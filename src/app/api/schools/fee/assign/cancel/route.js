// ═══════════════════════════════════════════════════════════════
// FILE: app/api/schools/fee/assign/cancel/route.js
// Sets job status to 'cancelled' in Redis.
// Worker checks this at the start of each chunk and stops.
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getJob, updateJob } from '../route';

export async function POST(req) {
    const { jobId } = await req.json();

    if (!jobId) {
        return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const job = await getJob(jobId);
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'done') {
        return NextResponse.json({ error: 'Job already completed, cannot cancel' }, { status: 400 });
    }

    await updateJob(jobId, { status: 'cancelled' });

    return NextResponse.json({
        message: 'Job cancellation requested',
        done: job.done,
        total: job.total,
    });
}