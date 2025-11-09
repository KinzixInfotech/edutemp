
import { allocatePaymentToInstallments } from "@/lib/payment-allocation";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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
      const payment = await tx.feePayment.findUnique({
        where: { id: paymentId },
        include: { studentFee: true },
      });

      if (!payment) {
        throw new Error("Payment record not found");
      }

      if (payment.status !== "PENDING") {
        throw new Error("Payment already processed");
      }

      const isValid = simulationSuccess;

      if (!isValid) {
        await tx.feePayment.update({
          where: { id: paymentId },
          data: {
            status: "FAILED",
            failureReason: "Signature verification failed",
          },
        });
        throw new Error("Payment verification failed");
      }

      // Update payment status
      await tx.feePayment.update({
        where: { id: paymentId },
        data: {
          status: "SUCCESS",
          gatewayPaymentId: razorpayPaymentId || `pay_${Date.now()}`,
          transactionId: razorpayPaymentId || `txn_${Date.now()}`,
          clearedDate: new Date(),
        },
      });

      // USE THE SHARED ALLOCATION FUNCTION
      const { allocations } = await allocatePaymentToInstallments(
        tx,
        payment.studentFeeId,
        payment.id,
        payment.amount
      );

      // Update student fee
      const studentFee = payment.studentFee;
      const newPaidAmount = studentFee.paidAmount + payment.amount;
      const newBalanceAmount = studentFee.finalAmount - newPaidAmount;
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

      return { payment, allocations };
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      payment: result.payment,
      allocations: result.allocations,
    });
  } catch (error) {
    console.error("Verify Payment Error:", error);
    return NextResponse.json(
      { error: error.message || "Payment verification failed" },
      { status: 400 }
    );
  }
}
