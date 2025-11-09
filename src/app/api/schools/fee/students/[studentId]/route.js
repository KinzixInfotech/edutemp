// ============================================
// API: /api/fee/students/[studentId]/route.js
// ENHANCED: Return detailed installment breakdowns
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
                        installmentRules: {
                            orderBy: { installmentNumber: 'asc' }
                        }
                    },
                },
                particulars: {
                    orderBy: { name: "asc" },
                },
                installments: {
                    orderBy: { installmentNumber: "asc" },
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
                { error: "No fee record found" },
                { status: 404 }
            );
        }

        // ===================================
        // Calculate installment breakdowns
        // ===================================
        const enrichedInstallments = studentFee.installments.map(installment => {
            const rule = studentFee.globalFeeStructure?.installmentRules?.find(
                r => r.installmentNumber === installment.installmentNumber
            );

            const percentage = rule ? rule.percentage : 100;
            const particularBreakdowns = studentFee.particulars.map(particular => ({
                particularId: particular.id,
                particularName: particular.name,
                totalParticularAmount: particular.amount,
                amountInThisInstallment: (particular.amount * percentage) / 100,
                paidInThisInstallment: 0, // Will be calculated from payment allocations
            }));

            return {
                ...installment,
                rule: rule || null,
                particularBreakdowns,
                canPayNow: installment.status !== 'PAID' && installment.amount > installment.paidAmount,
            };
        });

        // Update overdue status
        const now = new Date();
        const overdueInstallments = enrichedInstallments.filter(
            inst => inst.status !== "PAID" && new Date(inst.dueDate) < now
        );

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
            installments: enrichedInstallments,
            overdueCount: overdueInstallments.length,
            nextDueInstallment: enrichedInstallments.find(
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