import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { remember, generateKey } from "@/lib/cache";

// GET - Get class statistics
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    let academicYearId = searchParams.get('academicYearId');

    // Auto-resolve active year
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true }
      });
      if (activeYear) academicYearId = activeYear.id;
    }

    const cacheKey = generateKey('classes:stats', { schoolId, academicYearId });

    const stats = await remember(cacheKey, async () => {
      const yearFilter = academicYearId ? { academicYearId } : {};

      // Get total classes
      const totalClasses = await prisma.class.count({
        where: { schoolId, ...yearFilter }
      });

      // Get total sections
      const totalSections = await prisma.section.count({
        where: { schoolId, ...(academicYearId ? { class: { academicYearId } } : {}) }
      });

      // Get total students
      const totalStudents = await prisma.student.count({
        where: { schoolId, isAlumni: false, ...(academicYearId ? { class: { academicYearId } } : {}) }
      });

      // Sections without class teacher
      const sectionsWithoutTeacher = await prisma.section.count({
        where: { schoolId, teachingStaffUserId: null, ...(academicYearId ? { class: { academicYearId } } : {}) }
      });

      // Empty sections (0 students)
      const sectionsWithStudents = await prisma.section.findMany({
        where: { schoolId, ...(academicYearId ? { class: { academicYearId } } : {}) },
        select: {
          id: true,
          _count: { select: { students: true } }
        }
      });
      const emptySections = sectionsWithStudents.filter((s) => s._count.students === 0).length;

      // Total distinct teachers assigned to sections
      const teachersAssigned = await prisma.section.findMany({
        where: {
          schoolId,
          teachingStaffUserId: { not: null },
          ...(academicYearId ? { class: { academicYearId } } : {})
        },
        select: { teachingStaffUserId: true },
        distinct: ['teachingStaffUserId']
      });
      const totalTeachersAssigned = teachersAssigned.length;

      // Get students per class breakdown
      const classesWithCounts = await prisma.class.findMany({
        where: { schoolId, ...yearFilter },
        include: {
          sections: {
            include: {
              _count: {
                select: {
                  students: true
                }
              }
            }
          }
        },
        orderBy: {
          className: 'asc'
        }
      });

      // Calculate breakdown
      const breakdown = classesWithCounts.map((cls) => {
        const studentCount = cls.sections.reduce((sum, sec) => sum + sec._count.students, 0);
        return {
          className: cls.className,
          sectionCount: cls.sections.length,
          studentCount
        };
      });

      const avgStudentsPerClass = totalClasses > 0 ?
      Math.round(totalStudents / totalClasses) :
      0;

      return {
        totalClasses,
        totalSections,
        totalStudents,
        avgStudentsPerClass,
        sectionsWithoutTeacher,
        emptySections,
        totalTeachersAssigned,
        breakdown
      };
    }, 300); // Cache for 5 minutes

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching class stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch class statistics" },
      { status: 500 }
    );
  }
});