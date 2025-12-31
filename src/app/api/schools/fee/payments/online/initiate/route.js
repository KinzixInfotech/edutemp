// ============================================
// API: /api/schools/fee/payments/online/initiate/route.js
// Initiate online payment with Razorpay Route (split payments)
// ============================================
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { getRazorpayClient, canAcceptPayments, calculateSchoolAmount, calculateCommission, isTestMode } from "@/lib/razorpay";

// Helper: Generate receipt number
function generateReceiptNumber(schoolId) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REC-${schoolId.slice(0, 4).toUpperCase()}-${timestamp}-${random}`;
}

export async function POST(req) {
    try {
        const body = await req.json();
        const {
            studentFeeId,
            studentId,
            schoolId,
            academicYearId,
            amount,
            installmentIds,
        } = body;

        // Validation
        if (!studentFeeId || !studentId || !schoolId || !amount) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: "Amount must be greater than zero" },
                { status: 400 }
            );
        }

        // Fetch school with payment settings
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            include: { feeSettings: true },
        });

        if (!school) {
            return NextResponse.json(
                { error: "School not found" },
                { status: 404 }
            );
        }

        // Check if online payments are enabled
        if (!school.feeSettings?.onlinePaymentEnabled) {
            return NextResponse.json(
                { error: "Online payments are not enabled for this school" },
                { status: 400 }
            );
        }

        // Check if school can accept payments (has activated Razorpay account)
        if (!canAcceptPayments(school)) {
            return NextResponse.json(
                { error: "School's payment account is not yet activated. Please complete KYC." },
                { status: 400 }
            );
        }

        // Verify student fee
        const studentFee = await prisma.studentFee.findUnique({
            where: { id: studentFeeId },
            include: {
                student: {
                    select: {
                        name: true,
                        email: true,
                        contactNumber: true,
                        user: { select: { email: true } }
                    }
                },
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
                { error: "Amount exceeds balance due" },
                { status: 400 }
            );
        }

        // Generate receipt number
        const receiptNumber = generateReceiptNumber(schoolId);

        // Calculate commission split
        const commissionType = school.platformCommissionType || "PERCENTAGE";
        const commissionValue = school.platformCommissionValue || 5;
        const platformAmount = calculateCommission(amount, commissionType, commissionValue);
        const schoolAmount = calculateSchoolAmount(amount, commissionType, commissionValue);

        // Get Razorpay client (platform credentials)
        const razorpay = getRazorpayClient();

        // Create Razorpay order with transfer to linked account
        let razorpayOrder;
        try {
            razorpayOrder = await razorpay.orders.create({
                amount: Math.round(amount * 100), // Convert to paise
                currency: "INR",
                receipt: receiptNumber,
                transfers: [
                    {
                        account: school.razorpayAccountId, // Linked account
                        amount: Math.round(schoolAmount * 100), // School's share in paise
                        currency: "INR",
                        notes: {
                            purpose: "School fee payment",
                            school_id: schoolId,
                            student_fee_id: studentFeeId,
                        },
                        on_hold: 0, // Transfer immediately on payment
                    },
                ],
                notes: {
                    studentFeeId,
                    studentId,
                    schoolId,
                    academicYearId,
                    installmentIds: installmentIds ? JSON.stringify(installmentIds) : null,
                    platformCommission: platformAmount,
                },
            });
        } catch (razorpayError) {
            console.error("Razorpay order creation failed:", razorpayError);
            return NextResponse.json(
                { error: razorpayError.error?.description || "Failed to create payment order" },
                { status: 500 }
            );
        }

        // Create pending payment record
        const payment = await prisma.feePayment.create({
            data: {
                studentFeeId,
                studentId,
                schoolId,
                academicYearId,
                amount,
                paymentMode: "ONLINE",
                paymentMethod: "RAZORPAY",
                status: "PENDING",
                receiptNumber,
                gatewayName: "RAZORPAY_ROUTE",
                gatewayOrderId: razorpayOrder.id,
                schoolAmount,
                platformAmount,
                gatewayResponse: {
                    orderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                    status: razorpayOrder.status,
                    createdAt: new Date().toISOString(),
                    isRoute: true,
                    linkedAccountId: school.razorpayAccountId,
                },
            },
        });

        // Get student email
        const studentEmail = studentFee.student?.user?.email || studentFee.student?.email;

        // Return response for Razorpay checkout
        return NextResponse.json({
            success: true,
            orderId: razorpayOrder.id,
            paymentId: payment.id,
            amount: razorpayOrder.amount, // In paise for Razorpay
            currency: "INR",
            key: process.env.RAZORPAY_KEY_ID, // Platform's key (not school's)
            name: school.name,
            description: `Fee Payment - ${school.name}`,
            prefill: {
                name: studentFee.student.name,
                email: studentEmail,
                contact: studentFee.student.contactNumber,
            },
            notes: {
                student_fee_id: studentFeeId,
                receipt_number: receiptNumber,
            },
            receiptNumber,
            isTestMode: isTestMode(),
            // Split info (for reference, not shown to user)
            _split: {
                schoolAmount,
                platformAmount,
                commissionType,
                commissionValue,
            },
        });

    } catch (error) {
        console.error("Initiate Online Payment Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to initiate payment" },
            { status: 500 }
        );
    }
}
