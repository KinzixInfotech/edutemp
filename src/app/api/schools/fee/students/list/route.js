import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const GET = withSchoolAccess(async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    let academicYearId = searchParams.get('academicYearId');

    if (!schoolId) {
      return NextResponse.json({ error: 'Missing schoolId' }, { status: 400 });
    }

    // Auto-resolve academicYearId from active year if not provided
    if (!academicYearId) {
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true }
      });
      if (!activeYear) {
        return NextResponse.json({ error: 'No active academic year found' }, { status: 400 });
      }
      academicYearId = activeYear.id;
    }

    const enrollmentFilters = {
      academicYearId,
      status: 'ACTIVE',
      enrollmentStatus: { in: ['ENROLLED', 'PENDING_VERIFICATION'] },
      student: {
        schoolId,
        lifecycleStatus: { notIn: ['ALUMNI', 'TC', 'LEFT', 'DROPPED', 'ARCHIVED'] },
        user: { deletedAt: null },
      },
    };

    if (classId) enrollmentFilters.classId = parseInt(classId, 10);

    const enrollments = await prisma.studentSession.findMany({
      where: enrollmentFilters,
      select: {
        id: true,
        studentId: true,
        rollNumber: true,
        classId: true,
        sectionId: true,
        class: {
          select: {
            id: true,
            className: true
          }
        },
        section: {
          select: {
            id: true,
            name: true
          }
        },
        student: {
          select: {
            userId: true,
            admissionNo: true,
            rollNumber: true,
            name: true,
            admissionDate: true,
            missingJoiningDate: true,
            profileStatus: true,
            studentFees: {
              where: { academicYearId },
              select: {
                id: true,
                finalAmount: true,
                paidAmount: true,
                balanceAmount: true,
                status: true
              },
              take: 1,
              orderBy: {
                assignedDate: 'desc'
              }
            }
          }
        },
      },
      orderBy: [
      { class: { className: 'asc' } },
      { section: { name: 'asc' } },
      { rollNumber: 'asc' }]

    });

    const transformedStudents = enrollments.map((enrollment) => ({
      ...enrollment.student,
      enrollmentId: enrollment.id,
      rollNumber: enrollment.rollNumber || enrollment.student.rollNumber,
      classId: enrollment.classId,
      sectionId: enrollment.sectionId,
      academicYearId,
      class: enrollment.class,
      section: enrollment.section,
      fee: enrollment.student.studentFees?.[0] || null,
      studentFees: undefined
    }));

    return NextResponse.json(transformedStudents);
  } catch (error) {
    console.error('Error fetching students list:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
});
