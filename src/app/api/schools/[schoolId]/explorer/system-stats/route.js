import { withSchoolAccess } from "@/lib/api-auth"; // API to fetch school stats from existing system
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const GET = withSchoolAccess(async function GET(req, props) {
  try {
    const params = await props.params;
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

    // Get total students (filtered by academic year)
    const totalStudents = await prisma.student.count({
      where: { schoolId, ...(academicYearId ? { class: { academicYearId } } : {}) }
    });

    // Get total teaching staff
    const totalTeachingStaff = await prisma.teachingStaff.count({
      where: { schoolId }
    });

    // Get total non-teaching staff
    const totalNonTeachingStaff = await prisma.nonTeachingStaff.count({
      where: { schoolId }
    });

    // Calculate ratio
    const studentTeacherRatio = totalTeachingStaff > 0 ?
    Math.round(totalStudents / totalTeachingStaff) :
    0;

    return NextResponse.json({
      totalStudents,
      totalTeachers: totalTeachingStaff,
      totalNonTeachingStaff,
      studentTeacherRatio
    });

  } catch (error) {
    console.error('[SYSTEM STATS API ERROR]', error);
    return NextResponse.json(
      { error: 'Failed to fetch system stats' },
      { status: 500 }
    );
  }
});