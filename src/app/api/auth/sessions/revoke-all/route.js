import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

// POST - Revoke all sessions except current
export async function POST(req) {
    try {
        const userId = req.headers.get("x-user-id");
        const body = await req.json();
        const { currentSessionId } = body;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Revoke all sessions except current
        const result = await prisma.userSession.updateMany({
            where: {
                userId,
                id: { not: currentSessionId },
                isRevoked: false,
            },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: "User signed out everywhere",
            },
        });

        // Invalidate cache
        await redis.del(`sessions:${userId}`);

        // Log security event
        await prisma.securityEvent.create({
            data: {
                userId,
                eventType: "ALL_SESSIONS_REVOKED",
                severity: "WARNING",
                title: "Signed out everywhere",
                description: `${result.count} sessions were revoked`,
            },
        });

        return NextResponse.json({
            success: true,
            revokedCount: result.count
        });
    } catch (error) {
        console.error("Error revoking all sessions:", error);
        return NextResponse.json(
            { error: "Failed to revoke sessions" },
            { status: 500 }
        );
    }
}
