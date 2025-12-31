import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Clone fee structures from one academic year to another
 * POST /api/schools/academic-years/clone/fees
 */
export async function POST(req) {
    try {
        const body = await req.json();
        const { fromYearId, toYearId, schoolId } = body;

        if (!fromYearId || !toYearId || !schoolId) {
            return NextResponse.json(
                { error: "fromYearId, toYearId, and schoolId are required" },
                { status: 400 }
            );
        }

        // Verify both years belong to the same school
        const [fromYear, toYear] = await Promise.all([
            prisma.academicYear.findFirst({ where: { id: fromYearId, schoolId } }),
            prisma.academicYear.findFirst({ where: { id: toYearId, schoolId } }),
        ]);

        if (!fromYear || !toYear) {
            return NextResponse.json(
                { error: "Invalid academic years or school mismatch" },
                { status: 400 }
            );
        }

        // Get all fee structures from source year with particulars
        const sourceFees = await prisma.feeStructure.findMany({
            where: { academicYearId: fromYearId, schoolId },
            include: { feeParticulars: true },
        });

        if (sourceFees.length === 0) {
            return NextResponse.json(
                { error: "No fee structures found in source year to clone" },
                { status: 404 }
            );
        }

        // Check what already exists in target year
        const existingFees = await prisma.feeStructure.findMany({
            where: { academicYearId: toYearId },
            select: { name: true },
        });
        const existingNames = new Set(existingFees.map(f => f.name));

        // Clone only fee structures that don't exist
        let clonedCount = 0;
        for (const fee of sourceFees) {
            if (existingNames.has(fee.name)) continue;

            // Create fee structure
            const newFee = await prisma.feeStructure.create({
                data: {
                    name: fee.name,
                    academicYearId: toYearId,
                    schoolId: schoolId,
                    classId: fee.classId, // May need to map to new year's class
                    mode: fee.mode,
                    isInstallment: fee.isInstallment,
                },
            });

            // Create fee particulars for this structure
            if (fee.feeParticulars?.length > 0) {
                await prisma.feeParticular.createMany({
                    data: fee.feeParticulars.map(fp => ({
                        title: fp.title,
                        amount: fp.amount,
                        paymentMonths: fp.paymentMonths,
                        feeStructureId: newFee.id,
                        type: fp.type,
                    })),
                });
            }

            clonedCount++;
        }

        // Update setup status
        await prisma.academicYear.update({
            where: { id: toYearId },
            data: { feesConfigured: true },
        });

        return NextResponse.json({
            success: true,
            count: clonedCount,
            message: `Cloned ${clonedCount} fee structures with particulars`,
        });
    } catch (error) {
        console.error("Clone fees error:", error);
        return NextResponse.json(
            { error: "Failed to clone fee structures" },
            { status: 500 }
        );
    }
}
