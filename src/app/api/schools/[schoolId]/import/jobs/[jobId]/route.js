import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import { getBulkJob, updateBulkJob } from '@/lib/bulk-job-store';
import qstash from '@/lib/qstash';

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';

async function enqueueWorker(jobId) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';
  const workerUrl = `${baseUrl}/api/schools/import/worker`;

  if (process.env.NODE_ENV === 'development') {
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_KEY
      },
      body: JSON.stringify({ jobId })
    }).catch((error) => console.error('[IMPORT JOB RETRY ENQUEUE ERROR]', error));
    return;
  }

  await qstash.publishJSON({
    url: workerUrl,
    body: { jobId },
    retries: 3
  });
}

function toEtaSeconds(job) {
  if (!job?.processedRows || job.processedRows >= job.totalRows) return 0;
  const elapsedMs = Date.now() - new Date(job.startedAt || job.createdAt).getTime();
  if (elapsedMs <= 0) return null;
  const rowsPerMs = job.processedRows / elapsedMs;
  if (!rowsPerMs) return null;
  return Math.max(1, Math.round((job.totalRows - job.processedRows) / rowsPerMs / 1000));
}export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId, jobId } = await params;
    const job = await getBulkJob(jobId);

    if (!job || job.schoolId !== schoolId || job.type !== 'import') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...job,
      etaSeconds: toEtaSeconds(job)
    });
  } catch (error) {
    console.error('[IMPORT JOB DETAIL ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch job' }, { status: 500 });
  }
});

export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId, jobId } = await params;
    const job = await getBulkJob(jobId);
    if (!job || job.schoolId !== schoolId || job.type !== 'import') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const failedChunks = job.chunks.map((chunk) => {
      if (chunk.status !== 'failed') return chunk;
      return {
        ...chunk,
        status: 'queued',
        lastError: null
      };
    });

    const updated = await updateBulkJob(jobId, {
      status: 'queued',
      chunks: failedChunks
    });

    await enqueueWorker(jobId);

    return NextResponse.json({ success: true, job: updated });
  } catch (error) {
    console.error('[IMPORT JOB RETRY ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to retry job' }, { status: 500 });
  }
});