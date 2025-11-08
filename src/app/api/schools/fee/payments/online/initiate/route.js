// ============================================
// API: /api/fee/payments/online/initiate/route.js
// Initiate online payment (Razorpay simulation)
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
export async function POST_INITIATE_ONLINE(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            installmentIds, // Optional: specific installments to pay
        } = body;

        // Validation
        if (!studentFeeId || !studentId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const studentFee = await prisma.studentFee.findUnique({
            where: { id: studentFeeId },
            include: {
                student: { select: { name: true, email: true } },
            },
        });

        if (!studentFee) {
            return NextResponse.json(
                { error: "Student fee record not found" },
                { status: 404 }
            );
        }

        if (amount > studentFee.balanceAmount) {
            return NextResponse.json(
                { error: "Amount exceeds balance" },
                { status: 400 }
            );
        }

        // Generate receipt number (for tracking)
        const receiptNumber = generateReceiptNumber(schoolId);

        // Create pending payment record
        const payment = await prisma.feePayment.create({
            data: {
                studentFeeId,
                studentId,
                schoolId,
                academicYearId,
                amount,
                paymentMode: "ONLINE",
                paymentMethod: "NET_BANKING", // Default, can be updated
                status: "PENDING",
                receiptNumber,
                gatewayName: "RAZORPAY_SIMULATION",
            },
        });

        // SIMULATION: Generate dummy Razorpay order
        const orderId = `order_${crypto.randomBytes(16).toString("hex")}`;

        await prisma.feePayment.update({
            where: { id: payment.id },
            data: {
                gatewayOrderId: orderId,
                gatewayResponse: {
                    simulationMode: true,
                    orderId,
                    amount: amount * 100, // paise
                    currency: "INR",
                    createdAt: new Date().toISOString(),
                },
            },
        });

        // Return Razorpay-like response for frontend
        return NextResponse.json({
            orderId,
            paymentId: payment.id,
            amount: amount * 100, // paise
            currency: "INR",
            studentName: studentFee.student.name,
            studentEmail: studentFee.student.email,
            receiptNumber,
            // For Razorpay integration:
            // key: process.env.RAZORPAY_KEY_ID,
            // In simulation, frontend will show a mock payment page
            simulationMode: true,
        });
    } catch (error) {
        console.error("Initiate Online Payment Error:", error);
        return NextResponse.json(
            { error: "Failed to initiate payment" },
            { status: 500 }
        );
    }
}
