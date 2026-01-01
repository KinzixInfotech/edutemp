/**
 * SBI Collect Payment Adapter
 * 
 * Integration with State Bank of India's SBI Collect payment gateway.
 * Production URL: https://www.onlinesbi.com/prelogin/icollecthome.htm
 * 
 * Required credentials (from SchoolPaymentSettings):
 * - merchantId: SBI Merchant ID / Institution ID
 * - secretKey: SBI Encryption Key
 */

import crypto from 'crypto';

export class SBIAdapter {
    constructor(config) {
        this.config = config;
        this.merchantId = config.merchantId;
        this.encryptionKey = config.secretKey;

        // SBI Collect production URL (updated to new domain)
        this.gatewayUrl = 'https://onlinesbi.sbi.bank.in/sbicollect/icollecthome.htm';
    }

    /**
     * Generate checksum for SBI
     */
    generateChecksum(data) {
        if (!this.encryptionKey) {
            throw new Error('SBI Encryption Key not configured');
        }

        const hmac = crypto.createHmac('sha256', this.encryptionKey);
        hmac.update(data);
        return hmac.digest('hex').toUpperCase();
    }

    /**
     * Initiate payment - returns form data for browser auto-submit
     */
    async initiatePayment({ amount, orderId, studentName, email, phone, returnUrl }) {
        if (!this.merchantId || !this.encryptionKey) {
            throw new Error('SBI credentials not configured. Please add Merchant ID and Encryption Key in Fee Settings.');
        }

        // SBI Collect uses form POST with specific field names
        const params = {
            institutionId: this.merchantId,
            referenceNumber: orderId,
            amount: amount.toString(),
            payerName: studentName,
            payerEmail: email,
            payerMobile: phone,
            returnUrl: returnUrl,
        };

        // Generate checksum
        const checksumString = Object.values(params).join('|');
        params.checksum = this.generateChecksum(checksumString);

        return {
            url: this.gatewayUrl,
            method: 'POST',
            params: params
        };
    }

    /**
     * Verify payment callback from SBI
     */
    async verifyPayment(callbackData) {
        try {
            // Extract response fields
            const status = callbackData.status || callbackData.Status;
            const isSuccess = status === 'SUCCESS' || status === 'Y' || status === '0';

            // Verify checksum if provided
            if (callbackData.checksum && this.encryptionKey) {
                const { checksum, ...dataWithoutChecksum } = callbackData;
                const expectedChecksum = this.generateChecksum(Object.values(dataWithoutChecksum).join('|'));

                if (checksum !== expectedChecksum) {
                    return {
                        success: false,
                        status: 'FAILED',
                        error: 'Checksum verification failed'
                    };
                }
            }

            return {
                success: isSuccess,
                status: isSuccess ? 'SUCCESS' : 'FAILED',
                orderId: callbackData.referenceNumber || callbackData.ReferenceNumber,
                transactionId: callbackData.transactionId || callbackData.SBI_REF_ID,
                amount: parseFloat(callbackData.amount || 0),
                bankReference: callbackData.bankReference || callbackData.SBI_REF_ID,
                rawResponse: callbackData
            };
        } catch (error) {
            console.error('SBI verification error:', error);
            return {
                success: false,
                status: 'FAILED',
                error: error.message
            };
        }
    }
}
