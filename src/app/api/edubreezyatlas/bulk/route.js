import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import qstash from '@/lib/qstash';

const JOB_TTL = 60 * 60 * 2; // 2 hours

export async function setJob(jobId, data) {
    await redis.set(`atlas_bulk_job:${jobId}`, JSON.stringify(data), { ex: JOB_TTL });
}

export async function getJob(jobId) {
    const raw = await redis.get(`atlas_bulk_job:${jobId}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function updateJob(jobId, patch) {
    const job = await getJob(jobId);
    if (!job) return;
    await setJob(jobId, { ...job, ...patch });
}

// ── POST /api/edubreezyatlas/bulk ─────────────────────────────
export async function POST(req) {
    try {
        const body = await req.json();
        const { profiles } = body;

        if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
            return NextResponse.json({ error: 'No profiles provided' }, { status: 400 });
        }

        const jobId = `atlasbulk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        await setJob(jobId, {
            jobId,
            status: 'running',
            total: profiles.length,
            done: 0,
            failed: 0,
            processedCount: 0,
            profiles,
            startedAt: Date.now(),
            errors: [] // Store array of { schoolId, message }
        });

        // ── Kick worker ──────────────────────────────────────────
        const base = process.env.APP_URL || 'https://www.edubreezy.com';
        const workerUrl = `${base}/api/edubreezyatlas/bulk/worker`;
        const isDev = process.env.NODE_ENV === 'development';

        if (isDev) {
            // Local dev: QStash can't reach localhost
            fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': process.env.INTERNAL_API_KEY || 'edubreezy_internal',
                },
                body: JSON.stringify({ jobId }),
            }).catch(e => console.error('[AtlasBulk Worker kick failed]', e));
        } else {
            // Prod: QStash (handles retries)
            await qstash.publishJSON({
                url: workerUrl,
                body: { jobId },
                retries: 3,
            });
        }

        return NextResponse.json({
            jobId,
            total: profiles.length,
            status: 'running',
        });

    } catch (error) {
        console.error('[AtlasBulk POST Error]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
