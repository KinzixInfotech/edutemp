import { processNotificationJob } from '@/lib/notifications/notificationHelper';
import { NextResponse } from 'next/server';

// Optional: verify QStash signature
// import { verifySignature } from "@upstash/qstash/dist/nextjs";

export const POST = async (request) => {
    try {
        const body = await request.json();
        console.log('[Worker] Processing notification job:', body?.title || 'Unknown');

        // Call the heavy processing logic
        const result = await processNotificationJob(body);

        return NextResponse.json(result);
    } catch (error) {
        console.error('[Worker] Job failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
};

// If using QStash signature verification (recommended for production):
// export const POST = verifySignature(handler);

export const dynamic = 'force-dynamic';
