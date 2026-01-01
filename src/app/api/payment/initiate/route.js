import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PaymentGatewayFactory } from "@/lib/payment/PaymentGatewayFactory";

export async function POST(req) {
    try {
        const body = await req.json();
        const { studentFeeId, amount, paymentMode, studentId, schoolId, installments } = body;
        // installments: { id, amount }[] - if partial/multiple installments

        if (!studentFeeId || !amount || !schoolId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Fetch School Payment Settings
        const settings = await prisma.schoolPaymentSettings.findUnique({
            where: { schoolId },
        });

        if (!settings || !settings.isEnabled) {
            return NextResponse.json({ error: "Online payments are disabled for this school" }, { status: 403 });
        }

        const provider = settings.provider;

        // 2. Create FeePayment record (PENDING)
        // We generate a receipt Number or use a temporary one? 
        // Usually we generate a temporary reference like "ORD_..."
        const orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const payment = await prisma.feePayment.create({
            data: {
                studentFeeId,
                studentId,
                schoolId,
                academicYearId: (await prisma.studentFee.findUnique({ where: { id: studentFeeId }, select: { academicYearId: true } })).academicYearId,
                amount: parseFloat(amount),
                paymentMode: "ONLINE",
                paymentMethod: "NET_BANKING", // Default to NET_BANKING for online initiation
                status: "PENDING",
                gatewayName: provider,
                gatewayOrderId: orderId,
                receiptNumber: orderId, // Temporary, will be updated to real receipt prefix on success
                // Link installments if provided
                installmentPayments: installments ? {
                    create: installments.map(inst => ({
                        installmentId: inst.id,
                        amount: parseFloat(inst.amount)
                    }))
                } : undefined
            }
        });

        // 3. Initiate Payment via Adapter
        const adapter = PaymentGatewayFactory.getAdapter(provider, settings);

        // In Dev mode, force pay.localhost:3000 as requested
        const baseUrl = process.env.NODE_ENV === 'development'
            ? 'http://pay.localhost:3000'
            : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
        const returnUrl = `${baseUrl}/api/payment/callback/${provider}`; // Callback to our API

        const { url, params, method } = await adapter.initiatePayment({
            amount: parseFloat(amount),
            orderId: orderId, // Our internal ID
            studentName: "Student", // Fetch real name if needed
            email: "parent@example.com", // Fetch if needed
            phone: "9999999999", // Fetch if needed
            returnUrl: returnUrl
        });

        return NextResponse.json({
            success: true,
            redirectUrl: url,
            params,
            method,
            orderId // Internal reference
        });

    } catch (error) {
        console.error("Payment initiation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
