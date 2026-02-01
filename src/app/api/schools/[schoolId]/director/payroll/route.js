import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        // TEMPORARILY DISABLED CACHE FOR DEBUGGING
        // const cacheKey = generateKey('director:payroll:v2', { schoolId });
        // const data = await remember(cacheKey, async () => {

        const data = await (async () => {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();

            // Fetch all data in parallel
            const [currentPeriod, recentPeriods, allEmployees, payrollSettings] = await Promise.all([
                // Current month's payroll period
                prisma.payrollPeriod.findFirst({
                    where: {
                        schoolId,
                        month: currentMonth,
                        year: currentYear
                    },
                    include: {
                        payrollItems: {
                            include: {
                                employee: {
                                    include: {
                                        user: {
                                            select: {
                                                name: true,
                                                email: true,
                                                profilePicture: true
                                            }
                                        },
                                        salaryStructure: {
                                            select: { name: true }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }).catch(() => null),

                // Last 6 completed periods for history
                prisma.payrollPeriod.findMany({
                    where: {
                        schoolId,
                        status: 'PAID'
                    },
                    orderBy: [{ year: 'desc' }, { month: 'desc' }],
                    take: 6
                }).catch(() => []),

                // All employee profiles (show all, regardless of isActive status)
                prisma.employeePayrollProfile.findMany({
                    where: {
                        schoolId
                    },
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                profilePicture: true,
                                teacher: {
                                    select: { designation: true }
                                },
                                nonTeachingStaff: {
                                    select: { designation: true }
                                }
                            }
                        },
                        salaryStructure: {
                            select: {
                                name: true,
                                basicSalary: true,
                                grossSalary: true
                            }
                        }
                    }
                }).catch(() => []),

                // Payroll settings (enable after running prisma db push)
                Promise.resolve(null)
            ]);

            // Format month name
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];
            const monthName = monthNames[currentMonth - 1];

            // Build current period response
            const periodData = currentPeriod ? {
                month: monthName,
                year: currentYear,
                status: currentPeriod.status,
                employeeCount: currentPeriod.payrollItems?.length || 0,
                totalAmount: currentPeriod.totalNetSalary || 0,
                totalGross: currentPeriod.totalGrossSalary || 0,
                totalDeductions: currentPeriod.totalDeductions || 0,
                payDate: currentPeriod.approvedAt
                    ? new Date(currentPeriod.approvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                    : null,
                processedAt: currentPeriod.processedAt?.toISOString(),
                approvedAt: currentPeriod.approvedAt?.toISOString()
            } : {
                month: monthName,
                year: currentYear,
                status: 'NOT_CREATED',
                employeeCount: allEmployees.length,
                totalAmount: 0,
                totalGross: 0,
                totalDeductions: 0,
                payDate: null
            };

            // Build employees list - ALWAYS show all profiles, merge payroll data if available
            const payrollItemsMap = new Map();
            if (currentPeriod?.payrollItems) {
                currentPeriod.payrollItems.forEach(item => {
                    payrollItemsMap.set(item.employeeId, item);
                });
            }

            // Function to determine exclusion reason
            const getExclusionReason = (emp) => {
                if (!currentPeriod?.processedAt) {
                    return { status: 'NOT_PROCESSED', message: 'Payroll not yet processed' };
                }

                if (emp.createdAt > currentPeriod.processedAt) {
                    return { status: 'ADDED_AFTER', message: 'Added after payroll was processed' };
                }

                if (emp.pendingApprovedAt && emp.pendingApprovedAt > currentPeriod.processedAt) {
                    return { status: 'BANK_PENDING', message: 'Bank details were pending approval' };
                }

                if (!emp.salaryStructure) {
                    return { status: 'NO_STRUCTURE', message: 'No salary structure assigned' };
                }

                return { status: 'NOT_PROCESSED', message: 'Not included in payroll run' };
            };

            const employees = allEmployees.map(emp => {
                const user = emp.user;
                const designation = user?.teacher?.designation ||
                    user?.nonTeachingStaff?.designation ||
                    'Staff';

                // Check if this employee has payroll data in current period
                const payrollItem = payrollItemsMap.get(emp.id);

                if (payrollItem) {
                    // Has payroll data - use processed values
                    return {
                        id: emp.id,
                        name: user?.name || 'Unknown',
                        designation,
                        profilePicture: user?.profilePicture,
                        grossSalary: payrollItem.grossEarnings || 0,
                        deductions: payrollItem.totalDeductions || 0,
                        netSalary: payrollItem.netSalary || 0,
                        status: payrollItem.readiness || 'READY',
                        hasSalaryStructure: !!emp.salaryStructure,
                        isActive: emp.isActive,
                        statusMessage: null
                    };
                } else {
                    // No payroll data - determine why
                    const exclusion = getExclusionReason(emp);
                    return {
                        id: emp.id,
                        name: user?.name || 'Unknown',
                        designation,
                        profilePicture: user?.profilePicture,
                        grossSalary: emp.salaryStructure?.grossSalary || 0,
                        deductions: 0,
                        netSalary: emp.salaryStructure?.grossSalary || 0,
                        status: exclusion.status,
                        hasSalaryStructure: !!emp.salaryStructure,
                        isActive: emp.isActive,
                        statusMessage: exclusion.message
                    };
                }
            });

            // Calculate deduction totals from current period
            const deductionTotals = {
                pf: 0,
                esi: 0,
                tds: 0,
                professionalTax: 0
            };

            if (currentPeriod?.payrollItems) {
                currentPeriod.payrollItems.forEach(item => {
                    const ded = item.deductions || {};
                    deductionTotals.pf += (ded.pfEmployee || 0) + (ded.pfEmployer || 0);
                    deductionTotals.esi += (ded.esiEmployee || 0) + (ded.esiEmployer || 0);
                    deductionTotals.tds += ded.tds || 0;
                    deductionTotals.professionalTax += ded.professionalTax || 0;
                });
            }

            // Build history
            const history = recentPeriods.map(p => ({
                id: p.id,
                month: monthNames[p.month - 1],
                year: p.year,
                totalAmount: p.totalNetSalary || 0,
                employeeCount: p.totalEmployees || 0,
                paidDate: p.paidAt
                    ? new Date(p.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null,
                status: p.status
            }));

            // Settings
            const settings = {
                requireDirectorApproval: payrollSettings?.requireDirectorApproval ?? true,
                allowAdminToRunPayroll: payrollSettings?.allowAdminToRunPayroll ?? true,
                autoEmailPayslips: payrollSettings?.autoEmailPayslips ?? false
            };

            return {
                currentPeriod: periodData,
                employees,
                deductionTotals,
                history,
                settings,
                totalProfiles: allEmployees.length
            };
        })(); // IIFE - was cached with 60s timeout

        console.log('[DIRECTOR PAYROLL DEBUG] allEmployees count:', data.totalProfiles, 'employees returned:', data.employees.length);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[DIRECTOR PAYROLL ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch payroll data', details: error.message },
            { status: 500 }
        );
    }
}

// POST - Update payroll settings (Director only)
export async function POST(req, { params }) {
    try {
        const { schoolId } = await params;
        const body = await req.json();

        const { requireDirectorApproval, allowAdminToRunPayroll, autoEmailPayslips } = body;

        // Upsert settings
        const settings = await prisma.payrollSettings.upsert({
            where: { schoolId },
            update: {
                requireDirectorApproval,
                allowAdminToRunPayroll,
                autoEmailPayslips,
                updatedAt: new Date()
            },
            create: {
                schoolId,
                requireDirectorApproval: requireDirectorApproval ?? true,
                allowAdminToRunPayroll: allowAdminToRunPayroll ?? true,
                autoEmailPayslips: autoEmailPayslips ?? false
            }
        });

        return NextResponse.json({
            success: true,
            settings
        });
    } catch (error) {
        console.error('[PAYROLL SETTINGS ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to update settings', details: error.message },
            { status: 500 }
        );
    }
}
