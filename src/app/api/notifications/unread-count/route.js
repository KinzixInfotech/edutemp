// app/api/notifications/unread-count/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * GET - Fetch only unread notification count (lightweight endpoint for badge)
 * Query params: userId, schoolId (optional)
 */
export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const schoolId = searchParams.get("schoolId");

    if (!userId) {
        return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    try {
        const where = {
            receiverId: userId,
            isRead: false,
            ...(schoolId && { schoolId })
        };

        const unreadCount = await prisma.notification.count({ where });

        return NextResponse.json({
            success: true,
            unreadCount,
            userId,
            schoolId: schoolId || null
        });
    } catch (error) {
        console.error("Fetch unread count error:", error);
        return NextResponse.json(
            { error: "Failed to fetch unread count" },
            { status: 500 }
        );
    }
}