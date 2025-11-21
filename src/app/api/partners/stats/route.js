// app/api/partners/stats/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const partnerId = searchParams.get("partnerId");

    if (!partnerId) {
        return NextResponse.json(
            { error: "partnerId is required" },
            { status: 400 }
        );
    }

    try {
        // Get partner details
        const partner = await prisma.partner.findUnique({
            where: { id: partnerId },
            select: {
                totalLeads: true,
                convertedLeads: true,
                totalRevenue: true,
                totalCommission: true,
                level: true,
                commissionRate: true
            }
        });

        if (!partner) {
            return NextResponse.json(
                { error: "Partner not found" },
                { status: 404 }
            );
        }

        // Get leads by status
        const leadsByStatus = await prisma.partnerLead.groupBy({
            by: ['status'],
            where: { partnerId },
            _count: true
        });

        // Get schools onboarded
        const schoolsOnboarded = await prisma.partnerSchool.count({
            where: { partnerId, isActive: true }
        });

        // Get pending commissions
        const pendingCommissions = await prisma.partnerCommission.aggregate({
            where: {
                partnerId,
                isPaid: false
            },
            _sum: { commissionAmount: true }
        });

        // Get paid commissions (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentEarnings = await prisma.partnerCommission.aggregate({
            where: {
                partnerId,
                isPaid: true,
                paidAt: { gte: thirtyDaysAgo }
            },
            _sum: { commissionAmount: true }
        });

        // Get monthly performance (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyData = await prisma.partnerCommission.groupBy({
            by: ['periodMonth', 'periodYear'],
            where: {
                partnerId,
                createdAt: { gte: sixMonthsAgo }
            },
            _sum: {
                commissionAmount: true,
                revenueAmount: true
            },
            _count: true,
            orderBy: [
                { periodYear: 'asc' },
                { periodMonth: 'asc' }
            ]
        });

        // Format monthly performance for charts
        const performanceGraph = monthlyData.map(item => ({
            month: `${item.periodYear}-${String(item.periodMonth).padStart(2, '0')}`,
            commission: item._sum.commissionAmount || 0,
            revenue: item._sum.revenueAmount || 0,
            schools: item._count
        }));

        // Get active schools with upcoming renewals
        const upcomingRenewals = await prisma.partnerSchool.count({
            where: {
                partnerId,
                isActive: true,
                renewalDate: {
                    gte: new Date(),
                    lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Next 30 days
                }
            }
        });

        return NextResponse.json({
            success: true,
            stats: {
                overview: {
                    totalLeads: partner.totalLeads,
                    convertedLeads: partner.convertedLeads,
                    conversionRate: partner.totalLeads > 0
                        ? ((partner.convertedLeads / partner.totalLeads) * 100).toFixed(2)
                        : 0,
                    schoolsOnboarded,
                    upcomingRenewals
                },
                financial: {
                    totalRevenue: partner.totalRevenue,
                    totalCommission: partner.totalCommission,
                    pendingPayout: pendingCommissions._sum.commissionAmount || 0,
                    recentEarnings: recentEarnings._sum.commissionAmount || 0,
                    commissionRate: partner.commissionRate
                },
                leads: {
                    byStatus: leadsByStatus.reduce((acc, item) => {
                        acc[item.status] = item._count;
                        return acc;
                    }, {}),
                    total: partner.totalLeads
                },
                partner: {
                    level: partner.level,
                    commissionRate: partner.commissionRate
                },
                performanceGraph
            }
        });

    } catch (error) {
        console.error("Fetch partner stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch statistics" },
            { status: 500 }
        );
    }
}