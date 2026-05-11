import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const PENDING_PAYMENT_TTL_MINUTES = 30;

export const GET = withSchoolAccess(async function GET(req, props) {
  const params = await props.params;
  try {
    const { orderId } = params;

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    let payment = await prisma.feePayment.findFirst({
      where: {
        OR: [
          { gatewayOrderId: orderId },
          { receiptNumber: orderId },
          { transactionId: orderId },
          { gatewayPaymentId: orderId },
        ],
      },
      select: {
        id: true,
        status: true,
        amount: true,
        receiptNumber: true,
        paymentDate: true,
        gatewayOrderId: true,
        gatewayPaymentId: true,
        transactionId: true,
        failureReason: true,
      }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const isExpiredPending =
      payment.status === "PENDING" &&
      new Date(payment.paymentDate).getTime() < Date.now() - PENDING_PAYMENT_TTL_MINUTES * 60 * 1000;

    if (isExpiredPending) {
      payment = await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: "CANCELLED",
          failureReason: "Payment session expired before completion",
        },
        select: {
          id: true,
          status: true,
          amount: true,
          receiptNumber: true,
          paymentDate: true,
          gatewayOrderId: true,
          gatewayPaymentId: true,
          transactionId: true,
          failureReason: true,
        },
      });
    }

    const receipt = payment.status === "SUCCESS"
      ? await prisma.receipt.findFirst({
          where: { feePaymentId: payment.id },
          orderBy: { createdAt: "desc" },
          select: { receiptNumber: true },
        })
      : null;

    return NextResponse.json({
      orderId: payment.gatewayOrderId,
      status: payment.status, // PENDING, SUCCESS, FAILED
      amount: payment.amount,
      receiptNumber: receipt?.receiptNumber || payment.receiptNumber,
      transactionId: payment.gatewayPaymentId || payment.transactionId,
      paymentDate: payment.paymentDate,
      failureReason: payment.failureReason,
    });
  } catch (error) {
    console.error("Payment Status Error:", error);
    return NextResponse.json({ error: "Failed to fetch payment status" }, { status: 500 });
  }
});
