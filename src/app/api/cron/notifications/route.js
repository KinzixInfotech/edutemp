/**
 * Cron Notifications API
 * 
 * Endpoint called by Supabase pg_cron every 5 minutes
 * Processes all role-based notifications with rate limiting
 * 
 * Usage: 
 * - pg_cron: SELECT net.http_get('https://yourapp.com/api/cron/notifications?secret=XXX')
 * - Manual: GET /api/cron/notifications?secret=XXX
 */

import { NextResponse } from 'next/server';
import { processCronNotifications } from '@/lib/cron/cron-notification-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds for processing

export async function GET(req) {
    const startTime = Date.now();

    try {
        // Verify cron secret
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        const authHeader = req.headers.get('authorization');

        const expectedSecret = process.env.CRON_SECRET;

        // Check secret from query param or Authorization header
        const providedSecret = secret || authHeader?.replace('Bearer ', '');

        if (!expectedSecret || providedSecret !== expectedSecret) {
            console.warn('[CronNotifications] Unauthorized access attempt');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('[CronNotifications] Starting cron job...');

        // Process all notifications
        const stats = await processCronNotifications();

        const duration = Date.now() - startTime;

        console.log(`[CronNotifications] Completed in ${duration}ms`, stats);

        return NextResponse.json({
            success: true,
            duration: `${duration}ms`,
            stats
        });

    } catch (error) {
        console.error('[CronNotifications] Error:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            duration: `${Date.now() - startTime}ms`
        }, { status: 500 });
    }
}

// Also support POST for flexibility
export async function POST(req) {
    return GET(req);
}
