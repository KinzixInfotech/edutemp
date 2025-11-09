
// 3. RECORD PAYMENT API
// Location: app/api/schools/fee/payments/record/route.js (NEW FILE)
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { allocatePaymentToInstallments } from "@/lib/payment-allocation";

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            paymentMode,
            paymentMethod,
            transactionId,
            collectedBy,
            remarks,
        } = body;

        if (!studentFeeId || !studentId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            const studentFee = await tx.studentFee.findUnique({
                where: { id: studentFeeId },
            });

            if (!studentFee) {
                throw new Error("Student fee record not found");
            }

            if (amount > studentFee.balanceAmount) {
                throw new Error("Amount exceeds balance");
            }

            // Generate receipt number
            const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            // Create payment record
            const payment = await tx.feePayment.create({
                data: {
                    studentFeeId,
                    studentId,
                    schoolId,
                    academicYearId,
                    amount,
                    paymentMode: paymentMode || "OFFLINE",
                    paymentMethod: paymentMethod || "CASH",
                    status: "SUCCESS",
                    receiptNumber,
                    transactionId,
                    collectedBy,
                    remarks,
                    paymentDate: new Date(),
                    clearedDate: new Date(),
                },
            });

            // Allocate payment to installments and particulars
            const { allocations, particularUpdates } = await allocatePaymentToInstallments(
                tx,
                studentFeeId,
                payment.id,
                amount
            );

            // Update StudentFee totals
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

            return { payment, allocations, particularUpdates };
        });

        return NextResponse.json({
            success: true,
            message: "Payment recorded successfully",
            payment: result.payment,
            allocations: result.allocations,
            particularsUpdated: Object.keys(result.particularUpdates).length
        });
    } catch (error) {
        console.error("Record Payment Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to record payment" },
            { status: 400 }
        );
    }
}
