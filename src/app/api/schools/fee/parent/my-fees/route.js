// ============================================
// API: /api/fee/parent/my-fees/route.js
// ENHANCED: Show complete installment breakdown for parents
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const parentId = searchParams.get("parentId");
        const academicYearId = searchParams.get("academicYearId");

        if (!parentId) {
            return NextResponse.json(
                { error: "parentId required" },
                { status: 400 }
            );
        }

        // Get all children of this parent
        const children = await prisma.student.findMany({
            where: {
                parentId,
                ...(academicYearId && { academicYearId }),
            },
            include: {
                class: { select: { className: true } },
                section: { select: { name: true } },
                studentFees: {
                    where: academicYearId ? { academicYearId } : {},
                    include: {
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
                            where: { status: "SUCCESS" },
                            orderBy: { paymentDate: "desc" },
                            take: 5,
                        },
                        discounts: true,
                    },
                },
            },
        });

        const childrenWithFees = children.map(child => {
            const fee = child.studentFees[0];

            if (!fee) {
                return {
                    student: {
                        userId: child.userId,
                        name: child.name,
                        admissionNo: child.admissionNo,
                        class: child.class.className,
                        section: child.section?.name,
                    },
                    fee: null,
                    message: "No fee assigned yet",
                };
            }

            // ===================================
            // Enrich installments with particular breakdowns
            // ===================================
            const enrichedInstallments = fee.installments.map(installment => {
                const rule = fee.globalFeeStructure?.installmentRules?.find(
                    r => r.installmentNumber === installment.installmentNumber
                );

                const percentage = rule ? rule.percentage : 100;

                // Calculate what particulars are included in this installment
                const particularBreakdowns = fee.particulars.map(particular => {
                    const amountInInstallment = (particular.amount * percentage) / 100;
                    return {
                        name: particular.name,
                        totalAmount: particular.amount,
                        amountInThisInstallment: amountInInstallment,
                        status: particular.status,
                    };
                });

                return {
                    id: installment.id,
                    number: installment.installmentNumber,
                    dueDate: installment.dueDate,
                    amount: installment.amount,
                    paidAmount: installment.paidAmount,
                    balance: installment.amount - installment.paidAmount,
                    status: installment.status,
                    isOverdue: installment.isOverdue,
                    paidDate: installment.paidDate,
                    canPayNow: installment.status !== "PAID" && installment.paidAmount < installment.amount,
                    particularBreakdowns, // What's included in this installment
                    percentage: rule?.percentage || 100,
                };
            });

            // Calculate upcoming dues
            const now = new Date();
            const upcomingInstallments = enrichedInstallments.filter(
                inst => inst.status === "PENDING" && new Date(inst.dueDate) > now
            ).slice(0, 3);

            const overdueInstallments = enrichedInstallments.filter(
                inst => inst.isOverdue && inst.status !== "PAID"
            );

            return {
                student: {
                    userId: child.userId,
                    name: child.name,
                    admissionNo: child.admissionNo,
                    rollNumber: child.rollNumber,
                    class: child.class.className,
                    section: child.section?.name,
                },
                fee: {
                    id: fee.id,
                    structureName: fee.globalFeeStructure?.name,
                    mode: fee.globalFeeStructure?.mode,
                    originalAmount: fee.originalAmount,
                    discountAmount: fee.discountAmount,
                    finalAmount: fee.finalAmount,
                    paidAmount: fee.paidAmount,
                    balanceAmount: fee.balanceAmount,
                    status: fee.status,
                    lastPaymentDate: fee.lastPaymentDate,
                },
                particulars: fee.particulars, // All fee components
                installments: enrichedInstallments, // With breakdowns
                upcomingDues: upcomingInstallments,
                overdueDues: overdueInstallments,
                recentPayments: fee.payments,
                discounts: fee.discounts,
            };
        });

        // Overall summary
        const summary = {
            totalChildren: children.length,
            totalBalance: childrenWithFees.reduce(
                (sum, c) => sum + (c.fee?.balanceAmount || 0),
                0
            ),
            totalPaid: childrenWithFees.reduce(
                (sum, c) => sum + (c.fee?.paidAmount || 0),
                0
            ),
            childrenWithOverdue: childrenWithFees.filter(
                c => c.overdueDues?.length > 0
            ).length,
        };

        return NextResponse.json({
            children: childrenWithFees,
            summary,
        });
    } catch (error) {
        console.error("Parent Fees View Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch fees" },
            { status: 500 }
        );
    }
}