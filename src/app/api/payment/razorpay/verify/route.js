import { withSchoolAccess } from "@/lib/api-auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PaymentGatewayFactory } from "@/lib/payment/PaymentGatewayFactory";
import { processPayment } from "@/lib/fee/payment-engine";

export const POST = withSchoolAccess(async function POST(req) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    console.log("🔍 Verifying Razorpay Payment:", { razorpay_order_id, razorpay_payment_id });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    const payment = await prisma.feePayment.findFirst({
      where: { gatewayOrderId: razorpay_order_id }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.status === 'SUCCESS') {
      const receipt = await prisma.receipt.findFirst({
        where: { feePaymentId: payment.id },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({
        success: true,
        message: "Payment already verified",
        payment: {
          id: payment.id,
          receiptNumber: receipt?.receiptNumber || payment.receiptNumber,
          amount: payment.amount,
          date: payment.paymentDate,
        },
      });
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.json({ error: `Payment is ${payment.status.toLowerCase()}` }, { status: 409 });
    }

    // 2. Fetch School Settings (to get secret)
    const settings = await prisma.schoolPaymentSettings.findUnique({
      where: { schoolId: payment.schoolId }
    });

    if (!settings) {
      return NextResponse.json({ error: "School payment settings not found" }, { status: 404 });
    }

    // 3. Verify Signature
    // We use the same adapter logic
    const adapter = PaymentGatewayFactory.getAdapter('RAZORPAY', settings);

    const verification = await adapter.verifyPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (verification.status !== 'SUCCESS') {
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          failureReason: 'Signature Verification Failed',
          gatewayPaymentId: razorpay_payment_id,
          gatewayResponse: verification.rawResponse
        }
      });
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const session = await prisma.feeSession.findFirst({
      where: { schoolId: payment.schoolId, isClosed: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return NextResponse.json({ error: "Payment session unavailable" }, { status: 503 });
    }

    await prisma.feePayment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: razorpay_payment_id,
        transactionId: razorpay_payment_id,
        webhookVerified: true,
        reconciledAt: new Date(),
        gatewayResponse: verification.rawResponse,
        settlementStatus: 'verified',
      },
    });

    const allocationResult = await processPayment({
      studentId: payment.studentId,
      schoolId: payment.schoolId,
      academicYearId: payment.academicYearId,
      feeSessionId: session.id,
      amountPaid: payment.amount,
      paymentMode: payment.paymentMode,
      paymentMethod: "NET_BANKING",
      existingPaymentId: payment.id,
      remarks: "Online Razorpay Payment"
    });

    await prisma.feePayment.update({
      where: { id: payment.id },
      data: {
        gatewayPaymentId: razorpay_payment_id,
        webhookVerified: true,
        reconciledAt: new Date(),
        gatewayResponse: verification.rawResponse,
        settlementStatus: 'processed'
      }
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified successfully",
      payment: {
        id: payment.id,
        receiptNumber: allocationResult.receiptNumber,
        amount: payment.amount,
        date: new Date()
      }
    });

  } catch (error) {
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ error: "Verification failed: " + error.message }, { status: 500 });
  }
}, { allowPastDueWrite: true });
