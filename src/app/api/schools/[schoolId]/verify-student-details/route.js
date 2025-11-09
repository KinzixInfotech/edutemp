
// src/app/api/schools/[schoolId]/verify-student-details/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { studentId, email, phoneNumber } = await req.json();

    try {
        if (!studentId || !email || !phoneNumber) {
            return NextResponse.json(
                { error: "All fields are required" },
                { status: 400 }
            );
        }
        console.log(studentId, schoolId, email, phoneNumber);

        // Find student and verify details
        const student = await prisma.student.findFirst({
            where: {
                userId: studentId,
                schoolId,
                email,
                contactNumber: phoneNumber,
            },
        });

        if (!student) {
            return NextResponse.json(
                { error: "Details do not match our records" },
                { status: 404 }
            );
        }

        // Check if student already has a parent linked
        const existingLinks = await prisma.studentParentLink.findMany({
            where: {
                studentId: student.userId,
            },
            include: {
                parent: {
                    select: {
                        name: true,
                        contactNumber: true,
                    },
                },
            },
        });

        return NextResponse.json({
            verified: true,
            student: {
                userId: student.userId,
                name: student.name,
            },
            existingParents: existingLinks.map((link) => ({
                name: link.parent.name,
                relation: link.relation,
            })),
        });
    } catch (error) {
        console.error("[VERIFY_STUDENT_DETAILS]", error);
        return NextResponse.json(
            { error: "Failed to verify details" },
            { status: 500 }
        );
    }
}