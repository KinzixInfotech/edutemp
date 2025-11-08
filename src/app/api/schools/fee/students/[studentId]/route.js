// ============================================
// API: /api/fee/students/[studentId]/route.js
// Get fee details for a specific student
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, { params }) {
    try {
        const { studentId } = params;
        const { searchParams } = new URL(req.url);
        const academicYearId = searchParams.get("academicYearId");

        if (!academicYearId) {
            return NextResponse.json(
                { error: "academicYearId required" },
                { status: 400 }
            );
        }

        const studentFee = await prisma.studentFee.findUnique({
            where: {
                studentId_academicYearId: {
                    studentId,
                    academicYearId,
                },
            },
            include: {
                student: {
                    select: {
                        userId: true,
                        name: true,
                        admissionNo: true,
                        rollNumber: true,
                        class: { select: { className: true } },
                        section: { select: { name: true } },
                    },
                },
                globalFeeStructure: {
                    select: {
                        name: true,
                        mode: true,
                    },
                },
                particulars: {
                    orderBy: { name: "asc" },
                },
                installments: {
                    orderBy: { dueDate: "asc" },
                    include: {
                        payments: {
                            include: {
                                payment: {
                                    select: {
                                        amount: true,
                                        paymentDate: true,
                                        receiptNumber: true,
                                        paymentMethod: true,
                                    },
                                },
                            },
                        },
                    },
                },
                payments: {
                    orderBy: { paymentDate: "desc" },
                    where: { status: "SUCCESS" },
                },
                discounts: {
                    include: {
                        approver: {
                            select: { name: true },
                        },
                    },
                },
            },
        });

        if (!studentFee) {
            return NextResponse.json(
                { error: "No fee record found for this student" },
                { status: 404 }
            );
        }

        // Calculate overdue installments
        const now = new Date();
        const overdueInstallments = studentFee.installments.filter(
            inst => inst.status !== "PAID" && new Date(inst.dueDate) < now
        );

        // Update overdue status
        if (overdueInstallments.length > 0) {
            await prisma.studentFeeInstallment.updateMany({
                where: {
                    id: { in: overdueInstallments.map(i => i.id) },
                },
                data: { isOverdue: true },
            });
        }

        return NextResponse.json({
            ...studentFee,
            overdueCount: overdueInstallments.length,
            nextDueInstallment: studentFee.installments.find(
                inst => inst.status === "PENDING" && !inst.isOverdue
            ),
        });
    } catch (error) {
        console.error("Get Student Fee Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch student fee details" },
            { status: 500 }
        );
    }
}
