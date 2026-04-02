import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import qstash from '@/lib/qstash';
import prisma from '@/lib/prisma';
import { getJob, updateJob } from '../route';

const CHUNK_SIZE = 10;
const IS_DEV = process.env.NODE_ENV === 'development';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';

async function handleWorker(req) {
    const { jobId } = await req.json();

    if (!jobId) {
        return NextResponse.json({ error: 'jobId required' }, { status: 400 });
    }

    const job = await getJob(jobId);
    if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'done' || job.status === 'error') {
        return NextResponse.json({ message: 'Job already complete' });
    }

    // Cancelled by user
    if (job.status === 'cancelled') {
        return NextResponse.json({ message: 'Job cancelled', done: job.done, total: job.total });
    }

    const { profiles, processedCount } = job;
    const start = processedCount || 0;
    const chunk = profiles.slice(start, start + CHUNK_SIZE);

    if (!chunk.length) {
        await updateJob(jobId, { status: 'done' });
        return NextResponse.json({ message: 'All done' });
    }

    let chunkDone = 0;
    let chunkFailed = 0;
    const errors = job.errors || [];

    for (const profile of chunk) {
        try {
            if (!profile.schoolId) {
                throw new Error("Missing schoolId");
            }
            // Upsert public profile
            await prisma.schoolPublicProfile.upsert({
                where: { schoolId: profile.schoolId },
                update: {
                    ...profile,
                    schoolId: undefined, // remove from update body
                    updatedAt: new Date()
                },
                create: {
                    ...profile,
                }
            });
            chunkDone++;
        } catch (err) {
            chunkFailed++;
            errors.push({ schoolId: profile.schoolId || 'unknown', message: err.message });
            console.error(`[AtlasBulk Worker] Failed for ${profile.schoolId}:`, err.message);
        }
    }

    const newProcessed = start + chunk.length;
    const newDone = (job.done || 0) + chunkDone;
    const newFailed = (job.failed || 0) + chunkFailed;
    const allDone = newProcessed >= profiles.length;

    await updateJob(jobId, {
        done: newDone,
        failed: newFailed,
        processedCount: newProcessed,
        status: allDone ? 'done' : 'running',
        errors
    });

    if (!allDone) {
        const base = process.env.APP_URL || 'https://www.edubreezy.com';
        const workerUrl = `${base}/api/edubreezyatlas/bulk/worker`;

        if (IS_DEV) {
            fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': INTERNAL_KEY,
                },
                body: JSON.stringify({ jobId }),
            }).catch(e => console.error('[AtlasBulk Worker Chain failed]:', e));
        } else {
            await qstash.publishJSON({
                url: workerUrl,
                body: { jobId },
                retries: 3,
            });
        }
    }

    return NextResponse.json({
        chunk: chunk.length,
        done: newDone,
        failed: newFailed,
        remaining: profiles.length - newProcessed,
        status: allDone ? 'done' : 'running',
    });
}

export async function POST(req) {
    if (IS_DEV) {
        const key = req.headers.get('x-internal-key');
        if (key !== INTERNAL_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        return handleWorker(req);
    }
    return verifySignatureAppRouter(handleWorker)(req);
}
