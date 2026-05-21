import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET /api/schools/[schoolId]/examination/marks
// Fetch marks for a specific exam, class, and subject
export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const examId = searchParams.get('examId');
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');

    if (!examId || !classId || !subjectId) {
      return NextResponse.json(
        { error: 'Exam ID, Class ID, and Subject ID are required' },
        { status: 400 }
      );
    }

    const cacheKey = generateKey('examination:marks', { schoolId, examId, classId, subjectId });

    const studentMarks = await remember(cacheKey, async () => {
      const exam = await prisma.exam.findFirst({
        where: { id: examId, schoolId },
        select: { academicYearId: true },
      });
      if (!exam) return [];

      const enrollments = await prisma.studentSession.findMany({
        where: {
          academicYearId: exam.academicYearId,
          classId: parseInt(classId),
          status: "ACTIVE",
          enrollmentStatus: { in: ["ENROLLED", "PENDING_VERIFICATION"] },
          student: {
            schoolId,
            lifecycleStatus: { notIn: ["ALUMNI", "TC", "LEFT", "DROPPED", "ARCHIVED"] },
          },
        },
        select: {
          rollNumber: true,
          student: {
            select: {
              userId: true,
              name: true,
              rollNumber: true,
              admissionNo: true
            }
          }
        },
        orderBy: {
          rollNumber: 'asc'
        }
      });
      const students = enrollments.map((enrollment) => ({
        ...enrollment.student,
        rollNumber: enrollment.rollNumber || enrollment.student.rollNumber
      }));

      // Fetch existing marks
      const marks = await prisma.examResult.findMany({
        where: {
          examId: examId,
          subjectId: parseInt(subjectId),
          studentId: {
            in: students.map((s) => s.userId)
          }
        }
      });

      // Combine students with their marks
      return students.map((student) => {
        const mark = marks.find((m) => m.studentId === student.userId);
        return {
          ...student,
          marksObtained: mark?.marksObtained || '',
          grade: mark?.grade || '',
          remarks: mark?.remarks || '',
          isAbsent: mark?.isAbsent || false
        };
      });
    }, 300);

    return NextResponse.json(studentMarks);
  } catch (error) {
    console.error('Error fetching marks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marks' },
      { status: 500 }
    );
  }
});

// POST /api/schools/[schoolId]/examination/marks
// Bulk update marks
export const POST = withSchoolAccess(async function POST(req, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const body = await req.json();
    const { examId, subjectId, marks } = body; // marks: [{ studentId, marksObtained, grade, remarks, isAbsent }]

    if (!examId || !subjectId || !Array.isArray(marks)) {
      return NextResponse.json(
        { error: 'Invalid data provided' },
        { status: 400 }
      );
    }

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: { academicYearId: true }
    });
    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }
    const enrollmentCount = await prisma.studentSession.count({
      where: {
        academicYearId: exam.academicYearId,
        status: "ACTIVE",
        enrollmentStatus: { in: ["ENROLLED", "PENDING_VERIFICATION"] },
        studentId: { in: marks.map((mark) => mark.studentId) },
        student: { schoolId }
      }
    });
    if (enrollmentCount !== new Set(marks.map((mark) => mark.studentId)).size) {
      return NextResponse.json({
        error: 'Marks can only be submitted for students enrolled in the exam academic session.'
      }, { status: 400 });
    }

    // Use transaction for bulk update
    await prisma.$transaction(
      marks.map((mark) =>
      prisma.examResult.upsert({
        where: {
          examId_studentId_subjectId: {
            examId: examId,
            studentId: mark.studentId,
            subjectId: parseInt(subjectId)
          }
        },
        update: {
          marksObtained: mark.marksObtained !== '' ? parseFloat(mark.marksObtained) : null,
          grade: mark.grade,
          remarks: mark.remarks,
          isAbsent: mark.isAbsent
        },
        create: {
          examId: examId,
          studentId: mark.studentId,
          subjectId: parseInt(subjectId),
          marksObtained: mark.marksObtained !== '' ? parseFloat(mark.marksObtained) : null,
          grade: mark.grade,
          remarks: mark.remarks,
          isAbsent: mark.isAbsent
        }
      })
      )
    );

    await invalidatePattern(`examination:marks:*${schoolId}*`);
    await invalidatePattern(`examination:overview:*${schoolId}*`);

    return NextResponse.json({ message: 'Marks updated successfully' });
  } catch (error) {
    console.error('Error updating marks:', error);
    return NextResponse.json(
      { error: 'Failed to update marks' },
      { status: 500 }
    );
  }
});
