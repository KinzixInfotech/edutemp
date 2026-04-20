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
                        admissionDate: true,
                        FatherName: true,
                        MotherName: true,
                        GuardianName: true,
                        GuardianRelation: true,
                        user: {
                            select: {
                                profilePicture: true,
                            },
                        },
                        class: { select: { className: true } },
                        section: { select: { name: true } },
                    },
                },
                installmentPayments: {
                    include: {
                        installment: {
                            select: {
                                installmentNumber: true,
                                dueDate: true,
                                amount: true,
                            },
                        },
                    },
                },
            },
            orderBy: { paymentDate: "desc" },
        });

        return NextResponse.json(payments.map((payment) => ({
            ...payment,
            studentProfile: {
                name: payment.student?.name || null,
                admissionNo: payment.student?.admissionNo || null,
                admissionDate: payment.student?.admissionDate || null,
                className: payment.student?.class?.className || null,
                sectionName: payment.student?.section?.name || null,
                profilePicture: payment.student?.user?.profilePicture || null,
                fatherName: payment.student?.FatherName || null,
                motherName: payment.student?.MotherName || null,
                guardianName: payment.student?.GuardianName || null,
                guardianRelation: payment.student?.GuardianRelation || null,
            },
            installmentSummary: (payment.installmentPayments || []).map((ip) => ({
                id: ip.id,
                amount: ip.amount,
                installmentNumber: ip.installment?.installmentNumber,
                monthLabel: ip.installment?.dueDate
                    ? new Date(ip.installment.dueDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
                    : null,
                dueDate: ip.installment?.dueDate || null,
                installmentAmount: ip.installment?.amount || null,
            })),
        })));
    } catch (error) {
        console.error("Student Payment History Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch payment history" },
            { status: 500 }
        );
    }
}
