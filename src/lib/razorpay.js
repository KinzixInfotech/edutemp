// ============================================
// Razorpay Route Client Singleton
// For Partner/Linked Account operations
// ============================================
import Razorpay from 'razorpay';

let razorpayInstance = null;

/**
 * Get Razorpay instance (singleton)
 * Uses platform credentials from environment
 */
export function getRazorpayClient() {
    if (!razorpayInstance) {
        const keyId = process.env.RAZORPAY_KEY_ID;
        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        if (!keyId || !keySecret) {
            throw new Error('Razorpay credentials not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
        }

        razorpayInstance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }

    return razorpayInstance;
}

/**
 * Verify Razorpay webhook signature
 */
export function verifyWebhookSignature(body, signature, secret) {
    const crypto = require('crypto');

    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error('Webhook secret not configured');
    }

    const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');

    return expectedSignature === signature;
}

/**
 * Calculate platform commission
 */
export function calculateCommission(amount, commissionType, commissionValue) {
    if (commissionType === 'FLAT') {
        return Math.min(commissionValue, amount); // Can't take more than amount
    }
    // PERCENTAGE
    return Math.round((amount * commissionValue) / 100);
}

/**
 * Calculate school amount after commission
 */
export function calculateSchoolAmount(amount, commissionType, commissionValue) {
    const commission = calculateCommission(amount, commissionType, commissionValue);
    return amount - commission;
}

/**
 * Onboarding status constants
 */
export const ONBOARDING_STATUS = {
    CREATED: 'CREATED',
    KYC_SUBMITTED: 'KYC_SUBMITTED',
    KYC_VERIFIED: 'KYC_VERIFIED',
    PAYMENTS_ENABLED: 'PAYMENTS_ENABLED',
    REJECTED: 'REJECTED',
};

/**
 * Razorpay account status constants
 */
export const ACCOUNT_STATUS = {
    NOT_CREATED: 'not_created',
    CREATED: 'created',
    ACTIVATED: 'activated',
    SUSPENDED: 'suspended',
};

/**
 * KYC status constants
 */
export const KYC_STATUS = {
    NOT_STARTED: 'not_started',
    PENDING: 'pending',
    VERIFIED: 'verified',
    REJECTED: 'rejected',
};

/**
 * Check if school can accept online payments
 */
export function canAcceptPayments(school) {
    return (
        school.razorpayAccountStatus === ACCOUNT_STATUS.ACTIVATED &&
        school.razorpayKycStatus === KYC_STATUS.VERIFIED &&
        school.razorpaySettlementReady === true
    );
}

/**
 * Get Razorpay Route mode (test or live)
 */
export function isTestMode() {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    return keyId.startsWith('rzp_test_');
}

/**
 * Default platform commission (can be overridden per school)
 */
export const DEFAULT_COMMISSION = {
    type: 'PERCENTAGE',
    value: parseFloat(process.env.DEFAULT_PLATFORM_COMMISSION_PERCENT || '5'),
};
