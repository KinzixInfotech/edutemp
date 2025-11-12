// ============================================
// API: /api/fee/payments/route.js
// Process fee payments (Online & Offline)
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// Helper: Generate receipt number
function generateReceiptNumber(schoolId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REC-${schoolId.slice(0, 4).toUpperCase()}-${timestamp}-${random}`;
}

// Helper: Allocate payment to installments
async function allocatePaymentToInstallments(
    tx,
    studentFeeId,
    paymentId,
    amountToAllocate
) {
    // Get pending installments ordered by due date
    const installments = await tx.studentFeeInstallment.findMany({
        where: {
            studentFeeId,
            status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        },
        orderBy: [
            { isOverdue: "desc" }, // Pay overdue first
            { dueDate: "asc" },
        ],
    });

    let remainingAmount = amountToAllocate;
    const allocations = [];

    for (const installment of installments) {
        if (remainingAmount <= 0) break;

        const installmentBalance = installment.amount - installment.paidAmount;
        const amountForThis = Math.min(remainingAmount, installmentBalance);

        // Create allocation
        await tx.feePaymentInstallment.create({
            data: {
                paymentId,
                installmentId: installment.id,
                amount: amountForThis,
            },
        });

        // Update installment
        const newPaidAmount = installment.paidAmount + amountForThis;
        const newStatus =
            newPaidAmount >= installment.amount
                ? "PAID"
                : "PARTIAL";

        await tx.studentFeeInstallment.update({
            where: { id: installment.id },
            data: {
                paidAmount: newPaidAmount,
                status: newStatus,
                paidDate: newStatus === "PAID" ? new Date() : undefined,
            },
        });

        allocations.push({
            installmentId: installment.id,
            installmentNumber: installment.installmentNumber,
            amount: amountForThis,
        });

        remainingAmount -= amountForThis;
    }

    return { allocations, unallocatedAmount: remainingAmount };
}

// POST: Process Offline Payment (Cash, Cheque, etc.)
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            paymentMethod,
            referenceNumber,
            collectedBy,
            remarks,
        } = body;

        // Validation
        if (!studentFeeId || !studentId || !schoolId || !academicYearId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: "Amount must be positive" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Verify student fee
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
            });

            if (!studentFee) {
                throw new Error("Student fee record not found");
            }

            if (amount > studentFee.balanceAmount) {
                throw new Error(
                    `Payment amount (₹${amount}) exceeds balance (₹${studentFee.balanceAmount})`
                );
            }

            // Generate receipt number
            const receiptNumber = generateReceiptNumber(schoolId);

            // Create payment record
            const payment = await tx.feePayment.create({
                data: {
                    studentFeeId,
                    studentId,
                    schoolId,
                    academicYearId,
                    amount,
                    paymentMode: "OFFLINE",
                    paymentMethod: paymentMethod || "CASH",
                    referenceNumber,
                    status: "SUCCESS",
                    receiptNumber,
                    collectedBy,
                    remarks,
                    paymentDate: new Date(),
                    clearedDate: new Date(),
                },
            });

            // Allocate payment to installments
            const { allocations } = await allocatePaymentToInstallments(
                tx,
                studentFeeId,
                payment.id,
                amount
            );

            // Update student fee
            const newPaidAmount = studentFee.paidAmount + amount;
            const newBalanceAmount = studentFee.finalAmount - newPaidAmount;
            const newStatus =
                newBalanceAmount <= 0
                    ? "PAID"
                    : newPaidAmount > 0
                        ? "PARTIAL"
                        : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFeeId },
                data: {
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount, 
                    status: newStatus,
                    lastPaymentDate: new Date(),
                },
            });

            return { payment, allocations };
        });

        return NextResponse.json({
            message: "Payment processed successfully",
            payment: result.payment,
            allocations: result.allocations,
        });
    } catch (error) {
        console.error("Process Payment Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process payment" },
            { status: 400 }
        );
    }
}