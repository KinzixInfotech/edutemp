import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // prisma client

// GET fee structures by schoolId (and optional academicYearId)
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId"); // optional

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        const feeStructures = await prisma.feeStructure.findMany({
            where: {
                schoolId,
                ...(academicYearId && { academicYearId }), // add filter only if provided
            },
            include: {
                academicYear: {
                    select: {
                        name: true,
                        startDate: true,
                        endDate: true,
                    },
                },
                school: false, // won't be included
            },

            orderBy: {
                issueDate: "desc",
            },
        });

        return NextResponse.json(feeStructures);
    } catch (error) {
        console.error("Error fetching fee structures:", error.message, error.stack);
        return NextResponse.json(
            { error: "Failed to fetch fee structures", details: error.message },
            { status: 500 }
        );
    }
}
