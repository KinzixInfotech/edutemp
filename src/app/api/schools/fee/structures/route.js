import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
    schoolId: z.string().uuid(),
    academicYearId: z.string().uuid(),
    classId: z.number().int().nullable().optional(),
    mode: z.enum(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]),
    fees: z.array(
        z.object({
            name: z.string().min(1),
            amount: z.number().positive(),
        })
    ),
});
const getInstallments = (mode, totalAmount) => {
    const installments = [];
    const now = new Date();

    let count = 1;
    let monthsGap = 1; // default monthly

    switch (mode) {
        case "MONTHLY": count = 12; monthsGap = 1; break;
        case "QUARTERLY": count = 4; monthsGap = 3; break;
        case "HALF_YEARLY": count = 2; monthsGap = 6; break;
        case "YEARLY": count = 1; monthsGap = 12; break;
    }

    const installmentAmount = parseFloat((totalAmount / count).toFixed(2));

    for (let i = 0; i < count; i++) {
        const dueDate = new Date(now.getFullYear(), now.getMonth() + i * monthsGap, 1);
        installments.push({
            dueDate,
            amount: installmentAmount,
            status: "UNPAID",
        });
    }

    return installments;
};
const getFeeStructureName = (mode) => {
    const now = new Date();
    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    switch (mode) {
        case "MONTHLY":
            return monthNames[now.getMonth()];
        case "QUARTERLY":
            const quarter = Math.floor(now.getMonth() / 3) + 1;
            return `Quarter ${quarter}`;
        case "HALF_YEARLY":
            const half = now.getMonth() < 6 ? 1 : 2;
            return `Half Year ${half}`;
        case "YEARLY":
            return `Year ${now.getFullYear()}`;
        default:
            return `Fees for ${now.toLocaleDateString()}`;
    }
};

export async function POST(req) {
    try {
        const body = await req.json();
        const parsed = schema.parse(body);

        // 1. Create FeeStructure
        const feeStructure = await prisma.feeStructure.create({
            data: {
                schoolId: parsed.schoolId,
                academicYearId: parsed.academicYearId,
                classId: parsed.classId ?? null,
                mode: parsed.mode,
                issueDate: new Date(),
                name: getFeeStructureName(parsed.mode),
                feeParticulars: {
                    create: parsed.fees.map(f => ({
                        name: f.name,
                        defaultAmount: f.amount,
                    })),
                },
            },
            include: { feeParticulars: true },
        });

        // 2. Fetch all students in this class (or all if classId is null)
        const students = await prisma.student.findMany({
            where: {
                schoolId: parsed.schoolId,
                ...(parsed.classId ? { classId: parsed.classId } : {}),
            },
        });

        // 3. Assign fees to each student
        for (const student of students) {
            await prisma.studentFeeStructure.create({
                data: {
                    studentId: student.userId,
                    academicYearId: parsed.academicYearId,
                    schoolId: parsed.schoolId,
                    studentUserId: student.userId,
                    feeParticulars: {
                        create: feeStructure.feeParticulars.map(fp => ({
                            globalParticularId: fp.id,
                            amount: fp.defaultAmount,
                            status: "UNPAID",
                        })),
                    },
                },
            });
        }

        // 4. Assign student fees structure to each student
        for (const student of students) {
            const studentFee = await prisma.studentFeeStructure.create({
                data: {
                    studentId: student.userId,
                    academicYearId: parsed.academicYearId,
                    schoolId: parsed.schoolId,
                    studentUserId: student.userId,
                    feeParticulars: {
                        create: feeStructure.feeParticulars.map(fp => ({
                            globalParticularId: fp.id,
                            amount: fp.defaultAmount,
                            status: "UNPAID",
                        })),
                    },
                },
                include: { feeParticulars: true }
            });

            // Create installments for each fee particular
            for (const sfp of studentFee.feeParticulars) {
                const installments = getInstallments(parsed.mode, sfp.amount);
                await prisma.studentFeeInstallment.createMany({
                    data: installments.map(inst => ({ ...inst, studentFeeParticularId: sfp.id }))
                });
            }
        }

        return NextResponse.json({
            message: `Fee structure created and assigned to ${students.length} students`,
            feeStructure,
        }, { status: 201 });

    } catch (err) {
        console.error("FeeStructure API error:", err);
        return NextResponse.json(
            { error: err.message || "Invalid request" },
            { status: 400 }
        );
    }
}
