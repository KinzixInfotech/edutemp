/**
 * PaymentAdapter Interface
 * All payment gateway adapters must extend this class
 */
export class PaymentAdapter {
    constructor(config) {
        this.config = config; // { merchantId, secretKey, accessCode, ... }
    }

    /**
     * Initiate a payment request
     * @param {Object} paymentData 
     * @param {number} paymentData.amount - Amount in currency units (e.g., INR)
     * @param {string} paymentData.orderId - Unique Order ID from ERP
     * @param {string} paymentData.studentName - Name of student
     * @param {string} paymentData.email - Payer email
     * @param {string} paymentData.phone - Payer phone
     * @param {string} paymentData.returnUrl - Callback URL after payment
     * @returns {Promise<{ url: string, params: Object, method: string }>}
     */
    async initiatePayment(paymentData) {
        throw new Error('initiatePayment must be implemented');
    }

    /**
     * Verify payment status from callback/webhook
     * @param {Object} responseParams - Parameters received from gateway
     * @returns {Promise<{ status: 'SUCCESS'|'FAILED'|'PENDING', transactionId: string, amount: number, rawResponse: Object }>}
     */
    async verifyPayment(responseParams) {
        throw new Error('verifyPayment must be implemented');
    }
}
