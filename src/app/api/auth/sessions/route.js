import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { parseUserAgent, getClientIP, generateSessionToken, getGeoLocation } from "@/lib/device-info";
import redis from "@/lib/redis";

// GET - List user's active sessions
export async function GET(req) {
    try {
        const userId = req.headers.get("x-user-id"); // Set by auth middleware or context

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUA = req.headers.get("user-agent") || "";
        const CACHE_KEY = `sessions:${userId}`;

        // Helper to deduplicate sessions by User Agent
        const deduplicateSessions = (sessionList) => {
            const seenUAs = new Set();
            return sessionList.filter(session => {
                if (seenUAs.has(session.userAgent)) {
                    return false;
                }
                seenUAs.add(session.userAgent);
                return true;
            });
        };

        // Try to fetch from Redis cache
        const cachedSessions = await redis.get(CACHE_KEY);
        if (cachedSessions) {
            // Deduplicate cached sessions too just in case
            const uniqueSessions = deduplicateSessions(cachedSessions);
            // Mark current session dynamically even on cached data
            const sessionsWithCurrent = uniqueSessions.map(s => ({
                ...s,
                isCurrent: s.userAgent === currentUA
            }));
            return NextResponse.json({ sessions: sessionsWithCurrent });
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

        // Deduplicate before caching/returning
        // Since we order by lastActiveAt desc, the first one is the latest -> keep it.
        const uniqueSessions = deduplicateSessions(sessions);

        // Cache the *deduplicated* result for 10 minutes
        await redis.set(CACHE_KEY, uniqueSessions, { ex: 600 });

        // Add isCurrent flag
        const sessionsWithCurrent = uniqueSessions.map(s => ({
            ...s,
            isCurrent: s.userAgent === currentUA
        }));

        return NextResponse.json({ sessions: sessionsWithCurrent });
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

        // Fetch Geolocation
        const location = await getGeoLocation(ipAddress);

        // Calculate expiry (30 days standard, 90 days for Remember Me)
        const expiryDays = rememberMe ? 90 : 30;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiryDays);

        let session;
        let isNewDevice = false;

        // 1. Check for existing active session to reuse
        const existingSession = await prisma.userSession.findFirst({
            where: {
                userId,
                userAgent, // Same browser instance
                isRevoked: false,
                expiresAt: { gt: new Date() }
            }
        });

        if (existingSession) {
            // Update existing session
            session = await prisma.userSession.update({
                where: { id: existingSession.id },
                data: {
                    refreshToken: supabaseSessionToken, // Update Supabase token
                    ipAddress,
                    location,
                    lastActiveAt: new Date(),
                    expiresAt, // Extend expiry
                    // Update device info in case it changed (e.g. browser update)
                    browser: deviceInfo.browser,
                    browserVersion: deviceInfo.browserVersion,
                    os: deviceInfo.os,
                    osVersion: deviceInfo.osVersion,
                    // Keep original deviceName if custom, or update if it was default
                }
            });
            // Not a new device, so isNewDevice remains false
        } else {
            // Generate session token
            const sessionToken = generateSessionToken();

            // Create new session
            session = await prisma.userSession.create({
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
                    location: location,
                    deviceName: deviceInfo.deviceModel || deviceInfo.os, // Save specific model or OS as default name
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

            isNewDevice = !existingSessions.some(
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
        }

        // Invalidate cache
        await redis.del(`sessions:${userId}`);

        return NextResponse.json({ session, isNewDevice });
    } catch (error) {
        console.error("Error creating session:", error);
        return NextResponse.json(
            { error: "Failed to create session" },
            { status: 500 }
        );
    }
}

export async function DELETE(req, { params }) {
    // Handling single revoke here if routing allows methods in same file or separate dynamic route
    // But this file is /api/auth/sessions/route.js, usually handles collection.
    // The revoke ID logic is likely in /api/auth/sessions/[sessionId]/route.js.
    // I need to confirm if I need to update that file too for cache invalidation.
    return NextResponse.json({ error: "Method not allowed here" }, { status: 405 });
}
