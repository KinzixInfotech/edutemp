import { processNotificationJob } from '@/lib/notifications/notificationHelper';
import { NextResponse } from 'next/server';

// Optional: verify QStash signature
// import { verifySignature } from "@upstash/qstash/dist/nextjs";

export const POST = async (request) => {
    try {
        const body = await request.json();
        const attemptLabel = body?.retryAttempt ? ` (retry ${body.retryAttempt})` : '';
        console.log(`[Worker] Processing notification job${attemptLabel}:`, body?.title || 'Unknown');

        // Call the heavy processing logic
        const result = await processNotificationJob(body);

        // If retry was scheduled, return 200 so QStash doesn't double-retry
        if (result?.retryScheduled) {
            return NextResponse.json({ ...result, message: 'Retry scheduled' });
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Worker] Job failed:', error);
        // Return 200 to prevent QStash from retrying on its own
        // (our own retry logic handles transient failures)
        return NextResponse.json({ error: error.message, failed: true }, { status: 200 });
    }
};

// If using QStash signature verification (recommended for production):
// export const POST = verifySignature(handler);

export const dynamic = 'force-dynamic';
