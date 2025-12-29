import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { remember } from '@/lib/cache';

// GET - Fetch global SMS dashboard stats
export async function GET(req) {
    try {
        const cacheKey = 'sms:admin:dashboard';

        const stats = await remember(cacheKey, async () => {
            // Get total SMS sent
            const totalSent = await prisma.smsLog.count();

            // Get status breakdown
            const statusCounts = await prisma.smsLog.groupBy({
                by: ['status'],
                _count: true,
            });

            const delivered = statusCounts.find(s => s.status === 'DELIVERED')?._count || 0;
            const sent = statusCounts.find(s => s.status === 'SENT')?._count || 0;
            const failed = statusCounts.find(s => s.status === 'FAILED')?._count || 0;

            // Get active schools (schools with wallet)
            const activeSchools = await prisma.smsWallet.count();

            // Get total credits purchased and used
            const walletStats = await prisma.smsWallet.aggregate({
                _sum: {
                    totalCredits: true,
                    usedCredits: true,
                    balance: true,
                },
            });

            // Get top 10 schools by SMS sent
            const topSchoolsRaw = await prisma.smsLog.groupBy({
                by: ['schoolId'],
                _count: true,
                _sum: {
                    cost: true,
                },
                orderBy: {
                    _count: {
                        schoolId: 'desc',
                    },
                },
                take: 10,
            });

            // Get school details and wallet info
            const topSchools = await Promise.all(
                topSchoolsRaw.map(async (s) => {
                    const school = await prisma.school.findUnique({
                        where: { id: s.schoolId },
                        select: { id: true, name: true },
                    });
                    const wallet = await prisma.smsWallet.findUnique({
                        where: { schoolId: s.schoolId },
                        select: { balance: true },
                    });
                    return {
                        id: s.schoolId,
                        name: school?.name || 'Unknown School',
                        smsSent: s._count,
                        creditsUsed: s._sum?.cost || 0,
                        balance: wallet?.balance || 0,
                    };
                })
            );

            return {
                totalSent,
                delivered,
                sent,
                failed,
                activeSchools,
                totalCreditsPurchased: walletStats._sum?.totalCredits || 0,
                totalCreditsUsed: walletStats._sum?.usedCredits || 0,
                totalBalance: walletStats._sum?.balance || 0,
                topSchools,
            };
        }, 60); // Cache for 1 minute

        return NextResponse.json(stats);
    } catch (error) {
        console.error('[SMS ADMIN DASHBOARD ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats', details: error.message },
            { status: 500 }
        );
    }
}
