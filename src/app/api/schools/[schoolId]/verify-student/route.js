// src/app/api/schools/[schoolId]/verify-student/route.js
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { admissionNo } = await req.json();

    try {
        if (!admissionNo) {
            return NextResponse.json(
                { error: "Admission number is required" },
                { status: 400 }
            );
        }

        // Find student by admission number
        const student = await prisma.student.findFirst({
            where: {
                schoolId,
                admissionNo: admissionNo.toUpperCase(),
            },
            include: {
                class: {
                    select: {
                        className: true,
                    },
                },
                section: {
                    select: {
                        name: true,
                    },
                },
                user: {
                    select: {
                        profilePicture: true,
                    },
                },
            },
        });

        if (!student) {
            return NextResponse.json(
                { error: "Student not found with this admission number" },
                { status: 404 }
            );
        }

        // Return basic student info (without sensitive data)
        return NextResponse.json({
            student: {
                userId: student.userId,
                name: student.name,
                admissionNo: student.admissionNo,
                rollNumber: student.rollNumber,
                class: student.class,
                section: student.section,
                profilePicture: student.user.profilePicture,
            },
        });
    } catch (error) {
        console.error("[VERIFY_STUDENT]", error);
        return NextResponse.json(
            { error: "Failed to verify student" },
            { status: 500 }
        );
    }
}
