import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { PaymentGatewayFactory } from "@/lib/payment/PaymentGatewayFactory";

export async function POST(req, { params }) {
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

        // 2. Find Pending Payment
        const payment = await prisma.feePayment.findFirst({
            where: { gatewayOrderId: orderId },
            include: { school: { include: { paymentSettings: true } } }
        });

        if (!payment) {
            return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
        }

        // 3. Get Adapter & Verify
        const adapter = PaymentGatewayFactory.getAdapter(gateway, payment.school.paymentSettings);
        const verificationResult = await adapter.verifyPayment(responseParams);

        // 4. Update Payment Status
        if (verificationResult.status === 'SUCCESS') {
            // Update FeePayment record
            await prisma.feePayment.update({
                where: { id: payment.id },
                data: {
                    status: 'SUCCESS',
                    transactionId: verificationResult.transactionId,
                    gatewayPaymentId: verificationResult.transactionId,
                    amount: verificationResult.amount,
                    gatewayResponse: verificationResult.rawResponse,
                    clearedDate: new Date(),
                }
            });

            // 5. Update Installments and StudentFee
            // Fetch the linked installment payments to know which installments were paid
            const installmentPayments = await prisma.feePaymentInstallment.findMany({
                where: { paymentId: payment.id },
                include: { installment: true }
            });

            // Update each installment's paidAmount and status
            for (const ip of installmentPayments) {
                const installment = ip.installment;
                const newPaidAmount = (installment.paidAmount || 0) + ip.amount;
                const isPaidInFull = newPaidAmount >= installment.amount;

                await prisma.studentFeeInstallment.update({
                    where: { id: installment.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: isPaidInFull ? 'PAID' : 'PARTIAL',
                        paidDate: isPaidInFull ? new Date() : undefined,
                    }
                });
            } 

            // Update the parent StudentFee record
            const studentFee = await prisma.studentFee.findUnique({
                where: { id: payment.studentFeeId },
            });

            if (studentFee) {
                const newPaidAmount = (studentFee.paidAmount || 0) + verificationResult.amount;
                const newBalanceAmount = (studentFee.finalAmount || 0) - newPaidAmount;
                const isFullyPaid = newBalanceAmount <= 0;

                await prisma.studentFee.update({
                    where: { id: payment.studentFeeId },
                    data: {
                        paidAmount: newPaidAmount,
                        balanceAmount: Math.max(0, newBalanceAmount),
                        status: isFullyPaid ? 'PAID' : 'PARTIAL',
                    }
                });
            }

            // Redirect to Success Page
            const baseUrl = process.env.NODE_ENV === 'development'
                ? 'http://pay.localhost:3000'
                : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
            return NextResponse.redirect(`${baseUrl}/pay/success?receipt=${payment.receiptNumber}`);

        } else {
            await prisma.feePayment.update({
                where: { id: payment.id },
                data: {
                    status: 'FAILED',
                    gatewayResponse: verificationResult.rawResponse,
                    failureReason: 'Gateway reported failure'
                }
            });

            // Redirect to Failure Page
            const baseUrl = process.env.NODE_ENV === 'development'
                ? 'http://pay.localhost:3000'
                : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
            return NextResponse.redirect(`${baseUrl}/pay/failure?orderId=${orderId}`);
        }

    } catch (error) {
        console.error("Callback error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
