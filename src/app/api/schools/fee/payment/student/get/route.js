import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const classId = searchParams.get("classId"); // optional
        const academicYearId = searchParams.get("academicYearId"); // optional

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        // Fetch students with assigned fee structures
        const students = await prisma.student.findMany({
            where: {
                schoolId,
                ...(classId && { classId: parseInt(classId) }),
            },
            include: {
                StudentFeeStructure: {
                    where: {
                        ...(academicYearId && { academicYearId }),
                    },
                    include: {
                        feeParticulars: {
                            include: {
                                globalParticular: true,
                                StudentFeeInstallment:true,
                            },
                        },
                    },
                },
            },
        });

        return NextResponse.json(students, { status: 200 });
    } catch (err) {
        console.error("Error fetching student fees:", err);
        return NextResponse.json(
            { error: "Failed to fetch student fees", details: err.message },
            { status: 500 }
        );
    }
}
