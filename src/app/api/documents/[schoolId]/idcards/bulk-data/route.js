import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const POST = withSchoolAccess(async function POST(request, props) {
  const params = await props.params;
  try {
    const { schoolId } = params;
    const body = await request.json();
    const { classId, sectionId, studentIds } = body;
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true }
    });
    if (!activeYear) {
      return NextResponse.json({ error: 'No active academic year found' }, { status: 400 });
    }

    let whereClause = {
      academicYearId: activeYear.id,
      status: 'ACTIVE',
      enrollmentStatus: { in: ['ENROLLED', 'PENDING_VERIFICATION'] },
      student: {
        schoolId,
        lifecycleStatus: { notIn: ['ALUMNI', 'TC', 'LEFT', 'DROPPED', 'ARCHIVED'] },
      }
    };

    if (studentIds && studentIds.length > 0) {
      whereClause.studentId = { in: studentIds };
    } else {
      // If classId is provided, filter by class profile
      if (classId) {
        whereClause.classId = parseInt(classId);
      }
      if (sectionId && sectionId !== 'ALL') {
        whereClause.sectionId = parseInt(sectionId);
      }
    }

    // We need to fetch Students ensuring we get class/section details
    // Note: The Student model is linked to User.
    const enrollments = await prisma.studentSession.findMany({
      where: whereClause,
      include: {
        class: {
          select: { className: true }
        },
        section: {
          select: { name: true }
        },
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                profilePicture: true
              }
            },
            parent: {
              select: {
                fatherName: true,
                motherName: true,
                fatherMobile: true,
                address: true
              }
            }
          }
        },
      },
      orderBy: {
        rollNumber: 'asc'
      }
    });

    // Format for frontend
    const formattedStudents = enrollments.map((enrollment) => {
      const s = enrollment.student;
      return ({
      id: s.userId,
      name: s.user.name,
      rollNumber: enrollment.rollNumber || s.rollNumber,
      admissionNo: s.admissionNo,
      className: enrollment.class?.className,
      section: enrollment.section?.name,
      photo: s.user.profilePicture,
      dob: s.dateOfBirth,
      fatherName: s.parent?.fatherName,
      motherName: s.parent?.motherName,
      address: s.parent?.address,
      emergencyContact: s.parent?.fatherMobile,
      bloodGroup: s.bloodGroup
    });
    });

    return NextResponse.json({
      count: formattedStudents.length,
      students: formattedStudents
    });

  } catch (error) {
    console.error('Error fetching bulk ID card data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
});
