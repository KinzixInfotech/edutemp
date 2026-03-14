// ============================================
// POST /api/users/heartbeat - Update user's last seen timestamp
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/api-auth';

/**
 * POST - Update lastSeenAt for the authenticated user.
 * This is called periodically (e.g. every 60s) from the app.
 */
export async function POST(req) {
    const auth = await verifyAuth(req);
    if (auth.error) return auth.response;

    try {
        await prisma.user.update({
            where: { id: auth.supabaseUser.id },
            data: { lastSeenAt: new Date() },
        });

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Heartbeat error:', error);
        return NextResponse.json(
            { error: 'Failed to update heartbeat' },
            { status: 500 }
        );
    }
}
