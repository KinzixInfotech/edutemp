// ============================================
// API: /api/schools/fee/refunds/route.js
// Process fee refunds
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// Helper: Generate refund receipt number
function generateRefundReceiptNumber(schoolId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REF-${schoolId.slice(0, 4).toUpperCase()}-${timestamp}-${random}`;
}

// GET - Fetch refunds for a school
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get("schoolId");
        const studentId = searchParams.get("studentId");
        const status = searchParams.get("status");
        const limit = parseInt(searchParams.get("limit") || "50");

        if (!schoolId) {
            return NextResponse.json(
                { error: "schoolId is required" },
                { status: 400 }
            );
        }

        const where = {
            schoolId,
            paymentMode: "REFUND",
            ...(studentId && { studentId }),
            ...(status && { status }),
        };

        const refunds = await prisma.feePayment.findMany({
            where,
            include: {
                student: { select: { name: true, admissionNo: true } },
                studentFee: { select: { academicYear: { select: { name: true } } } },
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });

        return NextResponse.json({ refunds });

    } catch (error) {
        console.error("Fetch Refunds Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch refunds" },
            { status: 500 }
        );
    }
}

// POST - Process a refund
export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            reason,
            refundMethod, // CASH, CHEQUE, BANK_TRANSFER
            referenceNumber,
            processedBy,
        } = body;

        // Validation
        if (!studentFeeId || !studentId || !schoolId || !amount || !reason) {
            return NextResponse.json(
                { error: "Missing required fields: studentFeeId, studentId, schoolId, amount, reason" },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: "Refund amount must be positive" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Verify student fee
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
                include: {
                    student: { select: { name: true, admissionNo: true } },
                },
            });

            if (!studentFee) {
                throw new Error("Student fee record not found");
            }

            // Check if refund amount is valid
            if (amount > studentFee.paidAmount) {
                throw new Error(
                    `Refund amount (₹${amount}) exceeds paid amount (₹${studentFee.paidAmount})`
                );
            }

            // Generate refund receipt number
            const receiptNumber = generateRefundReceiptNumber(schoolId);

            // Create refund payment record (negative amount conceptually)
            const refund = await tx.feePayment.create({
                data: {
                    studentFeeId,
                    studentId,
                    schoolId,
                    academicYearId,
                    amount: -Math.abs(amount), // Negative to indicate refund
                    paymentMode: "REFUND",
                    paymentMethod: refundMethod || "BANK_TRANSFER",
                    status: "SUCCESS",
                    receiptNumber,
                    referenceNumber,
                    collectedBy: processedBy,
                    remarks: reason,
                    paymentDate: new Date(),
                    clearedDate: new Date(),
                },
            });

            // Update student fee
            const newPaidAmount = studentFee.paidAmount - amount;
            const newBalanceAmount = studentFee.finalAmount - newPaidAmount;
            const newStatus =
                newBalanceAmount <= 0 ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFeeId },
                data: {
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount,
                    status: newStatus,
                },
            });

            // Reverse allocations from installments if needed
            // Find the most recent paid installments and reduce their paid amount
            let remainingRefund = amount;
            const installments = await tx.studentFeeInstallment.findMany({
                where: {
                    studentFeeId,
                    paidAmount: { gt: 0 },
                },
                orderBy: { installmentNumber: "desc" }, // Start from last installment
            });

            const adjustedInstallments = [];

            for (const installment of installments) {
                if (remainingRefund <= 0) break;

                const deductAmount = Math.min(remainingRefund, installment.paidAmount);
                const newPaid = installment.paidAmount - deductAmount;
                const newInstallmentStatus = newPaid <= 0 ? "PENDING" : newPaid >= installment.amount ? "PAID" : "PARTIAL";

                await tx.studentFeeInstallment.update({
                    where: { id: installment.id },
                    data: {
                        paidAmount: newPaid,
                        status: newInstallmentStatus,
                        paidDate: newInstallmentStatus === "PAID" ? installment.paidDate : null,
                    },
                });

                adjustedInstallments.push({
                    installmentNumber: installment.installmentNumber,
                    deducted: deductAmount,
                    newPaidAmount: newPaid,
                    newStatus: newInstallmentStatus,
                });

                remainingRefund -= deductAmount;
            }

            return { refund, adjustedInstallments, studentFee: { newPaidAmount, newBalanceAmount, newStatus } };
        });

        return NextResponse.json({
            success: true,
            message: "Refund processed successfully",
            refund: {
                id: result.refund.id,
                receiptNumber: result.refund.receiptNumber,
                amount: Math.abs(result.refund.amount),
            },
            adjustedInstallments: result.adjustedInstallments,
            updatedFeeStatus: result.studentFee,
        });

    } catch (error) {
        console.error("Process Refund Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process refund" },
            { status: 400 }
        );
    }
}
