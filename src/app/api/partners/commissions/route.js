// app/api/partners/commissions/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");
    const isPaid = searchParams.get("isPaid");

    if (!partnerId) {
        return NextResponse.json(
            { error: "partnerId is required" },
            { status: 400 }
        );
    }

    try {
        const where = { partnerId };
        if (isPaid !== null && isPaid !== undefined) {
            where.isPaid = isPaid === "true";
        }

        const commissions = await prisma.partnerCommission.findMany({
            where,
            include: {
                payout: {
                    select: {
                        id: true,
                        status: true,
                        completedAt: true,
                        transactionId: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate summary
        const summary = await prisma.partnerCommission.aggregate({
            where: { partnerId },
            _sum: {
                commissionAmount: true,
                revenueAmount: true
            }
        });

        const pending = await prisma.partnerCommission.aggregate({
            where: { partnerId, isPaid: false },
            _sum: { commissionAmount: true }
        });

        const paid = await prisma.partnerCommission.aggregate({
            where: { partnerId, isPaid: true },
            _sum: { commissionAmount: true }
        });

        return NextResponse.json({
            success: true,
            commissions,
            summary: {
                total: summary._sum.commissionAmount || 0,
                totalRevenue: summary._sum.revenueAmount || 0,
                pending: pending._sum.commissionAmount || 0,
                paid: paid._sum.commissionAmount || 0
            }
        });

    } catch (error) {
        console.error("Fetch commissions error:", error);
        return NextResponse.json(
            { error: "Failed to fetch commissions" },
            { status: 500 }
        );
    }
}
