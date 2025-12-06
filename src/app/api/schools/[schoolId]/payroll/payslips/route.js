// Payslips API
// GET - List payslips
// POST - Generate payslips for a period

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET - List payslips
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const employeeId = searchParams.get('employeeId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const cacheKey = generateKey('payroll:payslips', {
            schoolId, month, year, employeeId, status, page, limit
        });

        const result = await remember(cacheKey, async () => {
            const skip = (page - 1) * limit;

            const where = {
                employee: { schoolId },
                ...(month && { month: parseInt(month) }),
                ...(year && { year: parseInt(year) }),
                ...(employeeId && { employeeId }),
                ...(status && { status })
            };

            const [payslips, total] = await Promise.all([
                prisma.payslip.findMany({
                    where,
                    include: {
                        employee: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        profilePicture: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: [
                        { year: 'desc' },
                        { month: 'desc' }
                    ],
                    skip,
                    take: limit
                }),
                prisma.payslip.count({ where })
            ]);

            return {
                payslips: payslips.map(p => ({
                    ...p,
                    employeeName: p.employee.user.name,
                    employeeEmail: p.employee.user.email,
                    profilePicture: p.employee.user.profilePicture,
                    periodLabel: `${new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short' })} ${p.year}`
                })),
                pagination: {
                    page, limit, total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        }, 300);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Payslips fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch payslips',
            details: error.message
        }, { status: 500 });
    }
}

// POST - Generate payslips for a period
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { periodId, employeeIds } = await req.json();

    if (!periodId) {
        return NextResponse.json({
            error: 'periodId is required'
        }, { status: 400 });
    }

    try {
        // Get the period
        const period = await prisma.payrollPeriod.findUnique({
            where: { id: periodId }
        });

        if (!period) {
            return NextResponse.json({
                error: 'Payroll period not found'
            }, { status: 404 });
        }

        if (period.schoolId !== schoolId) {
            return NextResponse.json({
                error: 'Unauthorized'
            }, { status: 403 });
        }

        if (!['APPROVED', 'PAID'].includes(period.status)) {
            return NextResponse.json({
                error: 'Payroll must be approved before generating payslips'
            }, { status: 400 });
        }

        // Get payroll items
        const where = {
            periodId,
            ...(employeeIds && employeeIds.length > 0 && {
                employeeId: { in: employeeIds }
            })
        };

        const payrollItems = await prisma.payrollItem.findMany({
            where,
            include: {
                employee: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        },
                        salaryStructure: true
                    }
                }
            }
        });

        const results = { generated: [], skipped: [], failed: [] };

        for (const item of payrollItems) {
            try {
                // Check if payslip already exists
                const existing = await prisma.payslip.findUnique({
                    where: {
                        employeeId_month_year: {
                            employeeId: item.employeeId,
                            month: period.month,
                            year: period.year
                        }
                    }
                });

                if (existing) {
                    results.skipped.push({
                        employeeId: item.employeeId,
                        name: item.employee.user.name,
                        reason: 'Payslip already exists'
                    });
                    continue;
                }

                // Get staff employee ID
                const teacherData = await prisma.teachingStaff.findUnique({
                    where: { userId: item.employee.userId },
                    select: { employeeId: true, designation: true, department: { select: { name: true } } }
                });

                const nonTeachingData = !teacherData ? await prisma.nonTeachingStaff.findUnique({
                    where: { userId: item.employee.userId },
                    select: { employeeId: true, designation: true, department: { select: { name: true } } }
                }) : null;

                const staffData = teacherData || nonTeachingData;

                // Create payslip
                const payslip = await prisma.payslip.create({
                    data: {
                        employeeId: item.employeeId,
                        month: period.month,
                        year: period.year,
                        employeeName: item.employee.user.name,
                        employeeId_staff: staffData?.employeeId || 'N/A',
                        designation: staffData?.designation,
                        department: staffData?.department?.name,
                        bankAccount: item.employee.accountNumber ?
                            `${item.employee.bankName} - ****${item.employee.accountNumber.slice(-4)}` : null,
                        panNumber: item.employee.panNumber,
                        uanNumber: item.employee.uanNumber,
                        earnings: {
                            basic: item.basicEarned,
                            hra: item.hraEarned,
                            da: item.daEarned,
                            ta: item.taEarned,
                            medical: item.medicalEarned,
                            special: item.specialEarned,
                            overtime: item.overtimeEarned,
                            incentives: item.incentives,
                            arrears: item.arrears,
                            others: item.otherEarnings,
                            total: item.grossEarnings
                        },
                        deductions: {
                            pf: item.pfEmployee,
                            esi: item.esiEmployee,
                            pt: item.professionalTax,
                            tds: item.tds,
                            loan: item.loanDeduction,
                            advance: item.advanceDeduction,
                            lop: item.lossOfPay,
                            others: item.otherDeductions,
                            total: item.totalDeductions
                        },
                        netSalary: item.netSalary,
                        attendanceSummary: {
                            daysWorked: item.daysWorked,
                            daysAbsent: item.daysAbsent,
                            daysLeave: item.daysLeave,
                            holidays: item.daysHoliday,
                            lateCount: item.lateCount,
                            halfDays: item.halfDayCount
                        },
                        status: 'GENERATED'
                    }
                });

                // Update payroll item with payslip reference
                await prisma.payrollItem.update({
                    where: { id: item.id },
                    data: { payslipId: payslip.id }
                });

                results.generated.push({
                    payslipId: payslip.id,
                    employeeId: item.employeeId,
                    name: item.employee.user.name
                });
            } catch (error) {
                results.failed.push({
                    employeeId: item.employeeId,
                    error: error.message
                });
            }
        }

        // Invalidate cache
        await invalidatePattern(`payroll:payslips:${schoolId}*`);

        return NextResponse.json({
            success: true,
            message: 'Payslips generated',
            summary: {
                generated: results.generated.length,
                skipped: results.skipped.length,
                failed: results.failed.length
            },
            results
        });
    } catch (error) {
        console.error('Payslip generation error:', error);
        return NextResponse.json({
            error: 'Failed to generate payslips',
            details: error.message
        }, { status: 500 });
    }
}
