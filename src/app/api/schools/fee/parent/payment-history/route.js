// ============================================
// API: /api/fee/parent/payment-history/route.js
// Parent view payment history
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const parentId = searchParams.get("parentId");
        const studentId = searchParams.get("studentId");
        const academicYearId = searchParams.get("academicYearId");
        console.log(`
🧩 Query Params:
- Parent ID: ${parentId}
- Student ID: ${studentId}
- Academic Year ID: ${academicYearId}
`);
        if (!parentId) {
            return NextResponse.json(
                { error: "parentId required" },
                { status: 400 }
            );
        }

        // Verify parent owns this student
        const student = studentId
            ? await prisma.student.findFirst({
                where: {
                    userId: studentId,
                    studentParentLinks: {
                        some: {
                            parentId: parentId,
                        },
                    },
                },
            })
            : null;

        // console.log(student, studentId)

        if (studentId && !student) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 403 }
            );
        }

        const where = {
            student: {
                studentParentLinks: {
                    some: {
                        parentId: parentId,
                    },
                },
            },
            ...(studentId && { studentId }),
            ...(academicYearId && { academicYearId }),
            status: "SUCCESS",
        };

        const payments = await prisma.feePayment.findMany({
            where,
            include: {
                student: {
                    select: {
                        name: true,
                        admissionNo: true,
                        class: { select: { className: true } },
                    },
                },
                installmentPayments: {
                    include: {
                        installment: {
                            select: {
                                installmentNumber: true,
                                dueDate: true,
                            },
                        },
                    },
                },
            },
            orderBy: { paymentDate: "desc" },
        });
        console.log(payments);

        return NextResponse.json(payments);
    } catch (error) {
        console.error("Payment History Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch payment history" },
            { status: 500 }
        );
    }
}
