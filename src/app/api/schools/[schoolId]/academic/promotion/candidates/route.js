import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, props) {
  const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);
    const classId = parseInt(searchParams.get("classId"));
    const academicYearId = searchParams.get("academicYearId");

    if (!classId || !academicYearId) {
        return NextResponse.json({ error: "Missing classId or academicYearId" }, { status: 400 });
    }

    try {
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId,
                academicYearId
            },
            include: {
                examResults: {
                    where: {
                        exam: {
                            academicYearId: academicYearId,
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
                },
                section: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            }
        });

        // Process students to add recommended action
        const studentsWithStats = students.map(student => {
            let totalMarks = 0;
            let passedExams = 0;
            let totalExams = 0;

            // Group results by exam
            const examMap = {};
            student.examResults.forEach(result => {
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
                name: student.name,
                admissionNo: student.admissionNo,
                rollNumber: student.rollNumber,
                sectionName: student.section?.name,
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
}
