/**
 * Axis EasyPay Payment Adapter
 * 
 * Integration with Axis Bank's EasyPay payment gateway.
 * Production URL: https://easypay.axisbank.co.in/payment
 * 
 * Required credentials (from SchoolPaymentSettings):
 * - merchantId: Axis Merchant ID
 * - secretKey: Axis Secret Key
 */

import crypto from 'crypto';

export class AxisAdapter {
    constructor(config) {
        this.config = config;
        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;

        // Axis EasyPay production URL
        this.gatewayUrl = 'https://easypay.axisbank.co.in/payment';
    }

    /**
     * Generate hash for Axis
     */
    generateHash(data) {
        if (!this.secretKey) {
            throw new Error('Axis Secret Key not configured');
        }

        const hash = crypto.createHash('sha256');
        hash.update(data + this.secretKey);
        return hash.digest('hex').toUpperCase();
    }

    /**
     * Initiate payment - returns form data for browser auto-submit
     */
    async initiatePayment({ amount, orderId, studentName, email, phone, returnUrl }) {
        if (!this.merchantId || !this.secretKey) {
            throw new Error('Axis credentials not configured. Please add Merchant ID and Secret Key in Fee Settings.');
        }

        const params = {
            MerchantID: this.merchantId,
            OrderID: orderId,
            Amount: amount.toFixed(2),
            Currency: 'INR',
            CustomerName: studentName,
            CustomerEmail: email,
            CustomerMobile: phone,
            ReturnURL: returnUrl,
            TransactionDate: new Date().toISOString().split('T')[0],
        };

        // Generate hash
        const hashString = `${this.merchantId}|${orderId}|${amount}|${returnUrl}`;
        params.Hash = this.generateHash(hashString);

        return {
            url: this.gatewayUrl,
            method: 'POST',
            params: params
        };
    }

    /**
     * Verify payment callback from Axis
     */
    async verifyPayment(callbackData) {
        try {
            const status = callbackData.TxnStatus || callbackData.status;
            const isSuccess = status === 'SUCCESS' || status === 'Y' || status === '00';

            // Verify hash if provided
            if (callbackData.Hash && this.secretKey) {
                const { Hash, ...dataWithoutHash } = callbackData;
                const hashString = `${callbackData.MerchantID}|${callbackData.OrderID}|${callbackData.Amount}|${callbackData.TxnStatus}`;
                const expectedHash = this.generateHash(hashString);

                if (Hash !== expectedHash) {
                    return {
                        success: false,
                        status: 'FAILED',
                        error: 'Hash verification failed'
                    };
                }
            }

            return {
                success: isSuccess,
                status: isSuccess ? 'SUCCESS' : 'FAILED',
                orderId: callbackData.OrderID,
                transactionId: callbackData.TxnID || callbackData.BankRefNo,
                amount: parseFloat(callbackData.Amount || 0),
                bankReference: callbackData.BankRefNo,
                rawResponse: callbackData
            };
        } catch (error) {
            console.error('Axis verification error:', error);
            return {
                success: false,
                status: 'FAILED',
                error: error.message
            };
        }
    }
}
