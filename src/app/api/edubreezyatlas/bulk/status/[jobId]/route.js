import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import { getJob, updateJob } from '../../route';

// ── GET /api/edubreezyatlas/bulk/status/[jobId] ───────────────
export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.jobId,
      status: job.status,
      total: job.total,
      done: job.done || 0,
      failed: job.failed || 0,
      processedCount: job.processedCount || 0,
      errors: job.errors || []
    });

  } catch (error) {
    console.error('[AtlasBulk GET Status error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});

// ── DELETE /api/edubreezyatlas/bulk/status/[jobId] ────────────
export const DELETE = withSchoolAccess(async function DELETE(req, { params }) {
  try {
    const { jobId } = await params;
    const job = await getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'done' || job.status === 'error') {
      return NextResponse.json({ message: `Job already ${job.status}` });
    }

    await updateJob(jobId, { status: 'cancelled' });

    return NextResponse.json({ message: 'Job cancelled successfully' });

  } catch (error) {
    console.error('[AtlasBulk DELETE Status error]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});