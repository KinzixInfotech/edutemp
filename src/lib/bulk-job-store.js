import redis from '@/lib/redis';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7;

function getJobKey(jobId) {
    return `bulk_job:${jobId}`;
}

export async function setBulkJob(jobId, data, ttlSeconds = DEFAULT_TTL_SECONDS) {
    await redis.set(getJobKey(jobId), JSON.stringify(data), { ex: ttlSeconds });
}

export async function getBulkJob(jobId) {
    const raw = await redis.get(getJobKey(jobId));
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function updateBulkJob(jobId, patch, ttlSeconds = DEFAULT_TTL_SECONDS) {
    const current = await getBulkJob(jobId);
    if (!current) return null;
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    await setBulkJob(jobId, next, ttlSeconds);
    return next;
}

export async function listBulkJobs({ schoolId, type } = {}) {
    const jobs = [];
    let cursor = '0';

    do {
        const result = await redis.scan(cursor, { match: 'bulk_job:*', count: 200 });
        cursor = Array.isArray(result) ? result[0] : '0';
        const keys = Array.isArray(result) ? result[1] : [];

        for (const key of keys) {
            const raw = await redis.get(key);
            if (!raw) continue;
            const job = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (schoolId && job.schoolId !== schoolId) continue;
            if (type && job.type !== type) continue;
            jobs.push(job);
        }
    } while (cursor !== '0');

    jobs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    return jobs;
}

export function createJobId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
