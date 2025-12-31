// ============================================
// API: /api/razorpay/webhooks/payment/route.js
// Handle Razorpay payment-related webhooks
// Source of truth for payment status
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/razorpay";

export async function POST(req) {
    try {
        // Get raw body for signature verification
        const body = await req.json();
        const signature = req.headers.get("x-razorpay-signature");

        // CRITICAL: Verify signature
        if (!verifyWebhookSignature(body, signature)) {
            console.error("Invalid webhook signature - SECURITY ALERT");
            return NextResponse.json(
                { error: "Invalid signature" },
                { status: 401 }
            );
        }

        const event = body.event;
        const payload = body.payload;

        console.log("Razorpay Payment Webhook:", event);

        switch (event) {
            case "payment.captured":
                await handlePaymentCaptured(payload);
                break;

            case "payment.failed":
                await handlePaymentFailed(payload);
                break;

            case "payment.authorized":
                // Payment authorized but not captured - for manual capture flows
                console.log("Payment authorized:", payload.payment?.entity?.id);
                break;

            case "order.paid":
                await handleOrderPaid(payload);
                break;

            case "transfer.processed":
                await handleTransferProcessed(payload);
                break;

            case "settlement.processed":
                await handleSettlementProcessed(payload);
                break;

            case "refund.processed":
                await handleRefundProcessed(payload);
                break;

            default:
                console.log("Unhandled payment webhook event:", event);
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error("Payment Webhook Error:", error);
        return NextResponse.json(
            { error: "Webhook processing failed" },
            { status: 500 }
        );
    }
}

// Payment captured - Money received
async function handlePaymentCaptured(payload) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const orderId = payment.order_id;
    const paymentId = payment.id;
    const amount = payment.amount / 100; // Convert from paise

    // Find our payment record by order ID
    const feePayment = await prisma.feePayment.findFirst({
        where: { gatewayOrderId: orderId },
        include: { studentFee: true },
    });

    if (!feePayment) {
        console.log("Payment record not found for order:", orderId);
        return;
    }

    // Idempotency check - don't process twice
    if (feePayment.webhookVerified && feePayment.status === "SUCCESS") {
        console.log("Payment already processed:", feePayment.id);
        return;
    }

    await prisma.$transaction(async (tx) => {
        // Update payment record
        await tx.feePayment.update({
            where: { id: feePayment.id },
            data: {
                status: "SUCCESS",
                gatewayPaymentId: paymentId,
                transactionId: paymentId,
                paymentDate: new Date(),
                clearedDate: new Date(),
                webhookVerified: true,
                reconciledAt: new Date(),
                gatewayResponse: payment,
            },
        });

        // Update student fee
        const studentFee = feePayment.studentFee;
        const newPaidAmount = studentFee.paidAmount + amount;
        const newBalanceAmount = Math.max(0, studentFee.finalAmount - newPaidAmount);
        const newStatus = newBalanceAmount <= 0 ? "PAID" : newPaidAmount > 0 ? "PARTIAL" : "UNPAID";

        await tx.studentFee.update({
            where: { id: feePayment.studentFeeId },
            data: {
                paidAmount: newPaidAmount,
                balanceAmount: newBalanceAmount,
                status: newStatus,
                lastPaymentDate: new Date(),
            },
        });

        // Allocate to installments
        await allocatePaymentToInstallments(tx, feePayment.studentFeeId, feePayment.id, amount);
    });

    console.log("Payment captured and processed:", paymentId, "Amount:", amount);
}

// Payment failed
async function handlePaymentFailed(payload) {
    const payment = payload.payment?.entity;
    if (!payment) return;

    const orderId = payment.order_id;
    const reason = payment.error_description || payment.error_reason || "Payment failed";

    const feePayment = await prisma.feePayment.findFirst({
        where: { gatewayOrderId: orderId },
    });

    if (!feePayment) return;

    await prisma.feePayment.update({
        where: { id: feePayment.id },
        data: {
            status: "FAILED",
            failureReason: reason,
            webhookVerified: true,
            gatewayResponse: payment,
        },
    });

    console.log("Payment failed:", orderId, reason);
}

// Order paid - Alternative to payment.captured
async function handleOrderPaid(payload) {
    const order = payload.order?.entity;
    if (!order) return;

    // This is usually redundant with payment.captured
    // But useful as backup
    console.log("Order paid:", order.id, "Amount:", order.amount_paid / 100);
}

// Transfer to linked account processed
async function handleTransferProcessed(payload) {
    const transfer = payload.transfer?.entity;
    if (!transfer) return;

    const sourcePaymentId = transfer.source;
    const transferId = transfer.id;
    const linkedAccountId = transfer.recipient;
    const amount = transfer.amount / 100;

    // Find payment by Razorpay payment ID
    const feePayment = await prisma.feePayment.findFirst({
        where: { gatewayPaymentId: sourcePaymentId },
    });

    if (!feePayment) {
        console.log("Fee payment not found for transfer:", transferId);
        return;
    }

    await prisma.feePayment.update({
        where: { id: feePayment.id },
        data: {
            razorpayTransferId: transferId,
            schoolAmount: amount,
            settlementStatus: "pending",
        },
    });

    console.log("Transfer processed:", transferId, "to", linkedAccountId, "Amount:", amount);
}

// Settlement processed - Money sent to bank
async function handleSettlementProcessed(payload) {
    const settlement = payload.settlement?.entity;
    if (!settlement) return;

    const settlementId = settlement.id;
    const amount = settlement.amount / 100;

    // Update all payments with this settlement
    // Note: Settlement contains multiple payments
    console.log("Settlement processed:", settlementId, "Amount:", amount);

    // Find payments that might be in this settlement
    // This is approximate - Razorpay doesn't link settlements to specific payments in webhook
    await prisma.feePayment.updateMany({
        where: {
            settlementStatus: "pending",
            webhookVerified: true,
            status: "SUCCESS",
        },
        data: {
            settlementId,
            settlementStatus: "processed",
        },
    });
}

// Refund processed
async function handleRefundProcessed(payload) {
    const refund = payload.refund?.entity;
    if (!refund) return;

    console.log("Refund processed:", refund.id, "Amount:", refund.amount / 100);
    // Refund handling would go here
}

// Helper: Allocate payment to installments
async function allocatePaymentToInstallments(tx, studentFeeId, paymentId, amountToAllocate) {
    const installments = await tx.studentFeeInstallment.findMany({
        where: {
            studentFeeId,
            status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
        },
        orderBy: [
            { isOverdue: "desc" },
            { dueDate: "asc" },
        ],
    });

    let remainingAmount = amountToAllocate;

    for (const installment of installments) {
        if (remainingAmount <= 0) break;

        const balance = installment.amount - installment.paidAmount;
        const allocateAmount = Math.min(remainingAmount, balance);

        await tx.feePaymentInstallment.create({
            data: {
                paymentId,
                installmentId: installment.id,
                amount: allocateAmount,
            },
        });

        const newPaidAmount = installment.paidAmount + allocateAmount;
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

        remainingAmount -= allocateAmount;
    }
}
