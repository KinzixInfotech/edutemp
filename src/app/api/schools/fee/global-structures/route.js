// ============================================
// API: /api/schools/fee/global-structures/route.js
// Manage global fee structures (templates)
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Validation Schema
const createSchema = z.object({
    schoolId: z.string().uuid(),
    academicYearId: z.string().uuid(),
    classId: z.number().int().positive(),
    name: z.string().min(1),
    description: z.string().optional(),
    mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "ONE_TIME"]),
    particulars: z.array(z.object({
        name: z.string().min(1),
        amount: z.number().positive(),
        category: z.enum([
            "TUITION", "ADMISSION", "EXAMINATION", "LIBRARY",
            "LABORATORY", "SPORTS", "TRANSPORT", "HOSTEL",
            "MISCELLANEOUS", "DEVELOPMENT", "CAUTION_MONEY"
        ]),
        isOptional: z.boolean().default(false),
    })).min(1),
    installmentRules: z.array(z.object({
        installmentNumber: z.number().int().positive(),
        dueDate: z.string().transform(str => new Date(str)),
        percentage: z.number().min(0).max(100),
        lateFeeAmount: z.number().default(0),
        lateFeeAfterDays: z.number().int().default(0),
    })).optional(),
});

// GET: Fetch global fee structures
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");
        const classId = searchParams.get("classId");

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId required" }, { status: 400 });
        }

        const where = {
            schoolId,
            ...(academicYearId && { academicYearId }),
            ...(classId && { classId: parseInt(classId) }),
            isActive: true,
        };

        const structures = await prisma.globalFeeStructure.findMany({
            where,
            include: {
                academicYear: { select: { name: true, startDate: true, endDate: true } },
                class: { select: { className: true } },
                particulars: { orderBy: { displayOrder: "asc" } },
                installmentRules: { orderBy: { installmentNumber: "asc" } },
                _count: {
                    select: {
                        studentFees: { where: { academicYearId } }
                    }
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(structures);
    } catch (error) {
        console.error("GET Global Fee Structures Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch fee structures" },
            { status: 500 }
        );
    }
}

// POST: Create global fee structure
export async function POST(req) {
    try {
        const body = await req.json();
        const parsed = createSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.format() },
                { status: 400 }
            );
        }

        const {
            schoolId,
            academicYearId,
            classId,
            name,
            description,
            mode,
            particulars,
            installmentRules
        } = parsed.data;

        const result = await prisma.$transaction(async (tx) => {
            // Check for existing structure
            const existing = await tx.globalFeeStructure.findUnique({
                where: {
                    schoolId_academicYearId_classId: {
                        schoolId,
                        academicYearId,
                        classId
                    }
                },
            });

            if (existing) {
                throw new Error("Fee structure already exists for this class");
            }

            // Calculate total amount
            const totalAmount = particulars.reduce((sum, p) => sum + p.amount, 0);

            // Create structure with particulars
            const structure = await tx.globalFeeStructure.create({
                data: {
                    schoolId,
                    academicYearId,
                    classId,
                    name,
                    description,
                    mode,
                    totalAmount,
                    particulars: {
                        create: particulars.map((p, index) => ({
                            name: p.name,
                            amount: p.amount,
                            category: p.category,
                            isOptional: p.isOptional,
                            displayOrder: index,
                        })),
                    },
                },
                include: { particulars: true },
            });

            // Create installment rules if provided
            if (installmentRules && installmentRules.length > 0) {
                // Validate percentages sum to 100
                const totalPercentage = installmentRules.reduce((sum, r) => sum + r.percentage, 0);
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    throw new Error("Installment percentages must sum to 100%");
                }

                await tx.feeInstallmentRule.createMany({
                    data: installmentRules.map(rule => ({
                        globalFeeStructureId: structure.id,
                        installmentNumber: rule.installmentNumber,
                        dueDate: rule.dueDate,
                        percentage: rule.percentage,
                        amount: (totalAmount * rule.percentage) / 100,
                        lateFeeAmount: rule.lateFeeAmount,
                        lateFeeAfterDays: rule.lateFeeAfterDays,
                    })),
                });
            }

            return structure;
        });

        return NextResponse.json(
            { message: "Fee structure created successfully", structure: result },
            { status: 201 }
        );
    } catch (error) {
        console.error("POST Global Fee Structure Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create fee structure" },
            { status: 400 }
        );
    }
}

// PATCH: Update global fee structure
export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, name, description, particulars, installmentRules } = body;

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            const structure = await tx.globalFeeStructure.findUnique({
                where: { id },
                include: { particulars: true, installmentRules: true },
            });

            if (!structure) {
                throw new Error("Fee structure not found");
            }

            // Update basic info
            const updated = await tx.globalFeeStructure.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(description !== undefined && { description }),
                },
            });

            // Update particulars if provided
            if (particulars) {
                // Delete old particulars
                await tx.globalFeeParticular.deleteMany({
                    where: { globalFeeStructureId: id },
                });

                // Create new particulars
                const totalAmount = particulars.reduce((sum, p) => sum + p.amount, 0);

                await tx.globalFeeParticular.createMany({
                    data: particulars.map((p, index) => ({
                        globalFeeStructureId: id,
                        name: p.name,
                        amount: p.amount,
                        category: p.category,
                        isOptional: p.isOptional || false,
                        displayOrder: index,
                    })),
                });

                // Update total amount
                await tx.globalFeeStructure.update({
                    where: { id },
                    data: { totalAmount },
                });
            }

            // Update installment rules if provided
            if (installmentRules) {
                await tx.feeInstallmentRule.deleteMany({
                    where: { globalFeeStructureId: id },
                });

                if (installmentRules.length > 0) {
                    const totalAmount = structure.totalAmount;
                    await tx.feeInstallmentRule.createMany({
                        data: installmentRules.map(rule => ({
                            globalFeeStructureId: id,
                            installmentNumber: rule.installmentNumber,
                            dueDate: new Date(rule.dueDate),
                            percentage: rule.percentage,
                            amount: (totalAmount * rule.percentage) / 100,
                            lateFeeAmount: rule.lateFeeAmount || 0,
                            lateFeeAfterDays: rule.lateFeeAfterDays || 0,
                        })),
                    });
                }
            }

            return updated;
        });

        return NextResponse.json({
            message: "Fee structure updated successfully",
            structure: result,
        });
    } catch (error) {
        console.error("PATCH Global Fee Structure Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update fee structure" },
            { status: 400 }
        );
    }
}

// DELETE: Delete global fee structure
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        // Check if assigned to any students
        const assignedCount = await prisma.studentFee.count({
            where: { globalFeeStructureId: id },
        });

        if (assignedCount > 0) {
            return NextResponse.json(
                { error: `Cannot delete: Assigned to ${assignedCount} students` },
                { status: 400 }
            );
        }

        await prisma.globalFeeStructure.delete({ where: { id } });

        return NextResponse.json({ message: "Fee structure deleted successfully" });
    } catch (error) {
        console.error("DELETE Global Fee Structure Error:", error);
        return NextResponse.json(
            { error: "Failed to delete fee structure" },
            { status: 500 }
        );
    }
}