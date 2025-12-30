import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

// GET - Validate session token
export async function GET(req) {
    try {
        const token = req.headers.get('authorization')?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { valid: false, error: 'No token provided' },
                { status: 401 }
            );
        }

        // Check session in Redis
        const sessionData = await redis.get(`pay:session:${token}`);

        if (!sessionData) {
            return NextResponse.json(
                { valid: false, error: 'Session expired or invalid' },
                { status: 401 }
            );
        }

        const session = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData;

        // Check if session has expired
        if (new Date(session.expiresAt) < new Date()) {
            await redis.del(`pay:session:${token}`);
            return NextResponse.json(
                { valid: false, error: 'Session expired' },
                { status: 401 }
            );
        }

        return NextResponse.json({
            valid: true,
            session: {
                studentId: session.studentId,
                schoolId: session.schoolId,
                academicYearId: session.academicYearId,
                expiresAt: session.expiresAt,
            }
        });

    } catch (error) {
        console.error('[PAY SESSION VALIDATE ERROR]', error);
        return NextResponse.json(
            { valid: false, error: 'Validation failed' },
            { status: 500 }
        );
    }
}

// DELETE - Logout (invalidate session)
export async function DELETE(req) {
    try {
        const token = req.headers.get('authorization')?.replace('Bearer ', '');

        if (token) {
            await redis.del(`pay:session:${token}`);
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[PAY SESSION DELETE ERROR]', error);
        return NextResponse.json(
            { error: 'Logout failed' },
            { status: 500 }
        );
    }
}
