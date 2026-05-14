import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidateStudentDirectoryCaches } from "@/lib/cache";
import { parseImportDate } from "@/lib/student-import-normalization";
import { STUDENT_PROFILE_STATUS } from "@/lib/student-profile-status";

const missingWhere = {
  OR: [
    { missingJoiningDate: true },
    { profileStatus: STUDENT_PROFILE_STATUS.MISSING_JOIN_DATE },
    { admissionDate: null },
    { admissionDate: "" },
  ],
};

export const GET = withSchoolAccess(async function GET(req, props) {
  const { schoolId } = await props.params;
  const academicYearId = req.nextUrl.searchParams.get("academicYearId") || null;

  const students = await prisma.student.findMany({
    where: {
      schoolId,
      AND: [
        missingWhere,
        ...(academicYearId ? [{ OR: [{ academicYearId }, { class: { academicYearId } }] }] : []),
      ],
    },
    select: {
      userId: true,
      name: true,
      admissionNo: true,
      admissionDate: true,
      missingJoiningDate: true,
      profileStatus: true,
      class: { select: { className: true } },
      section: { select: { name: true } },
    },
    orderBy: [{ class: { className: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json({ students, count: students.length });
});

export const PATCH = withSchoolAccess(async function PATCH(req, props) {
  const { schoolId } = await props.params;
  const body = await req.json();
  const updates = Array.isArray(body.updates) ? body.updates : [];

  if (!updates.length) {
    return NextResponse.json({ error: "No joining date updates provided." }, { status: 400 });
  }

  const validUpdates = [];
  const errors = [];

  for (const update of updates) {
    const studentId = String(update.studentId || "").trim();
    const parsedDate = parseImportDate(update.admissionDate);

    if (!studentId) {
      errors.push({ studentId, error: "Missing student ID." });
      continue;
    }

    if (!parsedDate) {
      errors.push({ studentId, error: "Invalid joining date. Use YYYY-MM-DD or DD/MM/YYYY." });
      continue;
    }

    validUpdates.push({ studentId, admissionDate: parsedDate });
  }

  if (!validUpdates.length) {
    return NextResponse.json({ error: "No valid joining dates found.", errors }, { status: 400 });
  }

  const result = await prisma.$transaction(
    validUpdates.map((update) =>
      prisma.student.updateMany({
        where: { userId: update.studentId, schoolId },
        data: {
          admissionDate: update.admissionDate,
          missingJoiningDate: false,
          profileStatus: STUDENT_PROFILE_STATUS.ACTIVE,
        },
      })
    )
  );

  await invalidateStudentDirectoryCaches({ schoolId });

  return NextResponse.json({
    success: true,
    updated: result.reduce((sum, item) => sum + item.count, 0),
    errors,
  });
});
