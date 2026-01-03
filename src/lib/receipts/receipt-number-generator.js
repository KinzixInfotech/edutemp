import prisma from '@/lib/prisma';

/**
 * Generate a unique sequential receipt number
 * Pattern: {PREFIX}-{YEAR}-{SEQ}
 * Example: REC-2024-001
 * 
 * @param {string} schoolId - School UUID
 * @param {string} prefix - Receipt prefix from settings (e.g., "REC")
 * @returns {Promise<string>} - Generated receipt number
 */
export async function generateReceiptNumber(schoolId, prefix = 'REC') {
    const year = new Date().getFullYear();
    const searchPattern = `${prefix}-${year}-`;

    // Find the last receipt for this year
    const lastReceipt = await prisma.receipt.findFirst({
        where: {
            schoolId,
            receiptNumber: {
                startsWith: searchPattern
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        select: {
            receiptNumber: true
        }
    });

    let nextSeq = 1;

    if (lastReceipt) {
        // Extract sequence number from "REC-2024-001"
        const parts = lastReceipt.receiptNumber.split('-');
        const currentSeq = parseInt(parts[parts.length - 1]);
        if (!isNaN(currentSeq)) {
            nextSeq = currentSeq + 1;
        }
    }

    // Pad sequence to 3 digits (001, 002, etc.)
    const paddedSeq = nextSeq.toString().padStart(3, '0');

    return `${prefix}-${year}-${paddedSeq}`;
}

/**
 * Validate receipt number format
 * @param {string} receiptNumber 
 * @returns {boolean}
 */
export function isValidReceiptNumber(receiptNumber) {
    // Pattern: PREFIX-YEAR-SEQ (e.g., REC-2024-001)
    const pattern = /^[A-Z]+-\d{4}-\d{3,}$/;
    return pattern.test(receiptNumber);
}
