import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseUserAgent, getClientIP, generateSessionToken } from "@/lib/device-info";

// GET - List user's active sessions
export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id"); // Set by auth middleware or context

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const sessions = await prisma.userSession.findMany({
            where: {
                userId,
                isRevoked: false,
                expiresAt: {
                    gte: new Date(), // Only active sessions
                },
            },
            orderBy: {
                lastActiveAt: "desc",
            },
        });

        return NextResponse.json({ sessions });
    } catch (error) {
        console.error("Error fetching sessions:", error);
        return NextResponse.json(
            { error: "Failed to fetch sessions" },
            { status: 500 }
        );
    }
}

// POST - Create new session (called on login)
export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, rememberMe = false, supabaseSessionToken } = body;

        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        // Parse device info from user-agent
        const userAgent = req.headers.get("user-agent") || "";
        const deviceInfo = parseUserAgent(userAgent);
        const ipAddress = getClientIP(req);

        // Generate session token
        const sessionToken = generateSessionToken();

        // Calculate expiry (30 days standard, 90 days for Remember Me)
        const expiryDays = rememberMe ? 90 : 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        // Create session
        const session = await prisma.userSession.create({
            data: {
                userId,
                sessionToken,
                refreshToken: supabaseSessionToken,
                expiresAt,
                browser: deviceInfo.browser,
                browserVersion: deviceInfo.browserVersion,
                os: deviceInfo.os,
                osVersion: deviceInfo.osVersion,
                deviceType: deviceInfo.deviceType,
                ipAddress,
                userAgent,
            },
        });

        // Check if this is a new device (different device type or OS)
        const existingSessions = await prisma.userSession.findMany({
            where: {
                userId,
                id: { not: session.id },
                isRevoked: false,
            },
            select: {
                deviceType: true,
                os: true,
                browser: true,
            },
        });

        const isNewDevice = !existingSessions.some(
            (s) =>
                s.deviceType === deviceInfo.deviceType &&
                s.os === deviceInfo.os &&
                s.browser === deviceInfo.browser
        );

        // Create security event if new device
        if (isNewDevice && existingSessions.length > 0) {
            await prisma.securityEvent.create({
                data: {
                    userId,
                    eventType: "NEW_LOGIN",
                    severity: "INFO",
                    title: "New device login",
                    description: `Logged in from ${deviceInfo.browser} on ${deviceInfo.os}`,
                    deviceInfo: `${deviceInfo.deviceType} - ${deviceInfo.browser} ${deviceInfo.browserVersion}`,
                    ipAddress,
                    userAgent,
                },
            });
        }

        return NextResponse.json({ session, isNewDevice });
    } catch (error) {
        console.error("Error creating session:", error);
        return NextResponse.json(
            { error: "Failed to create session" },
            { status: 500 }
        );
    }
}
