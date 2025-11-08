// ============================================
// API: /api/fee/parent/my-fees/route.js
// Parent view their children's fees
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const parentId = searchParams.get("parentId"); // From session/auth
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
                            select: { name: true, mode: true },
                        },
                        particulars: {
                            orderBy: { name: "asc" },
                        },
                        installments: {
                            orderBy: { installmentNumber: "asc" },
                            include: {
                                payments: {
                                    include: {
                                        payment: {
                                            select: {
                                                receiptNumber: true,
                                                paymentDate: true,
                                                amount: true,
                                                paymentMethod: true,
                                            },
                                        },
                                    },
                                },
                            },
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

            // Calculate upcoming dues
            const now = new Date();
            const upcomingInstallments = fee.installments.filter(
                inst => inst.status === "PENDING" && new Date(inst.dueDate) > now
            ).slice(0, 3);

            const overdueInstallments = fee.installments.filter(
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
                particulars: fee.particulars,
                installments: fee.installments.map(inst => ({
                    id: inst.id,
                    number: inst.installmentNumber,
                    dueDate: inst.dueDate,
                    amount: inst.amount,
                    paidAmount: inst.paidAmount,
                    balance: inst.amount - inst.paidAmount,
                    status: inst.status,
                    isOverdue: inst.isOverdue,
                    canPayNow: inst.status !== "PAID" && inst.paidAmount < inst.amount,
                })),
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




