// ============================================
// API: /api/fee/payments/receipt/[receiptNumber]/route.js
// Get payment receipt
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";


export async function GET_RECEIPT(req, { params }) {
    try {
        const { receiptNumber } = params;

        const payment = await prisma.feePayment.findUnique({
            where: { receiptNumber },
            include: {
                student: {
                    select: {
                        name: true,
                        admissionNo: true,
                        rollNumber: true,
                        class: { select: { className: true } },
                        section: { select: { name: true } },
                    },
                },
                studentFee: {
                    select: {
                        originalAmount: true,
                        finalAmount: true,
                        paidAmount: true,
                        balanceAmount: true,
                    },
                },
                school: {
                    select: {
                        name: true,
                        location: true,
                        contactNumber: true,
                        profilePicture: true,
                    },
                },
                collector: {
                    select: { name: true },
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
        });

        if (!payment) {
            return NextResponse.json(
                { error: "Receipt not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(payment);
    } catch (error) {
        console.error("Get Receipt Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch receipt" },
            { status: 500 }
        );
    }
}