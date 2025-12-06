import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import redis from "@/lib/redis";

// DELETE - Revoke specific session
export async function DELETE(req, props) {
    const params = await props.params;
    try {
        const { sessionId } = params;
        const userId = req.headers.get("x-user-id");

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify session belongs to user
        const session = await prisma.userSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.userId !== userId) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Revoke session
        await prisma.userSession.update({
            where: { id: sessionId },
            data: {
                isRevoked: true,
                revokedAt: new Date(),
                revokedReason: "User revoked",
            },
        });

        // Invalidate cache
        await redis.del(`sessions:${userId}`);

        // Log security event
        await prisma.securityEvent.create({
            data: {
                userId,
                eventType: "SESSION_REVOKED",
                severity: "INFO",
                title: "Session revoked",
                description: `Session on ${session.deviceType} was revoked`,
                deviceInfo: `${session.browser} on ${session.os}`,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error revoking session:", error);
        return NextResponse.json(
            { error: "Failed to revoke session" },
            { status: 500 }
        );
    }
}

// PATCH - Update session (e.g., rename device)
export async function PATCH(req, props) {
    const params = await props.params;
    try {
        const { sessionId } = params;
        const userId = req.headers.get("x-user-id");
        const body = await req.json();
        const { deviceName } = body;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify session belongs to user
        const session = await prisma.userSession.findUnique({
            where: { id: sessionId },
        });

        if (!session || session.userId !== userId) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // Update session
        const updatedSession = await prisma.userSession.update({
            where: { id: sessionId },
            data: {
                deviceName,
                lastActiveAt: new Date(),
            },
        });

        // Invalidate cache
        await redis.del(`sessions:${userId}`);

        return NextResponse.json({ session: updatedSession });
    } catch (error) {
        console.error("Error updating session:", error);
        return NextResponse.json(
            { error: "Failed to update session" },
            { status: 500 }
        );
    }
}
