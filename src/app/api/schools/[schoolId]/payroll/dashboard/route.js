// Payroll Dashboard API
// GET - Get payroll dashboard stats

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
        const cacheKey = generateKey('payroll:dashboard', { schoolId, year });

        const stats = await remember(cacheKey, async () => {
            // Get current month and year
            const now = new Date();
            const currentMonth = now.getMonth() + 1;
            const currentYear = now.getFullYear();

            // Get employee counts
            const [totalEmployees, activeEmployees, teachingCount, nonTeachingCount] = await Promise.all([
                prisma.employeePayrollProfile.count({ where: { schoolId } }),
                prisma.employeePayrollProfile.count({ where: { schoolId, isActive: true } }),
                prisma.employeePayrollProfile.count({ where: { schoolId, isActive: true, employeeType: 'TEACHING' } }),
                prisma.employeePayrollProfile.count({ where: { schoolId, isActive: true, employeeType: 'NON_TEACHING' } })
            ]);

            // Get payroll periods for the year
            const periods = await prisma.payrollPeriod.findMany({
                where: { schoolId, year },
                orderBy: { month: 'asc' }
            });

            // Calculate yearly totals
            const yearlyStats = periods.reduce((acc, p) => ({
                totalGross: acc.totalGross + p.totalGrossSalary,
                totalDeductions: acc.totalDeductions + p.totalDeductions,
                totalNet: acc.totalNet + p.totalNetSalary
            }), { totalGross: 0, totalDeductions: 0, totalNet: 0 });

            // Get monthly salary trends
            const monthlyTrends = periods.map(p => ({
                month: p.month,
                monthName: new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short' }),
                gross: p.totalGrossSalary,
                deductions: p.totalDeductions,
                net: p.totalNetSalary,
                employees: p.totalEmployees,
                status: p.status
            }));

            // Get current/latest period
            const currentPeriod = periods.find(p => p.month === currentMonth) ||
                periods[periods.length - 1];

            // Get pending approvals
            const pendingApprovals = await prisma.payrollPeriod.count({
                where: { schoolId, status: 'PENDING_APPROVAL' }
            });

            // Get pending payments
            const pendingPayments = await prisma.payrollItem.count({
                where: {
                    period: { schoolId },
                    paymentStatus: 'PENDING'
                }
            });

            // Get active loans count
            const activeLoans = await prisma.employeeLoan.count({
                where: {
                    employee: { schoolId },
                    status: 'ACTIVE'
                }
            });

            // Get pending loan amount
            const loansData = await prisma.employeeLoan.aggregate({
                where: {
                    employee: { schoolId },
                    status: 'ACTIVE'
                },
                _sum: { amountPending: true }
            });

            // Get salary structure distribution
            const structureDistribution = await prisma.salaryStructure.findMany({
                where: { schoolId, isActive: true },
                include: {
                    _count: { select: { employees: true } }
                }
            });

            return {
                overview: {
                    totalEmployees,
                    activeEmployees,
                    teachingCount,
                    nonTeachingCount,
                    pendingApprovals,
                    pendingPayments,
                    activeLoans,
                    pendingLoanAmount: loansData._sum.amountPending || 0
                },
                currentPeriod: currentPeriod ? {
                    id: currentPeriod.id,
                    month: currentPeriod.month,
                    year: currentPeriod.year,
                    status: currentPeriod.status,
                    totalGross: currentPeriod.totalGrossSalary,
                    totalNet: currentPeriod.totalNetSalary,
                    employeeCount: currentPeriod.totalEmployees
                } : null,
                yearlyStats: {
                    year,
                    ...yearlyStats,
                    averageMonthly: yearlyStats.totalNet / (periods.length || 1)
                },
                monthlyTrends,
                structureDistribution: structureDistribution.map(s => ({
                    id: s.id,
                    name: s.name,
                    employeeCount: s._count.employees,
                    grossSalary: s.grossSalary
                }))
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
