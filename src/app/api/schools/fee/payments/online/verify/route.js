// ============================================
// API: /api/schools/fee/payments/online/verify/route.js
// Verify Razorpay payment with signature verification
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// Helper: Allocate payment to installments
async function allocatePaymentToInstallments(tx, studentFeeId, paymentId, amountToAllocate) {
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
    const newStatus = newPaidAmount >= installment.amount ? "PAID" : "PARTIAL";

    await tx.studentFeeInstallment.update({
      where: { id: installment.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
        paidDate: newStatus === "PAID" ? new Date() : undefined,
        isOverdue: newStatus === "PAID" ? false : installment.isOverdue,
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

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      paymentId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      simulationSuccess = true,
    } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "paymentId required" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Fetch payment with related data
      const payment = await tx.feePayment.findUnique({
        where: { id: paymentId },
        include: {
          studentFee: true,
          school: {
            include: {
              feeSettings: true
            }
          }
        },
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      if (payment.status !== "PENDING") {
        throw new Error("Payment already processed");
      }

      let isValid = false;
      const feeSettings = payment.school?.feeSettings;

      // Check if this is a real Razorpay payment or simulation
      if (razorpayOrderId && razorpayPaymentId && razorpaySignature && feeSettings?.razorpayKeySecret) {
        // Real Razorpay signature verification
        const body = razorpayOrderId + "|" + razorpayPaymentId;
        const expectedSignature = crypto
          .createHmac("sha256", feeSettings.razorpayKeySecret)
          .update(body)
          .digest("hex");

        isValid = expectedSignature === razorpaySignature;

        if (!isValid) {
          console.error("Razorpay signature mismatch:", {
            expected: expectedSignature,
            received: razorpaySignature,
          });
        }
      } else {
        // Simulation mode - use simulationSuccess flag
        isValid = simulationSuccess;
      }

      if (!isValid) {
        await tx.feePayment.update({
          where: { id: paymentId },
          data: {
            status: "FAILED",
            failureReason: "Payment verification failed",
            gatewayResponse: {
              ...(payment.gatewayResponse || {}),
              verificationFailed: true,
              verifiedAt: new Date().toISOString(),
            },
          },
        });
        throw new Error("Payment verification failed");
      }

      // Update payment status to SUCCESS
      const updatedPayment = await tx.feePayment.update({
        where: { id: paymentId },
        data: {
          status: "SUCCESS",
          gatewayPaymentId: razorpayPaymentId || `pay_sim_${Date.now()}`,
          transactionId: razorpayPaymentId || `txn_sim_${Date.now()}`,
          paymentDate: new Date(),
          clearedDate: new Date(),
          gatewayResponse: {
            ...(payment.gatewayResponse || {}),
            razorpayPaymentId,
            razorpayOrderId,
            verified: true,
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      // Allocate payment to installments
      const { allocations } = await allocatePaymentToInstallments(
        tx,
        payment.studentFeeId,
        payment.id,
        payment.amount
      );

      // Update student fee totals
      const studentFee = payment.studentFee;
      const newPaidAmount = studentFee.paidAmount + payment.amount;
      const newBalanceAmount = Math.max(0, studentFee.finalAmount - newPaidAmount);
      const newStatus =
        newBalanceAmount <= 0 ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID";

      await tx.studentFee.update({
        where: { id: payment.studentFeeId },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalanceAmount,
          status: newStatus,
          lastPaymentDate: new Date(),
        },
      });

      return { payment: updatedPayment, allocations, newStatus };
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified and processed successfully",
      payment: {
        id: result.payment.id,
        amount: result.payment.amount,
        receiptNumber: result.payment.receiptNumber,
        status: result.payment.status,
      },
      allocations: result.allocations,
      feeStatus: result.newStatus,
    });

  } catch (error) {
    console.error("Verify Payment Error:", error);
    return NextResponse.json(
      { error: error.message || "Payment verification failed" },
      { status: 400 }
    );
  }
}
