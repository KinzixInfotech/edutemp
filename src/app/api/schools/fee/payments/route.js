// ============================================
// API: /api/fee/payments/route.js
// Process fee payments (Online & Offline)
// ENHANCED: Dual support for legacy Installments and new Financial Ledger
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { processPayment } from "@/lib/fee/payment-engine";

// Helper: Generate receipt number (Legacy)
function generateReceiptNumber(schoolId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REC-${schoolId.slice(0, 4).toUpperCase()}-${timestamp}-${random}`;
}

// Helper: Allocate payment to installments (Legacy)
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
            feeSessionId, // 🟢 New Ledger Indicator
            studentId,
            schoolId,
            academicYearId,
            amount,
            paymentMethod,
            referenceNumber,
            collectedBy,
            remarks,
        } = body;

        // V2: FINANCIAL LEDGER PROCESSING
        if (feeSessionId) {
            if (!studentId || !schoolId || !academicYearId || !amount) {
                return NextResponse.json({ error: "Missing required fields for ledger payment" }, { status: 400 });
            }

            const result = await processPayment({
                studentId,
                schoolId,
                academicYearId,
                feeSessionId,
                amountPaid: amount,
                paymentMode: "OFFLINE",
                paymentMethod: paymentMethod || "CASH",
                reference: referenceNumber,
                collectedBy,
                remarks
            });

            return NextResponse.json({
                message: "Ledger Payment processed successfully",
                paymentId: result.paymentId,
                receiptId: result.receiptId,
                receiptNumber: result.receiptNumber,
                allocationsCount: result.allocatedToItems,
                walletCredited: result.walletCredited,
                isLedgerEngine: true
            });
        }

        // V1: LEGACY INSTALLMENT PROCESSING
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

            // For V1 fallback: generate a generic receipt record if possible,
            // but V1 already relied on just the feePayment record. We skip the new `Receipt` model for V1.

            return { payment, allocations };
        });

        return NextResponse.json({
            message: "Legacy Payment processed successfully",
            payment: result.payment,
            allocations: result.allocations,
            isLedgerEngine: false
        });
    } catch (error) {
        console.error("Process Payment Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process payment" },
            { status: 400 }
        );
    }
}