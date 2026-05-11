import { withSchoolAccess } from "@/lib/api-auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PaymentGatewayFactory } from "@/lib/payment/PaymentGatewayFactory";
import crypto from "node:crypto";

const PENDING_PAYMENT_TTL_MINUTES = 30;

export const POST = withSchoolAccess(async function POST(req) {
  let paymentIdForFailure = null;
  try {
    const body = await req.json();
    const { studentFeeId, amount, studentId, schoolId } = body;
    const amountValue = Number(amount);

    if (!studentFeeId || !amountValue || !schoolId || !studentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero" }, { status: 400 });
    }

    const studentFee = await prisma.studentFee.findFirst({
      where: { id: studentFeeId, studentId, schoolId },
      select: {
        id: true,
        studentId: true,
        schoolId: true,
        academicYearId: true,
        balanceAmount: true,
      },
    });

    if (!studentFee) {
      return NextResponse.json({ error: "Student fee record not found" }, { status: 404 });
    }

    if (amountValue > studentFee.balanceAmount + 0.01) {
      return NextResponse.json({ error: "Payment amount exceeds outstanding balance" }, { status: 400 });
    }

    const settings = await prisma.schoolPaymentSettings.findUnique({
      where: { schoolId }
    });

    if (!settings || !settings.isEnabled) {
      return NextResponse.json({ error: "Online payments are disabled for this school" }, { status: 403 });
    }

    const provider = settings.provider;
    const expiredBefore = new Date(Date.now() - PENDING_PAYMENT_TTL_MINUTES * 60 * 1000);

    await prisma.feePayment.updateMany({
      where: {
        studentFeeId,
        schoolId,
        status: "PENDING",
        paymentMode: "ONLINE",
        paymentDate: { lt: expiredBefore },
      },
      data: {
        status: "CANCELLED",
        failureReason: "Payment session expired before completion",
      },
    });

    const reusablePendingPayment = await prisma.feePayment.findFirst({
      where: {
        studentFeeId,
        studentId,
        schoolId,
        status: "PENDING",
        paymentMode: "ONLINE",
        amount: amountValue,
        gatewayName: provider,
        paymentDate: { gte: expiredBefore },
      },
      orderBy: { paymentDate: "desc" },
    });

    if (reusablePendingPayment) {
      return NextResponse.json({
        success: false,
        pending: true,
        orderId: reusablePendingPayment.gatewayOrderId,
        error: "A payment for this amount is already pending. Please check its status before starting another payment.",
      }, { status: 409 });
    }

    const orderId = `ORD_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const payment = await prisma.feePayment.create({
      data: {
        studentFeeId,
        studentId,
        schoolId,
        academicYearId: studentFee.academicYearId,
        amount: amountValue,
        paymentMode: "ONLINE",
        paymentMethod: "NET_BANKING",
        status: "PENDING",
        gatewayName: provider,
        gatewayOrderId: orderId,
        receiptNumber: orderId
      }
    });
    paymentIdForFailure = payment.id;

    const adapter = PaymentGatewayFactory.getAdapter(provider, settings);

    const baseUrl = process.env.NODE_ENV === 'development' ?
    'http://pay.localhost:3000' :
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/api/payment/callback/${provider}`;

    const result = await adapter.initiatePayment({
      amount: amountValue,
      orderId,
      studentName: body.studentName || "Student",
      email: body.email || "parent@example.com",
      phone: body.phone || "9999999999",
      upiId: body.upiId,
      returnUrl: returnUrl,
      studentId,
      schoolId
    });

    if (result.type === 'RAZORPAY') {

      await prisma.feePayment.update({
        where: { id: payment.id },
        data: { gatewayOrderId: result.order.id }
      });

      return NextResponse.json({
        success: true,
        type: 'RAZORPAY',
        order: result.order,
        keyId: result.keyId,
        orderId: orderId
      });
    } else if (result.type === 'UPI_COLLECT') {
      return NextResponse.json({
        success: true,
        type: 'UPI_COLLECT',
        orderId: orderId,
        merchantTranId: result.merchantTranId,
        message: result.statusMessage
      });
    } else {
      const { url, params, method } = result;
      return NextResponse.json({
        success: true,
        type: 'REDIRECT',
        redirectUrl: url,
        params,
        method,
        orderId // Internal reference
      });
    }

  } catch (error) {
    console.error("Payment initiation error:", error);
    if (paymentIdForFailure) {
      await prisma.feePayment.update({
        where: { id: paymentIdForFailure },
        data: {
          status: "FAILED",
          failureReason: error.message || "Gateway initiation failed",
        },
      }).catch((updateError) => {
        console.error("Failed to mark payment initiation as failed:", updateError);
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, { allowPastDueWrite: true });
