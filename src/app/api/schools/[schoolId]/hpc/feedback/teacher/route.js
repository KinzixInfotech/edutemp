import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch teacher feedback for students
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, teacherId, academicYearId, termNumber } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const feedback = await prisma.teacherFeedback.findMany({
            where: {
                student: { schoolId },
                ...(studentId && { studentId }),
                ...(teacherId && { teacherId }),
                ...(academicYearId && { academicYearId }),
                ...(termNumber && { termNumber: Number(termNumber) })
            },
            include: {
                student: { select: { name: true, rollNumber: true, admissionNo: true } },
                teacher: { select: { name: true, designation: true } },
                academicYear: { select: { name: true } }
            },
            orderBy: { submittedAt: "desc" }
        });

        return NextResponse.json({ feedback });
    } catch (err) {
        console.error("Error fetching teacher feedback:", err);
        return NextResponse.json(
            { error: "Failed to fetch feedback", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Submit teacher narrative feedback
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { studentId, teacherId, academicYearId, termNumber, strengths, areasToImprove, suggestions, overallRemarks } = body;

    if (!schoolId || !studentId || !teacherId || !academicYearId || !termNumber || !strengths) {
        return NextResponse.json(
            { error: "studentId, teacherId, academicYearId, termNumber, and strengths are required" },
            { status: 400 }
        );
    }

    try {
        // Verify teacher belongs to school
        const teacher = await prisma.teachingStaff.findFirst({
            where: { userId: teacherId, schoolId }
        });

        if (!teacher) {
            return NextResponse.json(
                { error: "Teacher not found in this school" },
                { status: 404 }
            );
        }

        const feedback = await prisma.teacherFeedback.upsert({
            where: {
                studentId_teacherId_academicYearId_termNumber: {
                    studentId,
                    teacherId,
                    academicYearId,
                    termNumber: Number(termNumber)
                }
            },
            update: {
                strengths,
                areasToImprove: areasToImprove || null,
                suggestions: suggestions || null,
                overallRemarks: overallRemarks || null,
                submittedAt: new Date()
            },
            create: {
                studentId,
                teacherId,
                academicYearId,
                termNumber: Number(termNumber),
                strengths,
                areasToImprove: areasToImprove || null,
                suggestions: suggestions || null,
                overallRemarks: overallRemarks || null
            }
        });

        return NextResponse.json({
            message: "Feedback submitted successfully",
            feedback
        });
    } catch (err) {
        console.error("Error submitting teacher feedback:", err);
        return NextResponse.json(
            { error: "Failed to submit feedback", message: err.message },
            { status: 500 }
        );
    }
}
