
import { PaymentAdapter } from '../PaymentAdapter';
import Razorpay from 'razorpay';

export class RazorpayAdapter extends PaymentAdapter {
    async initiatePayment(paymentData) {
        // paymentData: { amount, orderId, schoolName, studentId, schoolId, ... }
        // config (from Settings): { merchantId (Key ID), secretKey (Key Secret), ... }

        if (!this.config.merchantId || !this.config.secretKey) {
            throw new Error("Razorpay API keys (Key ID / Secret) are missing in settings");
        }

        const instance = new Razorpay({
            key_id: this.config.merchantId,
            key_secret: this.config.secretKey,
        });

        // Amount in paise
        const amountInPaise = Math.round(paymentData.amount * 100);

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: paymentData.orderId,
            notes: {
                studentId: paymentData.studentId, // Ensure these are passed in paymentData
                schoolId: paymentData.schoolId
            }
        };

        try {
            const order = await instance.orders.create(options);

            // Return specific type for Frontend to handle Razorpay Checkout
            return {
                type: 'RAZORPAY',
                order: order,
                keyId: this.config.merchantId,
                amount: paymentData.amount,
                orderId: paymentData.orderId
            };
        } catch (error) {
            console.error("Razorpay Order Creation Failed:", error);
            throw new Error("Failed to create Razorpay order: " + error.message);
        }
    }

    async verifyPayment(responseParams) {
        // Verify signature
        // responseParams: { razorpay_order_id, razorpay_payment_id, razorpay_signature }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = responseParams;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return { status: 'FAILED', rawResponse: responseParams };
        }

        const generated_signature = require('crypto')
            .createHmac('sha256', this.config.secretKey)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            return {
                status: 'SUCCESS',
                transactionId: razorpay_payment_id,
                amount: 0, // Amount matches order, can be retrieved if needed but verification is binary
                rawResponse: responseParams
            };
        } else {
            return {
                status: 'FAILED',
                transactionId: razorpay_payment_id,
                rawResponse: responseParams
            };
        }
    }
}
