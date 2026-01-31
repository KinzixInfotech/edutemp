// Payroll Dashboard API
// GET - Get payroll dashboard stats with enhanced data

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey } from "@/lib/cache";

// GET - Get payroll dashboard statistics
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear());

    try {
        const cacheKey = generateKey('payroll:dashboard:v3', { schoolId, year });

        const stats = await remember(cacheKey, async () => {
            // Get current month and year
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentDay = now.getDate();

            // Get employee counts in parallel
            const [
                activeEmployees,
                teachingCount,
                nonTeachingCount,
                pendingApprovals,
                approvedCount,
                paidCount
            ] = await Promise.all([
                prisma.employeePayrollProfile.count({ where: { schoolId, isActive: true } }),
                prisma.employeePayrollProfile.count({ where: { schoolId, isActive: true, employeeType: 'TEACHING' } }),
                prisma.employeePayrollProfile.count({ where: { schoolId, isActive: true, employeeType: 'NON_TEACHING' } }),
                prisma.payrollPeriod.count({ where: { schoolId, status: 'PENDING_APPROVAL', year } }),
                prisma.payrollPeriod.count({ where: { schoolId, status: 'APPROVED', year } }),
                prisma.payrollPeriod.count({ where: { schoolId, status: 'PAID', year } })
            ]);

            // Get payroll periods for the year
            const periods = await prisma.payrollPeriod.findMany({
                where: { schoolId, year },
                orderBy: { month: 'desc' }
            });

            // Calculate yearly totals
            const yearlyStats = periods.reduce((acc, p) => ({
                totalGross: acc.totalGross + (p.totalGrossSalary || 0),
                totalDeductions: acc.totalDeductions + (p.totalDeductions || 0),
                totalNet: acc.totalNet + (p.totalNetSalary || 0)
            }), { totalGross: 0, totalDeductions: 0, totalNet: 0 });

            // Get current/latest period with full details
            const latestProcessedPeriod = periods.find(p => p.status !== 'DRAFT') || periods[0];

            // Get deduction summary from all payroll items for the year
            const deductionSummary = await prisma.payrollItem.aggregate({
                where: {
                    period: { schoolId, year }
                },
                _sum: {
                    pfEmployee: true,
                    pfEmployer: true,
                    esiEmployee: true,
                    esiEmployer: true,
                    tds: true,
                    totalDeductions: true
                }
            });

            // Get active loans data
            const [activeLoans, loansData] = await Promise.all([
                prisma.employeeLoan.count({
                    where: { employee: { schoolId }, status: 'ACTIVE' }
                }),
                prisma.employeeLoan.aggregate({
                    where: { employee: { schoolId }, status: 'ACTIVE' },
                    _sum: { amountPending: true }
                })
            ]);

            // Get recent payments (last 10 paid items)
            const recentPayments = await prisma.payrollItem.findMany({
                where: {
                    period: { schoolId },
                    paymentStatus: 'PROCESSED'
                },
                take: 10,
                orderBy: { paidAt: 'desc' },
                include: {
                    employee: {
                        include: {
                            user: { select: { name: true, profilePicture: true } }
                        }
                    },
                    period: { select: { month: true, year: true } }
                }
            });

            // Get salary structure distribution
            const structureDistribution = await prisma.salaryStructure.findMany({
                where: { schoolId, isActive: true },
                include: { _count: { select: { employees: true } } }
            });

            // Get department/type breakdown for pie chart
            const typeBreakdown = await prisma.employeePayrollProfile.groupBy({
                by: ['employeeType'],
                where: { schoolId, isActive: true },
                _count: true
            });

            // Status counts for badges
            const statusCounts = {
                draft: periods.filter(p => p.status === 'DRAFT').length,
                pendingApproval: pendingApprovals,
                approved: approvedCount,
                paid: paidCount,
                total: periods.length
            };

            // Get upcoming birthdays (next 30 days)
            const employees = await prisma.employeePayrollProfile.findMany({
                where: { schoolId, isActive: true },
                include: {
                    user: {
                        select: {
                            name: true,
                            profilePicture: true,
                            teacher: { select: { dob: true } },
                            nonTeachingStaff: { select: { dob: true } }
                        }
                    }
                }
            });

            // Calculate upcoming birthdays
            const upcomingBirthdays = employees
                .filter(e => {
                    const dob = e.user?.teacher?.dob || e.user?.nonTeachingStaff?.dob;
                    return dob;
                })
                .map(e => {
                    const dobStr = e.user?.teacher?.dob || e.user?.nonTeachingStaff?.dob;
                    const dob = new Date(dobStr);
                    const thisYearBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
                    if (thisYearBirthday < now) {
                        thisYearBirthday.setFullYear(now.getFullYear() + 1);
                    }
                    const daysUntil = Math.ceil((thisYearBirthday - now) / (1000 * 60 * 60 * 24));
                    return {
                        name: e.user.name,
                        profilePicture: e.user.profilePicture,
                        date: `${dob.toLocaleString('default', { month: 'short' })} ${dob.getDate()}`,
                        daysUntil
                    };
                })
                .filter(b => b.daysUntil <= 30)
                .sort((a, b) => a.daysUntil - b.daysUntil)
                .slice(0, 5);

            // Calculate upcoming work anniversaries
            const upcomingAnniversaries = employees
                .filter(e => e.joiningDate)
                .map(e => {
                    const joinDate = new Date(e.joiningDate);
                    const thisYearAnniversary = new Date(now.getFullYear(), joinDate.getMonth(), joinDate.getDate());
                    if (thisYearAnniversary < now) {
                        thisYearAnniversary.setFullYear(now.getFullYear() + 1);
                    }
                    const yearsCompleted = now.getFullYear() - joinDate.getFullYear() + (thisYearAnniversary.getFullYear() > now.getFullYear() ? 0 : 1);
                    const daysUntil = Math.ceil((thisYearAnniversary - now) / (1000 * 60 * 60 * 24));
                    return {
                        name: e.user?.name || 'Unknown',
                        profilePicture: e.user?.profilePicture,
                        date: `${joinDate.toLocaleString('default', { month: 'short' })} ${joinDate.getDate()}`,
                        yearsCompleted,
                        daysUntil
                    };
                })
                .filter(a => a.daysUntil <= 30)
                .sort((a, b) => a.daysUntil - b.daysUntil)
                .slice(0, 5);

            // Monthly trends (ordered by month)
            const monthlyTrends = [...periods]
                .sort((a, b) => a.month - b.month)
                .map(p => ({
                    month: p.month,
                    monthName: new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short' }),
                    gross: p.totalGrossSalary || 0,
                    deductions: p.totalDeductions || 0,
                    net: p.totalNetSalary || 0,
                    employees: p.totalEmployees || 0,
                    status: p.status
                }));

            return {
                overview: {
                    activeEmployees,
                    teachingCount,
                    nonTeachingCount,
                    pendingApprovals,
                    activeLoans,
                    pendingLoanAmount: loansData._sum.amountPending || 0
                },
                summary: {
                    totalGross: yearlyStats.totalGross,
                    totalDeductions: yearlyStats.totalDeductions,
                    totalNet: yearlyStats.totalNet,
                    averageMonthly: yearlyStats.totalNet / (periods.length || 1),
                    monthsProcessed: periods.length,
                    year
                },
                // Deduction summary
                deductionSummary: {
                    tax: deductionSummary._sum.tds || 0,
                    pf: (deductionSummary._sum.pfEmployee || 0) + (deductionSummary._sum.pfEmployer || 0),
                    esi: (deductionSummary._sum.esiEmployee || 0) + (deductionSummary._sum.esiEmployer || 0),
                    pfEmployee: deductionSummary._sum.pfEmployee || 0,
                    pfEmployer: deductionSummary._sum.pfEmployer || 0,
                    tds: deductionSummary._sum.tds || 0,
                    total: deductionSummary._sum.totalDeductions || 0
                },
                // Recent processed payroll (latest period)
                recentProcessedPayroll: latestProcessedPeriod ? {
                    id: latestProcessedPeriod.id,
                    month: latestProcessedPeriod.month,
                    year: latestProcessedPeriod.year,
                    monthName: new Date(latestProcessedPeriod.year, latestProcessedPeriod.month - 1).toLocaleString('default', { month: 'long' }),
                    status: latestProcessedPeriod.status,
                    totalGross: latestProcessedPeriod.totalGrossSalary || 0,
                    totalNet: latestProcessedPeriod.totalNetSalary || 0,
                    employeeCount: latestProcessedPeriod.totalEmployees || 0,
                    processedAt: latestProcessedPeriod.processedAt
                } : null,
                statusCounts,
                monthlyTrends,
                recentPayments: recentPayments.map(p => ({
                    id: p.id,
                    employeeName: p.employee?.user?.name || 'Unknown',
                    profilePicture: p.employee?.user?.profilePicture,
                    employeeType: p.employee?.employeeType,
                    netSalary: p.netSalary,
                    paidAt: p.paidAt,
                    month: p.period?.month,
                    year: p.period?.year
                })),
                structureDistribution: structureDistribution.map(s => ({
                    id: s.id,
                    name: s.name,
                    employeeCount: s._count.employees,
                    grossSalary: s.grossSalary
                })),
                typeBreakdown: typeBreakdown.map(t => ({
                    type: t.employeeType,
                    count: t._count
                })),
                upcomingBirthdays,
                upcomingAnniversaries
            };
        }, 300); // Cache for 5 minutes

        return NextResponse.json(stats);
    } catch (error) {
        console.error('Payroll dashboard error:', error);
        return NextResponse.json({
            error: 'Failed to fetch payroll dashboard',
            details: error.message
        }, { status: 500 });
    }
}
