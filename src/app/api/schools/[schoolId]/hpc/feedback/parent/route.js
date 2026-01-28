import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Fetch parent feedback for students
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const { studentId, parentId, academicYearId, termNumber } = searchParams;

    if (!schoolId) {
        return NextResponse.json({ error: "School ID is required" }, { status: 400 });
    }

    try {
        const feedback = await prisma.parentFeedback.findMany({
            where: {
                student: { schoolId },
                ...(studentId && { studentId }),
                ...(parentId && { parentId }),
                ...(academicYearId && { academicYearId }),
                ...(termNumber && { termNumber: Number(termNumber) })
            },
            include: {
                student: { select: { name: true, rollNumber: true, admissionNo: true } },
                parent: { select: { name: true } },
                academicYear: { select: { name: true } }
            },
            orderBy: { submittedAt: "desc" }
        });

        return NextResponse.json({ feedback });
    } catch (err) {
        console.error("Error fetching parent feedback:", err);
        return NextResponse.json(
            { error: "Failed to fetch feedback", message: err.message },
            { status: 500 }
        );
    }
}

// POST - Submit parent feedback
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const body = await req.json();
    const { studentId, parentId, academicYearId, termNumber, childInterest, homeParticipation, observations, suggestions } = body;

    if (!schoolId || !studentId || !parentId || !academicYearId || !termNumber) {
        return NextResponse.json(
            { error: "studentId, parentId, academicYearId, and termNumber are required" },
            { status: 400 }
        );
    }

    try {
        // Verify parent belongs to school
        const parent = await prisma.parent.findFirst({
            where: { id: parentId, schoolId }
        });

        if (!parent) {
            return NextResponse.json(
                { error: "Parent not found in this school" },
                { status: 404 }
            );
        }

        const feedback = await prisma.parentFeedback.upsert({
            where: {
                studentId_parentId_academicYearId_termNumber: {
                    studentId,
                    parentId,
                    academicYearId,
                    termNumber: Number(termNumber)
                }
            },
            update: {
                childInterest: childInterest || null,
                homeParticipation: homeParticipation || null,
                observations: observations || null,
                suggestions: suggestions || null,
                submittedAt: new Date()
            },
            create: {
                studentId,
                parentId,
                academicYearId,
                termNumber: Number(termNumber),
                childInterest: childInterest || null,
                homeParticipation: homeParticipation || null,
                observations: observations || null,
                suggestions: suggestions || null
            }
        });

        return NextResponse.json({
            message: "Feedback submitted successfully",
            feedback
        });
    } catch (err) {
        console.error("Error submitting parent feedback:", err);
        return NextResponse.json(
            { error: "Failed to submit feedback", message: err.message },
            { status: 500 }
        );
    }
}
