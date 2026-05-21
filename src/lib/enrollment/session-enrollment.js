import prisma from "@/lib/prisma";

export const TERMINAL_LIFECYCLE_STATUSES = ["ALUMNI", "TC", "LEFT", "DROPPED", "ARCHIVED"];
export const ACTIVE_ENROLLMENT_STATUSES = ["ENROLLED", "PENDING_VERIFICATION"];

export async function resolveActiveAcademicYear(schoolId, academicYearId = null, db = prisma) {
  if (academicYearId) {
    return db.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
      select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
    });
  }

  return db.academicYear.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true, name: true, startDate: true, endDate: true, isActive: true },
  });
}

export function buildOperationalEnrollmentWhere({
  schoolId,
  academicYearId,
  classId,
  sectionId,
  search,
  includePendingVerification = true,
}) {
  const enrollmentStatuses = includePendingVerification
    ? ACTIVE_ENROLLMENT_STATUSES
    : ["ENROLLED"];

  return {
    academicYearId,
    status: "ACTIVE",
    enrollmentStatus: { in: enrollmentStatuses },
    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
    student: {
      schoolId,
      lifecycleStatus: { notIn: TERMINAL_LIFECYCLE_STATUSES },
      user: { deletedAt: null },
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { admissionNo: { contains: search, mode: "insensitive" } },
        ],
      } : {}),
    },
  };
}

export function flattenEnrollmentStudent(enrollment) {
  const student = enrollment.student || {};

  return {
    ...student,
    classId: enrollment.classId,
    sectionId: enrollment.sectionId,
    academicYearId: enrollment.academicYearId,
    rollNumber: enrollment.rollNumber || student.rollNumber || "",
    enrollmentId: enrollment.id,
    enrollmentStatus: enrollment.enrollmentStatus,
    sessionStatus: enrollment.status,
    joinedAt: enrollment.joinedAt,
    class: enrollment.class || student.class || null,
    section: enrollment.section || student.section || null,
  };
}

export async function listCurrentSessionStudents({
  schoolId,
  academicYearId,
  classId,
  sectionId,
  search = "",
  sortBy = "newest",
  page = 1,
  limit = 10,
  db = prisma,
}) {
  const activeYear = await resolveActiveAcademicYear(schoolId, academicYearId, db);
  if (!activeYear) {
    return { students: [], total: 0, activeCount: 0, missingJoiningDateCount: 0, academicYear: null };
  }

  const where = buildOperationalEnrollmentWhere({
    schoolId,
    academicYearId: activeYear.id,
    classId,
    sectionId,
    search,
  });

  let orderBy;
  switch (sortBy) {
    case "oldest":
      orderBy = { student: { admissionDate: "asc" } };
      break;
    case "name_asc":
      orderBy = { student: { name: "asc" } };
      break;
    case "name_desc":
      orderBy = { student: { name: "desc" } };
      break;
    case "newest":
    default:
      orderBy = { student: { admissionDate: "desc" } };
      break;
  }

  const skip = (Math.max(1, page) - 1) * Math.max(1, limit);

  const [enrollments, total, activeCount, missingJoiningDateCount] = await Promise.all([
    db.studentSession.findMany({
      where,
      include: {
        class: { select: { id: true, className: true } },
        section: { select: { id: true, name: true } },
        student: {
          include: {
            user: true,
            studentParentLinks: {
              include: {
                parent: {
                  include: {
                    user: { select: { email: true, profilePicture: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy,
      skip,
      take: Math.max(1, limit),
    }),
    db.studentSession.count({ where }),
    db.studentSession.count({
      where: buildOperationalEnrollmentWhere({
        schoolId,
        academicYearId: activeYear.id,
      }),
    }),
    db.studentSession.count({
      where: {
        ...buildOperationalEnrollmentWhere({
          schoolId,
          academicYearId: activeYear.id,
        }),
        student: {
          schoolId,
          lifecycleStatus: { notIn: TERMINAL_LIFECYCLE_STATUSES },
          OR: [
            { missingJoiningDate: true },
            { profileStatus: "MISSING_JOIN_DATE" },
            { admissionDate: null },
            { admissionDate: "" },
          ],
        },
      },
    }),
  ]);

  return {
    students: enrollments.map(flattenEnrollmentStudent),
    total,
    activeCount,
    missingJoiningDateCount,
    academicYear: activeYear,
  };
}

function getYearIndex(years, academicYearId) {
  return years.findIndex((year) => year.id === academicYearId);
}

function getResolutionSuggestion({ years, lastEnrollment, activeYear }) {
  const lastIndex = getYearIndex(years, lastEnrollment.academicYearId);
  const activeIndex = getYearIndex(years, activeYear.id);
  const gap = lastIndex >= 0 && activeIndex >= 0 ? activeIndex - lastIndex : null;

  if (gap === 1) {
    return {
      category: "LIKELY_ACTIVE",
      suggestedAction: "PROMOTE",
      confidence: 90,
      metadata: { sessionGap: gap, badge: "Safe To Promote" },
    };
  }

  if (gap !== null && gap > 1) {
    return {
      category: "HUGE_SESSION_GAP",
      suggestedAction: "VERIFY",
      confidence: 35,
      metadata: { sessionGap: gap, badge: "Huge Session Gap" },
    };
  }

  return {
    category: "NEEDS_VERIFICATION",
    suggestedAction: "VERIFY",
    confidence: 50,
    metadata: { sessionGap: gap, badge: "Needs Verification" },
  };
}

export async function createUnresolvedEnrollmentIssuesForBatch({
  schoolId,
  importBatchId,
  importedAcademicYearId,
  db = prisma,
}) {
  const activeYear = await resolveActiveAcademicYear(schoolId, null, db);
  if (!activeYear || !importedAcademicYearId || activeYear.id === importedAcademicYearId) {
    return { created: 0, activeYearId: activeYear?.id || null };
  }

  const years = await db.academicYear.findMany({
    where: { schoolId },
    select: { id: true, name: true, startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });

  const [importedEnrollments, importedStudentsWithoutEnrollment] = await Promise.all([
    db.studentSession.findMany({
      where: { importBatchId, academicYearId: importedAcademicYearId },
      include: {
        student: {
          select: {
            userId: true,
            lifecycleStatus: true,
            isAlumni: true,
            DateOfLeaving: true,
          },
        },
        academicYear: { select: { id: true, name: true } },
        class: { select: { id: true, className: true } },
        section: { select: { id: true, name: true } },
      },
    }),
    db.student.findMany({
      where: {
        schoolId,
        importBatchId,
        academicYearId: importedAcademicYearId,
        lifecycleStatus: { notIn: TERMINAL_LIFECYCLE_STATUSES },
        isAlumni: false,
        DateOfLeaving: null,
        sessions: {
          none: { academicYearId: importedAcademicYearId },
        },
      },
      include: {
        AcademicYear: { select: { id: true, name: true } },
        class: { select: { id: true, className: true } },
        section: { select: { id: true, name: true } },
      },
    }),
  ]);

  if (!importedEnrollments.length && !importedStudentsWithoutEnrollment.length) {
    return { created: 0, activeYearId: activeYear.id };
  }

  const studentIds = [
    ...importedEnrollments.map((enrollment) => enrollment.studentId),
    ...importedStudentsWithoutEnrollment.map((student) => student.userId),
  ];
  const currentEnrollments = await db.studentSession.findMany({
    where: {
      studentId: { in: studentIds },
      academicYearId: activeYear.id,
      status: "ACTIVE",
      enrollmentStatus: { in: ACTIVE_ENROLLMENT_STATUSES },
    },
    select: { studentId: true },
  });
  const activeStudentIds = new Set(currentEnrollments.map((enrollment) => enrollment.studentId));

  const candidates = importedEnrollments.filter((enrollment) => (
    !activeStudentIds.has(enrollment.studentId) &&
    enrollment.student &&
    !TERMINAL_LIFECYCLE_STATUSES.includes(enrollment.student.lifecycleStatus) &&
    !enrollment.student.isAlumni &&
    !enrollment.student.DateOfLeaving
  ));

  const data = candidates.map((enrollment) => {
    const suggestion = getResolutionSuggestion({ years, lastEnrollment: enrollment, activeYear });
    return {
      schoolId,
      studentId: enrollment.studentId,
      importBatchId,
      lastEnrollmentId: enrollment.id,
      activeAcademicYearId: activeYear.id,
      issueType: "MISSING_ACTIVE_SESSION_ENROLLMENT",
      category: suggestion.category,
      suggestedAction: suggestion.suggestedAction,
      confidence: suggestion.confidence,
      metadata: {
        ...suggestion.metadata,
        lastSession: enrollment.academicYear?.name || null,
        lastClass: enrollment.class?.className || null,
        lastSection: enrollment.section?.name || null,
        activeSession: activeYear.name,
      },
    };
  });

  const missingEnrollmentData = importedStudentsWithoutEnrollment
    .filter((student) => !activeStudentIds.has(student.userId))
    .map((student) => ({
      schoolId,
      studentId: student.userId,
      importBatchId,
      lastEnrollmentId: null,
      activeAcademicYearId: activeYear.id,
      issueType: "MISSING_IMPORTED_SESSION_DETAILS",
      category: "NEEDS_VERIFICATION",
      suggestedAction: "VERIFY",
      confidence: 50,
      metadata: {
        sessionGap: null,
        badge: "Missing Session Details",
        lastSession: student.AcademicYear?.name || null,
        lastClass: student.class?.className || null,
        lastSection: student.section?.name || null,
        activeSession: activeYear.name,
        reason: "Imported historical student has no session row, likely due incomplete class/section mapping.",
      },
    }));

  data.push(...missingEnrollmentData);

  if (!data.length) {
    return { created: 0, activeYearId: activeYear.id };
  }

  const result = await db.enrollmentResolutionIssue.createMany({
    data,
    skipDuplicates: true,
  });

  return { created: result.count, activeYearId: activeYear.id };
}

export async function countOpenEnrollmentIssues(schoolId, academicYearId = null, db = prisma) {
  const activeYear = await resolveActiveAcademicYear(schoolId, academicYearId, db);
  if (!activeYear) return { count: 0, academicYear: null };

  const count = await db.enrollmentResolutionIssue.count({
    where: {
      schoolId,
      activeAcademicYearId: activeYear.id,
      status: { in: ["OPEN", "IN_REVIEW"] },
    },
  });

  return { count, academicYear: activeYear };
}

export async function getOperationalEnrollmentMap({
  schoolId,
  academicYearId,
  studentIds,
  requireJoiningDate = false,
  db = prisma,
}) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  if (!ids.length) return new Map();

  const enrollments = await db.studentSession.findMany({
    where: {
      studentId: { in: ids },
      academicYearId,
      status: "ACTIVE",
      enrollmentStatus: { in: ACTIVE_ENROLLMENT_STATUSES },
      student: {
        schoolId,
        lifecycleStatus: { notIn: TERMINAL_LIFECYCLE_STATUSES },
        user: { deletedAt: null },
        ...(requireJoiningDate ? {
          admissionDate: { not: null },
          missingJoiningDate: false,
          NOT: [
            { profileStatus: "MISSING_JOIN_DATE" },
            { admissionDate: "" },
          ],
        } : {}),
      },
    },
    include: {
      class: { select: { id: true, className: true } },
      section: { select: { id: true, name: true } },
      student: {
        select: {
          userId: true,
          name: true,
          admissionNo: true,
          admissionDate: true,
          missingJoiningDate: true,
          profileStatus: true,
        },
      },
    },
  });

  return new Map(enrollments.map((enrollment) => [enrollment.studentId, enrollment]));
}

export async function assertOperationalStudentsForYear({
  schoolId,
  academicYearId,
  studentIds,
  moduleName = "this operation",
  requireJoiningDate = false,
  db = prisma,
}) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  const enrollmentMap = await getOperationalEnrollmentMap({
    schoolId,
    academicYearId,
    studentIds: ids,
    requireJoiningDate,
    db,
  });

  const blockedIds = ids.filter((id) => !enrollmentMap.has(id));
  if (blockedIds.length) {
    const reason = requireJoiningDate
      ? `Students must be actively enrolled in this academic session and have joining dates before ${moduleName}.`
      : `Students must be actively enrolled in this academic session before ${moduleName}.`;
    const error = new Error(reason);
    error.code = "OPERATIONAL_ENROLLMENT_REQUIRED";
    error.blockedStudentIds = blockedIds;
    error.enrollmentMap = enrollmentMap;
    throw error;
  }

  return enrollmentMap;
}
