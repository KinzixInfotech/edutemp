import { NextResponse } from "next/server";
import prisma from "@/lib/prisma"; // make sure you have this

// GET /api/schools/fee/structures/status?schoolId=xxx
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");

        if (!schoolId) {
            return NextResponse.json(
                { error: "Missing schoolId" },
                { status: 400 }
            );
        }

        // Fetch fee structures for this school
        const feeStructures = await prisma.feeStructure.findMany({
            where: { schoolId },
            include: {
                AcademicYear: true,
                feeParticulars: true,
                _count: { select: { FeePayments: true } },
            },
        });

        // Add assignment info
        const data = await Promise.all(
            feeStructures.map(async (fs) => {
                const assignedCount = await prisma.studentFeeStructure.count({
                    where: {
                        feeStructureId: fs.id, // ✅ directly use relation instead of going through particulars
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
        console.error(error);
        return NextResponse.json(
            { error: "Failed to fetch fee structure status" },
            { status: 500 }
        );
    }
}
