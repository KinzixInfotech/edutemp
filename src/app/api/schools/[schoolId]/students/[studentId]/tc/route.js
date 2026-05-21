import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(_req, { params }) {
  const { schoolId, studentId } = await params;

  const student = await prisma.student.findFirst({
    where: { userId: studentId, schoolId },
    include: {
      user: { select: { email: true } },
      sessions: {
        include: {
          academicYear: { select: { name: true } },
          class: { select: { className: true } },
          section: { select: { name: true } },
        },
        orderBy: [{ joinedAt: "desc" }],
        take: 1,
      },
      lifecycleAuditLogs: {
        where: { action: "TC_ISSUED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  const latestEnrollment = student.sessions?.[0] || null;
  const tcLog = student.lifecycleAuditLogs?.[0] || null;
  return NextResponse.json({
    certificate: {
      studentId: student.userId,
      name: student.name,
      admissionNo: student.admissionNo,
      dateOfBirth: student.dateOfBirth,
      gender: student.gender,
      fatherName: student.FatherName,
      motherName: student.MotherName,
      lastAcademicYear: latestEnrollment?.academicYear?.name || null,
      lastClass: latestEnrollment?.class?.className || null,
      lastSection: latestEnrollment?.section?.name || null,
      issueDate: tcLog?.createdAt || student.DateOfLeaving || null,
      tcNumber: tcLog?.metadata?.tcNumber || null,
      reason: tcLog?.metadata?.reason || null,
      remarks: tcLog?.metadata?.remarks || null,
    },
  });
});

export const POST = withSchoolAccess(async function POST(req, { params }) {
  const { schoolId, studentId } = await params;
  const body = await req.json().catch(() => ({}));
  const { tcNumber, issueDate, reason, remarks, actorId } = body;
  const now = issueDate ? new Date(issueDate) : new Date();

  const student = await prisma.student.findFirst({
    where: { userId: studentId, schoolId },
    select: { userId: true, lifecycleStatus: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { userId: studentId },
        data: {
          lifecycleStatus: "TC",
          DateOfLeaving: now.toISOString(),
          currentSessionId: null,
          isAlumni: false,
        },
      });

      await tx.studentSession.updateMany({
        where: { studentId, student: { schoolId }, status: "ACTIVE" },
        data: {
          status: "TRANSFERRED",
          enrollmentStatus: "TC_ISSUED",
          leftAt: now,
          remarks: remarks || reason || "Transfer certificate issued",
        },
      });

      await tx.studentLifecycleAuditLog.create({
        data: {
          schoolId,
          studentId,
          actorId: actorId || null,
          action: "TC_ISSUED",
          entityType: "Student",
          entityId: studentId,
          oldValue: { lifecycleStatus: student.lifecycleStatus },
          newValue: { lifecycleStatus: "TC", DateOfLeaving: now },
          metadata: { tcNumber: tcNumber || null, reason: reason || null, remarks: remarks || null },
        },
      });

      await tx.enrollmentResolutionIssue.updateMany({
        where: { schoolId, studentId, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolutionAction: "TC_ISSUED",
          resolvedAt: now,
          resolvedBy: actorId || null,
        },
      });

      return { studentId, tcNumber: tcNumber || null, issueDate: now };
    });

    return NextResponse.json({ success: true, certificate: result });
  } catch (error) {
    console.error("[TC ISSUE ERROR]", error.name, "→", error.message?.slice(0, 300));
    return NextResponse.json({ error: error.message || "Failed to issue transfer certificate." }, { status: 500 });
  }
});
