import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { getVisibleContactEmail } from "@/lib/auth-identifiers";
import { NextResponse } from "next/server";

export const GET = withSchoolAccess(async function GET(req, { params }) {
  const { schoolId } = await params;
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));
  const search = String(searchParams.get("search") || "").trim();
  const lifecycleStatus = String(searchParams.get("lifecycleStatus") || "ALL").trim();

  const where = {
    schoolId,
    ...(lifecycleStatus && lifecycleStatus !== "ALL" ? { lifecycleStatus } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { admissionNo: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    } : {}),
  };

  const [students, total, statusSummary] = await Promise.all([
    prisma.student.findMany({
      where,
      include: {
        user: { select: { email: true, status: true, profilePicture: true, createdAt: true } },
        sessions: {
          include: {
            academicYear: { select: { id: true, name: true, startDate: true } },
            class: { select: { id: true, className: true } },
            section: { select: { id: true, name: true } },
          },
          orderBy: [{ joinedAt: "desc" }],
          take: 1,
        },
      },
      orderBy: [
        { name: "asc" },
        { admissionNo: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.student.count({ where }),
    prisma.student.groupBy({
      by: ["lifecycleStatus"],
      where: { schoolId },
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    students: students.map((student) => {
      const latestEnrollment = student.sessions?.[0] || null;
      return {
        userId: student.userId,
        name: student.name,
        admissionNo: student.admissionNo,
        email: getVisibleContactEmail(student.email, student.user?.email),
        lifecycleStatus: student.lifecycleStatus,
        user: student.user,
        userStatus: student.user?.status,
        createdAt: student.user?.createdAt || null,
        latestEnrollment,
      };
    }),
    total,
    page,
    limit,
    summary: statusSummary.reduce((acc, row) => {
      acc[row.lifecycleStatus] = row._count._all;
      return acc;
    }, {}),
  });
});

export const PATCH = withSchoolAccess(async function PATCH(req, { params }) {
  const { schoolId } = await params;
  const body = await req.json().catch(() => ({}));
  const studentIds = Array.isArray(body.studentIds) ? body.studentIds.filter(Boolean) : [];
  const action = String(body.action || "").trim().toUpperCase();
  const actorId = body.actorId || null;

  if (!studentIds.length) {
    return NextResponse.json({ error: "No students selected." }, { status: 400 });
  }

  const statusByAction = {
    ARCHIVE: "ARCHIVED",
    MARK_ALUMNI: "ALUMNI",
    MARK_TC: "TC",
    MARK_DROPPED: "DROPPED",
    MARK_LEFT: "LEFT",
    REACTIVATE: "ACTIVE",
  };
  const lifecycleStatus = statusByAction[action];
  if (!lifecycleStatus) {
    return NextResponse.json({ error: "Unsupported registry action." }, { status: 400 });
  }

  const now = new Date();
  const leavingDate = now.toISOString().slice(0, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const students = await tx.student.findMany({
        where: { schoolId, userId: { in: studentIds } },
        select: { userId: true, lifecycleStatus: true, name: true },
      });

      if (!students.length) return { updated: 0 };

      await tx.student.updateMany({
        where: { schoolId, userId: { in: students.map((student) => student.userId) } },
        data: {
          lifecycleStatus,
          ...(lifecycleStatus === "ACTIVE" ? {
            isAlumni: false,
            DateOfLeaving: null,
          } : {}),
          ...(lifecycleStatus === "ALUMNI" ? {
            isAlumni: true,
            alumniConvertedAt: now,
            DateOfLeaving: leavingDate,
            currentSessionId: null,
          } : {}),
          ...(["TC", "LEFT", "DROPPED", "ARCHIVED"].includes(lifecycleStatus) ? {
            DateOfLeaving: leavingDate,
            currentSessionId: null,
          } : {}),
        },
      });

      if (lifecycleStatus !== "ACTIVE") {
        const enrollmentStatus = lifecycleStatus === "ALUMNI"
          ? "COMPLETED"
          : lifecycleStatus === "TC"
            ? "TC_ISSUED"
            : lifecycleStatus === "ARCHIVED"
              ? "WITHDRAWN"
              : lifecycleStatus;
        const sessionStatus = lifecycleStatus === "ALUMNI"
          ? "ALUMNI"
          : lifecycleStatus === "TC"
            ? "TRANSFERRED"
            : "DROPOUT";

        await tx.studentSession.updateMany({
          where: {
            studentId: { in: students.map((student) => student.userId) },
            status: "ACTIVE",
            student: { schoolId },
          },
          data: {
            status: sessionStatus,
            enrollmentStatus,
            leftAt: now,
          },
        });
      }

      await tx.studentLifecycleAuditLog.createMany({
        data: students.map((student) => ({
          schoolId,
          studentId: student.userId,
          actorId,
          action: `REGISTRY_${action}`,
          entityType: "Student",
          entityId: student.userId,
          oldValue: { lifecycleStatus: student.lifecycleStatus },
          newValue: { lifecycleStatus },
        })),
      });

      return { updated: students.length };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[STUDENT REGISTRY PATCH ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to update registry students." }, { status: 500 });
  }
});
