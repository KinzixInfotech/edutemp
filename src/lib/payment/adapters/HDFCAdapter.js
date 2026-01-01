/**
 * HDFC SmartHub Payment Adapter
 * 
 * Integration with HDFC Bank's SmartHub payment gateway.
 * Production URL: https://smartgateway.hdfcbank.com/payment
 * 
 * Required credentials (from SchoolPaymentSettings):
 * - merchantId: HDFC Merchant ID
 * - secretKey: HDFC Secret Key
 * - accessCode: HDFC Access Code
 */

import crypto from 'crypto';

export class HDFCAdapter {
    constructor(config) {
        this.config = config;
        this.merchantId = config.merchantId;
        this.secretKey = config.secretKey;
        this.accessCode = config.accessCode;

        // HDFC SmartHub production URL
        this.gatewayUrl = 'https://smartgateway.hdfcbank.com/payment';
    }

    /**
     * Generate HMAC signature for HDFC
     */
    generateSignature(data) {
        if (!this.secretKey) {
            throw new Error('HDFC Secret Key not configured');
        }

        const hmac = crypto.createHmac('sha512', this.secretKey);
        hmac.update(data);
        return hmac.digest('hex');
    }

    /**
     * Initiate payment - returns form data for browser auto-submit
     */
    async initiatePayment({ amount, orderId, studentName, email, phone, returnUrl }) {
        if (!this.merchantId || !this.secretKey) {
            throw new Error('HDFC credentials not configured. Please add Merchant ID and Secret Key in Fee Settings.');
        }

        const params = {
            merchant_id: this.merchantId,
            access_code: this.accessCode || '',
            order_id: orderId,
            amount: amount.toFixed(2),
            currency: 'INR',
            redirect_url: returnUrl,
            cancel_url: returnUrl,
            billing_name: studentName,
            billing_email: email,
            billing_tel: phone,
        };

        // Generate signature
        const signatureString = Object.entries(params)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join('&');

        params.signature = this.generateSignature(signatureString);

        return {
            url: this.gatewayUrl,
            method: 'POST',
            params: params
        };
    }

    /**
     * Verify payment callback from HDFC
     */
    async verifyPayment(callbackData) {
        try {
            const status = callbackData.order_status || callbackData.status;
            const isSuccess = status === 'Success' || status === 'Y' || status === 'TXN_SUCCESS';

            // Verify signature if provided
            if (callbackData.signature && this.secretKey) {
                const { signature, ...dataWithoutSignature } = callbackData;
                const signatureString = Object.entries(dataWithoutSignature)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([k, v]) => `${k}=${v}`)
                    .join('&');

                const expectedSignature = this.generateSignature(signatureString);

                if (signature !== expectedSignature) {
                    return {
                        success: false,
                        status: 'FAILED',
                        error: 'Signature verification failed'
                    };
                }
            }

            return {
                success: isSuccess,
                status: isSuccess ? 'SUCCESS' : 'FAILED',
                orderId: callbackData.order_id,
                transactionId: callbackData.tracking_id || callbackData.bank_ref_no,
                amount: parseFloat(callbackData.amount || 0),
                bankReference: callbackData.bank_ref_no,
                rawResponse: callbackData
            };
        } catch (error) {
            console.error('HDFC verification error:', error);
            return {
                success: false,
                status: 'FAILED',
                error: error.message
            };
        }
    }
}
