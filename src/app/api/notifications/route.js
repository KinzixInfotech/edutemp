// app/api/notifications/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

/**
 * GET - Fetch notifications for a user
 * Query params: userId, schoolId, unreadOnly, page, offset, limit
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const schoolId = searchParams.get("schoolId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "20");
    const offsetParam = searchParams.get("offset");
    const pageParam = searchParams.get("page");
    const type = searchParams.get("type");

    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    try {
        const offset = offsetParam !== null
            ? Math.max(parseInt(offsetParam || "0", 10), 0)
            : (Math.max(parseInt(pageParam || "1", 10), 1) - 1) * limit;
        const page = Math.floor(offset / limit) + 1;

        const cacheKey = generateKey('notifications:list', {
            userId,
            schoolId,
            unreadOnly,
            offset,
            limit,
            type,
        });

        const result = await remember(cacheKey, async () => {
            const where = {
                receiverId: userId,
                ...(schoolId && { schoolId }),
                ...(unreadOnly && { isRead: false }),
                ...(type && { type }),
            };

            // Get notifications
            const notifications = await prisma.notification.findMany({
                where,
                include: {
                    sender: {
                        select: {
                            id: true,
                            name: true,
                            profilePicture: true,
                            role: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: [
                    { isRead: 'asc' },
                    { createdAt: 'desc' }
                ],
                skip: offset,
                take: limit,
            });

            // Get total count
            const totalCount = await prisma.notification.count({ where });
            const unreadCount = await prisma.notification.count({
                where: {
                    receiverId: userId,
                    isRead: false,
                    ...(schoolId && { schoolId }),
                }
            });

            // Group by date for better UX
            const grouped = groupNotificationsByDate(notifications);
            const hasMore = offset + notifications.length < totalCount;

            return {
                success: true,
                notifications: grouped,
                pagination: {
                    page,
                    offset,
                    limit,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    hasMore,
                    nextOffset: hasMore ? offset + notifications.length : null,
                },
                unreadCount,
            };
        }, 60); // 1 minute cache

        // Return the full result object
        return NextResponse.json(result);
    } catch (error) {
        console.error("Fetch notifications error:", error);
        return NextResponse.json(
            { error: "Failed to fetch notifications" },
            { status: 500 }
        );
    }
}
/**
 * GET unread count only - Lightweight endpoint for badge
 * Route: /api/notifications/unread-count?userId=xxx&schoolId=xxx
 */
export async function HEAD(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const schoolId = searchParams.get("schoolId");

    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    try {
        const unreadCount = await prisma.notification.count({
            where: {
                receiverId: userId,
                isRead: false,
                ...(schoolId && { schoolId })
            }
        });

        return NextResponse.json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error("Fetch unread count error:", error);
        return NextResponse.json(
            { error: "Failed to fetch unread count" },
            { status: 500 }
        );
    }
}


/**
 * PUT - Mark notifications as read
 * Body: { notificationIds: string[] } or { markAllAsRead: true, userId: string }
 */
export async function PUT(req) {
    try {
        const body = await req.json();
        const { notificationIds, markAllAsRead, userId, schoolId, type } = body;

        if (markAllAsRead && userId) {
            // Mark all as read for a user (optionally filtered by type)
            await prisma.notification.updateMany({
                where: {
                    receiverId: userId,
                    isRead: false,
                    ...(schoolId && { schoolId }),
                    ...(type && { type }),
                },
                data: {
                    isRead: true,
                    readAt: new Date(),
                },
            });

            await invalidatePattern(`notifications:*${userId}*`);

            return NextResponse.json({
                success: true,
                message: "All notifications marked as read"
            });
        }

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: "notificationIds array is required" },
                { status: 400 }
            );
        }

        // Mark specific notifications as read
        await prisma.notification.updateMany({
            where: {
                receiverId: userId,
                ...(schoolId && { schoolId }),
                id: { in: notificationIds },
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        await invalidatePattern(`notifications:*${userId || 'unknown'}*`);

        return NextResponse.json({
            success: true,
            message: `${notificationIds.length} notification(s) marked as read`
        });
    } catch (error) {
        console.error("Update notifications error:", error);
        return NextResponse.json(
            { error: "Failed to update notifications" },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Delete notifications
 * Body: { notificationIds: string[], userId: string } or { clearAll: true, userId: string }
 */
export async function DELETE(req) {
    try {
        const body = await req.json();
        const { notificationIds, clearAll, userId, schoolId } = body;

        if (!userId) {
            return NextResponse.json(
                { error: "userId is required" },
                { status: 400 }
            );
        }

        if (clearAll && userId) {
            await prisma.notification.deleteMany({
                where: {
                    receiverId: userId,
                    ...(schoolId && { schoolId }),
                }
            });

            await invalidatePattern(`notifications:*${userId}*`);

            return NextResponse.json({
                success: true,
                message: "All notifications cleared"
            });
        }

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: "notificationIds array is required" },
                { status: 400 }
            );
        }

        await prisma.notification.deleteMany({
            where: {
                receiverId: userId,
                ...(schoolId && { schoolId }),
                id: { in: notificationIds },
            },
        });

        await invalidatePattern(`notifications:*${userId}*`);

        return NextResponse.json({
            success: true,
            message: `${notificationIds.length} notification(s) deleted`
        });
    } catch (error) {
        console.error("Delete notifications error:", error);
        return NextResponse.json(
            { error: "Failed to delete notifications" },
            { status: 500 }
        );
    }
}

/**
 * Helper function to group notifications by date
 */
function groupNotificationsByDate(notifications) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
        today: [],
        yesterday: [],
        earlier: []
    };

    notifications.forEach(notif => {
        const notifDate = new Date(notif.createdAt);
        notifDate.setHours(0, 0, 0, 0);

        const timeDiff = today - notifDate;
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

        if (daysDiff === 0) {
            groups.today.push(formatNotification(notif));
        } else if (daysDiff === 1) {
            groups.yesterday.push(formatNotification(notif));
        } else {
            groups.earlier.push(formatNotification(notif));
        }
    });

    return groups;
}

/**
 * Format notification for frontend
 */
function formatNotification(notif) {
    const now = new Date();
    const createdAt = new Date(notif.createdAt);
    const diffInMinutes = Math.floor((now - createdAt) / (1000 * 60));

    let timeAgo;
    if (diffInMinutes < 1) {
        timeAgo = 'Just now';
    } else if (diffInMinutes < 60) {
        timeAgo = `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
        timeAgo = `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
        timeAgo = `${Math.floor(diffInMinutes / 1440)}d ago`;
    }

    return {
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        priority: notif.priority,
        icon: notif.icon,
        isRead: notif.isRead,
        time: timeAgo,
        actionUrl: notif.actionUrl,
        metadata: notif.metadata,
        sender: notif.sender,
        createdAt: notif.createdAt,
    };
}
