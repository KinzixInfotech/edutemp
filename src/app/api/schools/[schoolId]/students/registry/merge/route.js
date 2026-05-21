import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const POST = withSchoolAccess(async function POST(req, { params }) {
  const { schoolId } = await params;
  const body = await req.json().catch(() => ({}));
  const { primaryStudentId, duplicateStudentId, actorId, reason } = body;

  if (!primaryStudentId || !duplicateStudentId || primaryStudentId === duplicateStudentId) {
    return NextResponse.json({ error: "Select two different students to merge." }, { status: 400 });
  }

  const [primary, duplicate] = await Promise.all([
    prisma.student.findFirst({ where: { userId: primaryStudentId, schoolId }, select: { userId: true, name: true } }),
    prisma.student.findFirst({ where: { userId: duplicateStudentId, schoolId }, select: { userId: true, name: true, lifecycleStatus: true } }),
  ]);

  if (!primary || !duplicate) {
    return NextResponse.json({ error: "Primary or duplicate student was not found." }, { status: 404 });
  }

  try {
    const report = await prisma.$transaction(async (tx) => {
      const duplicateSessions = await tx.studentSession.findMany({
        where: { studentId: duplicateStudentId },
        select: { id: true, academicYearId: true },
      });
      const primarySessions = await tx.studentSession.findMany({
        where: { studentId: primaryStudentId },
        select: { academicYearId: true },
      });
      const primaryYearIds = new Set(primarySessions.map((session) => session.academicYearId));

      let movedEnrollments = 0;
      let conflictedEnrollments = 0;
      for (const session of duplicateSessions) {
        if (primaryYearIds.has(session.academicYearId)) {
          conflictedEnrollments += 1;
          await tx.studentSession.update({
            where: { id: session.id },
            data: {
              status: "TRANSFERRED",
              enrollmentStatus: "WITHDRAWN",
              leftAt: new Date(),
              remarks: `Duplicate record merged into ${primaryStudentId}`,
            },
          });
        } else {
          movedEnrollments += 1;
          await tx.studentSession.update({
            where: { id: session.id },
            data: { studentId: primaryStudentId, remarks: `Moved from duplicate student ${duplicateStudentId}` },
          });
        }
      }

      const duplicateLinks = await tx.studentParentLink.findMany({
        where: { studentId: duplicateStudentId, isActive: true },
        select: {
          parentId: true,
          relation: true,
          isPrimary: true,
          canPickup: true,
          canViewReports: true,
          canViewFees: true,
          linkedBy: true,
        },
      });
      let movedParentLinks = 0;
      for (const link of duplicateLinks) {
        const existing = await tx.studentParentLink.findUnique({
          where: { studentId_parentId: { studentId: primaryStudentId, parentId: link.parentId } },
          select: { id: true },
        });
        if (!existing) {
          movedParentLinks += 1;
          await tx.studentParentLink.create({
            data: { ...link, studentId: primaryStudentId },
          });
        }
      }

      await tx.student.update({
        where: { userId: duplicateStudentId },
        data: {
          lifecycleStatus: "ARCHIVED",
          currentSessionId: null,
          DateOfLeaving: new Date(),
        },
      });

      await tx.studentLifecycleAuditLog.createMany({
        data: [
          {
            schoolId,
            studentId: primaryStudentId,
            actorId: actorId || null,
            action: "REGISTRY_MERGE_DUPLICATE_PRIMARY",
            entityType: "Student",
            entityId: primaryStudentId,
            newValue: { mergedDuplicateStudentId: duplicateStudentId },
            metadata: { reason: reason || null, movedEnrollments, conflictedEnrollments, movedParentLinks },
          },
          {
            schoolId,
            studentId: duplicateStudentId,
            actorId: actorId || null,
            action: "REGISTRY_MERGE_DUPLICATE_ARCHIVE",
            entityType: "Student",
            entityId: duplicateStudentId,
            oldValue: { lifecycleStatus: duplicate.lifecycleStatus },
            newValue: { lifecycleStatus: "ARCHIVED", mergedIntoStudentId: primaryStudentId },
            metadata: { reason: reason || null },
          },
        ],
      });

      return { movedEnrollments, conflictedEnrollments, movedParentLinks };
    });

    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error("[REGISTRY MERGE ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to merge duplicate students." }, { status: 500 });
  }
});
