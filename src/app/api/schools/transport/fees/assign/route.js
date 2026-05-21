import { withSchoolAccess } from "@/lib/api-auth"; // app/api/schools/transport/fees/assign/route.js
// Assign transport fee to students

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';
import { studentMissingJoiningDate } from '@/lib/student-profile-status';
import { assertOperationalStudentsForYear, resolveActiveAcademicYear } from '@/lib/enrollment/session-enrollment';

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const data = await req.json();
    const { transportFeeId, studentIds, startDate, endDate } = data;

    if (!transportFeeId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !startDate) {
      return NextResponse.json({
        error: 'Missing required fields: transportFeeId, studentIds (array), startDate'
      }, { status: 400 });
    }

    // Verify fee exists
    const fee = await prisma.transportFee.findUnique({
      where: { id: transportFeeId },
      select: { id: true, schoolId: true }
    });
    if (!fee) {
      return NextResponse.json({ error: 'Transport fee not found' }, { status: 404 });
    }
    const activeYear = await resolveActiveAcademicYear(fee.schoolId, data.academicYearId || null);
    if (!activeYear) {
      return NextResponse.json({ error: 'No active academic year found for transport assignment.' }, { status: 400 });
    }

    try {
      await assertOperationalStudentsForYear({
        schoolId: fee.schoolId,
        academicYearId: activeYear.id,
        studentIds,
        moduleName: 'assigning transport fee',
        requireJoiningDate: true,
      });
    } catch (error) {
      return NextResponse.json({
        error: error.message,
        code: error.code || 'OPERATIONAL_ENROLLMENT_REQUIRED',
        blockedStudentIds: error.blockedStudentIds || [],
      }, { status: 400 });
    }

    const missingStudents = await prisma.student.findMany({
      where: { userId: { in: studentIds }, schoolId: fee.schoolId },
      select: {
        userId: true,
        name: true,
        admissionNo: true,
        admissionDate: true,
        missingJoiningDate: true,
        profileStatus: true,
      },
    }).then((students) => students.filter(studentMissingJoiningDate));

    if (missingStudents.length) {
      return NextResponse.json({
        error: `${missingStudents.length} student(s) are missing joining date. Transport fee cannot be assigned until joining date is assigned.`,
        code: 'MISSING_JOINING_DATE',
        students: missingStudents.map((student) => ({
          studentId: student.userId,
          name: student.name,
          admissionNo: student.admissionNo,
        })),
      }, { status: 400 });
    }

    // Assign to students
    const results = await prisma.$transaction(async (tx) => {
      const assignments = [];

      for (const studentId of studentIds) {
        try {
          const assignment = await tx.studentTransportFee.upsert({
            where: { studentId_transportFeeId: { studentId, transportFeeId } },
            update: {
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null,
              isActive: true
            },
            create: {
              studentId,
              transportFeeId,
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null
            }
          });
          assignments.push({ studentId, success: true, id: assignment.id });
        } catch (err) {
          assignments.push({ studentId, success: false, error: err.message });
        }
      }

      return assignments;
    });

    await invalidatePattern(`transport-fees:*schoolId:${fee.schoolId}*`);

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({
      success: true,
      message: `Assigned transport fee to ${successCount} of ${studentIds.length} students`,
      results
    });
  } catch (error) {
    console.error('Error assigning transport fee:', error);
    return NextResponse.json({ error: 'Failed to assign transport fee' }, { status: 500 });
  }
});
