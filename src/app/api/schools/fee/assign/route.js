import { withSchoolAccess } from "@/lib/api-auth"; // ═══════════════════════════════════════════════════════════════
// FILE: app/api/schools/fee/assign/route.js
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import qstash from '@/lib/qstash';
import { studentMissingJoiningDate } from '@/lib/student-profile-status';
import { getOperationalEnrollmentMap } from '@/lib/enrollment/session-enrollment';

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
export const POST = withSchoolAccess(async function POST(req) {
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
      assignedBy,
      acknowledgeMissingJoiningDate = false
    } = body;

    if (!globalFeeStructureId || !schoolId || !academicYearId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    // ── 1. Resolve student list ────────────────────────────
    let targetIds = studentIds || [];

    if (applyToClass && classId) {
      const enrollments = await prisma.studentSession.findMany({
        where: {
          academicYearId,
          status: 'ACTIVE',
          enrollmentStatus: { in: ['ENROLLED', 'PENDING_VERIFICATION'] },
          classId: parseInt(classId),
          ...(sectionId && sectionId !== 'all' && { sectionId: parseInt(sectionId) }),
          student: {
            schoolId,
            lifecycleStatus: { notIn: ['ALUMNI', 'TC', 'LEFT', 'DROPPED', 'ARCHIVED'] },
            user: { deletedAt: null }
          }
        },
        select: { studentId: true }
      });
      targetIds = enrollments.map((enrollment) => enrollment.studentId);
    }

    if (!targetIds.length) {
      return NextResponse.json({ error: 'No students to assign' }, { status: 400 });
    }

    const operationalEnrollmentMap = await getOperationalEnrollmentMap({
      schoolId,
      academicYearId,
      studentIds: targetIds,
    });

    const targetStudents = await prisma.student.findMany({
      where: { userId: { in: targetIds }, schoolId },
      select: {
        userId: true,
        name: true,
        admissionNo: true,
        admissionDate: true,
        missingJoiningDate: true,
        profileStatus: true,
        class: { select: { className: true } },
        section: { select: { name: true } }
      }
    });
    const inactiveOrHistoricalIds = targetIds.filter((id) => !operationalEnrollmentMap.has(id));
    if (inactiveOrHistoricalIds.length) {
      return NextResponse.json({
        error: `${inactiveOrHistoricalIds.length} student(s) are not enrolled in this academic session. Fee assignment is blocked for historical/global-only students.`,
        code: 'OPERATIONAL_ENROLLMENT_REQUIRED',
        blockedStudentIds: inactiveOrHistoricalIds
      }, { status: 400 });
    }
    const targetStudentMap = new Map(targetStudents.map((student) => [student.userId, student]));
    const missingJoiningDateStudents = targetStudents.filter(studentMissingJoiningDate);

    if (missingJoiningDateStudents.length && !acknowledgeMissingJoiningDate) {
      return NextResponse.json({
        error: `${missingJoiningDateStudents.length} student(s) are missing joining date. Assign joining dates first or acknowledge that they will be skipped.`,
        code: 'MISSING_JOINING_DATE_ACK_REQUIRED',
        missingJoiningDateStudents: missingJoiningDateStudents.map((student) => ({
          studentId: student.userId,
          name: student.name,
          admissionNo: student.admissionNo,
          className: student.class?.className || null,
          sectionName: student.section?.name || null
        }))
      }, { status: 400 });
    }

    const eligibleTargetIds = targetIds.filter((id) => {
      const student = targetStudentMap.get(id);
      return student && !studentMissingJoiningDate(student);
    });

    if (!eligibleTargetIds.length) {
      return NextResponse.json({
        error: 'No eligible students to assign. All selected students are missing joining date.',
        skippedMissingJoiningDate: missingJoiningDateStudents.length
      }, { status: 400 });
    }

    // ── 2. Filter already-assigned ─────────────────────────
    const existing = await prisma.studentFee.findMany({
      where: { studentId: { in: eligibleTargetIds }, academicYearId },
      select: { studentId: true }
    });
    const alreadyAssigned = new Set(existing.map((f) => f.studentId));
    const toAssign = eligibleTargetIds.filter((id) => !alreadyAssigned.has(id));

    const structure = await prisma.globalFeeStructure.findUnique({
      where: { id: globalFeeStructureId },
      select: { id: true, name: true }
    });

    const reportRows = missingJoiningDateStudents.map((student) => ({
      reason: 'Missing joining/admission date. Fee structure was not assigned.',
      studentId: student.userId,
      name: student.name,
      admissionNo: student.admissionNo,
      className: student.class?.className || '',
      sectionName: student.section?.name || ''
    }));

    const history = await prisma.feeAssignmentHistory.create({
      data: {
        schoolId,
        academicYearId,
        globalFeeStructureId,
        structureName: structure?.name || null,
        classId: classId ? parseInt(classId) : null,
        sectionId: sectionId && sectionId !== 'all' ? parseInt(sectionId) : null,
        assignedBy: assignedBy || null,
        totalRequested: targetIds.length,
        skippedAlreadyAssigned: alreadyAssigned.size,
        skippedMissingJoiningDate: missingJoiningDateStudents.length,
        report: {
          missingJoiningDateStudents: reportRows,
          createdAt: new Date().toISOString()
        }
      }
    });

    if (!toAssign.length) {
      return NextResponse.json({
        jobId: null,
        message: 'All selected students already have fees assigned',
        skipped: eligibleTargetIds.length,
        skippedMissingJoiningDate: missingJoiningDateStudents.length,
        historyId: history.id,
        assigned: 0
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
      historyId: history.id,
      skippedMissingJoiningDate: missingJoiningDateStudents.length,
      missingJoiningDateReport: reportRows,
      processedCount: 0, // tracks how many have been processed across QStash hops
      startedAt: Date.now()
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
          'x-internal-key': process.env.INTERNAL_API_KEY || 'edubreezy_internal'
        },
        body: JSON.stringify({ jobId })
      }).catch((e) => console.error('[FeeAssign] Worker kick failed:', e));
    } else {
      // Production: use QStash (handles retries + no timeout)
      await qstash.publishJSON({
        url: workerUrl,
        body: { jobId },
        retries: 3
      });
    }

    return NextResponse.json({
      jobId,
      total: toAssign.length,
      skipped: alreadyAssigned.size,
      skippedMissingJoiningDate: missingJoiningDateStudents.length,
      historyId: history.id,
      status: 'running'
    });

  } catch (error) {
    console.error('[FeeAssign POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
});
