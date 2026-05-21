import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { resolveActiveAcademicYear } from "@/lib/enrollment/session-enrollment";
import { NextResponse } from "next/server";

const TERMINAL_LIFECYCLE_STATUSES = new Set(["ALUMNI", "TC", "LEFT", "DROPPED", "ARCHIVED"]);

function toDateInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeClassName(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
}

function classRank(className) {
  const normalized = normalizeClassName(className);
  if (!normalized) return null;
  if (["NURSERY", "NUR", "PRE NURSERY", "PRE-NURSERY"].includes(normalized)) return 0;
  if (["LKG", "LOWER KG", "LOWER KINDERGARTEN"].includes(normalized)) return 1;
  if (["UKG", "UPPER KG", "UPPER KINDERGARTEN", "PREP", "PREPARATORY"].includes(normalized)) return 2;
  const numeric = normalized.match(/\d+/)?.[0];
  return numeric ? Number(numeric) + 2 : null;
}

function buildClassProgression(classes) {
  const byRank = new Map();
  for (const cls of classes) {
    const rank = classRank(cls.className);
    if (rank === null || byRank.has(rank)) continue;
    byRank.set(rank, cls);
  }
  return byRank;
}

function findSectionForPrediction(targetClass, preferredSectionName) {
  const sections = targetClass?.sections || [];
  if (!sections.length) return null;
  const normalized = normalizeClassName(preferredSectionName);
  if (normalized) {
    const match = sections.find((section) => normalizeClassName(section.name) === normalized);
    if (match) return match;
  }
  return sections.length === 1 ? sections[0] : null;
}

function buildIssuePrediction({ issue, classProgression, activeEnrollmentIds }) {
  const activeEnrollmentId = activeEnrollmentIds.get(issue.studentId) || null;
  const lastClassName = issue.lastEnrollment?.class?.className || issue.metadata?.lastClass || issue.student?.class?.className || null;
  const lastSectionName = issue.lastEnrollment?.section?.name || issue.metadata?.lastSection || issue.student?.section?.name || null;
  const rawGap = issue.metadata?.sessionGap;
  const sessionGap = Number.isFinite(Number(rawGap)) ? Number(rawGap) : null;
  const lastRank = classRank(lastClassName);
  const predictedRank = lastRank !== null && sessionGap !== null ? lastRank + sessionGap : null;
  const targetClass = predictedRank !== null ? classProgression.get(predictedRank) || null : null;
  const targetSection = findSectionForPrediction(targetClass, lastSectionName);
  const fallbackAdmissionDate = toDateInput(issue.lastEnrollment?.academicYear?.startDate || issue.metadata?.lastSessionStartDate);
  const hasAdmissionDate = Boolean(issue.student?.admissionDate);
  const terminal = TERMINAL_LIFECYCLE_STATUSES.has(issue.student?.lifecycleStatus);

  const blockers = [];
  if (activeEnrollmentId) blockers.push("Already enrolled in current session.");
  if (terminal) blockers.push("Student has a terminal lifecycle status.");
  if (predictedRank === null) blockers.push("Cannot predict current class without a known last class and session gap.");
  if (!targetClass) blockers.push("Predicted target class is not configured in the current year.");
  if (!targetSection) blockers.push("Predicted target section is not configured in the current year.");
  if (!hasAdmissionDate && !fallbackAdmissionDate) blockers.push("Joining date is missing.");

  return {
    isInCurrentSession: Boolean(activeEnrollmentId),
    currentEnrollmentId: activeEnrollmentId,
    lastClassName,
    lastSectionName,
    sessionGap,
    predictedClassId: targetClass?.id || null,
    predictedClassName: targetClass?.className || null,
    predictedSectionId: targetSection?.id || null,
    predictedSectionName: targetSection?.name || null,
    admissionDate: issue.student?.admissionDate || fallbackAdmissionDate,
    admissionDateSource: issue.student?.admissionDate ? "student" : fallbackAdmissionDate ? "historical_session_start" : null,
    canEnroll: blockers.length === 0,
    blockers,
  };
}

export const GET = withSchoolAccess(async function GET(req, { params }) {
  const { schoolId } = await params;
  const { searchParams } = req.nextUrl;
  const academicYearId = searchParams.get("academicYearId") || null;
  const category = searchParams.get("category") || null;
  const status = searchParams.get("status") || "OPEN";
  const search = searchParams.get("search") || "";
  const sourceAcademicYearId = searchParams.get("sourceAcademicYearId") || null;
  const importBatchId = searchParams.get("importBatchId") || null;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 25)));

  const activeYear = await resolveActiveAcademicYear(schoolId, academicYearId);
  if (!activeYear) {
    return NextResponse.json({ issues: [], total: 0, academicYear: null });
  }

  const where = {
    schoolId,
    activeAcademicYearId: activeYear.id,
    ...(status && status !== "ALL" ? { status } : {}),
    ...(category && category !== "ALL" ? { category } : {}),
    ...(importBatchId && importBatchId !== "ALL" ? { importBatchId } : {}),
    ...(sourceAcademicYearId && sourceAcademicYearId !== "ALL" ? {
      OR: [
        { lastEnrollment: { academicYearId: sourceAcademicYearId } },
        { lastEnrollmentId: null, student: { academicYearId: sourceAcademicYearId } },
      ],
    } : {}),
    ...(search ? {
      student: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { admissionNo: { contains: search, mode: "insensitive" } },
        ],
      },
    } : {}),
  };
  const optionWhere = {
    schoolId,
    activeAcademicYearId: activeYear.id,
    ...(status && status !== "ALL" ? { status } : {}),
  };
  const { category: _category, status: _status, ...summaryBaseWhere } = where;

  const [issues, total, grouped, currentClasses, optionIssues] = await Promise.all([
    prisma.enrollmentResolutionIssue.findMany({
      where,
      include: {
        student: {
          select: {
            userId: true,
            name: true,
            admissionNo: true,
            lifecycleStatus: true,
            admissionDate: true,
            missingJoiningDate: true,
            profileStatus: true,
            class: { select: { id: true, className: true } },
            section: { select: { id: true, name: true } },
          },
        },
        lastEnrollment: {
          include: {
            academicYear: { select: { id: true, name: true, startDate: true } },
            class: { select: { id: true, className: true } },
            section: { select: { id: true, name: true } },
          },
        },
        importBatch: { select: { id: true, fileName: true, createdAt: true } },
      },
      orderBy: [{ confidence: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.enrollmentResolutionIssue.count({ where }),
    prisma.enrollmentResolutionIssue.groupBy({
      by: ["category"],
      where: { ...summaryBaseWhere, status: { in: ["OPEN", "IN_REVIEW"] } },
      _count: { _all: true },
    }),
    prisma.class.findMany({
      where: { schoolId, OR: [{ academicYearId: activeYear.id }, { academicYearId: null }] },
      include: { sections: { select: { id: true, name: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.enrollmentResolutionIssue.findMany({
      where: optionWhere,
      select: {
        importBatchId: true,
        lastEnrollment: {
          select: {
            academicYear: { select: { id: true, name: true, startDate: true } },
          },
        },
        student: {
          select: {
            AcademicYear: { select: { id: true, name: true, startDate: true } },
          },
        },
        importBatch: { select: { id: true, fileName: true, createdAt: true } },
      },
    }),
  ]);

  const issueStudentIds = issues.map((issue) => issue.studentId);
  const currentEnrollments = issueStudentIds.length ? await prisma.studentSession.findMany({
    where: {
      studentId: { in: issueStudentIds },
      academicYearId: activeYear.id,
      status: "ACTIVE",
      enrollmentStatus: { in: ["ENROLLED", "PENDING_VERIFICATION"] },
    },
    select: { id: true, studentId: true },
  }) : [];
  const activeEnrollmentIds = new Map(currentEnrollments.map((enrollment) => [enrollment.studentId, enrollment.id]));
  const classProgression = buildClassProgression(currentClasses);
  const enrichedIssues = issues.map((issue) => ({
    ...issue,
    prediction: buildIssuePrediction({ issue, classProgression, activeEnrollmentIds }),
  }));
  const sourceYearsById = new Map();
  const importBatchesById = new Map();
  for (const issue of optionIssues) {
    const sourceYear = issue.lastEnrollment?.academicYear || issue.student?.AcademicYear;
    if (sourceYear?.id) sourceYearsById.set(sourceYear.id, sourceYear);
    if (issue.importBatch?.id) importBatchesById.set(issue.importBatch.id, issue.importBatch);
  }

  return NextResponse.json({
    issues: enrichedIssues,
    total,
    page,
    limit,
    academicYear: activeYear,
    summary: grouped.reduce((acc, row) => {
      acc[row.category] = row._count._all;
      return acc;
    }, {}),
    filterOptions: {
      sourceYears: [...sourceYearsById.values()].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
      importBatches: [...importBatchesById.values()].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    },
  });
});

export const PATCH = withSchoolAccess(async function PATCH(req, { params }) {
  const { schoolId } = await params;
  const body = await req.json().catch(() => ({}));
  const issueIds = Array.isArray(body.issueIds) ? body.issueIds.filter(Boolean) : [];
  const action = String(body.action || "").trim().toUpperCase();
  const actorId = body.actorId || null;

  if (!issueIds.length) {
    return NextResponse.json({ error: "No enrollment resolution issues selected." }, { status: 400 });
  }

  const supportedActions = new Set(["IGNORE", "MARK_ALUMNI", "MARK_TC", "MARK_DROPPED", "MARK_LEFT", "ENROLL_CURRENT_SESSION"]);
  if (!supportedActions.has(action)) {
    return NextResponse.json({ error: "Unsupported resolution action." }, { status: 400 });
  }

  const issueStatus = action === "IGNORE" ? "IGNORED" : "RESOLVED";
  const lifecycleByAction = {
    MARK_ALUMNI: "ALUMNI",
    MARK_TC: "TC",
    MARK_DROPPED: "DROPPED",
    MARK_LEFT: "LEFT",
  };
  const enrollmentByLifecycle = {
    ALUMNI: "COMPLETED",
    TC: "TC_ISSUED",
    DROPPED: "DROPPED",
    LEFT: "LEFT",
  };
  const sessionByLifecycle = {
    ALUMNI: "ALUMNI",
    TC: "TRANSFERRED",
    DROPPED: "DROPOUT",
    LEFT: "DROPOUT",
  };
  const lifecycleStatus = lifecycleByAction[action] || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const issues = await tx.enrollmentResolutionIssue.findMany({
        where: {
          id: { in: issueIds },
          schoolId,
          status: { in: ["OPEN", "IN_REVIEW"] },
        },
        include: {
          student: {
            select: {
              userId: true,
              name: true,
              admissionNo: true,
              lifecycleStatus: true,
              admissionDate: true,
              missingJoiningDate: true,
              profileStatus: true,
              class: { select: { id: true, className: true } },
              section: { select: { id: true, name: true } },
            },
          },
          lastEnrollment: {
            include: {
              academicYear: { select: { id: true, name: true, startDate: true } },
              class: { select: { id: true, className: true } },
              section: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!issues.length) {
        return { updated: 0 };
      }

      const resolvedAt = new Date();
      const studentIds = [...new Set(issues.map((issue) => issue.studentId))];

      if (action === "ENROLL_CURRENT_SESSION") {
        const activeAcademicYearIds = [...new Set(issues.map((issue) => issue.activeAcademicYearId).filter(Boolean))];
        if (activeAcademicYearIds.length !== 1) {
          throw new Error("Select issues from one target academic year at a time.");
        }
        const activeYear = await tx.academicYear.findFirst({
          where: { id: activeAcademicYearIds[0], schoolId },
          select: { id: true, name: true, startDate: true },
        });
        if (!activeYear) throw new Error("Target academic year was not found.");

        const [currentClasses, currentEnrollments] = await Promise.all([
          tx.class.findMany({
            where: { schoolId, OR: [{ academicYearId: activeYear.id }, { academicYearId: null }] },
            include: { sections: { select: { id: true, name: true } } },
            orderBy: { id: "asc" },
          }),
          tx.studentSession.findMany({
            where: {
              studentId: { in: studentIds },
              academicYearId: activeYear.id,
              status: "ACTIVE",
              enrollmentStatus: { in: ["ENROLLED", "PENDING_VERIFICATION"] },
            },
            select: { id: true, studentId: true },
          }),
        ]);

        const classProgression = buildClassProgression(currentClasses);
        const activeEnrollmentIds = new Map(currentEnrollments.map((enrollment) => [enrollment.studentId, enrollment.id]));
        const predictions = issues.map((issue) => ({
          issue,
          prediction: buildIssuePrediction({ issue, classProgression, activeEnrollmentIds }),
        }));
        const invalid = predictions.filter(({ prediction }) => !prediction.canEnroll);
        if (invalid.length) {
          throw new Error(`Cannot enroll ${invalid.length} selected student(s): ${invalid.map(({ issue, prediction }) => `${issue.student?.name || issue.studentId} (${prediction.blockers.join(" ")})`).join("; ")}`);
        }

        const enrollments = [];
        for (const { issue, prediction } of predictions) {
          const joinedAt = new Date(activeYear.startDate || resolvedAt);
          const enrollment = await tx.studentSession.upsert({
            where: {
              studentId_academicYearId: {
                studentId: issue.studentId,
                academicYearId: activeYear.id,
              },
            },
            update: {
              classId: prediction.predictedClassId,
              sectionId: prediction.predictedSectionId,
              status: "ACTIVE",
              enrollmentStatus: "ENROLLED",
              joinedAt,
              leftAt: null,
              promotedFromEnrollmentId: issue.lastEnrollmentId || null,
              remarks: "Enrolled from enrollment resolution prediction",
            },
            create: {
              studentId: issue.studentId,
              academicYearId: activeYear.id,
              classId: prediction.predictedClassId,
              sectionId: prediction.predictedSectionId,
              status: "ACTIVE",
              enrollmentStatus: "ENROLLED",
              joinedAt,
              promotedFromEnrollmentId: issue.lastEnrollmentId || null,
              remarks: "Enrolled from enrollment resolution prediction",
            },
          });
          enrollments.push(enrollment);

          await tx.student.update({
            where: { userId: issue.studentId },
            data: {
              lifecycleStatus: "ACTIVE",
              isAlumni: false,
              DateOfLeaving: null,
              academicYearId: activeYear.id,
              currentSessionId: enrollment.id,
              classId: prediction.predictedClassId,
              sectionId: prediction.predictedSectionId,
              admissionDate: prediction.admissionDate,
              missingJoiningDate: false,
              profileStatus: "ACTIVE",
            },
          });
        }

        const update = await tx.enrollmentResolutionIssue.updateMany({
          where: { id: { in: issues.map((issue) => issue.id) }, schoolId },
          data: {
            status: "RESOLVED",
            resolutionAction: action,
            resolvedAt,
            resolvedBy: actorId,
          },
        });

        await tx.studentLifecycleAuditLog.createMany({
          data: predictions.map(({ issue, prediction }) => ({
            schoolId,
            studentId: issue.studentId,
            importBatchId: issue.importBatchId,
            actorId,
            academicYearId: activeYear.id,
            action: "ENROLLMENT_RESOLUTION_ENROLL_CURRENT_SESSION",
            entityType: "StudentSession",
            entityId: enrollments.find((enrollment) => enrollment.studentId === issue.studentId)?.id || issue.id,
            oldValue: {
              issueId: issue.id,
              lastEnrollmentId: issue.lastEnrollmentId,
              lastClass: prediction.lastClassName,
              lastSection: prediction.lastSectionName,
            },
            newValue: {
              academicYearId: activeYear.id,
              classId: prediction.predictedClassId,
              sectionId: prediction.predictedSectionId,
              admissionDate: prediction.admissionDate,
            },
          })),
        });

        return { updated: update.count, enrolled: enrollments.length };
      }

      if (lifecycleStatus) {
        await tx.student.updateMany({
          where: { schoolId, userId: { in: studentIds } },
          data: {
            lifecycleStatus,
            ...(lifecycleStatus === "ALUMNI" ? { isAlumni: true } : {}),
            ...(lifecycleStatus === "LEFT" ? { DateOfLeaving: toDateInput(resolvedAt) } : {}),
          },
        });

        await tx.studentSession.updateMany({
          where: {
            studentId: { in: studentIds },
            academicYearId: { in: [...new Set(issues.map((issue) => issue.activeAcademicYearId).filter(Boolean))] },
            student: { schoolId },
          },
          data: {
            enrollmentStatus: enrollmentByLifecycle[lifecycleStatus],
            status: sessionByLifecycle[lifecycleStatus],
          },
        });
      }

      const update = await tx.enrollmentResolutionIssue.updateMany({
        where: { id: { in: issues.map((issue) => issue.id) }, schoolId },
        data: {
          status: issueStatus,
          resolutionAction: action,
          resolvedAt,
          resolvedBy: actorId,
        },
      });

      await tx.studentLifecycleAuditLog.createMany({
        data: issues.map((issue) => ({
          schoolId,
          studentId: issue.studentId,
          importBatchId: issue.importBatchId,
          actorId,
          academicYearId: issue.activeAcademicYearId,
          action: `ENROLLMENT_RESOLUTION_${action}`,
          entityType: "EnrollmentResolutionIssue",
          entityId: issue.id,
          newValue: {
            issueStatus,
            lifecycleStatus,
          },
        })),
      });

      return { updated: update.count };
    }, { timeout: 30000, maxWait: 10000 });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ENROLLMENT RESOLUTION PATCH ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to update enrollment issues." }, { status: 500 });
  }
});
