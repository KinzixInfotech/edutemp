import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { generateKey, remember } from "@/lib/cache";

/**
 * GET /api/schools/[schoolId]/status/stats
 * Status statistics for admin dashboard widget
 */
export async function GET(request, { params }) {
    try {
        const { schoolId } = await params;

        const cacheKey = generateKey("statusStats", schoolId);
        const stats = await remember(cacheKey, async () => {
            const now = new Date();
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const [
                activeCount,
                totalViewsToday,
                statusesToday,
                topPosters,
                recentStatuses
            ] = await Promise.all([
                // Active statuses count
                prisma.storyStatus.count({
                    where: { schoolId, expiryAt: { gt: now } }
                }),

                // Views today
                prisma.storyStatusView.count({
                    where: {
                        status: { schoolId },
                        viewedAt: { gte: todayStart }
                    }
                }),

                // Statuses posted today
                prisma.storyStatus.count({
                    where: {
                        schoolId,
                        createdAt: { gte: todayStart }
                    }
                }),

                // Top posters (last 7 days)
                prisma.storyStatus.groupBy({
                    by: ["userId"],
                    where: {
                        schoolId,
                        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                    },
                    _count: { id: true },
                    orderBy: { _count: { id: "desc" } },
                    take: 5
                }),

                // Recent active statuses for avatar row
                prisma.storyStatus.findMany({
                    where: {
                        schoolId,
                        expiryAt: { gt: now }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 10,
                    include: {
                        user: {
                            select: { id: true, name: true, profilePicture: true, role: { select: { name: true } } }
                        },
                        _count: { select: { views: true } }
                    }
                })
            ]);

            // Fetch user details for top posters
            let topPostersWithDetails = [];
            if (topPosters.length > 0) {
                const userIds = topPosters.map(p => p.userId);
                const users = await prisma.user.findMany({
                    where: { id: { in: userIds } },
                    select: { id: true, name: true, profilePicture: true, role: { select: { name: true } } }
                });

                const userMap = new Map(users.map(u => [u.id, u]));
                topPostersWithDetails = topPosters.map(p => ({
                    ...userMap.get(p.userId),
                    statusCount: p._count.id
                }));
            }

            return {
                activeStatuses: activeCount,
                totalViewsToday,
                statusesToday,
                topPosters: topPostersWithDetails,
                recentStatuses: recentStatuses.map(s => ({
                    id: s.id,
                    type: s.type,
                    mediaUrl: s.mediaUrl,
                    text: s.text?.slice(0, 30),
                    caption: s.caption,
                    userId: s.userId,
                    userName: s.user?.name,
                    userAvatar: s.user?.profilePicture,
                    userRole: s.user?.role?.name,
                    viewCount: s._count?.views || 0,
                    createdAt: s.createdAt,
                }))
            };
        }, 300); // 5 min cache

        return NextResponse.json({ success: true, stats });

    } catch (error) {
        console.error("Error fetching status stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch stats", details: error.message },
            { status: 500 }
        );
    }
}
