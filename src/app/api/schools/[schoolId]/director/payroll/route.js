import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = generateKey('director:payroll', { schoolId });

        const data = await remember(cacheKey, async () => {
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();

            const [currentPeriod, recentPeriods] = await Promise.all([
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
                                    select: {
                                        user: {
                                            select: {
                                                name: true,
                                                email: true
                                            }
                                        }
                                    }
                                }
                            },
                            take: 20
                        }
                    }
                }).catch(() => null),
                prisma.payrollPeriod.findMany({
                    where: { schoolId },
                    orderBy: [{ year: 'desc' }, { month: 'desc' }],
                    take: 6
                }).catch(() => [])
            ]);

            if (!currentPeriod) {
                return {
                    summary: {
                        month: today.toLocaleString('default', { month: 'long', year: 'numeric' }),
                        status: 'NOT_CREATED',
                        totalEmployees: 0,
                        totalNetSalary: 0
                    },
                    employees: [],
                    recentPeriods: recentPeriods.map(p => ({
                        id: p.id,
                        month: new Date(p.year, p.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
                        status: p.status,
                        totalEmployees: p.totalEmployees,
                        totalNetSalary: p.totalNetSalary
                    }))
                };
            }

            return {
                summary: {
                    month: new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
                    status: currentPeriod.status,
                    totalEmployees: currentPeriod.totalEmployees,
                    totalGrossSalary: currentPeriod.totalGrossSalary,
                    totalDeductions: currentPeriod.totalDeductions,
                    totalNetSalary: currentPeriod.totalNetSalary,
                    processedAt: currentPeriod.processedAt?.toISOString(),
                    approvedAt: currentPeriod.approvedAt?.toISOString()
                },
                employees: currentPeriod.payrollItems.map(item => ({
                    id: item.id,
                    employeeName: item.employee.user.name,
                    email: item.employee.user.email,
                    grossEarnings: item.grossEarnings,
                    totalDeductions: item.totalDeductions,
                    netSalary: item.netSalary,
                    paymentStatus: item.paymentStatus
                })),
                recentPeriods: recentPeriods.map(p => ({
                    id: p.id,
                    month: new Date(p.year, p.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }),
                    status: p.status,
                    totalEmployees: p.totalEmployees,
                    totalNetSalary: p.totalNetSalary
                }))
            };
        }, 120);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[PAYROLL ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch payroll data', details: error.message },
            { status: 500 }
        );
    }
}
