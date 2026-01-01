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
        // Debug: Log what we're querying
        console.log("Clone Fees Debug [v3]:", {
            fromYearId,
            toYearId,
            schoolId
        });

        // Fetch classes for both years to map them by name
        const [sourceClasses, targetClasses] = await Promise.all([
            prisma.class.findMany({ where: { academicYearId: fromYearId, schoolId } }),
            prisma.class.findMany({ where: { academicYearId: toYearId, schoolId } })
        ]);

        // Create a map of ClassName -> TargetClassId
        const targetClassMap = new Map();
        targetClasses.forEach(c => {
            if (c.className) targetClassMap.set(c.className, c.id);
        });

        // Debug: Log class mapping
        console.log("Class Mapping:", {
            sourceClassesCount: sourceClasses.length,
            targetClassesCount: targetClasses.length,
            mappedClasses: targetClassMap.size
        });

        // Get all GLOBAL fee structures from source year
        const sourceFees = await prisma.globalFeeStructure.findMany({
            where: { academicYearId: fromYearId, schoolId },
            include: { particulars: true, installmentRules: true },
        });

        console.log(`Found ${sourceFees.length} GlobalFeeStructures to clone`);

        if (sourceFees.length === 0) {
            return NextResponse.json(
                { error: "No fee structures found in source year to clone" },
                { status: 404 }
            );
        }

        // Check for existing fees in target year to avoid duplicates
        const existingFees = await prisma.globalFeeStructure.findMany({
            where: { academicYearId: toYearId, schoolId },
            select: { classId: true },
        });
        const existingClassIds = new Set(existingFees.map(f => f.classId));

        // Calculate time difference to shift due dates
        const timeDiff = new Date(toYear.startDate).getTime() - new Date(fromYear.startDate).getTime();

        let clonedCount = 0;
        const errors = [];

        for (const fee of sourceFees) {
            // Find the class name for this fee structure
            const sourceClass = sourceClasses.find(c => c.id === fee.classId);
            if (!sourceClass) {
                errors.push(`Skipped fee '${fee.name}': Source class ID ${fee.classId} not found`);
                continue;
            }

            // Find matching class ID in target year
            const targetClassId = targetClassMap.get(sourceClass.className);
            if (!targetClassId) {
                errors.push(`Skipped fee '${fee.name}': Target class '${sourceClass.className}' not found in new year`);
                continue;
            }

            // Skip if already exists for this class
            if (existingClassIds.has(targetClassId)) {
                continue;
            }

            try {
                // Clone the fee structure
                const newFee = await prisma.globalFeeStructure.create({
                    data: {
                        schoolId,
                        academicYearId: toYearId,
                        classId: targetClassId,
                        name: fee.name,
                        description: fee.description,
                        mode: fee.mode,
                        totalAmount: fee.totalAmount,
                        isActive: true, // Set active by default
                        status: "DRAFT", // Start as DRAFT in new year
                        version: 1,
                        clonedFromId: fee.id,
                        enableInstallments: fee.enableInstallments,

                        // Clone particulars
                        particulars: {
                            create: fee.particulars.map(p => ({
                                name: p.name,
                                amount: p.amount,
                                isOptional: p.isOptional,
                                category: p.category,
                                displayOrder: p.displayOrder
                            }))
                        },

                        // Clone installment rules if any
                        installmentRules: {
                            create: fee.installmentRules.map(r => {
                                // Calculate new due date by adding year difference
                                const oldDate = new Date(r.dueDate);
                                const newDate = new Date(oldDate.getTime() + timeDiff);

                                return {
                                    installmentNumber: r.installmentNumber,
                                    dueDate: newDate,
                                    percentage: r.percentage,
                                    amount: r.amount, // Schema field is 'amount', not fixedAmount
                                    lateFeeAmount: r.lateFeeAmount,
                                    lateFeeAfterDays: r.lateFeeAfterDays
                                };
                            })
                        }
                    }
                });
                clonedCount++;
            } catch (err) {
                console.error(`Failed to clone fee ${fee.id}:`, err);
                errors.push(`Failed to clone '${fee.name}'`);
            }
        }

        // Update setup status
        await prisma.academicYear.update({
            where: { id: toYearId },
            data: { feesConfigured: true },
        });

        return NextResponse.json({
            success: true,
            count: clonedCount,
            message: `Cloned ${clonedCount} fee structures`,
            errors: errors.length > 0 ? errors : undefined,
            debug: { sourceFeesFound: sourceFees.length }
        });
    } catch (error) {
        console.error("Clone fees error:", error);
        return NextResponse.json(
            { error: "Failed to clone fee structures: " + error.message },
            { status: 500 }
        );
    }
}

