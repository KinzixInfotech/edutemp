/**
 * ICICI Eazypay Payment Gateway Adapter
 * 
 * This is the PAYMENT GATEWAY (supports Cards/NetBanking/UPI)
 * NOT the Collect Pay API (which is UPI-only)
 * 
 * Production URL: https://eazypay.icicibank.com/EazyPG
 * 
 * Required credentials:
 * - merchantId: ICICI Merchant ID
 * - secretKey: ICICI Encryption Key (16 bytes for AES-128-CBC)
 */

import crypto from 'crypto';

export class ICICIAdapter {
    constructor(config) {
        this.config = config;
        this.merchantId = config.merchantId;
        this.encryptionKey = config.secretKey;

        // ICICI Eazypay Payment Gateway URL
        // This is the correct URL for full payment gateway (not just UPI)
        this.gatewayUrl = 'https://eazypay.icicibank.com/EazyPG';
    }

    /**
     * Encrypt data using AES-128-CBC (ICICI standard)
     */
    encrypt(plainText) {
        if (!this.encryptionKey) {
            throw new Error('ICICI Encryption Key not configured. Please add it in Fee Settings or switch to Test Mode.');
        }

        // Prepare key (must be exactly 16 bytes for AES-128)
        let key;
        try {
            const keyBuffer = Buffer.from(this.encryptionKey, 'utf8');
            if (keyBuffer.length < 16) {
                // Pad with zeros if too short
                key = Buffer.concat([keyBuffer, Buffer.alloc(16 - keyBuffer.length, 0)]);
            } else {
                // Trim to 16 bytes if too long
                key = keyBuffer.slice(0, 16);
            }
        } catch (error) {
            throw new Error('Invalid ICICI Encryption Key format');
        }

        // Zero IV (check ICICI docs for actual IV requirement)
        const iv = Buffer.alloc(16, 0);

        const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        return encrypted;
    }

    /**
     * Decrypt response from ICICI
     */
    decrypt(encryptedText) {
        if (!this.encryptionKey) {
            throw new Error('ICICI Encryption Key not configured');
        }

        // Use same key handling as encrypt
        let key;
        const keyBuffer = Buffer.from(this.encryptionKey, 'utf8');
        if (keyBuffer.length < 16) {
            key = Buffer.concat([keyBuffer, Buffer.alloc(16 - keyBuffer.length, 0)]);
        } else {
            key = keyBuffer.slice(0, 16);
        }

        const iv = Buffer.alloc(16, 0);

        const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'base64', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * Initiate payment - returns form data for browser auto-submit
     * This creates a payment gateway redirect (like the Angels High School screenshot)
     */
    async initiatePayment({ amount, orderId, studentName, email, phone, returnUrl }) {
        if (!this.merchantId || !this.encryptionKey) {
            throw new Error('ICICI credentials not configured. Please add Merchant ID and Encryption Key in Fee Settings or switch to Test Mode.');
        }

        // Prepare mandatory fields (pipe-delimited as per ICICI Eazypay spec)
        const mandatoryFields = [
            `referenceNo=${orderId}`,
            `submerchantId=${this.merchantId}`,
            `transactionAmount=${amount}`,
            `payerName=${studentName}`,
            `payerEmail=${email}`,
            `payerMobile=${phone}`,
            `returnUrl=${returnUrl}`,
        ].join('|');

        // Optional fields (if any)
        const optionalFields = '';

        // Encrypt the data
        const encryptedMandatory = this.encrypt(mandatoryFields);
        const encryptedOptional = this.encrypt(optionalFields);
        const encryptedReturnUrl = this.encrypt(returnUrl);

        // Return redirect data for form POST
        return {
            url: this.gatewayUrl,
            method: 'POST',
            params: {
                merchantid: this.merchantId,
                'mandatory fields': encryptedMandatory,
                'optional fields': encryptedOptional,
                returnurl: encryptedReturnUrl,
            }
        };
    }

    /**
     * Verify payment callback from ICICI
     */
    async verifyPayment(callbackData) {
        try {
            // ICICI sends encrypted response in 'Response' field
            const encryptedResponse = callbackData.Response || callbackData.response;

            if (!encryptedResponse) {
                return {
                    success: false,
                    status: 'FAILED',
                    error: 'No response data from ICICI'
                };
            }

            // Decrypt the response
            const decryptedResponse = this.decrypt(encryptedResponse);

            // Parse pipe-delimited response
            const params = {};
            decryptedResponse.split('|').forEach(pair => {
                const [key, value] = pair.split('=');
                if (key && value) params[key.trim()] = value.trim();
            });

            // Check payment status
            const status = params.RStatus || params.Response_Code;
            const isSuccess = status === '0' || status === 'Y' || status === 'SUCCESS';

            return {
                success: isSuccess,
                status: isSuccess ? 'SUCCESS' : 'FAILED',
                orderId: params.ReferenceNo || params.referenceNo,
                transactionId: params.PaymentId || params.Transaction_Id,
                amount: parseFloat(params.Amount || params.amount || 0),
                bankReference: params.BankReferenceNo || params.Bank_Reference_No,
                rawResponse: params
            };
        } catch (error) {
            console.error('ICICI verification error:', error);
            return {
                success: false,
                status: 'FAILED',
                error: error.message
            };
        }
    }
}
