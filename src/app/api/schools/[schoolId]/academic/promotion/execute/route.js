import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req, { params }) {
    const { schoolId } = await params;
    const body = await req.json();
    const { promotions, toYearId, promotedBy } = body;
    // promotions: [{ studentId, toClassId, toSectionId, status, remarks }]

    if (!promotions || !Array.isArray(promotions) || !toYearId || !promotedBy) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    try {
        const results = await prisma.$transaction(async (tx) => {
            const updates = [];

            for (const promo of promotions) {
                const { studentId, toClassId, toSectionId, status, remarks } = promo;

                if (!toSectionId) {
                    throw new Error(`Target section is required for student ${studentId}`);
                }

                const currentStudent = await tx.student.findUnique({
                    where: { userId: studentId },
                    select: { classId: true, academicYearId: true }
                });

                if (!currentStudent) continue;

                // Create History
                await tx.promotionHistory.create({
                    data: {
                        studentId,
                        fromClassId: currentStudent.classId,
                        toClassId: toClassId,
                        fromYearId: currentStudent.academicYearId,
                        toYearId: toYearId,
                        status,
                        remarks,
                        promotedBy
                    }
                });

                // Update Student
                const updatedStudent = await tx.student.update({
                    where: { userId: studentId },
                    data: {
                        academicYearId: toYearId,
                        classId: toClassId,
                        sectionId: toSectionId
                    }
                });

                updates.push(updatedStudent);
            }
            return updates;
        });

        return NextResponse.json({ message: "Promotions processed", count: results.length });
    } catch (error) {
        console.error("Error executing promotions:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
