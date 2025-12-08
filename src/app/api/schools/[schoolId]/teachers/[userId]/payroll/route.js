// Teacher Payroll API - Get teacher's payroll profile, latest payslip, YTD stats
// GET /api/schools/[schoolId]/teachers/[userId]/payroll

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey } from "@/lib/cache";

export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;

    try {
        const cacheKey = generateKey('teacher:payroll', { schoolId, userId });

        const result = await remember(cacheKey, async () => {
            // Get employee payroll profile
            const profile = await prisma.employeePayrollProfile.findUnique({
                where: { userId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            profilePicture: true
                        }
                    },
                    salaryStructure: {
                        select: {
                            id: true,
                            name: true,
                            basicSalary: true,
                            hraPercent: true,
                            daPercent: true,
                            taAmount: true,
                            medicalAllowance: true,
                            specialAllowance: true,
                            grossSalary: true,
                            ctc: true
                        }
                    },
                    loans: {
                        where: { status: 'ACTIVE' },
                        select: {
                            id: true,
                            type: true,
                            principalAmount: true,
                            emiAmount: true,
                            amountPaid: true,
                            amountPending: true,
                            tenure: true,
                            startDate: true
                        }
                    }
                }
            });

            if (!profile) {
                return { error: 'Payroll profile not found' };
            }

            // Get payroll config to check if loans are enabled
            const payrollConfig = await prisma.payrollConfig.findUnique({
                where: { schoolId },
                select: {
                    enablePF: true,
                    enableESI: true,
                    enableProfessionalTax: true,
                    enableTDS: true
                }
            });

            // Get current year for YTD calculation
            const currentYear = new Date().getFullYear();
            const startOfYear = new Date(currentYear, 0, 1);

            // Get latest payroll item
            const latestPayrollItem = await prisma.payrollItem.findFirst({
                where: { employeeId: profile.id },
                include: {
                    period: {
                        select: {
                            month: true,
                            year: true,
                            status: true
                        }
                    }
                },
                orderBy: { period: { year: 'desc' } }
            });

            // Get all payroll items for YTD calculation
            const ytdPayrollItems = await prisma.payrollItem.findMany({
                where: {
                    employeeId: profile.id,
                    period: {
                        year: currentYear,
                        status: { in: ['APPROVED', 'PAID'] }
                    }
                },
                select: {
                    grossEarnings: true,
                    totalDeductions: true,
                    netSalary: true,
                    pfEmployee: true,
                    esiEmployee: true,
                    professionalTax: true,
                    tds: true,
                    loanDeduction: true,
                    daysWorked: true,
                    daysAbsent: true,
                    daysLeave: true,
                    period: {
                        select: { month: true, year: true }
                    }
                }
            });

            // Calculate YTD totals
            const ytd = ytdPayrollItems.reduce((acc, item) => ({
                grossEarnings: acc.grossEarnings + item.grossEarnings,
                totalDeductions: acc.totalDeductions + item.totalDeductions,
                netSalary: acc.netSalary + item.netSalary,
                pfContribution: acc.pfContribution + item.pfEmployee,
                esiContribution: acc.esiContribution + item.esiEmployee,
                professionalTax: acc.professionalTax + item.professionalTax,
                tds: acc.tds + item.tds,
                loanDeductions: acc.loanDeductions + item.loanDeduction,
                daysWorked: acc.daysWorked + item.daysWorked,
                daysAbsent: acc.daysAbsent + item.daysAbsent,
                daysLeave: acc.daysLeave + item.daysLeave,
                monthsProcessed: acc.monthsProcessed + 1
            }), {
                grossEarnings: 0,
                totalDeductions: 0,
                netSalary: 0,
                pfContribution: 0,
                esiContribution: 0,
                professionalTax: 0,
                tds: 0,
                loanDeductions: 0,
                daysWorked: 0,
                daysAbsent: 0,
                daysLeave: 0,
                monthsProcessed: 0
            });

            // Check if school has loans enabled (check if there are any loans configured)
            const loansEnabled = profile.loans.length > 0 || await prisma.employeeLoan.count({
                where: { employee: { schoolId } }
            }) > 0;

            return {
                profile: {
                    id: profile.id,
                    userId: profile.userId,
                    name: profile.user.name,
                    email: profile.user.email,
                    profilePicture: profile.user.profilePicture,
                    employeeType: profile.employeeType,
                    employmentType: profile.employmentType,
                    joiningDate: profile.joiningDate,
                    bankName: profile.bankName,
                    accountNumber: profile.accountNumber ? '****' + profile.accountNumber.slice(-4) : null,
                    uanNumber: profile.uanNumber,
                    panNumber: profile.panNumber ? '****' + profile.panNumber.slice(-4) : null
                },
                salaryStructure: profile.salaryStructure,
                latestPayslip: latestPayrollItem ? {
                    month: latestPayrollItem.period.month,
                    year: latestPayrollItem.period.year,
                    status: latestPayrollItem.period.status,
                    grossEarnings: latestPayrollItem.grossEarnings,
                    totalDeductions: latestPayrollItem.totalDeductions,
                    netSalary: latestPayrollItem.netSalary,
                    daysWorked: latestPayrollItem.daysWorked,
                    daysAbsent: latestPayrollItem.daysAbsent,
                    paymentStatus: latestPayrollItem.paymentStatus,
                    earnings: {
                        basic: latestPayrollItem.basicEarned,
                        hra: latestPayrollItem.hraEarned,
                        da: latestPayrollItem.daEarned,
                        ta: latestPayrollItem.taEarned,
                        medical: latestPayrollItem.medicalEarned,
                        special: latestPayrollItem.specialEarned,
                        overtime: latestPayrollItem.overtimeEarned,
                        incentives: latestPayrollItem.incentives,
                        arrears: latestPayrollItem.arrears
                    },
                    deductions: {
                        pf: latestPayrollItem.pfEmployee,
                        esi: latestPayrollItem.esiEmployee,
                        professionalTax: latestPayrollItem.professionalTax,
                        tds: latestPayrollItem.tds,
                        loan: latestPayrollItem.loanDeduction,
                        advance: latestPayrollItem.advanceDeduction,
                        lossOfPay: latestPayrollItem.lossOfPay
                    }
                } : null,
                ytd: {
                    year: currentYear,
                    ...ytd
                },
                loans: profile.loans,
                loansEnabled,
                config: payrollConfig
            };
        }, 300); // Cache for 5 minutes

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 404 });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Teacher payroll fetch error:', error);
        return NextResponse.json({
            error: 'Failed to fetch payroll data',
            details: error.message
        }, { status: 500 });
    }
}
