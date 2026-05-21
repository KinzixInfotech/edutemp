import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  const { schoolId } = params;
  const { searchParams } = new URL(req.url);
  const classId = parseInt(searchParams.get("classId"));
  const academicYearId = searchParams.get("academicYearId");

  if (!classId || !academicYearId) {
    return NextResponse.json({ error: "Missing classId or academicYearId" }, { status: 400 });
  }

  try {
    const enrollments = await prisma.studentSession.findMany({
      where: {
        academicYearId,
        classId,
        status: "ACTIVE",
        enrollmentStatus: { in: ["ENROLLED", "PENDING_VERIFICATION"] },
        student: {
          schoolId,
          lifecycleStatus: { notIn: ["ALUMNI", "TC", "LEFT", "DROPPED", "ARCHIVED"] },
          isAlumni: false,
          DateOfLeaving: null,
          user: { deletedAt: null },
        },
      },
      include: {
        section: {
          select: {
            id: true,
            name: true
          }
        },
        student: {
          include: {
            examResults: {
              where: {
                exam: {
                  academicYearId,
                  isFinalExam: true
                }
              },
              include: {
                exam: {
                  select: {
                    title: true,
                    type: true
                  }
                },
                subject: {
                  select: {
                    subjectName: true
                  }
                }
              }
            }
          },
        }
      },
      orderBy: {
        student: { name: 'asc' }
      }
    });

    // Process students to add recommended action
    const studentsWithStats = enrollments.map((enrollment) => {
      const student = enrollment.student;
      let totalMarks = 0;
      let passedExams = 0;
      let totalExams = 0;

      // Group results by exam
      const examMap = {};
      student.examResults.forEach((result) => {
        if (!examMap[result.examId]) {
          examMap[result.examId] = {
            title: result.exam.title,
            subjects: []
          };
        }
        examMap[result.examId].subjects.push({
          subject: result.subject.subjectName,
          marks: result.marksObtained,
          grade: result.grade
        });

        if (result.marksObtained) totalMarks += result.marksObtained;
      });

      return {
        id: student.userId,
        enrollmentId: enrollment.id,
        name: student.name,
        admissionNo: student.admissionNo,
        rollNumber: enrollment.rollNumber || student.rollNumber,
        sectionId: enrollment.sectionId,
        sectionName: enrollment.section?.name,
        classId: enrollment.classId,
        academicYearId: enrollment.academicYearId,
        examStats: {
          totalMarks,
          examCount: Object.keys(examMap).length,
          details: examMap
        },
        // Default recommendation: Promoted if they have some marks? 
        // For now, we default to PROMOTED, teacher can change
        recommendedStatus: "PROMOTED"
      };
    });

    return NextResponse.json(studentsWithStats);
  } catch (error) {
    console.error("Error fetching promotion candidates:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
});
