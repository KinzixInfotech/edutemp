import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey } from '@/lib/cache';

export async function GET(req, { params }) {
    try {
        const { schoolId } = await params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get('academicYearId');

        if (!academicYearId) {
            return NextResponse.json({ error: 'academicYearId required' }, { status: 400 });
        }

        const cacheKey = generateKey('director:fees-collected', { schoolId, academicYearId });

        const data = await remember(cacheKey, async () => {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

            const [monthlyPayments, totalCollected, paymentMethods] = await Promise.all([
                prisma.feePayment.findMany({
                    where: {
                        schoolId,
                        academicYearId,
                        status: 'SUCCESS',
                        paymentDate: {
                            gte: firstDayOfMonth,
                            lte: lastDayOfMonth
                        }
                    },
                    include: {
                        student: {
                            select: {
                                admissionNo: true,
                                user: { select: { name: true } }
                            }
                        }
                    },
                    orderBy: { paymentDate: 'desc' },
                    take: 50
                }),
                prisma.feePayment.aggregate({
                    where: {
                        schoolId,
                        academicYearId,
                        status: 'SUCCESS',
                        paymentDate: {
                            gte: firstDayOfMonth,
                            lte: lastDayOfMonth
                        }
                    },
                    _sum: { amount: true },
                    _count: true
                }),
                prisma.feePayment.groupBy({
                    by: ['paymentMode'],
                    where: {
                        schoolId,
                        academicYearId,
                        status: 'SUCCESS',
                        paymentDate: {
                            gte: firstDayOfMonth,
                            lte: lastDayOfMonth
                        }
                    },
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
                    admissionNo: p.student.admissionNo,
                    studentName: p.student.user.name,
                    amount: p.amount,
                    paymentMode: p.paymentMode,
                    transactionId: p.transactionId,
                    paymentDate: p.paymentDate.toISOString()
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
