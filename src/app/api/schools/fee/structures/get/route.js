import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }

        const feeStructures = await prisma.feeStructure.findMany({
            where: {
                schoolId,
                ...(academicYearId && { academicYearId }),
            },
            include: {
                AcademicYear: { // <-- fix capitalization
                    select: { name: true, startDate: true, endDate: true },
                },
                feeParticulars: true, // fee particulars will now be included
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(feeStructures);
    } catch (error) {
        console.error("Error fetching fee structures:", error);
        return NextResponse.json(
            { error: "Failed to fetch fee structures", details: error.message },
            { status: 500 }
        );
    }
}
