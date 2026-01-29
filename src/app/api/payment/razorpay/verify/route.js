
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { PaymentGatewayFactory } from "@/lib/payment/PaymentGatewayFactory";

export async function POST(req) {
    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

        console.log("🔍 Verifying Razorpay Payment:", { razorpay_order_id, razorpay_payment_id });

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
        }

        // 1. Fetch Payment Record
        const payment = await prisma.feePayment.findFirst({
            where: { gatewayOrderId: razorpay_order_id },
            include: {
                installmentPayments: true
            }
        });

        if (!payment) {
            return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
        }

        if (payment.status === 'SUCCESS') {
            return NextResponse.json({ success: true, message: "Payment already verified" });
        }

        // 2. Fetch School Settings (to get secret)
        const settings = await prisma.schoolPaymentSettings.findUnique({
            where: { schoolId: payment.schoolId },
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

        // 4. Update Payment Status in DB Transaction
        await prisma.$transaction(async (tx) => {
            // 4.1 Update FeePayment
            await tx.feePayment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    gatewayPaymentId: razorpay_payment_id,
                    webhookVerified: true,
                    paymentDate: new Date(),
                    reconciledAt: new Date(),
                    gatewayResponse: verification.rawResponse,
                    settlementStatus: 'processed' // Assume processed for online
                }
            });

            // 4.2 Update Installments
            if (payment.installmentPayments && payment.installmentPayments.length > 0) {
                for (const instPayment of payment.installmentPayments) {
                    const installment = await tx.studentFeeInstallment.findUnique({
                        where: { id: instPayment.installmentId }
                    });

                    if (installment) {
                        const newPaidAmount = installment.paidAmount + instPayment.amount;
                        let newStatus = installment.status;

                        // Check if fully paid
                        if (newPaidAmount >= (installment.amount + (installment.lateFee || 0))) {
                            newStatus = 'PAID';
                        } else if (newPaidAmount > 0) {
                            newStatus = 'PARTIAL';
                        }

                        await tx.studentFeeInstallment.update({
                            where: { id: installment.id },
                            data: {
                                paidAmount: newPaidAmount,
                                status: newStatus,
                                paidDate: new Date(),
                                isOverdue: false // Clear overdue flag if paid (or logically partial?)
                                // Maybe only clear overdue if fully paid? 
                                // For now, let's keep isOverdue as is unless FULLY paid.
                            }
                        });

                        if (newStatus === 'PAID') {
                            await tx.studentFeeInstallment.update({
                                where: { id: installment.id },
                                data: { isOverdue: false }
                            });
                        }
                    }
                }
            }

            // 4.3 Update Student Fee (Total)
            const studentFee = await tx.studentFee.findUnique({
                where: { id: payment.studentFeeId }
            });

            if (studentFee) {
                const newPaidAmount = studentFee.paidAmount + payment.amount;
                const newBalanceAmount = studentFee.finalAmount - newPaidAmount;

                let newStatus = studentFee.status;
                if (newBalanceAmount <= 1) { // Floating point tolerance
                    newStatus = 'PAID';
                } else if (newPaidAmount > 0) {
                    newStatus = 'PARTIAL';
                }

                await tx.studentFee.update({
                    where: { id: studentFee.id },
                    data: {
                        paidAmount: newPaidAmount,
                        balanceAmount: Math.max(0, newBalanceAmount),
                        status: newStatus,
                        lastPaymentDate: new Date()
                    }
                });
            }
        });

        return NextResponse.json({
            success: true,
            message: "Payment verified successfully",
            payment: {
                id: payment.id,
                receiptNumber: payment.receiptNumber,
                amount: payment.amount,
                date: new Date()
            }
        });

    } catch (error) {
        console.error("Payment Verification Error:", error);
        return NextResponse.json({ error: "Verification failed: " + error.message }, { status: 500 });
    }
}
