/**
 * LATE FEE ENGINE — FINANCIAL LEDGER
 * 
 * Priority:
 * 1. FeeComponent.lateFeeRule — structure/class-specific rule
 * 2. FeeSettings (school-level fallback) — if no rule on component
 */

import prisma from "@/lib/prisma";

// ── Resolve the effective late fee rule for an entry ─────────────────────────
// Returns a normalised rule object regardless of source, or null if none.
async function resolveLateFeeRule(entry, schoolId) {
    // 1. Component-level rule (class/structure specific)
    const compRule = entry.feeComponent?.lateFeeRule;
    if (compRule && compRule.isActive) {
        return {
            type: compRule.type,           // "FIXED" | "PERCENTAGE"
            amount: compRule.amount ?? 0,
            percentage: compRule.percentage ?? 0,
            graceDays: compRule.graceDays ?? 0,
            maxAmount: compRule.maxAmount ?? null,
            source: "component",
        };
    }

    // No component-level rule → no late fee applied.
    // School-level fallback intentionally disabled — only components with
    // an explicit lateFeeRule should incur late fees. This prevents blind
    // late-fee charges on Library Fee, Sports Fee, etc.
    return null;
}

// ── Calculate late fee amount for a single entry ──────────────────────────────
function computeLateFee(entry, rule, today) {
    const dueDateWithGrace = new Date(entry.dueDate);
    dueDateWithGrace.setDate(dueDateWithGrace.getDate() + rule.graceDays);

    if (today <= dueDateWithGrace) return 0;

    const daysLate = Math.floor((today - dueDateWithGrace) / (1000 * 60 * 60 * 24));

    let fee = 0;
    if (rule.type === "FIXED") {
        // Flat amount once (not per-day) — most Indian schools do a one-time fixed charge
        // If you want per-day multiply: rule.amount * daysLate
        fee = rule.amount;
    } else if (rule.type === "PERCENTAGE") {
        fee = (entry.originalAmount * (rule.percentage / 100));
    }

    if (rule.maxAmount && fee > rule.maxAmount) fee = rule.maxAmount;

    return fee;
}

/**
 * Calculate and apply late fees for all overdue entries of a student.
 *
 * @param {string} studentId
 * @param {string} feeSessionId  — real FeeSession.id
 * @param {boolean} forceRecalculate
 */
export async function calculateLateFees(studentId, feeSessionId, forceRecalculate = false) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Resolve schoolId for the global fallback
    const student = await prisma.student.findUnique({
        where: { userId: studentId },
        select: { schoolId: true },
    });
    const schoolId = student?.schoolId;

    // Fetch ALL unpaid/partial entries — regardless of lateFeeRuleId
    const entries = await prisma.studentFeeLedger.findMany({
        where: {
            studentId,
            feeSessionId,
            status: { in: ["LEDGER_UNPAID", "LEDGER_PARTIAL"] },
        },
        include: {
            feeComponent: { include: { lateFeeRule: true } },
        },
    });

    if (entries.length === 0) return [];

    const updatesToPerform = [];
    const updatedEntries = [];

    for (const entry of entries) {
        // Daily cache — skip if already calculated today
        if (!forceRecalculate && entry.lateFeeCalculatedAt) {
            const calcDate = new Date(entry.lateFeeCalculatedAt);
            calcDate.setHours(0, 0, 0, 0);
            if (calcDate.getTime() === today.getTime()) {
                updatedEntries.push(entry);
                continue;
            }
        }

        // Skip entries not yet due
        if (!entry.dueDate || new Date(entry.dueDate) > today) {
            updatedEntries.push(entry);
            continue;
        }

        // Resolve rule — component-level first, then school fallback
        const rule = await resolveLateFeeRule(entry, schoolId);
        if (!rule) {
            // No rule at any level — just update cache timestamp and move on
            updatesToPerform.push({ id: entry.id, lateFeeCalculatedAt: new Date() });
            updatedEntries.push(entry);
            continue;
        }

        const newLateFee = computeLateFee(entry, rule, today);

        if (newLateFee !== entry.lateFeeAmount) {
            const previousNet = entry.netAmount;
            const newNet = entry.originalAmount - entry.discountAmount + newLateFee;
            const newBalance = newNet - entry.paidAmount;

            const daysLate = entry.dueDate
                ? Math.max(0, Math.floor((today - new Date(entry.dueDate)) / (1000 * 60 * 60 * 24)) - rule.graceDays)
                : 0;

            updatesToPerform.push({
                id: entry.id,
                lateFeeAmount: newLateFee,
                netAmount: newNet,
                balanceAmount: newBalance,
                lateFeeCalculatedAt: new Date(),
                isFrozen: entry.status === "LEDGER_PARTIAL",
                version: entry.version + 1,
            });

            // Note: doneBy requires a valid User UUID — skip audit for automated late fee
            // since there's no real user actor. The ledger entry update itself is the record.
            console.log(`[LateFee] Entry ${entry.id}: ₹${entry.lateFeeAmount} → ₹${newLateFee} (${rule.source} rule, ${daysLate}d overdue)`);

            updatedEntries.push({
                ...entry,
                lateFeeAmount: newLateFee,
                netAmount: newNet,
                balanceAmount: newBalance,
                lateFeeCalculatedAt: new Date(),
                version: entry.version + 1,
            });
        } else {
            updatesToPerform.push({ id: entry.id, lateFeeCalculatedAt: new Date() });
            updatedEntries.push(entry);
        }
    }

    // Write all updates in one transaction
    if (updatesToPerform.length > 0) {
        await prisma.$transaction(async (tx) => {
            for (const update of updatesToPerform) {
                await tx.studentFeeLedger.update({
                    where: { id: update.id },
                    data: update,
                });
            }
        });
    }

    return updatedEntries;
}

/**
 * Cron: process late fees for entire school
 */
export async function batchCalculateSchoolLateFees(schoolId, feeSessionId) {
    const students = await prisma.student.findMany({
        where: { schoolId },
        select: { userId: true },
    });

    let processedCount = 0;
    for (const student of students) {
        await calculateLateFees(student.userId, feeSessionId);
        processedCount++;
    }

    return { processedCount };
}