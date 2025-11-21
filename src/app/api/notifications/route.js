// app/api/notifications/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET - Fetch notifications for a user
 * Query params: userId, schoolId, unreadOnly, page, limit
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const schoolId = searchParams.get("schoolId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type");

    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    try {
        const skip = (page - 1) * limit;
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
            skip,
            take: limit,
        });

        // Get total count
        const totalCount = await prisma.notification.count({ where });
        const unreadCount = await prisma.notification.count({
            where: { receiverId: userId, isRead: false }
        });

        // Group by date for better UX
        const grouped = groupNotificationsByDate(notifications);

        return NextResponse.json({
            success: true,
            notifications: grouped,
            pagination: {
                page,
                limit,
                total: totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
            unreadCount,
        });
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
        const { notificationIds, markAllAsRead, userId } = body;

        if (markAllAsRead && userId) {
            // Mark all as read for a user
            await prisma.notification.updateMany({
                where: {
                    receiverId: userId,
                    isRead: false,
                },
                data: {
                    isRead: true,
                    readAt: new Date(),
                },
            });

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
                id: { in: notificationIds },
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

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
 * Body: { notificationIds: string[] }
 */
export async function DELETE(req) {
    try {
        const body = await req.json();
        const { notificationIds } = body;

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: "notificationIds array is required" },
                { status: 400 }
            );
        }

        await prisma.notification.deleteMany({
            where: {
                id: { in: notificationIds },
            },
        });

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