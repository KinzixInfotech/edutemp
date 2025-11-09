// // ============================================
// // API: /api/schools/fee/global-structures/route.js
// // Manage global fee structures (templates)
// // ============================================

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
            // Check existing
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

            // Calculate total
            const totalAmount = particulars.reduce((sum, p) => sum + p.amount, 0);

            // Create structure
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
                            isOptional: p.isOptional || false,
                            displayOrder: index,
                        })),
                    },
                },
                include: { particulars: true },
            });

            // ===================================
            // AUTO-GENERATE INSTALLMENT RULES
            // ===================================
            let rulesToCreate = installmentRules;

            if (!rulesToCreate || rulesToCreate.length === 0) {
                // Generate based on mode
                rulesToCreate = generateInstallmentRules(mode, totalAmount, new Date());
            }

            // Validate percentages sum to 100
            const totalPercentage = rulesToCreate.reduce((sum, r) => sum + r.percentage, 0);
            if (Math.abs(totalPercentage - 100) > 0.01) {
                throw new Error("Installment percentages must sum to 100%");
            }

            // Create installment rules
            for (const rule of rulesToCreate) {
                await tx.feeInstallmentRule.create({
                    data: {
                        globalFeeStructureId: structure.id,
                        installmentNumber: rule.installmentNumber,
                        dueDate: new Date(rule.dueDate),
                        percentage: rule.percentage,
                        amount: (totalAmount * rule.percentage) / 100,
                        lateFeeAmount: rule.lateFeeAmount || 0,
                        lateFeeAfterDays: rule.lateFeeAfterDays || 0,
                    },
                });
            }

            return structure;
        });

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
// HELPER: Auto-generate installment rules
// ===================================
function generateInstallmentRules(mode, totalAmount, startDate) {
    const rules = [];
    let numberOfInstallments = 1;
    const currentDate = new Date(startDate);

    // Determine number of installments
    switch (mode) {
        case "MONTHLY":
            numberOfInstallments = 12;
            break;
        case "QUARTERLY":
            numberOfInstallments = 4;
            break;
        case "HALF_YEARLY":
            numberOfInstallments = 2;
            break;
        case "YEARLY":
        case "ONE_TIME":
            numberOfInstallments = 1;
            break;
    }

    const percentagePerInstallment = 100 / numberOfInstallments;
    const amountPerInstallment = totalAmount / numberOfInstallments;

    for (let i = 0; i < numberOfInstallments; i++) {
        let dueDate = new Date(currentDate);

        if (mode === "MONTHLY") {
            // Monthly: Due on 10th of each month
            dueDate.setMonth(currentDate.getMonth() + i + 1);
            dueDate.setDate(10);
        } else if (mode === "QUARTERLY") {
            // Quarterly: Every 3 months on 15th
            dueDate.setMonth(currentDate.getMonth() + (i * 3) + 1);
            dueDate.setDate(15);
        } else if (mode === "HALF_YEARLY") {
            // Half-yearly: Every 6 months on 15th
            dueDate.setMonth(currentDate.getMonth() + (i * 6) + 1);
            dueDate.setDate(15);
        } else {
            // Yearly/One-time: Due next month on 15th
            dueDate.setMonth(currentDate.getMonth() + 1);
            dueDate.setDate(15);
        }

        rules.push({
            installmentNumber: i + 1,
            dueDate: dueDate.toISOString(),
            percentage: percentagePerInstallment,
            amount: amountPerInstallment,
            lateFeeAmount: 100, // Default ₹100 late fee
            lateFeeAfterDays: 7, // After 7 days
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