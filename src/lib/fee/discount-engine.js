/**
 * DISCOUNT ENGINE — FINANCIAL LEDGER
 * 
 * Applies, adjusts, and waives discounts on ledger line items.
 * Audits all changes. Never touches fully paid / locked items.
 */

import prisma from "@/lib/prisma";

/**
 * Applies a specific discount amount to a ledger entry.
 * Can be used for sibling discounts, staff wards, etc.
 * 
 * @param {string} ledgerEntryId 
 * @param {number} discountAmount 
 * @param {string} appliedBy - User ID
 * @param {string} reason 
 */
export async function applyDiscount(ledgerEntryId, discountAmount, appliedBy, reason) {
    return await prisma.$transaction(async (tx) => {
        const entry = await tx.studentFeeLedger.findUnique({
            where: { id: ledgerEntryId }
        });

        if (!entry) throw new Error("Ledger entry not found");
        if (entry.status === "LEDGER_PAID") throw new Error("Cannot apply discount to fully paid entry");
        if (entry.isFrozen) throw new Error("Cannot modify a frozen ledger entry. Reverse payment first if necessary.");

        const newNet = entry.originalAmount + entry.lateFeeAmount - discountAmount;
        if (newNet < 0) throw new Error("Discount cannot exceed original amount");

        const newBalance = newNet - entry.paidAmount;
        const newStatus = newBalance <= 0 ? (entry.paidAmount > 0 ? "LEDGER_PAID" : "LEDGER_UNPAID") : "LEDGER_PARTIAL";

        const updatedEntry = await tx.studentFeeLedger.update({
            where: { id: ledgerEntryId },
            data: {
                discountAmount,
                netAmount: newNet,
                balanceAmount: newBalance,
                status: newStatus,
                version: entry.version + 1
            }
        });

        await tx.ledgerAuditLog.create({
            data: {
                ledgerEntryId,
                action: "LEDGER_DISCOUNT_APPLIED",
                oldValue: { discount: entry.discountAmount, net: entry.netAmount },
                newValue: { discount: discountAmount, net: newNet },
                doneBy: appliedBy,
                remarks: reason
            }
        });

        return updatedEntry;
    });
}

/**
 * Waives the remaining balance of an entry in full.
 */
export async function waiveBalance(ledgerEntryId, waivedBy, reason) {
    return await prisma.$transaction(async (tx) => {
        const entry = await tx.studentFeeLedger.findUnique({
            where: { id: ledgerEntryId }
        });

        if (!entry) throw new Error("Ledger entry not found");
        if (entry.status === "LEDGER_PAID" || entry.status === "LEDGER_WAIVED") {
            throw new Error("Entry is already paid or waived");
        }

        // A waive is essentially an automated discount equal to the remaining balance
        const balanceToWaive = entry.balanceAmount;
        const newDiscount = entry.discountAmount + balanceToWaive;
        
        // Recalculate net to zero out balance
        const newNet = entry.originalAmount + entry.lateFeeAmount - newDiscount;

        const updatedEntry = await tx.studentFeeLedger.update({
            where: { id: ledgerEntryId },
            data: {
                discountAmount: newDiscount,
                netAmount: newNet,
                balanceAmount: 0,
                status: "LEDGER_WAIVED",
                version: entry.version + 1
            }
        });

        await tx.ledgerAuditLog.create({
            data: {
                ledgerEntryId,
                action: "LEDGER_WAIVED",
                oldValue: { balance: entry.balanceAmount, status: entry.status },
                newValue: { discount: newDiscount, balance: 0, status: "LEDGER_WAIVED" },
                doneBy: waivedBy,
                remarks: `Waived ₹${balanceToWaive}. Reason: ${reason}`
            }
        });

        return updatedEntry;
    });
}
