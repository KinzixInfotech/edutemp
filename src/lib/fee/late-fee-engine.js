/**
 * LATE FEE ENGINE — FINANCIAL LEDGER
 * 
 * Computes and applies late fees to overdue ledger entries.
 * Uses a caching strategy to avoid expensive recalculations on every fetch.
 */

import prisma from "@/lib/prisma";

/**
 * Calculates late fees for a batch of student ledger entries.
 * Updates the DB only if calculations changed and caches the timestamp.
 * 
 * @param {string} studentId
 * @param {string} feeSessionId
 * @param {boolean} forceRecalculate - bypass daily cache
 * @returns {Array} Updated ledger entries
 */
export async function calculateLateFees(studentId, feeSessionId, forceRecalculate = false) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of day for caching check

    // 1. Fetch unpaid/partial entries that have late fee rules attached
    const entries = await prisma.studentFeeLedger.findMany({
        where: {
            studentId,
            feeSessionId,
            status: { in: ["LEDGER_UNPAID", "LEDGER_PARTIAL"] },
            feeComponent: { lateFeeRuleId: { not: null } }
        },
        include: {
            feeComponent: { include: { lateFeeRule: true } }
        }
    });

    if (entries.length === 0) return [];

    const updatesToPerform = [];
    const auditLogs = [];
    const updatedEntries = []; // to return back to caller

    for (const entry of entries) {
        // Skip if already computed today (unless forced)
        if (!forceRecalculate && entry.lateFeeCalculatedAt) {
            const calcDate = new Date(entry.lateFeeCalculatedAt);
            calcDate.setHours(0, 0, 0, 0);
            if (calcDate.getTime() === today.getTime()) {
                updatedEntries.push(entry);
                continue;
            }
        }

        const rule = entry.feeComponent.lateFeeRule;
        if (!rule || !rule.isActive) {
            updatedEntries.push(entry);
            continue;
        }

        // Check if past grace period
        const dueDateWithGrace = new Date(entry.dueDate);
        dueDateWithGrace.setDate(dueDateWithGrace.getDate() + rule.graceDays);

        let newLateFee = 0;

        if (today > dueDateWithGrace) {
            const daysLate = Math.floor((today - dueDateWithGrace) / (1000 * 60 * 60 * 24));
            
            if (rule.type === "FIXED") {
                // E.g., ₹50 flat per day late
                newLateFee = rule.amount * daysLate;
            } else if (rule.type === "PERCENTAGE") {
                // E.g., 2% of original amount per day late
                newLateFee = (entry.originalAmount * (rule.percentage / 100)) * daysLate;
            }

            // Apply Cap if exists
            if (rule.maxAmount && newLateFee > rule.maxAmount) {
                newLateFee = rule.maxAmount;
            }
        }

        // If late fee changed, prep update
        if (newLateFee !== entry.lateFeeAmount) {
            const previousNet = entry.netAmount;
            const newNet = entry.originalAmount - entry.discountAmount + newLateFee;
            const newBalance = newNet - entry.paidAmount;

            updatesToPerform.push({
                id: entry.id,
                lateFeeAmount: newLateFee,
                netAmount: newNet,
                balanceAmount: newBalance,
                lateFeeCalculatedAt: new Date(),
                // ONLY unfreeze if it was unpaid. Partial stays frozen.
                isFrozen: entry.status === "LEDGER_PARTIAL" ? true : false,
                version: entry.version + 1
            });

            auditLogs.push({
                ledgerEntryId: entry.id,
                action: "LEDGER_LATE_FEE_APPLIED",
                oldValue: { lateFee: entry.lateFeeAmount, netAmount: previousNet },
                newValue: { lateFee: newLateFee, netAmount: newNet },
                doneBy: "SYSTEM", // automated action
                remarks: `Late fee recalculated: ${daysLate} days late`
            });

            updatedEntries.push({
                ...entry,
                lateFeeAmount: newLateFee,
                netAmount: newNet,
                balanceAmount: newBalance,
                lateFeeCalculatedAt: new Date(),
                version: entry.version + 1
            });
        } else {
            // Even if fee is same, update the calculation timestamp so we skip it later today
            updatesToPerform.push({
                id: entry.id,
                lateFeeCalculatedAt: new Date()
            });
            updatedEntries.push(entry);
        }
    }

    // 2. Perform DB Updates in transaction
    if (updatesToPerform.length > 0) {
        await prisma.$transaction(async (tx) => {
            for (const update of updatesToPerform) {
                await tx.studentFeeLedger.update({
                    where: { id: update.id },
                    data: update
                });
            }
            if (auditLogs.length > 0) {
                await tx.ledgerAuditLog.createMany({ data: auditLogs });
            }
        });
    }

    return updatedEntries;
}

/**
 * Utility for Cron Job to process whole school
 */
export async function batchCalculateSchoolLateFees(schoolId, feeSessionId) {
    const students = await prisma.student.findMany({
        where: { schoolId },
        select: { userId: true }
    });

    let processedCount = 0;
    for (const student of students) {
        await calculateLateFees(student.userId, feeSessionId);
        processedCount++;
    }

    return { processedCount };
}
