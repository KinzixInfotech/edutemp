import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch competency assessments for students
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, subjectId, examId, academicYearId, termNumber } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const whereClause = {
            student: { schoolId },
            ...(studentId && { studentId }),
            ...(subjectId && { competency: { subjectId: Number(subjectId) } }),
            ...(examId && { examId }),
            ...(academicYearId && { academicYearId }),
            ...(termNumber && { termNumber: Number(termNumber) })
        };

        const assessments = await prisma.competencyAssessment.findMany({
            where: whereClause,
            include: {
                competency: {
                    include: {
                        subject: { select: { subjectName: true, id: true } }
                    }
                },
                student: { select: { name: true, rollNumber: true, admissionNo: true } },
                exam: { select: { title: true, id: true } },
                assessedBy: { select: { name: true, id: true } },
                academicYear: { select: { name: true, id: true } }
            },
            orderBy: [
                { competency: { subject: { subjectName: "asc" } } },
                { competency: { order: "asc" } }
            ]
        });

        return NextResponse.json({ assessments });
    } catch (err) {
        console.error("Error fetching competency assessments:", err);
        return NextResponse.json(
            { error: "Failed to fetch assessments", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Record competency assessments for students
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

    try {
        // Validate all students belong to this school
        const studentIds = [...new Set(assessments.map(a => a.studentId))];
        const students = await prisma.student.findMany({
            where: { userId: { in: studentIds }, schoolId }
        });

        if (students.length !== studentIds.length) {
            return NextResponse.json(
                { error: "Some students not found in this school" },
                { status: 404 }
            );
        }

        // Upsert assessments
        const results = await prisma.$transaction(
            assessments.map(assessment =>
                prisma.competencyAssessment.upsert({
                    where: {
                        studentId_competencyId_academicYearId_termNumber: {
                            studentId: assessment.studentId,
                            competencyId: assessment.competencyId,
                            academicYearId: assessment.academicYearId,
                            termNumber: assessment.termNumber
                        }
                    },
                    update: {
                        grade: assessment.grade,
                        remarks: assessment.remarks || null,
                        examId: assessment.examId || null,
                        assessedById,
                        assessedAt: new Date()
                    },
                    create: {
                        studentId: assessment.studentId,
                        competencyId: assessment.competencyId,
                        academicYearId: assessment.academicYearId,
                        termNumber: assessment.termNumber,
                        grade: assessment.grade,
                        remarks: assessment.remarks || null,
                        examId: assessment.examId || null,
                        assessedById
                    }
                })
            )
        );

        return NextResponse.json({
            message: "Assessments recorded successfully",
            count: results.length
        });
    } catch (err) {
        console.error("Error recording assessments:", err);
        return NextResponse.json(
            { error: "Failed to record assessments", message: err.message },
            { status: 500 }
        );
    }
}
