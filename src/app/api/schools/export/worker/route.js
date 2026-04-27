import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { getBulkJob, updateBulkJob } from '@/lib/bulk-job-store';
import { generateFileKey, uploadToR2 } from '@/lib/r2';
import { EXPORT_CONFIGS } from '../../[schoolId]/export/route';

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';
const IS_DEV = process.env.NODE_ENV === 'development';

async function handleWorker(req) {
    const { jobId } = await req.json();
    if (!jobId) {
        return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = await getBulkJob(jobId);
    if (!job || job.type !== 'export') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'completed') {
        return NextResponse.json({ success: true, message: 'Job already completed' });
    }

    try {
        const workbook = XLSX.utils.book_new();
        const stats = [];

        for (const moduleId of job.modules) {
            const config = EXPORT_CONFIGS[moduleId];
            if (!config) continue;

            const data = await config.fetchFn(job.schoolId);
            const headers = config.fields.map((field) => field.label);
            const rows = data.map((item) => config.fields.map((field) => {
                const value = item[field.key];
                if (value instanceof Date) return value.toISOString().split('T')[0];
                return value || '';
            }));

            XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), config.name.substring(0, 31));
            stats.push({ module: moduleId, name: config.name, recordCount: data.length });
        }

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        const key = generateFileKey(`export-${Date.now()}.xlsx`, { folder: 'documents', subFolder: 'exports', schoolId: job.schoolId });
        const fileUrl = await uploadToR2(key, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        const updated = await updateBulkJob(jobId, {
            status: 'completed',
            processedModules: job.totalModules,
            fileUrl,
            stats,
        });

        return NextResponse.json({ success: true, job: updated });
    } catch (error) {
        console.error('[EXPORT WORKER ERROR]', error);
        await updateBulkJob(jobId, { status: 'failed', error: error.message });
        return NextResponse.json({ error: error.message || 'Worker failed' }, { status: 500 });
    }
}

export async function POST(req) {
    if (IS_DEV) {
        if (req.headers.get('x-internal-key') !== INTERNAL_KEY) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        return handleWorker(req);
    }

    return verifySignatureAppRouter(handleWorker)(req);
}
