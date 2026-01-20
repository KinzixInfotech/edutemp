// // ============================================
// // API: /api/schools/fee/global-structures/route.js
// // Manage global fee structures (templates)
// // ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { paginate, getPagination, apiResponse, errorResponse } from "@/lib/api-utils";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

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
        const status = searchParams.get("status"); // DRAFT, ACTIVE, ARCHIVED, or 'all'
        const includeArchived = searchParams.get("includeArchived") === "true";

        if (!schoolId) {
            return errorResponse("schoolId required", 400);
        }

        const { page, limit, skip } = getPagination(req);
        const cacheKey = generateKey('fee-structures', { schoolId, academicYearId, classId, status, includeArchived, page, limit });

        const result = await remember(cacheKey, async () => {
            const where = {
                schoolId,
                ...(academicYearId && { academicYearId }),
                ...(classId && { classId: parseInt(classId) }),
                isActive: true,
                // Filter by status
                ...(status && status !== 'all' && { status }),
                // Exclude archived unless explicitly requested
                ...(!includeArchived && !status && { status: { not: 'ARCHIVED' } }),
            };

            return await paginate(prisma.globalFeeStructure, {
                where,
                include: {
                    academicYear: { select: { name: true, startDate: true, endDate: true } },
                    class: { select: { className: true } },
                    particulars: { orderBy: { displayOrder: "asc" } },
                    installmentRules: { orderBy: { installmentNumber: "asc" } },
                    _count: {
                        select: {
                            studentFees: true
                        }
                    },
                },
                orderBy: [{ status: 'asc' }, { createdAt: "desc" }], // DRAFT first, then ACTIVE, then ARCHIVED
            }, page, limit);
        }, 300);

        // Return data array for backward compatibility
        return apiResponse(result.data);
    } catch (error) {
        console.error("GET Global Fee Structures Error:", error);
        return errorResponse("Failed to fetch fee structures");
    }
}

// POST: Create global fee structure
// export async function POST(req) {
//     try {
//         const body = await req.json();
//         const parsed = createSchema.safeParse(body);

//         if (!parsed.success) {
//             return NextResponse.json(
//                 { error: "Validation failed", details: parsed.error.format() },
//                 { status: 400 }
//             );
//         }

//         const {
//             schoolId,
//             academicYearId,
//             classId,
//             name,
//             description,
//             mode,
//             particulars,
//             installmentRules
//         } = parsed.data;

//         const result = await prisma.$transaction(async (tx) => {
//             // Check for existing structure
//             const existing = await tx.globalFeeStructure.findUnique({
//                 where: {
//                     schoolId_academicYearId_classId: {
//                         schoolId,
//                         academicYearId,
//                         classId
//                     }
//                 },
//             });

//             if (existing) {
//                 throw new Error("Fee structure already exists for this class");
//             }

//             // Calculate total amount
//             const totalAmount = particulars.reduce((sum, p) => sum + p.amount, 0);

//             // Create structure with particulars
//             const structure = await tx.globalFeeStructure.create({
//                 data: {
//                     schoolId,
//                     academicYearId,
//                     classId,
//                     name,
//                     description,
//                     mode,
//                     totalAmount,
//                     particulars: {
//                         create: particulars.map((p, index) => ({
//                             name: p.name,
//                             amount: p.amount,
//                             category: p.category,
//                             isOptional: p.isOptional,
//                             displayOrder: index,
//                         })),
//                     },
//                 },
//                 include: { particulars: true },
//             });

//             // Create installment rules if provided
//             if (installmentRules && installmentRules.length > 0) {
//                 // Validate percentages sum to 100
//                 const totalPercentage = installmentRules.reduce((sum, r) => sum + r.percentage, 0);
//                 if (Math.abs(totalPercentage - 100) > 0.01) {
//                     throw new Error("Installment percentages must sum to 100%");
//                 }

//                 await tx.feeInstallmentRule.createMany({
//                     data: installmentRules.map(rule => ({
//                         globalFeeStructureId: structure.id,
//                         installmentNumber: rule.installmentNumber,
//                         dueDate: rule.dueDate,
//                         percentage: rule.percentage,
//                         amount: (totalAmount * rule.percentage) / 100,
//                         lateFeeAmount: rule.lateFeeAmount,
//                         lateFeeAfterDays: rule.lateFeeAfterDays,
//                     })),
//                 });
//             }

//             return structure;
//         });

//         return NextResponse.json(
//             { message: "Fee structure created successfully", structure: result },
//             { status: 201 }
//         );
//     } catch (error) {
//         console.error("POST Global Fee Structure Error:", error);
//         return NextResponse.json(
//             { error: error.message || "Failed to create fee structure" },
//             { status: 400 }
//         );
//     }
// }

// PATCH: Update global fee structure (respects status rules)
export async function PATCH(req) {
    try {
        const body = await req.json();
        const { id, action, name, description, particulars, installmentRules, targetAcademicYearId, newName } = body;

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        // Fetch current structure
        const structure = await prisma.globalFeeStructure.findUnique({
            where: { id },
            include: { particulars: true, installmentRules: true },
        });

        if (!structure) {
            return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
        }

        // Handle special actions
        if (action === 'archive') {
            // Only ACTIVE structures can be archived
            if (structure.status !== 'ACTIVE') {
                return NextResponse.json({ error: "Only ACTIVE structures can be archived" }, { status: 400 });
            }
            const updated = await prisma.globalFeeStructure.update({
                where: { id },
                data: { status: 'ARCHIVED' },
            });
            await invalidatePattern(`fee-structures:${structure.schoolId}*`);
            return NextResponse.json({ message: "Fee structure archived", structure: updated });
        }

        if (action === 'unarchive') {
            // Only ARCHIVED structures can be unarchived
            if (structure.status !== 'ARCHIVED') {
                return NextResponse.json({ error: "Only ARCHIVED structures can be restored" }, { status: 400 });
            }
            const updated = await prisma.globalFeeStructure.update({
                where: { id },
                data: { status: 'ACTIVE' },
            });
            await invalidatePattern(`fee-structures:${structure.schoolId}*`);
            return NextResponse.json({ message: "Fee structure restored to ACTIVE", structure: updated });
        }

        if (action === 'clone') {
            // Clone to a new structure
            const cloneName = newName || `${structure.name} (Copy)`;
            const cloneYearId = targetAcademicYearId || structure.academicYearId;

            // Check if clone already exists for target class/year
            const existing = await prisma.globalFeeStructure.findUnique({
                where: {
                    schoolId_academicYearId_classId: {
                        schoolId: structure.schoolId,
                        academicYearId: cloneYearId,
                        classId: structure.classId,
                    }
                }
            });
            if (existing) {
                return NextResponse.json({ error: "Fee structure already exists for this class in target year" }, { status: 400 });
            }

            const cloned = await prisma.$transaction(async (tx) => {
                // Create new structure
                const newStructure = await tx.globalFeeStructure.create({
                    data: {
                        schoolId: structure.schoolId,
                        academicYearId: cloneYearId,
                        classId: structure.classId,
                        name: cloneName,
                        description: structure.description,
                        mode: structure.mode,
                        totalAmount: structure.totalAmount,
                        status: 'DRAFT',
                        version: structure.version + 1,
                        clonedFromId: structure.id,
                        enableInstallments: structure.enableInstallments,
                        particulars: {
                            create: structure.particulars.map(p => ({
                                name: p.name,
                                amount: p.amount,
                                category: p.category,
                                isOptional: p.isOptional,
                                displayOrder: p.displayOrder,
                            })),
                        },
                    },
                    include: { particulars: true },
                });

                // Clone installment rules if enableInstallments
                if (structure.enableInstallments && structure.installmentRules.length > 0) {
                    await tx.feeInstallmentRule.createMany({
                        data: structure.installmentRules.map(rule => ({
                            globalFeeStructureId: newStructure.id,
                            installmentNumber: rule.installmentNumber,
                            dueDate: rule.dueDate,
                            percentage: rule.percentage,
                            amount: rule.amount,
                            lateFeeAmount: rule.lateFeeAmount,
                            lateFeeAfterDays: rule.lateFeeAfterDays,
                        })),
                    });
                }

                return newStructure;
            });

            await invalidatePattern(`fee-structures:${structure.schoolId}*`);
            return NextResponse.json({ message: "Fee structure cloned", structure: cloned }, { status: 201 });
        }

        // Regular update - only allowed for DRAFT status
        if (structure.status !== 'DRAFT') {
            return NextResponse.json({
                error: `Cannot edit ${structure.status} structure. Only DRAFT structures can be modified.`
            }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
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
                await tx.globalFeeParticular.deleteMany({
                    where: { globalFeeStructureId: id },
                });

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

        await invalidatePattern(`fee-structures:${structure.schoolId}*`);

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

// DELETE: Delete global fee structure (only DRAFT allowed)
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id required" }, { status: 400 });
        }

        // Fetch structure to check status
        const structure = await prisma.globalFeeStructure.findUnique({
            where: { id },
        });

        if (!structure) {
            return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });
        }

        // Check status - only DRAFT can be deleted
        if (structure.status === 'ACTIVE') {
            return NextResponse.json({
                error: "Cannot delete ACTIVE structure. Use Archive instead.",
                suggestion: "archive",
                assignedCount: await prisma.studentFee.count({ where: { globalFeeStructureId: id } }),
            }, { status: 400 });
        }

        if (structure.status === 'ARCHIVED') {
            return NextResponse.json({
                error: "Cannot delete ARCHIVED structure. It is kept for historical reference.",
            }, { status: 400 });
        }

        // Double-check - ensure no students assigned (even for DRAFT)
        const assignedCount = await prisma.studentFee.count({
            where: { globalFeeStructureId: id },
        });

        if (assignedCount > 0) {
            // Auto-transition to ACTIVE and block delete
            await prisma.globalFeeStructure.update({
                where: { id },
                data: { status: 'ACTIVE' },
            });
            return NextResponse.json({
                error: `Cannot delete: Structure has ${assignedCount} students assigned. Status updated to ACTIVE.`,
                suggestion: "archive",
            }, { status: 400 });
        }

        const deleted = await prisma.globalFeeStructure.delete({ where: { id } });

        if (deleted && deleted.schoolId) {
            await invalidatePattern(`fee-structures:${deleted.schoolId}*`);
        }

        return NextResponse.json({ message: "Fee structure deleted successfully" });
    } catch (error) {
        console.error("DELETE Global Fee Structure Error:", error);
        return NextResponse.json(
            { error: "Failed to delete fee structure" },
            { status: 500 }
        );
    }
}
// ============================================
// FIX: Create Global Fee Structure with Auto Installment Rules
// app/api/schools/fee/global-structures/route.js
// ============================================


export async function POST(req) {
    try {
        const body = await req.json();
        const {
            schoolId,
            academicYearId,
            classId,
            name,
            description,
            mode, // MONTHLY, QUARTERLY, HALF_YEARLY, YEARLY, ONE_TIME
            particulars,
            enableInstallments = true, // New field
            // installmentRules is now OPTIONAL - will auto-generate if not provided
            installmentRules
        } = body;

        if (!schoolId || !academicYearId || !classId || !name || !mode || !particulars) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Fetch academic year for dates
            const academicYear = await tx.academicYear.findUnique({
                where: { id: academicYearId },
                select: { startDate: true, endDate: true }
            });

            if (!academicYear) {
                throw new Error("Academic year not found");
            }

            // Check existing
            const existing = await tx.globalFeeStructure.findUnique({
                where: {
                    schoolId_academicYearId_classId: { schoolId, academicYearId, classId }
                },
            });

            if (existing) {
                throw new Error(`Fee structure already exists for this class (Status: ${existing.status}).`);
            }

            const totalAmount = particulars.reduce((sum, p) => sum + p.amount, 0);

            // Create structure
            const structure = await tx.globalFeeStructure.create({
                data: {
                    schoolId, academicYearId, classId, name, description, mode, totalAmount,
                    status: "DRAFT",
                    enableInstallments,
                    particulars: {
                        create: particulars.map((p, i) => ({
                            name: p.name, amount: p.amount, category: p.category,
                            isOptional: p.isOptional || false, displayOrder: i,
                        })),
                    },
                },
                include: { particulars: true },
            });

            // Generate installment rules using academic year dates
            const rulesToCreate = installmentRules?.length > 0
                ? installmentRules
                : generateInstallmentRules(mode, totalAmount, academicYear.startDate, academicYear.endDate);

            // Create installment rules (batch for efficiency)
            await tx.feeInstallmentRule.createMany({
                data: rulesToCreate.map(rule => ({
                    globalFeeStructureId: structure.id,
                    installmentNumber: rule.installmentNumber,
                    dueDate: new Date(rule.dueDate),
                    percentage: rule.percentage,
                    amount: rule.amount,
                    lateFeeAmount: rule.lateFeeAmount || 0,
                    lateFeeAfterDays: rule.lateFeeAfterDays || 0,
                })),
            });

            return structure;
        });

        // Invalidate cache
        await invalidatePattern(`fee-structures:${schoolId}*`);

        return NextResponse.json({
            message: "Fee structure created successfully",
            structure: result,
        }, { status: 201 });
    } catch (error) {
        console.error("Create Global Fee Structure Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create fee structure" },
            { status: 400 }
        );
    }
}

// ===================================
// HELPER: Generate installment rules based on academic year
// ===================================
function generateInstallmentRules(mode, totalAmount, academicYearStart, academicYearEnd) {
    const startDate = new Date(academicYearStart);
    const endDate = academicYearEnd ? new Date(academicYearEnd) : null;

    // Calculate months between start and end (or default to mode-based count)
    let numberOfInstallments = 1;

    if (endDate && mode === "MONTHLY") {
        // Calculate actual months in academic year
        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
            (endDate.getMonth() - startDate.getMonth()) + 1;
        numberOfInstallments = Math.max(1, Math.min(months, 12)); // Cap at 12
    } else {
        switch (mode) {
            case "MONTHLY": numberOfInstallments = 12; break;
            case "QUARTERLY": numberOfInstallments = 4; break;
            case "HALF_YEARLY": numberOfInstallments = 2; break;
            default: numberOfInstallments = 1;
        }
    }

    // Proper amount distribution with rounding
    const baseAmount = Math.floor((totalAmount / numberOfInstallments) * 100) / 100;
    const remainder = Math.round((totalAmount - baseAmount * numberOfInstallments) * 100) / 100;
    const percentagePerInstallment = Math.round((100 / numberOfInstallments) * 100) / 100;

    const rules = [];
    for (let i = 0; i < numberOfInstallments; i++) {
        const dueDate = new Date(startDate);

        if (mode === "MONTHLY") {
            dueDate.setMonth(startDate.getMonth() + i);
            dueDate.setDate(10);
        } else if (mode === "QUARTERLY") {
            dueDate.setMonth(startDate.getMonth() + (i * 3));
            dueDate.setDate(15);
        } else if (mode === "HALF_YEARLY") {
            dueDate.setMonth(startDate.getMonth() + (i * 6));
            dueDate.setDate(15);
        } else {
            dueDate.setDate(15);
        }

        // Last installment gets remainder for exact total
        const isLast = i === numberOfInstallments - 1;

        rules.push({
            installmentNumber: i + 1,
            dueDate: dueDate.toISOString(),
            percentage: percentagePerInstallment,
            amount: isLast ? baseAmount + remainder : baseAmount,
            lateFeeAmount: 100,
            lateFeeAfterDays: 7,
        });
    }

    return rules;
}

// ===================================
// EXAMPLE API CALL
// ===================================
/*
POST /api/schools/fee/global-structures

Request Body:
{
  "schoolId": "school-uuid",
  "academicYearId": "year-uuid",
  "classId": 10,
  "name": "Class 10 Annual Fees 2024-25",
  "description": "Complete fee structure for Class 10",
  "mode": "MONTHLY",  // ← This will create 12 installments automatically
  "particulars": [
    {
      "name": "Tuition Fee",
      "amount": 30000,
      "category": "TUITION",
      "isOptional": false
    },
    {
      "name": "Library Fee",
      "amount": 5000,
      "category": "LIBRARY",
      "isOptional": false
    },
    {
      "name": "Lab Fee",
      "amount": 8000,
      "category": "LABORATORY",
      "isOptional": false
    },
    {
      "name": "Sports Fee",
      "amount": 7000,
      "category": "SPORTS",
      "isOptional": true
    }
  ]
  // installmentRules is optional - will auto-generate
}

Response:
{
  "message": "Fee structure created successfully",
  "structure": {
    "id": "structure-uuid",
    "name": "Class 10 Annual Fees 2024-25",
    "mode": "MONTHLY",
    "totalAmount": 50000,
    "particulars": [...],
    "installmentRules": [
      {
        "installmentNumber": 1,
        "dueDate": "2025-12-10",
        "percentage": 8.33,
        "amount": 4166.67
      },
      // ... 11 more installments
    ]
  }
}
*/

// ===================================
// WHAT THIS FIXES:
// ===================================
/*
BEFORE (Your Current Issue):
- Create fee structure with mode "MONTHLY"
- NO installment rules created
- When assigning to student:
  → Creates 1 installment with full amount ₹1,04,000 ❌

AFTER (With This Fix):
- Create fee structure with mode "MONTHLY"
- AUTO-CREATES 12 installment rules
- When assigning to student:
  → Creates 12 installments, each ₹8,667 ✅
  → Each installment has proper particular breakdown:
    * Bus fees: ₹4,167 (₹50,000 ÷ 12)
    * Other fees: ₹4,500 (₹54,000 ÷ 12)
*/