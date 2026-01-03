import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

/**
 * Finance Overview API for Director
 * High-level finance metrics only - no transaction-level clutter
 */
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get("academicYearId");

        const cacheKey = generateKey('finance:overview', { schoolId, academicYearId });

        const result = await remember(cacheKey, async () => {
            // Get current academic year if not provided
            let yearId = academicYearId;
            if (!yearId) {
                const activeYear = await prisma.academicYear.findFirst({
                    where: { schoolId, isActive: true },
                    select: { id: true },
                });
                yearId = activeYear?.id;
            }

            // 1. Fee Collection Summary
            const feePayments = await prisma.feePayment.aggregate({
                where: {
                    schoolId,
                    academicYearId: yearId,
                    status: 'SUCCESS',
                },
                _sum: { amount: true },
                _count: true,
            });

            // Expected fees
            const expectedFees = await prisma.studentFee.aggregate({
                where: {
                    schoolId,
                    academicYearId: yearId,
                },
                _sum: {
                    totalAmount: true,
                    paidAmount: true,
                    balance: true,
                },
            });

            // Monthly collection (last 6 months)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

            const monthlyCollections = await prisma.feePayment.groupBy({
                by: ['paymentDate'],
                where: {
                    schoolId,
                    academicYearId: yearId,
                    status: 'SUCCESS',
                    paymentDate: { gte: sixMonthsAgo },
                },
                _sum: { amount: true },
            });

            // Group by month
            const monthlyData = {};
            monthlyCollections.forEach(item => {
                const month = new Date(item.paymentDate).toLocaleString('default', { month: 'short', year: '2-digit' });
                monthlyData[month] = (monthlyData[month] || 0) + (item._sum.amount || 0);
            });

            // 2. Fee Defaulters Count
            const defaultersCount = await prisma.studentFee.count({
                where: {
                    schoolId,
                    academicYearId: yearId,
                    balance: { gt: 0 },
                    status: { in: ['UNPAID', 'PARTIAL'] },
                },
            });

            // 3. Payroll Summary (if exists)
            let payrollSummary = { pending: 0, processed: 0, totalAmount: 0 };
            try {
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();

                const payrollPeriod = await prisma.payrollPeriod.findFirst({
                    where: {
                        schoolId,
                        month: currentMonth,
                        year: currentYear,
                    },
                    include: {
                        _count: {
                            select: { payrollItems: true },
                        },
                    },
                });

                if (payrollPeriod) {
                    const payrollTotals = await prisma.payrollItem.aggregate({
                        where: { periodId: payrollPeriod.id },
                        _sum: { netSalary: true },
                    });
                    payrollSummary = {
                        status: payrollPeriod.status,
                        employees: payrollPeriod._count.payrollItems,
                        totalAmount: payrollTotals._sum.netSalary || 0,
                    };
                }
            } catch (e) {
                console.log('Payroll data not available');
            }

            // 4. Calculate metrics
            const totalCollected = feePayments._sum.amount || 0;
            const totalExpected = expectedFees._sum.totalAmount || 0;
            const totalOutstanding = expectedFees._sum.balance || 0;
            const collectionRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : 0;

            return {
                feeCollection: {
                    collected: totalCollected,
                    expected: totalExpected,
                    outstanding: totalOutstanding,
                    collectionRate: parseFloat(collectionRate),
                    transactionCount: feePayments._count,
                },
                defaulters: {
                    count: defaultersCount,
                },
                monthlyTrend: Object.entries(monthlyData).map(([month, amount]) => ({
                    month,
                    amount,
                })).slice(-6),
                payroll: payrollSummary,
            };
        }, 120); // Cache for 2 minutes

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching finance overview:", error);
        return NextResponse.json(
            { error: "Failed to fetch finance overview", details: error.message },
            { status: 500 }
        );
    }
}
