/**
 * PAYMENT ENGINE — FINANCIAL LEDGER
 * 
 * Handles oldest-first payment allocation, receipt snapshot locking,
 * wallet crediting, and payment reversals.
 * 
 * Core flow:
 * Payment received → Fetch UNPAID/PARTIAL ledger entries (oldest first)
 *   → Allocate amount down the list
 *   → Mark fully/partially paid entries as frozen
 *   → Credit excess to StudentWallet (using DB locks)
 *   → Generate receipt with locked snapshot
 */

import prisma from "@/lib/prisma";

// ─── Core: Process a new payment ────────────────────────────
/**
 * Processes a payment, allocates it oldest-first, and generates receipt.
 * 
 * @param {Object} params
 * @param {string} params.studentId
 * @param {string} params.schoolId
 * @param {string} params.academicYearId
 * @param {string} params.feeSessionId
 * @param {number} params.amountPaid
 * @param {string} params.paymentMode
 * @param {string} [params.paymentMethod]
 * @param {string} [params.reference] - Gateway order ID / Cheque #
 * @param {string} params.collectedBy - User ID of collector
 * @param {string} [params.remarks]
 */
export async function processPayment({
    studentId, schoolId, academicYearId, feeSessionId,
    amountPaid, paymentMode, paymentMethod, reference, collectedBy, remarks
}) {
    if (amountPaid <= 0) throw new Error("Payment amount must be greater than zero");

    return await prisma.$transaction(async (tx) => {
        // 1. Session & Wallet Validation (Pessimistic lock on wallet to prevent race conditions)
        const session = await tx.feeSession.findUnique({
            where: { id: feeSessionId }
        });
        if (!session) throw new Error("Fee session not found");
        if (session.isClosed) throw new Error("Fee session is closed. No payments allowed.");

        // Lock wallet for this transaction (raw query for SELECT FOR UPDATE)
        const existingWallet = await tx.$queryRaw`
            SELECT id, balance FROM "StudentWallet" 
            WHERE "studentId" = ${studentId}::uuid FOR UPDATE
        `;
        
        // 2. Fetch UNPAID / PARTIAL entries ordered by due date (Oldest first)
        const entries = await tx.studentFeeLedger.findMany({
            where: {
                studentId,
                feeSessionId,
                status: { in: ["LEDGER_UNPAID", "LEDGER_PARTIAL"] }
            },
            include: { feeComponent: true },
            orderBy: [
                { month: "asc" },
                { dueDate: "asc" },
                { feeComponent: { displayOrder: "asc" } }
            ]
        });

        let remainingAmount = amountPaid;
        const allocationsToCreate = [];
        const entriesToUpdate = [];
        const auditLogs = [];
        let allocatedTotal = 0;

        // 3. Allocate line by line
        for (const entry of entries) {
            if (remainingAmount <= 0) break;

            const currentBalance = entry.balanceAmount;
            const allocateToThis = Math.min(currentBalance, remainingAmount);
            
            const newPaid = entry.paidAmount + allocateToThis;
            const newBalance = entry.netAmount - newPaid;
            const newStatus = newBalance <= 0 ? "LEDGER_PAID" : "LEDGER_PARTIAL";

            allocationsToCreate.push({
                ledgerEntryId: entry.id,
                amount: allocateToThis
            });

            entriesToUpdate.push({
                id: entry.id,
                paidAmount: newPaid,
                balanceAmount: newBalance,
                status: newStatus,
                isFrozen: true, // Freeze the entry once money touches it
                paidDate: newStatus === "LEDGER_PAID" ? new Date() : entry.paidDate
            });

            auditLogs.push({
                ledgerEntryId: entry.id,
                action: "LEDGER_PAID",
                oldValue: { balance: currentBalance, status: entry.status },
                newValue: { 
                    balance: newBalance, 
                    status: newStatus, 
                    allocated: allocateToThis 
                },
                doneBy: collectedBy,
                remarks: `Payment allocation: ₹${allocateToThis}`
            });

            remainingAmount -= allocateToThis;
            allocatedTotal += allocateToThis;
        }

        // 4. Handle Wallet (Credit excess)
        let walletCredit = 0;
        if (remainingAmount > 0) {
            walletCredit = remainingAmount;
            
            if (existingWallet.length > 0) {
                await tx.studentWallet.update({
                    where: { studentId },
                    data: { balance: { increment: walletCredit } }
                });
            } else {
                await tx.studentWallet.create({
                    data: {
                        studentId,
                        schoolId,
                        balance: walletCredit
                    }
                });
            }
        }

        // 5. Create core Payment record
        // Fallback dummy structure id for backward compatibility table if needed
        // Assuming we map to new fields `paymentAllocations` inside the new payment engine
        const payment = await tx.feePayment.create({
            data: {
                studentId,
                schoolId,
                academicYearId: academicYearId || session.academicYearId,
                amount: amountPaid,
                fineAmount: 0, // Late fees are included in ledger line net amounts now
                discountAmount: 0,
                paymentDate: new Date(),
                paymentMode: paymentMode || "ONLINE",
                paymentMethod: paymentMethod,
                reference: reference,
                status: "COMPLETED",
                collectedBy,
                remarks: remarks || `Ledger allocation. Wallet logic handled.`
            }
        });

        // 6. DB Updates in bulk
        if (allocationsToCreate.length > 0) {
            await tx.paymentAllocation.createMany({
                data: allocationsToCreate.map(a => ({
                    ...a,
                    paymentId: payment.id
                }))
            });

            for (const update of entriesToUpdate) {
                await tx.studentFeeLedger.update({
                    where: { id: update.id },
                    data: {
                        paidAmount: update.paidAmount,
                        balanceAmount: update.balanceAmount,
                        status: update.status,
                        isFrozen: update.isFrozen,
                        paidDate: update.paidDate
                    }
                });
            }

            await tx.ledgerAuditLog.createMany({
                data: auditLogs
            });
        }

        // 7. Generate locked Receipt Snapshot
        const receiptSnapshot = {
            schoolId,
            studentId,
            paymentId: payment.id,
            amountPaid,
            allocatedTotal,
            walletCredit,
            date: new Date().toISOString(),
            allocations: allocationsToCreate.map((a, i) => ({
                component: entries[i].feeComponent.name,
                month: entries[i].monthLabel,
                amount: a.amount
            }))
        };

        const receiptCount = await tx.receipt.count({ where: { schoolId } });
        const receiptNumber = `RCPT-${schoolId.substring(0,4).toUpperCase()}-${receiptCount + 1}`;

        const receipt = await tx.receipt.create({
            data: {
                schoolId,
                studentId,
                feePaymentId: payment.id,
                receiptNumber,
                // amount: amountPaid, -> no such field on Receipt model
                // paymentDate: new Date(), -> no such field on Receipt model, it uses createdAt or feePayment
                receiptData: receiptSnapshot, // 🟢 CTO FIX #3: Exact immutable snapshot
            }
        });

        return {
            paymentId: payment.id,
            receiptId: receipt.id,
            receiptNumber,
            allocatedToItems: allocationsToCreate.length,
            walletCredited: walletCredit
        };
    });
}

// ─── Reverse: Complete payment rollback ─────────────────────
/**
 * Reverses a payment completely, unfreezes allocations, and updates wallet.
 * 
 * @param {string} paymentId 
 * @param {string} reversedBy - User ID
 * @param {string} reason 
 */
export async function reversePayment(paymentId, reversedBy, reason) {
    return await prisma.$transaction(async (tx) => {
        // 1. Fetch payment and allocations
        const payment = await tx.feePayment.findUnique({
            where: { id: paymentId },
            include: { paymentAllocations: { include: { ledgerEntry: true } } }
        });

        if (!payment) throw new Error("Payment not found");
        if (payment.status === "REFUNDED" || payment.status === "CANCELLED") {
            throw new Error("Payment is already reversed/cancelled");
        }

        const allocations = payment.paymentAllocations;

        // 2. Un-allocate ledger entries
        const auditLogs = [];
        for (const alloc of allocations) {
            const entry = alloc.ledgerEntry;
            const newPaid = entry.paidAmount - alloc.amount;
            const newBalance = entry.balanceAmount + alloc.amount;
            
            // Re-evaluate Frozen status IF no other payments exist for this entry
            // This requires counting remaining allocations for this entry excluding the current payment
            const otherAllocationsCount = await tx.paymentAllocation.count({
                where: { 
                    ledgerEntryId: entry.id,
                    paymentId: { not: paymentId }
                }
            });

            const newStatus = newPaid <= 0 ? "LEDGER_UNPAID" : "LEDGER_PARTIAL";
            const isFrozen = otherAllocationsCount > 0;

            await tx.studentFeeLedger.update({
                where: { id: entry.id },
                data: {
                    paidAmount: newPaid,
                    balanceAmount: newBalance,
                    status: newStatus,
                    isFrozen: isFrozen,
                    paidDate: newPaid <= 0 ? null : entry.paidDate
                }
            });

            auditLogs.push({
                ledgerEntryId: entry.id,
                action: "LEDGER_REVERSED",
                oldValue: { balance: entry.balanceAmount, status: entry.status },
                newValue: { balance: newBalance, status: newStatus },
                doneBy: reversedBy,
                remarks: `Reversal of payment ${payment.receiptNumber || payment.id}. Reason: ${reason}`
            });
        }

        // 3. Reverse excess from Wallet
        const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
        const walletCreditToReverse = payment.amount - totalAllocated;

        if (walletCreditToReverse > 0) {
            await tx.studentWallet.update({
                where: { studentId: payment.studentId },
                data: { balance: { decrement: walletCreditToReverse } }
            });
        }

        // 4. Record Reversal & Audit
        await tx.paymentReversal.create({
            data: {
                paymentId,
                amount: payment.amount,
                reason,
                reversedBy
            }
        });

        if (auditLogs.length > 0) {
            await tx.ledgerAuditLog.createMany({ data: auditLogs });
        }

        // 5. Update Payment Status
        await tx.feePayment.update({
            where: { id: paymentId },
            data: { status: "REFUNDED" }
        });

        return {
            reversedAllocations: allocations.length,
            walletDebited: walletCreditToReverse
        };
    });
}
