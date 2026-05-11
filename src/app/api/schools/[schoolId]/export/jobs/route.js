import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import qstash from '@/lib/qstash';
import { createJobId, listBulkJobs, setBulkJob } from '@/lib/bulk-job-store';
import prisma from '@/lib/prisma';

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'edubreezy_internal';

async function enqueueWorker(jobId) {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';
  const workerUrl = `${baseUrl}/api/schools/export/worker`;

  if (process.env.NODE_ENV === 'development') {
    fetch(workerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': INTERNAL_KEY
      },
      body: JSON.stringify({ jobId })
    }).catch((error) => console.error('[EXPORT JOB ENQUEUE ERROR]', error));
    return;
  }

  await qstash.publishJSON({
    url: workerUrl,
    body: { jobId },
    retries: 3
  });
}export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { schoolId } = await params;
    const { modules, userId, academicYearId } = await req.json();

    if (!Array.isArray(modules) || !modules.length) {
      return NextResponse.json({ error: 'No modules selected' }, { status: 400 });
    }

    let academicYear = null;
    if (academicYearId) {
      academicYear = await prisma.academicYear.findFirst({
        where: { id: academicYearId, schoolId },
        select: { id: true, name: true, startDate: true, endDate: true, isActive: true }
      });
      if (!academicYear) {
        return NextResponse.json({ error: 'Selected academic year was not found for this school' }, { status: 400 });
      }
    }

    const jobId = createJobId('export');
    await setBulkJob(jobId, {
      id: jobId,
      type: 'export',
      schoolId,
      userId,
      academicYearId: academicYear?.id || null,
      academicYearName: academicYear?.name || null,
      modules,
      status: 'queued',
      processedModules: 0,
      totalModules: modules.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await enqueueWorker(jobId);

    return NextResponse.json({
      success: true,
      jobId,
      status: 'queued',
      totalModules: modules.length
    });
  } catch (error) {
    console.error('[EXPORT JOB CREATE ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to start export job' }, { status: 500 });
  }
});

export const GET = withSchoolAccess(async function GET(req, { params }) {
  try {
    const { schoolId } = await params;
    const jobs = await listBulkJobs({ schoolId, type: 'export' });
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('[EXPORT JOB LIST ERROR]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch export jobs' }, { status: 500 });
  }
});
