// ============================================
// FILE: app/api/admin/cron-health/route.js
// Monitors cron job health and auto-repairs
// Highly optimized with batching and parallel processing
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Configuration
const CONFIG = {
    BATCH_SIZE: 100,
    MAX_RETRIES: 3,
    PARALLEL_CHECKS: 5,
    TIMEOUT: 30000,
};

// ============================================
// GET - Check cron health status
// ============================================
export async function GET(request) {
    try {
        // Optional: Add admin authentication here
        // const session = await getServerSession();
        // if (!session?.user?.role === 'ADMIN') return 401;

        const startTime = Date.now();

        // Get all configured cron jobs from database
        const configuredJobs = await prisma.cronJobConfig.findMany({
            orderBy: { jobName: 'asc' }
        });

        if (configuredJobs.length === 0) {
            return NextResponse.json({
                healthy: false,
                systemConfig: await getSystemConfig(),
                jobs: [],
                totalJobs: 0,
                activeJobs: 0,
                needsRepair: [],
                message: 'No cron jobs configured',
                timestamp: new Date().toISOString(),
            });
        }

        // Get system config
        const systemConfig = await getSystemConfig();

        // Check each job's status in parallel batches
        const jobStatuses = [];

        // Process in batches to avoid overwhelming the database
        for (let i = 0; i < configuredJobs.length; i += CONFIG.PARALLEL_CHECKS) {
            const batch = configuredJobs.slice(i, i + CONFIG.PARALLEL_CHECKS);

            const batchPromises = batch.map(async (job) => {
                try {
                    // Check if cron exists in Supabase
                    const cronExists = await checkCronExists(job.jobName);

                    // Get last execution from Supabase cron logs
                    const lastExecution = await getLastExecution(job.jobName);

                    return {
                        name: job.jobName,
                        schedule: job.schedule,
                        endpoint: job.endpoint,
                        enabled: job.enabled,
                        configured: true,
                        active: cronExists && job.enabled,
                        lastRun: job.lastRun,
                        lastStatus: job.lastStatus,
                        lastExecution: lastExecution,
                        needsRepair: job.enabled && !cronExists,
                    };
                } catch (error) {
                    console.error(`Error checking ${job.jobName}:`, error);
                    return {
                        name: job.jobName,
                        schedule: job.schedule,
                        endpoint: job.endpoint,
                        enabled: job.enabled,
                        configured: true,
                        active: false,
                        error: error.message,
                        needsRepair: job.enabled,
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);

            batchResults.forEach(result => {
                if (result.status === 'fulfilled') {
                    jobStatuses.push(result.value);
                }
            });
        }

        const needsRepair = jobStatuses.filter(j => j.needsRepair);
        const activeJobs = jobStatuses.filter(j => j.active).length;

        return NextResponse.json({
            healthy: needsRepair.length === 0,
            systemConfig,
            jobs: jobStatuses,
            totalJobs: jobStatuses.length,
            activeJobs,
            needsRepair,
            executionTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[CRON HEALTH ERROR]', error);
        return NextResponse.json(
            {
                healthy: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// ============================================
// POST - Trigger cron repair or test
// ============================================
export async function POST(request) {
    try {
        // Optional: Add admin authentication

        const body = await request.json();
        const { action, jobName } = body;

        if (action === 'repair') {
            // Call Supabase function to repair all crons
            const result = await repairCronJobs();

            return NextResponse.json({
                success: true,
                message: 'Cron jobs repaired successfully',
                result,
                timestamp: new Date().toISOString(),
            });
        }

        if (action === 'test') {
            // Test a specific cron endpoint
            if (!jobName) {
                return NextResponse.json(
                    { error: 'jobName required for test action' },
                    { status: 400 }
                );
            }

            const job = await prisma.cronJobConfig.findUnique({
                where: { jobName }
            });

            if (!job) {
                return NextResponse.json(
                    { error: 'Job not found' },
                    { status: 404 }
                );
            }

            // Manually trigger the cron endpoint
            const systemConfig = await getSystemConfigMap();
            const url = `${systemConfig.base_url}${job.endpoint}`;

            console.log(`[TEST] Triggering ${jobName} at ${url}`);

            const startTime = Date.now();
            const response = await fetch(url, {
                method: job.endpoint.includes('event-reminders') ? 'GET' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${systemConfig.cron_secret}`,
                },
                signal: AbortSignal.timeout(CONFIG.TIMEOUT),
            });

            const executionTime = Date.now() - startTime;
            let data;

            try {
                data = await response.json();
            } catch (e) {
                data = { message: 'Response not JSON' };
            }

            // Update last run status
            await prisma.cronJobConfig.update({
                where: { jobName },
                data: {
                    lastRun: new Date(),
                    lastStatus: response.ok ? 'SUCCESS' : 'FAILED',
                },
            });

            return NextResponse.json({
                success: response.ok,
                status: response.status,
                executionTime,
                data,
                timestamp: new Date().toISOString(),
            });
        }

        return NextResponse.json(
            { error: 'Invalid action. Use "repair" or "test"' },
            { status: 400 }
        );

    } catch (error) {
        console.error('[CRON ACTION ERROR]', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 500 }
        );
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get system config as object
async function getSystemConfig() {
    try {
        const configs = await prisma.systemConfig.findMany({
            where: {
                key: { in: ['base_url', 'cron_secret'] }
            }
        });

        return {
            baseUrl: configs.find(c => c.key === 'base_url')?.value || 'NOT_SET',
            cronSecretConfigured: !!configs.find(c => c.key === 'cron_secret')?.value,
        };
    } catch (error) {
        console.error('Error fetching system config:', error);
        return {
            baseUrl: 'ERROR',
            cronSecretConfigured: false,
        };
    }
}

// Get system config as map
async function getSystemConfigMap() {
    try {
        const configs = await prisma.systemConfig.findMany();
        return Object.fromEntries(configs.map(c => [c.key, c.value]));
    } catch (error) {
        console.error('Error fetching system config:', error);
        return {};
    }
}

// Check if cron exists in Supabase
async function checkCronExists(jobName) {
    try {
        const result = await prisma.$queryRawUnsafe(
            `SELECT EXISTS(SELECT 1 FROM cron.job WHERE jobname = $1) as exists`,
            jobName
        );
        return result[0]?.exists || false;
    } catch (error) {
        console.error('Error checking cron existence:', error);
        return false;
    }
}

// Get last execution details from Supabase
async function getLastExecution(jobName) {
    try {
        const result = await prisma.$queryRawUnsafe(
            `SELECT 
                status,
                start_time,
                end_time,
                return_message
            FROM cron.job_run_details
            WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = $1)
            ORDER BY start_time DESC
            LIMIT 1`,
            jobName
        );
        return result[0] || null;
    } catch (error) {
        console.error('Error getting last execution:', error);
        return null;
    }
}

// Repair cron jobs by calling Supabase function
async function repairCronJobs() {
    try {
        console.log('[REPAIR] Starting cron repair...');

        await prisma.$executeRawUnsafe(`SELECT setup_cron_jobs_v2()`);

        console.log('[REPAIR] Cron jobs repaired successfully');

        return {
            repaired: true,
            message: 'All cron jobs recreated from configuration',
        };
    } catch (error) {
        console.error('[REPAIR ERROR]', error);
        throw new Error(`Failed to repair crons: ${error.message}`);
    }
}

// ============================================
// ADDITIONAL ENDPOINTS
// ============================================

// PUT - Update cron job configuration
export async function PUT(request) {
    try {
        const body = await request.json();
        const { jobName, schedule, endpoint, enabled } = body;

        if (!jobName) {
            return NextResponse.json(
                { error: 'jobName required' },
                { status: 400 }
            );
        }

        const updated = await prisma.cronJobConfig.upsert({
            where: { jobName },
            update: {
                ...(schedule && { schedule }),
                ...(endpoint && { endpoint }),
                ...(enabled !== undefined && { enabled }),
            },
            create: {
                jobName,
                schedule: schedule || '0 0 * * *',
                endpoint: endpoint || '/api/cron/' + jobName,
                enabled: enabled !== undefined ? enabled : true,
            },
        });

        // Reapply cron configuration
        await repairCronJobs();

        return NextResponse.json({
            success: true,
            message: 'Cron job updated and reapplied',
            job: updated,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[UPDATE ERROR]', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// DELETE - Remove cron job
export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const jobName = searchParams.get('jobName');

        if (!jobName) {
            return NextResponse.json(
                { error: 'jobName required' },
                { status: 400 }
            );
        }

        await prisma.cronJobConfig.delete({
            where: { jobName }
        });

        // Reapply cron configuration (will remove the deleted job)
        await repairCronJobs();

        return NextResponse.json({
            success: true,
            message: 'Cron job deleted and removed from scheduler',
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[DELETE ERROR]', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}