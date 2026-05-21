import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { resolveActiveAcademicYear } from "@/lib/enrollment/session-enrollment";

export const POST = withSchoolAccess(async function POST(req, { params }) {
  const { schoolId } = await params;
  const body = await req.json().catch(() => ({}));
  const {
    studentId,
    academicYearId,
    classId,
    sectionId,
    rollNumber,
    joinedAt,
    remarks,
    actorId,
  } = body;

  if (!studentId || !classId || !sectionId) {
    return NextResponse.json({ error: "studentId, classId, and sectionId are required." }, { status: 400 });
  }

  const targetYear = await resolveActiveAcademicYear(schoolId, academicYearId || null);
  if (!targetYear) {
    return NextResponse.json({ error: "No target academic year found." }, { status: 400 });
  }

  const [student, targetClass, targetSection] = await Promise.all([
    prisma.student.findFirst({ where: { userId: studentId, schoolId }, select: { userId: true, lifecycleStatus: true } }),
    prisma.class.findFirst({ where: { id: Number(classId), schoolId }, select: { id: true } }),
    prisma.section.findFirst({ where: { id: Number(sectionId), class: { schoolId } }, select: { id: true, classId: true } }),
  ]);

  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });
  if (!targetClass) return NextResponse.json({ error: "Class not found." }, { status: 404 });
  if (!targetSection || targetSection.classId !== Number(classId)) {
    return NextResponse.json({ error: "Section does not belong to the selected class." }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const enrollment = await tx.studentSession.upsert({
        where: {
          studentId_academicYearId: {
            studentId,
            academicYearId: targetYear.id,
          },
        },
        update: {
          classId: Number(classId),
          sectionId: Number(sectionId),
          rollNumber: rollNumber || null,
          status: "ACTIVE",
          enrollmentStatus: "ENROLLED",
          joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
          leftAt: null,
          remarks: remarks || "Re-enrolled from global registry",
        },
        create: {
          studentId,
          academicYearId: targetYear.id,
          classId: Number(classId),
          sectionId: Number(sectionId),
          rollNumber: rollNumber || null,
          status: "ACTIVE",
          enrollmentStatus: "ENROLLED",
          joinedAt: joinedAt ? new Date(joinedAt) : new Date(),
          remarks: remarks || "Re-enrolled from global registry",
        },
      });

      await tx.student.update({
        where: { userId: studentId },
        data: {
          lifecycleStatus: "ACTIVE",
          isAlumni: false,
          DateOfLeaving: null,
          classId: Number(classId),
          sectionId: Number(sectionId),
          academicYearId: targetYear.id,
          currentSessionId: enrollment.id,
        },
      });

      await tx.studentLifecycleAuditLog.create({
        data: {
          schoolId,
          studentId,
          enrollmentId: enrollment.id,
          academicYearId: targetYear.id,
          actorId: actorId || null,
          action: "REGISTRY_RE_ENROLL",
          entityType: "StudentSession",
          entityId: enrollment.id,
          oldValue: { lifecycleStatus: student.lifecycleStatus },
          newValue: { lifecycleStatus: "ACTIVE", classId: Number(classId), sectionId: Number(sectionId) },
          metadata: { remarks: remarks || null },
        },
      });

      await tx.enrollmentResolutionIssue.updateMany({
        where: { schoolId, studentId, activeAcademicYearId: targetYear.id, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolutionAction: "RE_ENROLLED",
          resolvedAt: new Date(),
          resolvedBy: actorId || null,
        },
      });

      return enrollment;
    });

    return NextResponse.json({ success: true, enrollment: result });
  } catch (error) {
    console.error("[REGISTRY RE-ENROLL ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to re-enroll student." }, { status: 500 });
  }
});
