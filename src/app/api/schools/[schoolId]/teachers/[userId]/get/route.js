import { withSchoolAccess } from "@/lib/api-auth"; // app/api/schools/[schoolId]/teachers/[userId]/get/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { remember, generateKey } from "@/lib/cache";

const CACHE_TTL = 300; // 5 minutes
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const detail = searchParams.get("detail") === "true";

  const { schoolId, userId } = params;

  const cacheKey = generateKey('teacher-get', { schoolId, userId, detail: detail ? 'true' : 'false' });

  const result = await remember(cacheKey, async () => {
    // BASIC FIELDS (no heavy relations)
    const basicSelect = {
      userId: true,
      name: true,
      designation: true,
      gender: true,
      contactNumber: true,
      email: true,
      sectionsAssigned: true,
      Class: true,
      employeeId: true
    };

    // FULL DETAILS (ALL RELATIONS)
    const detailedInclude = {
      department: true,
      school: true,
      AcademicYear: true,
      subjects: true,
      sectionsAssigned: {
        include: {
          class: true
        }
      },
      Class: true,
      homework: true,
      SectionSubjectTeacher: true,
      user: true
    };

    const teacher = await prisma.teachingStaff.findUnique({
      where: { userId, schoolId },
      ...(detail ?
      { include: detailedInclude } :
      { select: basicSelect })

    });

    // Filter sectionsAssigned to only include sections from classes that have active students
    // This avoids returning stale sections from old/duplicate class sets
    if (teacher?.sectionsAssigned?.length > 0) {
      const sectionClassIds = [...new Set(teacher.sectionsAssigned.map((s) => s.classId))];
      const classesWithStudents = await prisma.student.groupBy({
        by: ['classId'],
        where: {
          schoolId,
          classId: { in: sectionClassIds },
          user: { deletedAt: null, status: 'ACTIVE' }
        },
        _count: { userId: true }
      });
      const activeClassIds = new Set(classesWithStudents.map((c) => c.classId));
      if (activeClassIds.size > 0) {
        teacher.sectionsAssigned = teacher.sectionsAssigned.filter((s) => activeClassIds.has(s.classId));
      }
    }

    return teacher ? { teacher } : null;
  }, CACHE_TTL);

  if (!result)
  return NextResponse.json({ error: "Teacher not found" }, { status: 404 });

  return NextResponse.json(result, { status: 200 });
});