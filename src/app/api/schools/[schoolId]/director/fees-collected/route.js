import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;

        if (!schoolId || schoolId === 'null') {
            return NextResponse.json({ error: 'Invalid schoolId' }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');

        const cacheKey = generateKey('director:fees-collected', { schoolId, academicYearId });

        const data = await remember(cacheKey, async () => {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            // Build where clause - academic year is optional
            const where = {
                schoolId,
                status: 'SUCCESS',
                paymentDate: {
                    gte: firstDayOfMonth,
                    lte: lastDayOfMonth
                },
                ...(academicYearId && { academicYearId })
            };

            const [monthlyPayments, totalCollected, paymentMethods] = await Promise.all([
                prisma.feePayment.findMany({
                    where,
                    include: {
                        student: {
                            select: {
                                admissionNo: true,
                                name: true
                            }
                        }
                    },
                    orderBy: { paymentDate: 'desc' },
                    take: 50
                }),
                prisma.feePayment.aggregate({
                    where,
                    _sum: { amount: true },
                    _count: true
                }),
                prisma.feePayment.groupBy({
                    by: ['paymentMode'],
                    where,
                    _sum: { amount: true },
                    _count: true
                })
            ]);

            return {
                summary: {
                    totalAmount: totalCollected._sum.amount || 0,
                    totalCount: totalCollected._count || 0,
                    month: today.toLocaleString('default', { month: 'long', year: 'numeric' })
                },
                paymentMethods: paymentMethods.map(pm => ({
                    method: pm.paymentMode,
                    amount: pm._sum.amount || 0,
                    count: pm._count
                })),
                recentPayments: monthlyPayments.map(p => ({
                    id: p.id,
                    admissionNo: p.student?.admissionNo || 'N/A',
                    studentName: p.student?.name || 'Unknown',
                    amount: p.amount,
                    paymentMode: p.paymentMode,
                    transactionId: p.transactionId,
                    paymentDate: p.paymentDate?.toISOString()
                }))
            };
        }, 60);

        return NextResponse.json(data);
    } catch (error) {
        console.error('[FEES COLLECTED ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch fees collected', details: error.message },
            { status: 500 }
        );
    }
}
