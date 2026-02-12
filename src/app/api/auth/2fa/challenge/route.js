import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { decryptSecret, verifyToken, verifyBackupCode } from "@/lib/totp";
import redis from "@/lib/redis";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 900; // 15 minutes

export async function POST(req) {
    try {
        const body = await req.json();
        const { userId, code } = body;

        if (!userId || !code) {
            return NextResponse.json({ error: "Missing userId or code" }, { status: 400 });
        }

        // Rate limit check (Redis) — skip in dev mode
        const rateLimitKey = `2fa:attempts:${userId}`;
        const isDev = process.env.NODE_ENV === 'development';
        if (!isDev) {
            try {
                const attempts = await redis.get(rateLimitKey);
                if (attempts && parseInt(attempts) >= MAX_ATTEMPTS) {
                    return NextResponse.json({
                        error: "Too many failed attempts. Please try again in 15 minutes.",
                        locked: true,
                    }, { status: 429 });
                }
            } catch (e) {
                console.warn("Redis unavailable for 2FA rate limiting:", e.message);
            }
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                twoFactorEnabled: true,
                twoFactorSecret: true,
                twoFactorBackupCodes: true,
            },
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return NextResponse.json({ error: "2FA is not configured for this account" }, { status: 400 });
        }

        const secret = decryptSecret(user.twoFactorSecret);
        const trimmedCode = code.trim();

        // Try TOTP verification first (6-digit code)
        if (/^\d{6}$/.test(trimmedCode)) {
            const isValid = await verifyToken(secret, trimmedCode);
            if (isValid) {
                // Reset rate limit on success
                try { await redis.del(rateLimitKey); } catch { }
                return NextResponse.json({ success: true });
            }
        }

        // Try backup code (8-char hex)
        if (/^[A-Fa-f0-9]{8}$/.test(trimmedCode)) {
            const { valid, remaining } = verifyBackupCode(trimmedCode, user.twoFactorBackupCodes);
            if (valid) {
                // Update remaining backup codes
                await prisma.user.update({
                    where: { id: userId },
                    data: { twoFactorBackupCodes: remaining },
                });
                // Reset rate limit on success
                try { await redis.del(rateLimitKey); } catch { }
                return NextResponse.json({
                    success: true,
                    backupCodeUsed: true,
                    remainingBackupCodes: remaining.length,
                });
            }
        }

        // Failed — increment rate limit (skip in dev)
        if (!isDev) {
            try {
                const current = await redis.incr(rateLimitKey);
                if (current === 1) {
                    await redis.expire(rateLimitKey, LOCKOUT_SECONDS);
                }
            } catch { }
        }

        return NextResponse.json({ error: "Invalid code. Please try again." }, { status: 401 });
    } catch (err) {
        console.error("2FA challenge error:", err);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
