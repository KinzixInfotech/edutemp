import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import { getBulkJob } from '@/lib/bulk-job-store';

export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId, jobId } = await params;
    const job = await getBulkJob(jobId);

    if (!job || job.schoolId !== schoolId || job.type !== 'export') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('[EXPORT JOB DETAIL ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch job' }, { status: 500 });
  }
});