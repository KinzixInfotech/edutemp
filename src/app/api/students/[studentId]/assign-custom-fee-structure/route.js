// // /api/students/[studentId]/assign-custom-fee-structure/route.js - For assigning custom fee structure to a student

// import { NextResponse } from "next/server";
// import prisma from "@/lib/prisma";
// import { z } from "zod";

// const schema = z.object({
//     name: z.string().min(1, "Name is required"),
//     mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
//     particulars: z
//         .array(
//             z.object({
//                 name: z.string().min(1, "Particular name is required"),
//                 amount: z.number().positive("Amount must be positive"),
//             })
//         )
//         .min(1, "At least one particular is required"),
//     academicYearId: z.string().uuid("Invalid academic year ID").optional(),
//     isInstallment: z.boolean().optional(),
// });

// export async function POST(req, { params }) {
//     try {
//         const { studentId } = params;
//         const body = await req.json();
//         const parsed = schema.safeParse(body);
//         if (!parsed.success) {
//             return NextResponse.json(
//                 { error: "Validation failed", details: parsed.error.format() },
//                 { status: 400 }
//             );
//         }
//         const { name, mode, particulars, academicYearId, isInstallment = false } = parsed.data;

//         const result = await prisma.$transaction(async (tx) => {
//             const student = await tx.student.findUnique({ where: { userId: studentId } });
//             if (!student) throw new Error("Student not found");

//             const activeAcademicYear = await tx.academicYear.findFirst({
//                 where: { schoolId: student.schoolId, isActive: true },
//             });
//             const finalAcademicYearId = academicYearId || activeAcademicYear?.id;
//             if (!finalAcademicYearId) throw new Error("No academic year specified or active one found");

//             // Create custom FeeStructure for the student
//             const feeStructure = await tx.feeStructure.create({
//                 data: {
//                     schoolId: student.schoolId,
//                     academicYearId: finalAcademicYearId,
//                     studentUserId: studentId,
//                     mode,
//                     issueDate: new Date(),
//                     name,
//                     isInstallment,
//                     feeParticulars: {
//                         create: particulars.map((p) => ({
//                             name: p.name,
//                             defaultAmount: p.amount,
//                         })),
//                     },
//                 },
//                 include: { feeParticulars: true },
//             });

//             // Create StudentFeeStructure
//             const studentFeeStructure = await tx.studentFeeStructure.create({
//                 data: {
//                     studentId: studentId,
//                     academicYearId: finalAcademicYearId,
//                     schoolId: student.schoolId,
//                     studentUserId: studentId,
//                     feeStructureId: feeStructure.id,
//                 },
//             });

//             // Create StudentFeeParticulars with custom amounts (here same as default, but can adjust if needed)
//             await tx.studentFeeParticular.createMany({
//                 data: feeStructure.feeParticulars.map((particular) => ({
//                     studentFeeStructureId: studentFeeStructure.id,
//                     globalParticularId: particular.id,
//                     amount: particular.defaultAmount, // Can be customized if body has separate studentAmount
//                     status: "unpaid",
//                 })),
//             });

//             return feeStructure;
//         });

//         return NextResponse.json(
//             { message: "Custom fee structure assigned to student", feeStructure: result },
//             { status: 201 }
//         );
//     } catch (err) {
//         console.error("Assign Custom Fee Structure API error:", err);
//         return NextResponse.json({ error: err.message || "Internal server error" }, { status: 400 });
//     }
// }

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
    name: z.string().min(1, "Name is required"),
    mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
    particulars: z
        .array(
            z.object({
                name: z.string().min(1, "Particular name is required"),
                amount: z.number().positive("Amount must be positive"),
            })
        )
        .min(1, "At least one particular is required"),
    academicYearId: z.string().uuid("Invalid academic year ID").optional(),
    isInstallment: z.boolean().optional(),
});

export async function POST(req, { params }) {
    try {
        const { studentId } = params;
        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Validation failed", details: parsed.error.format() },
                { status: 400 }
            );
        }
        const { name, mode, particulars, academicYearId, isInstallment = false } = parsed.data;

        const result = await prisma.$transaction(async (tx) => {
            const student = await tx.student.findUnique({ where: { userId: studentId } });
            if (!student) throw new Error("Student not found");

            const activeAcademicYear = await tx.academicYear.findFirst({
                where: { schoolId: student.schoolId, isActive: true },
            });
            const finalAcademicYearId = academicYearId || activeAcademicYear?.id;
            if (!finalAcademicYearId) throw new Error("No academic year specified or active one found");

            // Check for existing StudentFeeStructure for the student and academic year
            const existingStudentFeeStructure = await tx.studentFeeStructure.findFirst({
                where: {
                    studentUserId: studentId,
                    academicYearId: finalAcademicYearId,
                },
                include: {
                    feeStructure: {
                        include: { feeParticulars: true },
                    },
                },
            });

            // If an existing fee structure is found, delete it and associated records
            if (existingStudentFeeStructure) {
                // Delete associated StudentFeeParticulars
                await tx.studentFeeParticular.deleteMany({
                    where: { studentFeeStructureId: existingStudentFeeStructure.id },
                });

                // Delete associated FeeParticulars
                await tx.feeParticular.deleteMany({
                    where: { feeStructureId: existingStudentFeeStructure.feeStructureId },
                });

                // Delete the StudentFeeStructure
                await tx.studentFeeStructure.delete({
                    where: { id: existingStudentFeeStructure.id },
                });

                // Delete the FeeStructure
                await tx.feeStructure.delete({
                    where: { id: existingStudentFeeStructure.feeStructureId },
                });
            }

            // Create new custom FeeStructure for the student
            const feeStructure = await tx.feeStructure.create({
                data: {
                    schoolId: student.schoolId,
                    academicYearId: finalAcademicYearId,
                    studentUserId: studentId,
                    mode,
                    issueDate: new Date(),
                    name,
                    isInstallment,
                    feeParticulars: {
                        create: particulars.map((p) => ({
                            name: p.name,
                            defaultAmount: p.amount,
                        })),
                    },
                },
                include: { feeParticulars: true },
            });

            // Create new StudentFeeStructure
            const studentFeeStructure = await tx.studentFeeStructure.create({
                data: {
                    studentId: studentId,
                    academicYearId: finalAcademicYearId,
                    schoolId: student.schoolId,
                    studentUserId: studentId,
                    feeStructureId: feeStructure.id,
                },
            });

            // Create new StudentFeeParticulars with custom amounts
            await tx.studentFeeParticular.createMany({
                data: feeStructure.feeParticulars.map((particular) => ({
                    studentFeeStructureId: studentFeeStructure.id,
                    globalParticularId: particular.id,
                    amount: particular.defaultAmount,
                    status: "unpaid",
                })),
            });

            return feeStructure;
        });

        return NextResponse.json(
            { message: "Custom fee structure assigned to student", feeStructure: result },
            { status: 201 }
        );
    } catch (err) {
        console.error("Assign Custom Fee Structure API error:", err);
        return NextResponse.json({ error: err.message || "Internal server error" }, { status: 400 });
    }
}