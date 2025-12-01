import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get security events for user
export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const { searchParams } = new URL(req.url);
        const unreadOnly = searchParams.get("unreadOnly") === "true";

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const where = {
            userId,
            ...(unreadOnly && { isRead: false }),
        };

        const events = await prisma.securityEvent.findMany({
            where,
            orderBy: {
                createdAt: "desc",
            },
            take: 50, // Limit to last 50 events
        });

        const unreadCount = await prisma.securityEvent.count({
            where: {
                userId,
                isRead: false,
            },
        });

        return NextResponse.json({ events, unreadCount });
    } catch (error) {
        console.error("Error fetching security events:", error);
        return NextResponse.json(
            { error: "Failed to fetch events" },
            { status: 500 }
        );
    }
}

// PATCH - Mark events as read
export async function PATCH(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const body = await req.json();
        const { eventIds } = body;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.securityEvent.updateMany({
            where: {
                userId,
                id: { in: eventIds },
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking events as read:", error);
        return NextResponse.json(
            { error: "Failed to mark events as read" },
            { status: 500 }
        );
    }
}
