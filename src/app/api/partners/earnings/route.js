import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const partnerId = searchParams.get("partnerId");

        if (!partnerId) {
            return NextResponse.json({ error: "Partner ID is required" }, { status: 400 });
        }

        // 1. Fetch Partner Stats
        const partner = await prisma.partner.findUnique({
            where: { userId: partnerId },
            select: {
                totalCommission: true,
                commissionRate: true,
            }
        });

        if (!partner) {
            return NextResponse.json({ error: "Partner not found" }, { status: 404 });
        }

        // 2. Calculate Available Balance (Sum of unpaid commissions)
        const unpaidCommissions = await prisma.partnerCommission.aggregate({
            where: {
                partnerId,
                isPaid: false
            },
            _sum: {
                commissionAmount: true
            }
        });

        const availableBalance = unpaidCommissions._sum.commissionAmount || 0;

        // 3. Fetch Last Payout
        const lastPayout = await prisma.partnerPayout.findFirst({
            where: {
                partnerId,
                status: "COMPLETED"
            },
            orderBy: {
                processedAt: 'desc'
            }
        });

        // 4. Fetch Transaction History (Commissions + Payouts)
        const commissions = await prisma.partnerCommission.findMany({
            where: { partnerId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const payouts = await prisma.partnerPayout.findMany({
            where: { partnerId },
            orderBy: { requestedAt: 'desc' },
            take: 20
        });

        // Combine and format transactions
        const transactions = [
            ...commissions.map(c => ({
                id: c.id,
                date: c.createdAt,
                type: 'COMMISSION',
                description: `Commission for ${c.schoolName}`,
                amount: c.commissionAmount,
                status: c.isPaid ? 'PAID' : 'PENDING'
            })),
            ...payouts.map(p => ({
                id: p.id,
                date: p.requestedAt,
                type: 'PAYOUT',
                description: `Payout Request`,
                amount: p.amount,
                status: p.status
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        return NextResponse.json({
            totalEarnings: partner.totalCommission,
            availableBalance,
            lastPayout: lastPayout ? {
                amount: lastPayout.amount,
                date: lastPayout.processedAt
            } : null,
            transactions
        });

    } catch (error) {
        console.error("Error fetching earnings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
