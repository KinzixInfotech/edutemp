
// API: /api/fee/admin/reports/collection/route.js
// Detailed fee collection report
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const academicYearId = searchParams.get("academicYearId");
        const classId = searchParams.get("classId");
        const sectionId = searchParams.get("sectionId");
        const status = searchParams.get("status"); // PAID, UNPAID, PARTIAL, OVERDUE
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!schoolId || !academicYearId) {
            return NextResponse.json(
                { error: "schoolId and academicYearId required" },
                { status: 400 }
            );
        }

        const where = {
            schoolId,
            academicYearId,
            ...(status && { status }),
        };

        const studentWhere = {
            schoolId,
            academicYearId,
            ...(classId && { classId: parseInt(classId) }),
            ...(sectionId && { sectionId: parseInt(sectionId) }),
        };

        const students = await prisma.student.findMany({
            where: studentWhere,
            include: {
                studentFees: {
                    where: { academicYearId },
                    include: {
                        globalFeeStructure: {
                            select: { name: true, mode: true },
                        },
                        particulars: true,
                        installments: {
                            orderBy: { installmentNumber: "asc" },
                        },
                        payments: {
                            where: {
                                status: "SUCCESS",
                                ...(startDate && endDate && {
                                    paymentDate: {
                                        gte: new Date(startDate),
                                        lte: new Date(endDate),
                                    },
                                }),
                            },
                            orderBy: { paymentDate: "desc" },
                        },
                        discounts: true,
                    },
                },
                class: { select: { className: true } },
                section: { select: { name: true } },
            },
            orderBy: [
                { classId: "asc" },
                { rollNumber: "asc" },
            ],
        });

        const report = students.map(student => {
            const fee = student.studentFees[0];
            if (!fee) return null;

            return {
                studentId: student.userId,
                admissionNo: student.admissionNo,
                rollNumber: student.rollNumber,
                name: student.name,
                class: student.class.className,
                section: student.section?.name,
                feeStructure: fee.globalFeeStructure?.name,
                originalAmount: fee.originalAmount,
                discountAmount: fee.discountAmount,
                finalAmount: fee.finalAmount,
                paidAmount: fee.paidAmount,
                balanceAmount: fee.balanceAmount,
                status: fee.status,
                lastPaymentDate: fee.lastPaymentDate,
                installments: fee.installments.map(inst => ({
                    number: inst.installmentNumber,
                    dueDate: inst.dueDate,
                    amount: inst.amount,
                    paidAmount: inst.paidAmount,
                    status: inst.status,
                    isOverdue: inst.isOverdue,
                })),
                payments: fee.payments.map(p => ({
                    receiptNumber: p.receiptNumber,
                    amount: p.amount,
                    date: p.paymentDate,
                    method: p.paymentMethod,
                })),
                discounts: fee.discounts.map(d => ({
                    reason: d.reason,
                    amount: d.amount,
                })),
            };
        }).filter(Boolean);

        return NextResponse.json({
            report,
            summary: {
                totalStudents: report.length,
                totalExpected: report.reduce((sum, r) => sum + r.originalAmount, 0),
                totalCollected: report.reduce((sum, r) => sum + r.paidAmount, 0),
                totalBalance: report.reduce((sum, r) => sum + r.balanceAmount, 0),
                totalDiscount: report.reduce((sum, r) => sum + r.discountAmount, 0),
            },
        });
    } catch (error) {
        console.error("Collection Report Error:", error);
        return NextResponse.json(
            { error: "Failed to generate report" },
            { status: 500 }
        );
    }
}
