import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { Client } from '@upstash/qstash';

// Initialize QStash client
const qstash = new Client({
    token: process.env.QSTASH_TOKEN || 'placeholder_dev_token',
});

// Maximum number of pincodes to schedule per cron execution
const BATCH_SIZE = 20;

/**
 * GET /api/cron/atlas-import
 * Vercel Cron or QStash scheduler endpoint.
 * Fetches pending pincodes and schedules the first worker job.
 */
export async function GET(req) {
    try {
        // Enforce cron secret if configured
        const authHeader = req.headers.get('authorization');
        const internalKey = req.headers.get('x-internal-key');
        
        if (
            process.env.CRON_SECRET &&
            authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
            internalKey !== process.env.CRON_SECRET // Allow internal key for dev
        ) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[ATLAS IMPORT CRON] Starting pipeline orchestration...');

        // 1. Fetch pending pincodes that need processing
        // Order by retryCount ascending so we process fresh ones before retries
        const pendingPincodes = await prisma.importProgress.findMany({
            where: {
                status: {
                    in: ['pending', 'failed'],
                },
                retryCount: {
                    lt: 3, // Max 3 retries
                },
            },
            orderBy: [
                { status: 'desc' }, // 'pending' comes before 'failed'
                { retryCount: 'asc' },
            ],
            take: BATCH_SIZE,
            select: {
                pincode: true,
                status: true,
                retryCount: true,
            },
        });

        if (pendingPincodes.length === 0) {
            console.log('[ATLAS IMPORT CRON] No pending pincodes found. Pipeline idle.');
            return NextResponse.json({
                success: true,
                message: 'No pending pincodes found',
            });
        }

        // Extract just the pincode strings
        const pincodeList = pendingPincodes.map((p) => p.pincode);

        // 2. Create a unique job ID for this orchestrator run
        const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // 3. Store the list of pincodes in Redis for the worker to process linearly
        // TTL: 24 hours to ensure it doesn't expire while processing
        const redisKey = `atlas_import_job:${jobId}`;
        await redis.set(
            redisKey,
            JSON.stringify({
                id: jobId,
                pincodes: pincodeList,
                totalCount: pincodeList.length,
                currentIndex: 0,
                createdAt: new Date().toISOString(),
            }),
            { ex: 60 * 60 * 24 } // 24 hours
        );

        console.log(
            `[ATLAS IMPORT CRON] Created job ${jobId} with ${pincodeList.length} pincodes`
        );

        // 4. Trigger the first worker to start processing this job
        const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas.edubreezy.com'}/api/cron/atlas-import/worker`;

        if (process.env.NODE_ENV === 'development') {
            // In development, handle async locally via fetch instead of QStash
            fetch(workerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-internal-key': process.env.CRON_SECRET || 'dev-secret-key',
                },
                body: JSON.stringify({ jobId }),
            }).catch((err) =>
                console.error('[ATLAS IMPORT CRON] Dev worker trigger failed:', err)
            );
        } else {
            // In Production, use QStash to invoke the worker
            await qstash.publishJSON({
                url: workerUrl,
                body: { jobId },
                // Retries are handled by the worker logic itself
                retries: 0, 
            });
        }

        return NextResponse.json({
            success: true,
            jobId,
            pincodesQueued: pincodeList.length,
            message: 'Import job scheduled successfully',
        });
    } catch (error) {
        console.error('[ATLAS IMPORT CRON ERROR]', error);
        return NextResponse.json(
            { error: 'Failed to schedule import job' },
            { status: 500 }
        );
    }
}
