import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PaymentGatewayFactory } from "@/lib/payment/PaymentGatewayFactory";
import { processPayment } from "@/lib/fee/payment-engine";

export const POST = withSchoolAccess(async function POST(req, { params }) {
  try {
    const { gateway } = await params; // Generic provider ID from URL

    // Handle both Form Data and JSON (Banks usually POST form data)
    const contentType = req.headers.get("content-type") || "";
    let responseParams = {};

    if (contentType.includes("application/json")) {
      responseParams = await req.json();
    } else {
      const formData = await req.formData();
      responseParams = Object.fromEntries(formData.entries());
    }

    // 1. Identify Order/Transaction (Gateway specific extraction)
    // For MockAdapter we sent 'orderId' in params. 
    // Real gateways might send 'MerchantRefNo', 'TrackId', etc.
    // We might need a helper in Adapter to extract Order ID from raw params.
    // But for simplicity, let's assume we pass 'orderId' or find it in common fields.

    let orderId = responseParams.orderId || responseParams.RefNo || responseParams.MerchantRefNo;

    if (!orderId) {
      return NextResponse.json({ error: "Could not identify Order ID" }, { status: 400 });
    }

    const payment = await prisma.feePayment.findFirst({
      where: { gatewayOrderId: orderId },
      include: { school: { include: { paymentSettings: true } } }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    }

    const baseUrl = process.env.NODE_ENV === 'development' ?
    'http://pay.localhost:3000' :
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (payment.status === 'SUCCESS') {
      return NextResponse.redirect(`${baseUrl}/pay/success?receipt=${payment.receiptNumber}`);
    }

    if (payment.status !== 'PENDING') {
      return NextResponse.redirect(`${baseUrl}/pay/failure?orderId=${orderId}`);
    }

    const adapter = PaymentGatewayFactory.getAdapter(gateway, payment.school.paymentSettings);
    const verificationResult = await adapter.verifyPayment(responseParams);

    if (verificationResult.status === 'SUCCESS') {
      const session = await prisma.feeSession.findFirst({
        where: { schoolId: payment.schoolId, isClosed: false },
        orderBy: { createdAt: 'desc' },
      });

      if (!session) {
        return NextResponse.json({ error: "Payment session unavailable" }, { status: 503 });
      }

      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          transactionId: verificationResult.transactionId || null,
          gatewayPaymentId: verificationResult.transactionId || null,
          gatewayResponse: verificationResult.rawResponse,
          webhookVerified: true,
          reconciledAt: new Date(),
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
        paymentMethod: payment.paymentMethod || "NET_BANKING",
        existingPaymentId: payment.id,
        remarks: `${gateway} payment callback`,
      });

      return NextResponse.redirect(`${baseUrl}/pay/success?receipt=${allocationResult.receiptNumber || payment.receiptNumber}`);

    } else {
      await prisma.feePayment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          gatewayResponse: verificationResult.rawResponse,
          failureReason: 'Gateway reported failure'
        }
      });

      return NextResponse.redirect(`${baseUrl}/pay/failure?orderId=${orderId}`);
    }

  } catch (error) {
    console.error("Callback error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, { allowPastDueWrite: true });
