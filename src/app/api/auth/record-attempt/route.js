import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordFailedAttempt, clearFailedAttempts } from '@/lib/rate-limit';

// Helper to get client IP
function getClientIP(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }

    if (realIP) {
        return realIP;
    }

    return 'unknown';
}

export async function POST(request) {
    try {
        const { email, success, reason, schoolCode } = await request.json();
        const ipAddress = getClientIP(request);
        const userAgent = request.headers.get('user-agent') || 'unknown';

        let schoolId = null;
        if (schoolCode) {
            const school = await prisma.school.findUnique({
                where: { schoolCode },
                select: { id: true },
            });
            schoolId = school?.id;
        }

        // Record in database
        await prisma.loginAttempt.create({
            data: {
                email,
                ipAddress,
                success,
                reason,
                schoolId,
                userAgent,
            },
        });

        // Handle rate limiting
        if (success) {
            // Clear failed attempts on successful login
            await clearFailedAttempts(ipAddress);
        } else {
            // Record failed attempt for rate limiting
            const result = await recordFailedAttempt(ipAddress, email, reason);

            return NextResponse.json({
                recorded: true,
                blocked: result.blocked,
                attemptsRemaining: result.attemptsRemaining,
            });
        }

        return NextResponse.json({ recorded: true });
    } catch (error) {
        console.error('Record attempt error:', error);
        return NextResponse.json(
            { error: 'Failed to record attempt' },
            { status: 500 }
        );
    }
}
