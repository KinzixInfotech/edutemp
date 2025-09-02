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

        // fetch structures
        const feeStructures = await prisma.feeStructure.findMany({
            where: {
                schoolId,
                ...(academicYearId && { academicYearId }),
            },
            include: {
                AcademicYear: {
                    select: { name: true, startDate: true, endDate: true },
                },
                feeParticulars: true,
                _count: { select: { FeePayments: true } }, // optional extra
            },
            orderBy: { createdAt: "desc" },
        });

        // add assigned info
        const data = await Promise.all(
            feeStructures.map(async (fs) => {
                const assignedCount = await prisma.studentFeeStructure.count({
                    where: {
                        feeParticulars: {
                            some: {
                                globalParticular: {
                                    feeStructureId: fs.id, // go via StudentFeeParticular → FeeParticular → FeeStructure
                                },
                            },
                        },
                    },
                });
                return {
                    ...fs,
                    assigned: assignedCount > 0,
                    assignedCount,
                };
            })
        );

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching fee structures:", error);
        return NextResponse.json(
            { error: "Failed to fetch fee structures", details: error.message },
            { status: 500 }
        );
    }
}
