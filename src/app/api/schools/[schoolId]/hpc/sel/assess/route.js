import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { notifyHPCAssessmentUpdated } from "@/lib/notifications/notificationHelper";

// GET - Fetch SEL assessments for students
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, parameterId, academicYearId, termNumber } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const assessments = await prisma.sELAssessment.findMany({
            where: {
                student: { schoolId },
                ...(studentId && { studentId }),
                ...(parameterId && { parameterId }),
                ...(academicYearId && { academicYearId }),
                ...(termNumber && { termNumber: Number(termNumber) })
            },
            include: {
                parameter: { select: { name: true, category: true } },
                student: { select: { name: true, rollNumber: true } },
                assessedBy: { select: { name: true } },
                academicYear: { select: { name: true } }
            },
            orderBy: [
                { parameter: { category: "asc" } },
                { parameter: { order: "asc" } }
            ]
        });

        return NextResponse.json({ assessments });
    } catch (err) {
        console.error("Error fetching SEL assessments:", err);
        return NextResponse.json(
            { error: "Failed to fetch SEL assessments", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Record SEL assessments
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { assessments, assessedById } = body;

    if (!schoolId || !assessments || !Array.isArray(assessments) || !assessedById) {
        return NextResponse.json(
            { error: "schoolId, assessments array, and assessedById are required" },
            { status: 400 }
        );
    }

    // Valid SEL grades
    const validGrades = ["NEEDS_IMPROVEMENT", "DEVELOPING", "PROFICIENT", "EXCELLENT"];

    try {
        const results = await prisma.$transaction(
            assessments.map(assessment => {
                if (!validGrades.includes(assessment.grade)) {
                    throw new Error(`Invalid grade: ${assessment.grade}. Must be one of: ${validGrades.join(", ")}`);
                }

                return prisma.sELAssessment.upsert({
                    where: {
                        studentId_parameterId_academicYearId_termNumber: {
                            studentId: assessment.studentId,
                            parameterId: assessment.parameterId,
                            academicYearId: assessment.academicYearId,
                            termNumber: assessment.termNumber
                        }
                    },
                    update: {
                        grade: assessment.grade,
                        remarks: assessment.remarks || null,
                        assessedById,
                        assessedAt: new Date()
                    },
                    create: {
                        studentId: assessment.studentId,
                        parameterId: assessment.parameterId,
                        academicYearId: assessment.academicYearId,
                        termNumber: assessment.termNumber,
                        grade: assessment.grade,
                        remarks: assessment.remarks || null,
                        assessedById
                    }
                });
            })
        );

        // Send notification to student and parents (non-blocking)
        if (assessments.length > 0) {
            const firstAssessment = assessments[0];

            // Get student and teacher names for notification
            const [student, teacher] = await Promise.all([
                prisma.student.findUnique({
                    where: { userId: firstAssessment.studentId },
                    select: { name: true }
                }),
                prisma.user.findUnique({
                    where: { id: assessedById },
                    select: { name: true }
                })
            ]);

            // Fire and forget - don't wait for notification
            notifyHPCAssessmentUpdated({
                schoolId,
                studentId: firstAssessment.studentId,
                studentName: student?.name,
                teacherName: teacher?.name,
                teacherId: assessedById,
                termNumber: firstAssessment.termNumber,
                assessmentCount: results.length
            }).catch(err => console.error('[HPC API] Notification error:', err));
        }

        return NextResponse.json({
            message: "SEL assessments recorded successfully",
            count: results.length
        });
    } catch (err) {
        console.error("Error recording SEL assessments:", err);
        return NextResponse.json(
            { error: "Failed to record SEL assessments", message: err.message },
            { status: 500 }
        );
    }
}
