// ============================================
// API: /api/schools/fee/payments/by-student/route.js
// Fetch payment history for a student (accountant/admin access)
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        let academicYearId = searchParams.get("academicYearId");

        if (!studentId) {
            return NextResponse.json(
                { error: "studentId required" },
                { status: 400 }
            );
        }

        // Auto-resolve academicYearId from active year if not passed
        if (!academicYearId) {
            const student = await prisma.student.findUnique({
                where: { userId: studentId },
                select: { schoolId: true },
            });
            if (student) {
                const activeYear = await prisma.academicYear.findFirst({
                    where: { schoolId: student.schoolId, isActive: true },
                    select: { id: true },
                });
                academicYearId = activeYear?.id;
            }
        }

        const where = {
            studentId,
            status: "SUCCESS",
            ...(academicYearId && { academicYearId }),
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

        return NextResponse.json(payments);
    } catch (error) {
        console.error("Student Payment History Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch payment history" },
            { status: 500 }
        );
    }
}
