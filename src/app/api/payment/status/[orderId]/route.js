// ============================================
// API: /api/payment/status/[orderId]/route.js
// Check payment status for mobile app polling
// ============================================

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req, props) {
    const params = await props.params;
    try {
        const { orderId } = params;

        if (!orderId) {
            return NextResponse.json({ error: "orderId required" }, { status: 400 });
        }

        // Find payment by gateway order ID
        const payment = await prisma.feePayment.findFirst({
            where: { gatewayOrderId: orderId },
            select: {
                id: true,
                status: true,
                amount: true,
                receiptNumber: true,
                paymentDate: true,
                gatewayOrderId: true,
                gatewayTransactionId: true,
            },
        });

        if (!payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        return NextResponse.json({
            orderId: payment.gatewayOrderId,
            status: payment.status, // PENDING, SUCCESS, FAILED
            amount: payment.amount,
            receiptNumber: payment.receiptNumber,
            transactionId: payment.gatewayTransactionId,
            paymentDate: payment.paymentDate,
        });
    } catch (error) {
        console.error("Payment Status Error:", error);
        return NextResponse.json({ error: "Failed to fetch payment status" }, { status: 500 });
    }
}
