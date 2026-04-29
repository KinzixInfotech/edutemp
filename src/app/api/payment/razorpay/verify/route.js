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

    // 1. Fetch Payment Record
    const payment = await prisma.feePayment.findFirst({
      where: { gatewayOrderId: razorpay_order_id, status: { not: 'SUCCESS' } }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    if (payment.status === 'SUCCESS') {
      return NextResponse.json({ success: true, message: "Payment already verified" });
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
      // Record failure
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

    // 4. Update Payment Status / Run new ledger logic

    // Find active fee session for the school
    const session = await prisma.feeSession.findFirst({
      where: { schoolId: payment.schoolId, isClosed: false },
      orderBy: { createdAt: 'desc' }
    });

    if (!session) {
      return NextResponse.json({ error: "Payment session unavailable" }, { status: 503 });
    }

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

    // 5. Update extra gateway response fields outside the strict processPayment envelope 
    // to record webhook data
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
});