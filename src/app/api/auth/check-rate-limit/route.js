import { NextResponse } from 'next/server';
import { isIPBlocked, getRemainingAttempts } from '@/lib/rate-limit';

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

export async function GET(request) {
    try {
        const ipAddress = getClientIP(request);

        const blocked = await isIPBlocked(ipAddress);
        const remaining = await getRemainingAttempts(ipAddress);

        return NextResponse.json({
            blocked,
            attemptsRemaining: remaining,
        });
    } catch (error) {
        console.error('Rate limit check error:', error);
        return NextResponse.json(
            { error: 'Failed to check rate limit' },
            { status: 500 }
        );
    }
}
