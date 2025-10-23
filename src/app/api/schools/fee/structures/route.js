// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { z } from "zod";

// // Validation schema
// const schema = z.object({
//     name: z.string().min(1, "Fee structure name is required"),
//     schoolId: z.string().uuid("Invalid school ID"),
//     classId: z.number().int().positive("Invalid class ID"), // Changed to number
//     mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"], {
//         message: "Invalid fee mode",
//     }),
//     fees: z
//         .array(
//             z.object({
//                 name: z.string().min(1, "Fee particular name is required"),
//                 amount: z.number().positive("Fee amount must be positive"),
//             })
//         )
//         .min(1, "At least one fee particular is required"),
// });


// export async function POST(req) {
//     try {
//         // Parse and validate input
//         const body = await req.json();
//         const parsed = schema.safeParse(body);
//         if (!parsed.success) {
//             return NextResponse.json(
//                 { error: "Validation failed", details: parsed.error.format() },
//                 { status: 400 }
//             );
//         }
//         const { name, schoolId, classId, mode, fees } = parsed.data;

//         // Start a transaction
//         const result = await prisma.$transaction(async (tx) => {
//             // Verify school exists
//             const school = await tx.school.findUnique({
//                 where: { id: schoolId },
//             });
//             if (!school) {
//                 throw new Error("School not found");
//             }

//             // Verify class exists and belongs to the school
//             const classRecord = await tx.class.findFirst({
//                 where: { id: classId, schoolId },
//             });
//             if (!classRecord) {
//                 throw new Error("Class not found or does not belong to the school");
//             }

//             // Fetch active academic year
//             const activeAcademicYear = await tx.academicYear.findFirst({
//                 where: { schoolId, isActive: true },
//             });
//             if (!activeAcademicYear) {
//                 throw new Error("No active academic year found for the school");
//             }

//             // Check for existing fee structure for this class and academic year
//             const existingFeeStructure = await tx.feeStructure.findFirst({
//                 where: {
//                     classId,
//                     academicYearId: activeAcademicYear.id,
//                     schoolId,
//                 },
//             });
//             if (existingFeeStructure) {
//                 throw new Error("A fee structure is already assigned to this class for the current academic year");
//             }

//             // Create FeeStructure
//             const feeStructure = await tx.feeStructure.create({
//                 data: {
//                     schoolId,
//                     academicYearId: activeAcademicYear.id,
//                     classId,
//                     mode,
//                     issueDate: new Date(),
//                     name: name,
//                     feeParticulars: {
//                         create: fees.map((fee) => ({
//                             name: fee.name,
//                             defaultAmount: fee.amount,
//                         })),
//                     },
//                 },
//                 include: { feeParticulars: true },
//             });

//             // Fetch all students in the class
//             const students = await tx.student.findMany({
//                 where: { classId },
//             });

//             // Assign fee structure to all students in the class
//             for (const student of students) {
//                 const studentFeeStructure = await tx.studentFeeStructure.create({
//                     data: {
//                         studentId: student.userId,
//                         academicYearId: activeAcademicYear.id,
//                         schoolId,
//                         studentUserId: student.userId,
//                         feeStructureId: feeStructure.id,
//                     },
//                 });

//                 // Create StudentFeeParticular for each fee particular
//                 await tx.studentFeeParticular.createMany({
//                     data: feeStructure.feeParticulars.map((particular) => ({
//                         studentFeeStructureId: studentFeeStructure.id,
//                         globalParticularId: particular.id,
//                         amount: particular.defaultAmount,
//                         status: "unpaid",
//                     })),
//                 });
//             }

//             return feeStructure;
//         });

//         return NextResponse.json(
//             {
//                 message: "Fee structure created and assigned to class",
//                 feeStructure: result,
//             },
//             { status: 201 }
//         );
//     } catch (err) {
//         console.error("FeeStructure API error:", err);
//         if (err.message.includes("not found") || err.message.includes("already assigned")) {
//             return NextResponse.json({ error: err.message }, { status: 400 });
//         }
//         return NextResponse.json(
//             { error: "Internal server error" },
//             { status: 500 }
//         );
//     }
// }

// /api/schools/fee/structures/route.js

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

// Validation schema for POST (create)
const createSchema = z.object({
    name: z.string().min(1, "Fee structure name is required"),
    schoolId: z.string().uuid("Invalid school ID"),
    installment: z.boolean(),
    classId: z.number().int().positive("Invalid class ID"),
    mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"], {
        message: "Invalid fee mode",
    }),
    fees: z
        .array(
            z.object({
                name: z.string().min(1, "Fee particular name is required"),
                amount: z.number().positive("Fee amount must be positive"),
            })
        )
        .min(1, "At least one fee particular is required"),
});

// Validation schema for PATCH (update)
const updateSchema = z.object({
    id: z.string().uuid("Invalid fee structure ID"),
    name: z.string().min(1, "Fee structure name is required").optional(),
    mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]).optional(),
    feeParticulars: z
        .array(
            z.object({
                id: z.string().uuid("Invalid fee particular ID").optional(), // For existing
                name: z.string().min(1, "Fee particular name is required"),
                amount: z.number().positive("Fee amount must be positive"),
            })
        )
        .min(1, "At least one fee particular is required")
        .optional(),
});

// Helper function to generate a unique fee structure name
const generateFeeStructureName = (name, mode) => {
    return `${name}-${mode}`;
};
// GET: Fetch fee structures
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");

        if (!schoolId) {
            return NextResponse.json({ error: "schoolId is required" }, { status: 400 });
        }
        // helper function to format numbers (1k, 1.5M, etc.)
        function formatAmount(num) {
            if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
            if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
            if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
            return num.toString();
        }
        const feeStructures = await prisma.feeStructure.findMany({
            where: {
                schoolId,
                ...(academicYearId && { academicYearId }),
            },
            include: {
                AcademicYear: { select: { name: true, startDate: true, endDate: true } },
                feeParticulars: true,
            },
            orderBy: { createdAt: "desc" },
        });

        const data = await Promise.all(
            feeStructures.map(async (fs) => {
                const assignedCount = await prisma.studentFeeStructure.count({
                    where: { feeStructureId: fs.id },
                });
                // sum all feeParticular amounts
                const totalAmount = fs.feeParticulars.reduce(
                    (sum, item) => sum + (item.defaultAmount || 0),
                    0
                );

                return {
                    ...fs,
                    assigned: assignedCount > 0,
                    totalAmountRaw: totalAmount, // exact number
                    totalAmountFormatted: formatAmount(totalAmount), // e.g. "1K"
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
// POST: Create fee structure
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
        const { name, schoolId, classId, mode, fees, installment } = parsed.data;

        const result = await prisma.$transaction(async (tx) => {
            const school = await tx.school.findUnique({ where: { id: schoolId } });
            if (!school) throw new Error("School not found");

            const classRecord = await tx.class.findFirst({ where: { id: classId, schoolId } });
            if (!classRecord) throw new Error("Class not found or does not belong to the school");

            const activeAcademicYear = await tx.academicYear.findFirst({ where: { schoolId, isActive: true } });
            if (!activeAcademicYear) throw new Error("No active academic year found for the school");

            const existingFeeStructure = await tx.feeStructure.findFirst({
                where: { classId, academicYearId: activeAcademicYear.id, schoolId },
            });
            if (existingFeeStructure) throw new Error("A fee structure is already assigned to this class for the current academic year");

            const feeStructure = await tx.feeStructure.create({
                data: {
                    schoolId,
                    academicYearId: activeAcademicYear.id,
                    classId,
                    mode,
                    issueDate: new Date(),
                    name: name,
                    feeParticulars: {
                        create: fees.map((fee) => ({
                            name: fee.name,
                            defaultAmount: fee.amount,
                        })),
                    },
                },
                include: { feeParticulars: true },
            });

            const students = await tx.student.findMany({ where: { classId } });

            const installmentCountMap = { MONTHLY: 12, QUARTERLY: 4, HALF_YEARLY: 2, YEARLY: 1 };
            const installmentsCount = installmentCountMap[mode] || 1;
            if (installmentsCount === 1 && installment) {
                // Optional: Warn or handle if mode implies no split but installment is true
                console.warn(`Mode ${mode} implies no split, but installment is enabled`);
            }

            for (const student of students) {
                const studentFeeStructure = await tx.studentFeeStructure.create({
                    data: {
                        studentId: student.userId,
                        academicYearId: activeAcademicYear.id,
                        schoolId,
                        studentUserId: student.userId,
                        feeStructureId: feeStructure.id,
                        status: "unpaid",
                    },
                });

                await tx.studentFeeParticular.createMany({
                    data: feeStructure.feeParticulars.map((particular) => ({
                        studentFeeStructureId: studentFeeStructure.id,
                        globalParticularId: particular.id,
                        amount: particular.defaultAmount,
                    })),
                });

                if (installment) {
                    const studentFeeParticulars = await tx.studentFeeParticular.findMany({
                        where: { studentFeeStructureId: studentFeeStructure.id },
                        select: { id: true, amount: true },
                    });

                    const installmentData = [];
                    const baseDueDate = new Date(); // Consistent start date

                    for (const particular of studentFeeParticulars) {
                        const amount = Number(particular.amount); // Ensure numeric
                        const baseAmount = Math.floor((amount / installmentsCount) * 100) / 100;
                        const lastAmount = amount - baseAmount * (installmentsCount - 1);

                        for (let i = 0; i < installmentsCount; i++) {
                            const dueDate = new Date(baseDueDate);
                            let monthMultiplier = 0;
                            switch (mode) {
                                case 'MONTHLY':
                                    monthMultiplier = i;
                                    break;
                                case 'QUARTERLY':
                                    monthMultiplier = i * 3;
                                    break;
                                case 'HALF_YEARLY':
                                    monthMultiplier = i * 6;
                                    break;
                                case 'YEARLY':
                                    monthMultiplier = i * 12; // Equivalent to adding years
                                    break;
                                default:
                                    throw new Error(`Invalid mode: ${mode}`);
                            }
                            dueDate.setMonth(dueDate.getMonth() + monthMultiplier);

                            installmentData.push({
                                studentFeeParticularId: particular.id,
                                dueDate,
                                amount: i === installmentsCount - 1 ? lastAmount : baseAmount,
                                status: 'UNPAID',
                            });
                        }
                    }

                    if (installmentData.length > 0) {
                        await tx.studentFeeInstallment.createMany({
                            data: installmentData,
                        });
                    }
                }
            }

            return feeStructure;
        });

        return NextResponse.json(
            { message: "Fee structure created and assigned to class", feeStructure: result },
            { status: 201 }
        );
    } catch (err) {
        console.error("Create FeeStructure API error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 400 });
    }
}
// PATCH: Update fee structure
// export async function PATCH(req) {
//     try {
//         const body = await req.json();
//         const parsed = updateSchema.safeParse(body);
//         if (!parsed.success) {
//             return NextResponse.json(
//                 { error: "Validation failed", details: parsed.error.format() },
//                 { status: 400 }
//             );
//         }
//         const { id, name, mode, fees } = parsed.data;

//         const result = await prisma.$transaction(async (tx) => {
//             const feeStructure = await tx.feeStructure.findUnique({
//                 where: { id },
//                 include: { feeParticulars: true, AcademicYear: true },
//             });
//             if (!feeStructure) throw new Error("Fee structure not found");

//             // Update fee structure fields if provided
//             const updatedFeeStructure = await tx.feeStructure.update({
//                 where: { id },
//                 data: {
//                     ...(name && { name: name }),
//                     ...(mode && { mode }),
//                 },
//             });

//             if (fees) {
//                 // Delete existing fee particulars
//                 await tx.feeParticular.deleteMany({ where: { feeStructureId: id } });

//                 // Create new fee particulars
//                 await tx.feeParticular.createMany({
//                     data: fees.map((fee) => ({
//                         feeStructureId: id,
//                         name: fee.name,
//                         defaultAmount: fee.amount,
//                     })),
//                 });

//                 // Update assigned student fee particulars
//                 const studentFeeStructures = await tx.studentFeeStructure.findMany({ where: { feeStructureId: id } });
//                 for (const sfs of studentFeeStructures) {
//                     await tx.studentFeeParticular.deleteMany({ where: { studentFeeStructureId: sfs.id } });

//                     await tx.studentFeeParticular.createMany({
//                         data: fees.map((fee) => ({
//                             studentFeeStructureId: sfs.id,
//                             globalParticularId: 'temp-id', // Note: This needs to be the new particular ID, so adjust accordingly
//                             amount: fee.amount,
//                             status: "unpaid",
//                         })),
//                     });
//                 }
//             }

//             return updatedFeeStructure;
//         });

//         return NextResponse.json({ message: "Fee structure updated", feeStructure: result });
//     } catch (err) {
//         console.error("Update FeeStructure API error:", err);
//         return NextResponse.json({ error: err.message || "Internal server error" }, { status: 400 });
//     }
// }
// PATCH: Update fee structure
// PATCH: Update fee structure
export async function PATCH(req) {
    try {
        const body = await req.json();
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.format() },
                { status: 400 }
            );
        }
        const { id, name, mode, feeParticulars } = parsed.data;
        console.log('fees', feeParticulars);

        const result = await prisma.$transaction(async (tx) => {
            const feeStructure = await tx.feeStructure.findUnique({
                where: { id },
                include: { feeParticulars: true, AcademicYear: true },
            });
            if (!feeStructure) throw new Error("Fee structure not found");

            // Update fee structure fields if provided
            const updatedFeeStructure = await tx.feeStructure.update({
                where: { id },
                data: {
                    ...(name && { name: name }),
                    ...(mode && { mode }),
                },
                include: { feeParticulars: true },
            });

            if (feeParticulars) {
                // Identify existing and new fee particulars
                const existingParticularIds = feeStructure.feeParticulars.map((p) => p.id);
                const providedParticularIds = feeParticulars.filter((f) => f.id).map((f) => f.id);
                const deletedParticularIds = existingParticularIds.filter(
                    (id) => !providedParticularIds.includes(id)
                );

                // Delete removed fee particulars and their associated student fee particulars
                if (deletedParticularIds.length > 0) {
                    await tx.studentFeeParticular.deleteMany({
                        where: { globalParticularId: { in: deletedParticularIds } },
                    });
                    await tx.feeParticular.deleteMany({
                        where: { id: { in: deletedParticularIds } },
                    });
                }

                // Update or create fee particulars
                const newParticulars = [];
                for (const fee of feeParticulars) {
                    if (fee.id) {
                        // Update existing fee particular
                        await tx.feeParticular.update({
                            where: { id: fee.id },
                            data: {
                                name: fee.name,
                                defaultAmount: fee.amount,
                            },
                        });
                        // Update corresponding student fee particulars
                        await tx.studentFeeParticular.updateMany({
                            where: { globalParticularId: fee.id },
                            data: { amount: fee.amount },
                        });
                    } else {
                        // Create new fee particular
                        const newParticular = await tx.feeParticular.create({
                            data: {
                                feeStructureId: id,
                                name: fee.name,
                                defaultAmount: fee.amount,
                            },
                        });
                        newParticulars.push(newParticular);
                    }
                }

                // Assign new fee particulars to existing student fee structures
                const studentFeeStructures = await tx.studentFeeStructure.findMany({
                    where: { feeStructureId: id },
                });
                for (const sfs of studentFeeStructures) {
                    for (const newParticular of newParticulars) {
                        await tx.studentFeeParticular.create({
                            data: {
                                studentFeeStructureId: sfs.id,
                                globalParticularId: newParticular.id,
                                amount: newParticular.defaultAmount,
                                status: "unpaid",
                            },
                        });
                    }
                }
            }

            return updatedFeeStructure;
        });

        return NextResponse.json({
            message: "Fee structure updated",
            feeStructure: result,
        });
    } catch (err) {
        console.error("Update FeeStructure API error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 400 });
    }
}
// DELETE: Delete fee structure
export async function DELETE(req) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        const feeStructure = await prisma.feeStructure.findUnique({ where: { id } });
        if (!feeStructure) throw new Error("Fee structure not found");

        const assignedCount = await prisma.studentFeeStructure.count({
            where: { feeStructureId: id },
        });
        if (assignedCount > 0) throw new Error("Cannot delete assigned fee structure");

        await prisma.$transaction(async (tx) => {
            await tx.studentFeeParticular.deleteMany({ where: { studentFeeStructure: { feeStructureId: id } } });
            await tx.feeParticular.deleteMany({ where: { feeStructureId: id } });
            await tx.studentFeeStructure.deleteMany({ where: { feeStructureId: id } });
            await tx.feeStructure.delete({ where: { id } });
        });

        return NextResponse.json({ message: "Fee structure deleted" });
    } catch (err) {
        console.error("Delete FeeStructure API error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 400 });
    }
}