// ═══════════════════════════════════════════════════════════════
// FILE: app/api/schools/fee/assign/route.js
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import qstash from '@/lib/qstash';

// ── Job helpers (exported so worker + status routes can import) ─
const JOB_TTL = 60 * 60 * 2; // 2 hours

export async function setJob(jobId, data) {
  await redis.set(`fee_assign_job:${jobId}`, JSON.stringify(data), { ex: JOB_TTL });
}

export async function getJob(jobId) {
  const raw = await redis.get(`fee_assign_job:${jobId}`);
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : raw;
}

export async function updateJob(jobId, patch) {
  const job = await getJob(jobId);
  if (!job) return;
  await setJob(jobId, { ...job, ...patch });
}

// ── POST /api/schools/fee/assign ──────────────────────────────
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      globalFeeStructureId,
      studentIds,
      applyToClass,
      classId,
      sectionId,
      academicYearId,
      schoolId,
    } = body;

    if (!globalFeeStructureId || !schoolId || !academicYearId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── 1. Resolve student list ────────────────────────────
    let targetIds = studentIds || [];

    if (applyToClass && classId) {
      const students = await prisma.student.findMany({
        where: {
          schoolId,
          classId: parseInt(classId),
          ...(sectionId && sectionId !== 'all' && { sectionId: parseInt(sectionId) }),
        },
        select: { userId: true },
      });
      targetIds = students.map(s => s.userId);
    }

    if (!targetIds.length) {
      return NextResponse.json({ error: 'No students to assign' }, { status: 400 });
    }

    // ── 2. Filter already-assigned ─────────────────────────
    const existing = await prisma.studentFee.findMany({
      where: { studentId: { in: targetIds }, academicYearId },
      select: { studentId: true },
    });
    const alreadyAssigned = new Set(existing.map(f => f.studentId));
    const toAssign = targetIds.filter(id => !alreadyAssigned.has(id));

    if (!toAssign.length) {
      return NextResponse.json({
        jobId: null,
        message: 'All selected students already have fees assigned',
        skipped: targetIds.length,
        assigned: 0,
      });
    }

    // ── 3. Create job in Redis ─────────────────────────────
    const jobId = `feeassign_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    await setJob(jobId, {
      jobId,
      status: 'running',
      total: toAssign.length,
      done: 0,
      failed: 0,
      skipped: alreadyAssigned.size,
      globalFeeStructureId,
      academicYearId,
      schoolId,
      studentIds: toAssign,
      processedCount: 0, // tracks how many have been processed across QStash hops
      startedAt: Date.now(),
    });

    // ── 4. Kick worker ─────────────────────────────────────
    const base = process.env.APP_URL || 'https://www.edubreezy.com';
    const workerUrl = `${base}/api/schools/fee/assign/worker`;
    const isDev = process.env.NODE_ENV === 'development';

    if (isDev) {
      // Local dev: QStash can't reach localhost, call directly
      fetch(workerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': process.env.INTERNAL_API_KEY || 'edubreezy_internal',
        },
        body: JSON.stringify({ jobId }),
      }).catch(e => console.error('[FeeAssign] Worker kick failed:', e));
    } else {
      // Production: use QStash (handles retries + no timeout)
      await qstash.publishJSON({
        url: workerUrl,
        body: { jobId },
        retries: 3,
      });
    }

    return NextResponse.json({
      jobId,
      total: toAssign.length,
      skipped: alreadyAssigned.size,
      status: 'running',
    });

  } catch (error) {
    console.error('[FeeAssign POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}