/**
 * Fast2SMS Service - DLT Compliant SMS Sending
 * Uses transactional route with pre-approved DLT templates
 */

const FAST2SMS_API_URL = 'https://www.fast2sms.com/dev/bulkV2';
const COST_PER_SMS = 0.20; // Credits per SMS
const MAX_MESSAGE_LENGTH = 100; // Max chars for MESSAGE/NOTICE_TEXT variable
const MAX_SMS_LENGTH = 160; // Single SMS limit

// Whitelisted domains for LINK variable
const WHITELISTED_DOMAINS = [
    'edubreezy.com',
    'www.edubreezy.com',
    'school.edubreezy.com',
];

// Blocked promo words (case insensitive)
const BLOCKED_PROMO_WORDS = [
    'offer', 'discount', 'sale', 'free', 'win', 'prize',
    'cashback', 'coupon', 'promo', 'deal', 'limited',
    'hurry', 'urgent', 'act now', 'click here', 'buy now',
    'lottery', 'winner', 'congratulations', 'claim',
];

/**
 * Render template with variables
 * @param {string} template - Template content with {VAR} placeholders
 * @param {object} variables - Key-value pairs for replacement
 * @returns {string} - Rendered message
 */
export function renderTemplate(template, variables = {}) {
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        message = message.replace(regex, value);
    }
    return message;
}

/**
 * Validate template variables
 * @param {string[]} allowedVars - Allowed variable names from template
 * @param {object} providedVars - Variables provided by user
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateVariables(allowedVars, providedVars) {
    const errors = [];
    const providedKeys = Object.keys(providedVars);

    // Check all allowed vars are provided (except auto-filled ones like SCHOOL_NAME)
    const autoFilledVars = ['SCHOOL_NAME'];
    for (const v of allowedVars) {
        if (!autoFilledVars.includes(v) && !providedKeys.includes(v)) {
            errors.push(`Missing required variable: ${v}`);
        }
    }

    // Check no extra vars provided
    for (const key of providedKeys) {
        if (!allowedVars.includes(key)) {
            errors.push(`Unknown variable: ${key}`);
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate MESSAGE or NOTICE_TEXT content
 * - Max 100 characters
 * - No links, phone numbers, or promo words
 * @param {string} text - The message/notice text
 * @param {string} fieldName - Field name for error messages
 * @returns {object} - { valid: boolean, errors: string[], charCount: number }
 */
export function validateMessageContent(text, fieldName = 'Message') {
    const errors = [];
    const charCount = text?.length || 0;

    if (!text || charCount === 0) {
        errors.push(`${fieldName} is required`);
        return { valid: false, errors, charCount };
    }

    // Check character limit
    if (charCount > MAX_MESSAGE_LENGTH) {
        errors.push(`${fieldName} must be ${MAX_MESSAGE_LENGTH} characters or less (currently ${charCount})`);
    }

    // Check for URLs
    const urlPattern = /(https?:\/\/|www\.|\.com|\.in|\.org|\.net|\.io)/i;
    if (urlPattern.test(text)) {
        errors.push(`${fieldName} cannot contain links. Use a "Notice with Link" template instead.`);
    }

    // Check for phone numbers (sequences of 10+ digits)
    const phonePattern = /\d{10,}/;
    if (phonePattern.test(text)) {
        errors.push(`${fieldName} cannot contain phone numbers`);
    }

    // Check for formatted phone numbers like 98765-43210 or 9876 543 210
    const formattedPhonePattern = /(\d[\d\s-]{8,}\d)/;
    if (formattedPhonePattern.test(text)) {
        const match = text.match(formattedPhonePattern);
        if (match && match[0].replace(/[\s-]/g, '').length >= 10) {
            errors.push(`${fieldName} cannot contain phone numbers`);
        }
    }

    // Check for blocked promo words
    const lowerText = text.toLowerCase();
    for (const word of BLOCKED_PROMO_WORDS) {
        if (lowerText.includes(word.toLowerCase())) {
            errors.push(`${fieldName} contains blocked promotional word: "${word}"`);
            break; // Only show first blocked word
        }
    }

    return { valid: errors.length === 0, errors, charCount };
}

/**
 * Validate notice text for NOTICE template (alias for validateMessageContent)
 */
export function validateNoticeText(text) {
    return validateMessageContent(text, 'Notice text');
}

/**
 * Validate LINK variable for link templates
 * Only whitelisted domains are allowed
 * @param {string} url - The URL to validate
 * @returns {object} - { valid: boolean, errors: string[] }
 */
export function validateLink(url) {
    const errors = [];

    if (!url || url.length === 0) {
        errors.push('Link is required');
        return { valid: false, errors };
    }

    // Must start with https://
    if (!url.startsWith('https://')) {
        errors.push('Link must start with https://');
    }

    // Check against whitelisted domains
    let isWhitelisted = false;
    for (const domain of WHITELISTED_DOMAINS) {
        if (url.includes(domain)) {
            isWhitelisted = true;
            break;
        }
    }

    if (!isWhitelisted) {
        errors.push(`Only EduBreezy links are allowed. Whitelisted domains: ${WHITELISTED_DOMAINS.join(', ')}`);
    }

    // Basic URL length check
    if (url.length > 100) {
        errors.push('Link is too long. Please use a shorter URL.');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Validate total SMS length
 * @param {string} renderedMessage - The fully rendered SMS message
 * @returns {object} - { valid: boolean, error: string, length: number, smsCount: number }
 */
export function validateSmsLength(renderedMessage) {
    const length = renderedMessage?.length || 0;
    const smsCount = Math.ceil(length / MAX_SMS_LENGTH);

    if (length > MAX_SMS_LENGTH) {
        return {
            valid: false,
            error: `Message exceeds single SMS limit (${length}/${MAX_SMS_LENGTH} chars). Multi-part SMS may cause unexpected costs.`,
            length,
            smsCount
        };
    }

    return { valid: true, error: null, length, smsCount: 1 };
}

/**
 * Calculate SMS cost
 * @param {number} recipientCount - Number of recipients
 * @param {number} smsCount - Number of SMS parts (default 1)
 * @returns {number} - Total credits required
 */
export function calculateCost(recipientCount, smsCount = 1) {
    return recipientCount * smsCount * COST_PER_SMS;
}

/**
 * Send SMS via Fast2SMS API
 * @param {object} options
 * @param {string} options.apiKey - Fast2SMS API key
 * @param {string} options.senderId - DLT approved sender ID
 * @param {string} options.dltTemplateId - DLT template ID
 * @param {string} options.message - Rendered message (must match template exactly)
 * @param {string[]} options.numbers - Phone numbers (10 digit)
 * @returns {Promise<object>} - API response
 */
export async function sendSms({ apiKey, senderId, dltTemplateId, message, numbers }) {
    if (!apiKey) {
        throw new Error('Fast2SMS API key not configured');
    }

    if (!senderId) {
        throw new Error('DLT Sender ID not configured');
    }

    // Validate SMS length before sending
    const lengthValidation = validateSmsLength(message);
    if (!lengthValidation.valid) {
        throw new Error(lengthValidation.error);
    }

    // Clean and validate phone numbers
    const cleanNumbers = numbers
        .map(n => n.replace(/\D/g, ''))
        .filter(n => n.length === 10);

    if (cleanNumbers.length === 0) {
        throw new Error('No valid phone numbers provided');
    }

    const payload = {
        route: 'dlt', // DLT transactional route
        sender_id: senderId,
        message: message,
        template_id: dltTemplateId,
        numbers: cleanNumbers.join(','),
        flash: 0
    };

    try {
        const response = await fetch(FAST2SMS_API_URL, {
            method: 'POST',
            headers: {
                'authorization': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || data.return === false) {
            throw new Error(data.message || 'SMS sending failed');
        }

        return {
            success: true,
            messageId: data.request_id,
            message: data.message
        };
    } catch (error) {
        console.error('[FAST2SMS ERROR]', error);
        throw error;
    }
}

export default {
    renderTemplate,
    validateVariables,
    validateNoticeText,
    validateMessageContent,
    validateLink,
    validateSmsLength,
    calculateCost,
    sendSms,
    COST_PER_SMS,
    MAX_MESSAGE_LENGTH,
    MAX_SMS_LENGTH,
    WHITELISTED_DOMAINS,
};

