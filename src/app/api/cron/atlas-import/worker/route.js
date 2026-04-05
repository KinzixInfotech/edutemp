import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { Client } from '@upstash/qstash';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import {
    fetchSchoolsByPincode,
    transformSchool,
    isOperational,
} from '@/lib/udise-client';
import { generateSchoolSlug, generateUniqueSlug } from '@/lib/slug-generator';

const qstash = new Client({
    token: process.env.QSTASH_TOKEN || 'placeholder_dev_token',
});

// Process up to 5 pincodes per worker invocation to avoid timeouts
const CHUNK_SIZE = 5;

// The actual worker logic wrapped in the QStash verification wrapper
async function handler(req) {
    try {
        // Enforce internal auth for direct calls in dev
        if (
            process.env.NODE_ENV === 'development' &&
            req.headers.get('x-internal-key') !==
            (process.env.CRON_SECRET || 'dev-secret-key')
        ) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get job details from payload
        const body = await req.json();
        const { jobId } = body;

        if (!jobId) {
            return NextResponse.json(
                { error: 'Missing jobId in payload' },
                { status: 400 }
            );
        }

        // 1. Fetch job state from Redis
        const redisKey = `atlas_import_job:${jobId}`;
        const jobDataRaw = await redis.get(redisKey);

        if (!jobDataRaw) {
            console.error(`[ATLAS WORKER] Job ${jobId} not found in Redis or expired.`);
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        // Upstash Redis SDK auto-parses JSON, but just in case:
        const jobData =
            typeof jobDataRaw === 'string' ? JSON.parse(jobDataRaw) : jobDataRaw;

        const { pincodes, currentIndex, totalCount } = jobData;

        if (currentIndex >= totalCount) {
            console.log(`[ATLAS WORKER] Job ${jobId} already completed.`);
            return NextResponse.json({ success: true, message: 'Job already completed' });
        }

        // 2. Slice the chunk to process in this invocation
        const chunk = pincodes.slice(currentIndex, currentIndex + CHUNK_SIZE);
        console.log(
            `[ATLAS WORKER] Processing chunk of size ${chunk.length} for job ${jobId} (indices ${currentIndex} to ${currentIndex + chunk.length - 1
            })`
        );

        let processedCount = 0;

        // 3. Process each pincode in the chunk sequentially
        for (const pincode of chunk) {
            try {
                // Mark passing as running in DB
                await prisma.importProgress.update({
                    where: { pincode },
                    data: {
                        status: 'running',
                        lastRunAt: new Date(),
                        retryCount: { increment: 1 },
                    },
                });

                console.log(`[ATLAS WORKER] Fetching schools for pincode: ${pincode}`);

                // Fetch data from UDISE API
                const apiData = await fetchSchoolsByPincode(pincode, 2);

                if (!apiData || !apiData.data || !Array.isArray(apiData.data.content)) {
                    throw new Error('Invalid or empty response format from UDISE API');
                }

                // Filter operational schools
                const operationalSchools = apiData.data.content.filter(isOperational);
                console.log(`[ATLAS WORKER] Found ${operationalSchools.length} operational schools out of ${apiData.data.content.length} total.`);

                let importedCount = 0;

                // Process each operational school
                for (const apiSchool of operationalSchools) {
                    try {
                        const baseSlug = generateSchoolSlug(
                            apiSchool.schoolName,
                            apiSchool.districtName
                        );

                        // First try to find if public profile exists to avoid slug collision logic if it's just an update
                        const existingSchool = await prisma.school.findUnique({
                            where: { schoolCode: apiSchool.udiseschCode.toString() },
                        });

                        let uniqueSlug = baseSlug;

                        if (!existingSchool) {
                            // Find existing slugs for collision handling
                            const existingSlugsRecords = await prisma.schoolPublicProfile.findMany({
                                where: {
                                    slug: { startsWith: baseSlug },
                                },
                                select: { slug: true },
                            });
                            const existingSlugs = existingSlugsRecords.map((r) => r.slug);
                            uniqueSlug = generateUniqueSlug(baseSlug, existingSlugs);
                        }

                        // Transform the payload
                        const { school: schoolData, profile: profileData } =
                            transformSchool(apiSchool, uniqueSlug);

                        // Upsert School and PublicProfile
                        // Note: Using upsert on School guarantees the record exists
                        // The profile is attached separately.
                        const upsertedSchool = await prisma.school.upsert({
                            where: { schoolCode: schoolData.schoolCode || 'invalid-code' },
                            update: {
                                ...schoolData, // Update mapped fields if it exists
                            },
                            create: {
                                ...schoolData, // Create new if missing
                                publicProfile: {
                                    create: {
                                        ...profileData,
                                    },
                                },
                            },
                        });

                        // If the school existed but the profile didn't get created in the upsert,
                        // ensure the profile exists (mostly for existing records without profiles).
                        if (existingSchool) {
                            await prisma.schoolPublicProfile.upsert({
                                where: { schoolId: upsertedSchool.id },
                                update: {
                                    isPubliclyVisible: true,
                                    // Optional: update description or other profile fields if we want UDISE to overwrite
                                },
                                create: {
                                    schoolId: upsertedSchool.id,
                                    slug: uniqueSlug,
                                    ...profileData,
                                },
                            });
                        }

                        importedCount++;
                    } catch (schoolError) {
                        console.error(
                            `[ATLAS WORKER] Failed to ingest school ${apiSchool.udiseschCode}:`,
                            schoolError
                        );
                    }
                }

                // Update progress tracking for this pincode
                await prisma.importProgress.update({
                    where: { pincode },
                    data: {
                        status: 'completed',
                        lastSchoolCount: importedCount,
                        errorMessage: null,
                    },
                });

                processedCount++;

                // Rate limit against UDISE API between pincodes
                await new Promise((resolve) => setTimeout(resolve, 1000));
            } catch (err) {
                console.error(`[ATLAS WORKER] Failed processing pincode ${pincode}:`, err);

                // Mark progress to failed so it can be retried in a future job
                await prisma.importProgress.update({
                    where: { pincode },
                    data: {
                        status: 'failed',
                        errorMessage: err.message || 'Unknown error',
                    },
                });
            }
        }

        // 4. Update the job state in Redis
        const nextIndex = currentIndex + CHUNK_SIZE;
        jobData.currentIndex = nextIndex;

        await redis.set(
            redisKey,
            JSON.stringify(jobData),
            { ex: 60 * 60 * 24 } // maintain 24h TTL
        );

        // 5. Self-chain via QStash if there are more pincodes
        if (nextIndex < totalCount) {
            console.log(
                `[ATLAS WORKER] Chunk complete. Queuing next chunk starting at ${nextIndex}.`
            );

            const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://atlas.edubreezy.com'
                }/api/cron/atlas-import/worker`;

            if (process.env.NODE_ENV === 'development') {
                // Dev async self-chaining
                fetch(workerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-internal-key': process.env.CRON_SECRET || 'dev-secret-key',
                    },
                    body: JSON.stringify({ jobId }),
                }).catch((err) =>
                    console.error('[ATLAS WORKER] Dev next-chunk trigger failed:', err)
                );
            } else {
                // Production QStash chaining
                await qstash.publishJSON({
                    url: workerUrl,
                    body: { jobId },
                    retries: 0,
                });
            }
        } else {
            console.log(`[ATLAS WORKER] Job ${jobId} completely finished.`);
            // Clean up Redis state
            await redis.del(redisKey);
        }

        return NextResponse.json({
            success: true,
            jobId,
            processedCount,
            progress: `${Math.min(nextIndex, totalCount)}/${totalCount}`,
        });
    } catch (error) {
        console.error('[ATLAS WORKER ROOT ERROR]', error);
        return NextResponse.json(
            { error: 'Worker unhandled failure' },
            { status: 500 }
        );
    }
}

// In production, QStash signature verification wrapper around the handler
export const POST =
    process.env.NODE_ENV === 'development'
        ? handler
        : verifySignatureAppRouter(handler);

// Force dynamic execution for background tasks
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minute max duration per Vercel chunk constraints
