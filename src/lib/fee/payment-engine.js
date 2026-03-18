// /**
//  * PAYMENT ENGINE — FINANCIAL LEDGER
//  * 
//  * Handles oldest-first payment allocation, receipt snapshot locking,
//  * wallet crediting, and payment reversals.
//  * 
//  * Core flow:
//  * Payment received → Fetch UNPAID/PARTIAL ledger entries (oldest first)
//  *   → Allocate amount down the list
//  *   → Mark fully/partially paid entries as frozen
//  *   → Credit excess to StudentWallet (using DB locks)
//  *   → Generate receipt with locked snapshot
//  */

// import prisma from "@/lib/prisma";

// // ─── Core: Process a new payment ────────────────────────────
// /**
//  * Processes a payment, allocates it oldest-first, and generates receipt.
//  * 
//  * @param {Object} params
//  * @param {string} params.studentId
//  * @param {string} params.schoolId
//  * @param {string} params.academicYearId
//  * @param {string} params.feeSessionId
//  * @param {number} params.amountPaid
//  * @param {string} params.paymentMode
//  * @param {string} [params.paymentMethod]
//  * @param {string} [params.reference] - Gateway order ID / Cheque #
//  * @param {string} params.collectedBy - User ID of collector
//  * @param {string} [params.remarks]
//  */
// export async function processPayment({
//     studentId, schoolId, academicYearId, feeSessionId,
//     amountPaid, paymentMode, paymentMethod, reference, collectedBy, remarks, existingPaymentId
// }) {
//     if (amountPaid <= 0) throw new Error("Payment amount must be greater than zero");

//     return await prisma.$transaction(async (tx) => {
//         // 1. Session & Wallet Validation (Pessimistic lock on wallet to prevent race conditions)
//         const session = await tx.feeSession.findUnique({
//             where: { id: feeSessionId }
//         });
//         if (!session) throw new Error("Fee session not found");
//         if (session.isClosed) throw new Error("Fee session is closed. No payments allowed.");

//         // Lock wallet for this transaction (raw query for SELECT FOR UPDATE)
//         const existingWallet = await tx.$queryRaw`
//             SELECT id, balance FROM "StudentWallet" 
//             WHERE "studentId" = ${studentId}::uuid FOR UPDATE
//         `;

//         // 2. Fetch UNPAID / PARTIAL entries ordered by due date (Oldest first)
//         const entries = await tx.studentFeeLedger.findMany({
//             where: {
//                 studentId,
//                 feeSessionId,
//                 status: { in: ["LEDGER_UNPAID", "LEDGER_PARTIAL"] }
//             },
//             include: { feeComponent: true },
//             orderBy: [
//                 { month: "asc" },
//                 { dueDate: "asc" },
//                 { feeComponent: { displayOrder: "asc" } }
//             ]
//         });

//         let remainingAmount = amountPaid;
//         const allocationsToCreate = [];
//         const entriesToUpdate = [];
//         const auditLogs = [];
//         let allocatedTotal = 0;

//         // 3. Allocate line by line
//         for (const entry of entries) {
//             if (remainingAmount <= 0) break;

//             const currentBalance = entry.balanceAmount;
//             const allocateToThis = Math.min(currentBalance, remainingAmount);

//             const newPaid = entry.paidAmount + allocateToThis;
//             const newBalance = entry.netAmount - newPaid;
//             const newStatus = newBalance <= 0 ? "LEDGER_PAID" : "LEDGER_PARTIAL";

//             allocationsToCreate.push({
//                 ledgerEntryId: entry.id,
//                 amount: allocateToThis
//             });

//             entriesToUpdate.push({
//                 id: entry.id,
//                 paidAmount: newPaid,
//                 balanceAmount: newBalance,
//                 status: newStatus,
//                 isFrozen: true, // Freeze the entry once money touches it
//                 paidDate: newStatus === "LEDGER_PAID" ? new Date() : entry.paidDate
//             });

//             auditLogs.push({
//                 ledgerEntryId: entry.id,
//                 action: "LEDGER_PAID",
//                 oldValue: { balance: currentBalance, status: entry.status },
//                 newValue: { 
//                     balance: newBalance, 
//                     status: newStatus, 
//                     allocated: allocateToThis 
//                 },
//                 doneBy: collectedBy,
//                 remarks: `Payment allocation: ₹${allocateToThis}`
//             });

//             remainingAmount -= allocateToThis;
//             allocatedTotal += allocateToThis;
//         }

//         // 4. Handle Wallet (Credit excess)
//         let walletCredit = 0;
//         if (remainingAmount > 0) {
//             walletCredit = remainingAmount;

//             if (existingWallet.length > 0) {
//                 await tx.studentWallet.update({
//                     where: { studentId },
//                     data: { balance: { increment: walletCredit } }
//                 });
//             } else {
//                 await tx.studentWallet.create({
//                     data: {
//                         studentId,
//                         schoolId,
//                         balance: walletCredit
//                     }
//                 });
//             }
//         }

//         // 5. Create core Payment record
//         let payment;
//         if (existingPaymentId) {
//             payment = await tx.feePayment.update({
//                 where: { id: existingPaymentId },
//                 data: {
//                     status: "SUCCESS",
//                     paymentDate: new Date(),
//                     paymentMethod: paymentMethod || "ONLINE",
//                     collectedBy,
//                     remarks: remarks || `Ledger allocation. Wallet logic handled.`
//                 }
//             });
//         } else {
//             payment = await tx.feePayment.create({
//                 data: {
//                     studentId,
//                     schoolId,
//                     academicYearId: academicYearId || session.academicYearId,
//                     amount: amountPaid,
//                     fineAmount: 0, 
//                     discountAmount: 0,
//                     paymentDate: new Date(),
//                     paymentMode: paymentMode || "ONLINE",
//                     paymentMethod: paymentMethod,
//                     reference: reference,
//                     status: "SUCCESS",
//                     collectedBy,
//                     remarks: remarks || `Ledger allocation. Wallet logic handled.`
//                 }
//             });
//         }

//         // 5.5 Update StudentFee (Header)
//         const studentFee = await tx.studentFee.findFirst({
//             where: { studentId, academicYearId: academicYearId || session.academicYearId }
//         });
//         if (studentFee) {
//             await tx.studentFee.update({
//                 where: { id: studentFee.id },
//                 data: {
//                     paidAmount: { increment: amountPaid },
//                     balanceAmount: Math.max(0, studentFee.balanceAmount - amountPaid),
//                     lastPaymentDate: new Date(),
//                     status: (studentFee.balanceAmount - amountPaid) <= 0 ? (studentFee.paidAmount + amountPaid > 0 ? 'PAID' : 'UNPAID') : 'PARTIAL'
//                 }
//             });
//         }

//         // 6. DB Updates in bulk
//         if (allocationsToCreate.length > 0) {
//             await tx.paymentAllocation.createMany({
//                 data: allocationsToCreate.map(a => ({
//                     ...a,
//                     paymentId: payment.id
//                 }))
//             });

//             for (const update of entriesToUpdate) {
//                 await tx.studentFeeLedger.update({
//                     where: { id: update.id },
//                     data: {
//                         paidAmount: update.paidAmount,
//                         balanceAmount: update.balanceAmount,
//                         status: update.status,
//                         isFrozen: update.isFrozen,
//                         paidDate: update.paidDate
//                     }
//                 });
//             }

//             await tx.ledgerAuditLog.createMany({
//                 data: auditLogs
//             });
//         }

//         // 7. Generate locked Receipt Snapshot
//         const receiptSnapshot = {
//             schoolId,
//             studentId,
//             paymentId: payment.id,
//             amountPaid,
//             allocatedTotal,
//             walletCredit,
//             date: new Date().toISOString(),
//             allocations: allocationsToCreate.map((a, i) => ({
//                 component: entries[i].feeComponent.name,
//                 month: entries[i].monthLabel,
//                 amount: a.amount
//             }))
//         };

//         const receiptCount = await tx.receipt.count({ where: { schoolId } });
//         const receiptNumber = `RCPT-${schoolId.substring(0,4).toUpperCase()}-${receiptCount + 1}`;

//         const receipt = await tx.receipt.create({
//             data: {
//                 schoolId,
//                 studentId,
//                 feePaymentId: payment.id,
//                 receiptNumber,
//                 // amount: amountPaid, -> no such field on Receipt model
//                 // paymentDate: new Date(), -> no such field on Receipt model, it uses createdAt or feePayment
//                 receiptData: receiptSnapshot, // 🟢 CTO FIX #3: Exact immutable snapshot
//             }
//         });

//         return {
//             paymentId: payment.id,
//             receiptId: receipt.id,
//             receiptNumber,
//             allocatedToItems: allocationsToCreate.length,
//             walletCredited: walletCredit
//         };
//     });
// }

// // ─── Reverse: Complete payment rollback ─────────────────────
// /**
//  * Reverses a payment completely, unfreezes allocations, and updates wallet.
//  * 
//  * @param {string} paymentId 
//  * @param {string} reversedBy - User ID
//  * @param {string} reason 
//  */
// export async function reversePayment(paymentId, reversedBy, reason) {
//     return await prisma.$transaction(async (tx) => {
//         // 1. Fetch payment and allocations
//         const payment = await tx.feePayment.findUnique({
//             where: { id: paymentId },
//             include: { paymentAllocations: { include: { ledgerEntry: true } } }
//         });

//         if (!payment) throw new Error("Payment not found");
//         if (payment.status === "REFUNDED" || payment.status === "CANCELLED") {
//             throw new Error("Payment is already reversed/cancelled");
//         }

//         const allocations = payment.paymentAllocations;

//         // 2. Un-allocate ledger entries
//         const auditLogs = [];
//         for (const alloc of allocations) {
//             const entry = alloc.ledgerEntry;
//             const newPaid = entry.paidAmount - alloc.amount;
//             const newBalance = entry.balanceAmount + alloc.amount;

//             // Re-evaluate Frozen status IF no other payments exist for this entry
//             // This requires counting remaining allocations for this entry excluding the current payment
//             const otherAllocationsCount = await tx.paymentAllocation.count({
//                 where: { 
//                     ledgerEntryId: entry.id,
//                     paymentId: { not: paymentId }
//                 }
//             });

//             const newStatus = newPaid <= 0 ? "LEDGER_UNPAID" : "LEDGER_PARTIAL";
//             const isFrozen = otherAllocationsCount > 0;

//             await tx.studentFeeLedger.update({
//                 where: { id: entry.id },
//                 data: {
//                     paidAmount: newPaid,
//                     balanceAmount: newBalance,
//                     status: newStatus,
//                     isFrozen: isFrozen,
//                     paidDate: newPaid <= 0 ? null : entry.paidDate
//                 }
//             });

//             auditLogs.push({
//                 ledgerEntryId: entry.id,
//                 action: "LEDGER_REVERSED",
//                 oldValue: { balance: entry.balanceAmount, status: entry.status },
//                 newValue: { balance: newBalance, status: newStatus },
//                 doneBy: reversedBy,
//                 remarks: `Reversal of payment ${payment.receiptNumber || payment.id}. Reason: ${reason}`
//             });
//         }

//         // 3. Reverse excess from Wallet
//         const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
//         const walletCreditToReverse = payment.amount - totalAllocated;

//         if (walletCreditToReverse > 0) {
//             await tx.studentWallet.update({
//                 where: { studentId: payment.studentId },
//                 data: { balance: { decrement: walletCreditToReverse } }
//             });
//         }

//         // 4. Record Reversal & Audit
//         await tx.paymentReversal.create({
//             data: {
//                 paymentId,
//                 amount: payment.amount,
//                 reason,
//                 reversedBy
//             }
//         });

//         if (auditLogs.length > 0) {
//             await tx.ledgerAuditLog.createMany({ data: auditLogs });
//         }

//         // 5. Update Payment Status
//         await tx.feePayment.update({
//             where: { id: paymentId },
//             data: { status: "REFUNDED" }
//         });

//         return {
//             reversedAllocations: allocations.length,
//             walletDebited: walletCreditToReverse
//         };
//     });
// }
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
 * @param {string} params.paymentMode          - PaymentMode enum: "ONLINE" | "OFFLINE"
 * @param {string} [params.paymentMethod]      - PaymentMethod enum: "CASH" | "CHEQUE" | "CARD" | "UPI" | "NET_BANKING" | "WALLET" | "DEMAND_DRAFT"
 * @param {string} [params.reference]          - Gateway order ID / Cheque number (maps to referenceNumber)
 * @param {string|null} [params.collectedBy]   - User ID of collector (null for online/system payments)
 * @param {string} [params.remarks]
 * @param {string} [params.existingPaymentId]  - If payment record already exists (e.g. from gateway initiation)
 */
export async function processPayment({
    studentId,
    schoolId,
    academicYearId,
    feeSessionId,
    amountPaid,
    paymentMode,
    paymentMethod,
    reference,
    collectedBy,
    remarks,
    existingPaymentId,
}) {
    if (amountPaid <= 0) throw new Error("Payment amount must be greater than zero");

    return await prisma.$transaction(async (tx) => {

        // ── 1. Session Validation ────────────────────────────────────────────────
        const session = await tx.feeSession.findUnique({
            where: { id: feeSessionId },
        });
        if (!session) throw new Error("Fee session not found");
        if (session.isClosed) throw new Error("Fee session is closed. No payments allowed.");

        // ── Pessimistic lock on wallet to prevent race conditions ────────────────
        const existingWallet = await tx.$queryRaw`
            SELECT id, balance FROM "StudentWallet"
            WHERE "studentId" = ${studentId}::uuid FOR UPDATE
        `;

        // ── 2. Fetch UNPAID / PARTIAL entries ordered oldest-first ───────────────
        const entries = await tx.studentFeeLedger.findMany({
            where: {
                studentId,
                feeSessionId,
                status: { in: ["LEDGER_UNPAID", "LEDGER_PARTIAL"] },
            },
            include: { feeComponent: true },
            orderBy: [
                { month: "asc" },
                { dueDate: "asc" },
                { feeComponent: { displayOrder: "asc" } },
            ],
        });

        let remainingAmount = amountPaid;
        const allocationsToCreate = [];
        const allocatedEntries = []; // FIX #5: track entries in sync with allocations
        const entriesToUpdate = [];
        const auditLogs = [];
        let allocatedTotal = 0;

        // ── 3. Allocate line by line (oldest-first) ──────────────────────────────
        for (const entry of entries) {
            if (remainingAmount <= 0) break;

            const currentBalance = entry.balanceAmount;
            const allocateToThis = Math.min(currentBalance, remainingAmount);

            const newPaid = entry.paidAmount + allocateToThis;
            const newBalance = entry.netAmount - newPaid;
            const newStatus = newBalance <= 0 ? "LEDGER_PAID" : "LEDGER_PARTIAL";

            allocationsToCreate.push({
                ledgerEntryId: entry.id,
                amount: allocateToThis,
            });

            // FIX #5: keep entries index in sync with allocationsToCreate
            allocatedEntries.push(entry);

            entriesToUpdate.push({
                id: entry.id,
                paidAmount: newPaid,
                balanceAmount: Math.max(0, newBalance),
                status: newStatus,
                isFrozen: true,
                paidDate: newStatus === "LEDGER_PAID" ? new Date() : entry.paidDate,
            });

            let logEntry = {
                ledgerEntryId: entry.id,
                action: "LEDGER_PAID",
                oldValue: { balance: Number(currentBalance), status: entry.status },
                newValue: { balance: Number(newBalance), status: newStatus, allocated: Number(allocateToThis) },
                remarks: `Payment allocation: ₹${allocateToThis}`,
            };
            if (collectedBy && String(collectedBy).toUpperCase() !== "SYSTEM") {
                logEntry.doneBy = collectedBy;
            }
            auditLogs.push(logEntry);

            remainingAmount -= allocateToThis;
            allocatedTotal += allocateToThis;
        }

        // ── 4. Credit excess to StudentWallet ────────────────────────────────────
        let walletCredit = 0;
        if (remainingAmount > 0) {
            walletCredit = remainingAmount;

            if (existingWallet.length > 0) {
                await tx.studentWallet.update({
                    where: { studentId },
                    data: { balance: { increment: walletCredit } },
                });
            } else {
                await tx.studentWallet.create({
                    data: { studentId, schoolId, balance: walletCredit },
                });
            }
        }

        // ── 5. Create / Update core Payment record ───────────────────────────────
        let payment;

        if (existingPaymentId) {
            // Updating a pre-created gateway payment record
            payment = await tx.feePayment.update({
                where: { id: existingPaymentId },
                data: {
                    status: "SUCCESS",
                    paymentDate: new Date(),
                    // FIX #1: paymentMethod must be a valid PaymentMethod enum value
                    // "ONLINE" is PaymentMode — never use it here
                    paymentMethod: paymentMethod || "NET_BANKING",
                    collectedBy: collectedBy || null,
                    remarks: remarks || "Ledger allocation via payment engine.",
                },
            });
        } else {
            // Creating a fresh payment record (offline / manual collections)
            payment = await tx.feePayment.create({
                data: {
                    studentId,
                    schoolId,
                    academicYearId: academicYearId || session.academicYearId,
                    // FIX #2a: studentFeeId is required on FeePayment — fetch it
                    studentFeeId: await (async () => {
                        const sf = await tx.studentFee.findFirst({
                            where: {
                                studentId,
                                academicYearId: academicYearId || session.academicYearId,
                            },
                            select: { id: true },
                        });
                        if (!sf) throw new Error("StudentFee record not found for this student/year");
                        return sf.id;
                    })(),
                    amount: amountPaid,
                    // FIX #2b: removed non-existent fields: fineAmount, discountAmount
                    paymentDate: new Date(),
                    paymentMode: paymentMode || "OFFLINE",
                    // FIX #1: correct PaymentMethod enum value
                    paymentMethod: paymentMethod || "CASH",
                    // FIX #2c: correct field name is referenceNumber, not reference
                    referenceNumber: reference || null,
                    status: "SUCCESS",
                    collectedBy: collectedBy || null,
                    remarks: remarks || "Ledger allocation via payment engine.",
                    // receiptNumber is @unique and required — generate it now
                    receiptNumber: await (async () => {
                        const count = await tx.receipt.count({ where: { schoolId } });
                        return `RCPT-${schoolId.substring(0, 4).toUpperCase()}-${count + 1}`;
                    })(),
                },
            });
        }

        // ── 5.5 Update StudentFee header ─────────────────────────────────────────
        const studentFee = await tx.studentFee.findFirst({
            where: {
                studentId,
                academicYearId: academicYearId || session.academicYearId,
            },
        });

        if (studentFee) {
            // FIX #4: correct status calculation — avoid double-counting paidAmount
            const newPaidTotal = studentFee.paidAmount + amountPaid;
            const newBalanceAmt = Math.max(0, studentFee.balanceAmount - amountPaid);
            const newFeeStatus =
                newBalanceAmt <= 0
                    ? "PAID"
                    : newPaidTotal > 0
                        ? "PARTIAL"
                        : "UNPAID";

            await tx.studentFee.update({
                where: { id: studentFee.id },
                data: {
                    paidAmount: newPaidTotal,
                    balanceAmount: newBalanceAmt,
                    lastPaymentDate: new Date(),
                    status: newFeeStatus,
                },
            });
        }

        // ── 6. Bulk DB updates ───────────────────────────────────────────────────
        if (allocationsToCreate.length > 0) {
            // 6a. Payment allocations
            await tx.paymentAllocation.createMany({
                data: allocationsToCreate.map((a) => ({
                    ...a,
                    paymentId: payment.id,
                })),
            });

            // 6b. Ledger entry updates
            for (const update of entriesToUpdate) {
                await tx.studentFeeLedger.update({
                    where: { id: update.id },
                    data: {
                        paidAmount: update.paidAmount,
                        balanceAmount: update.balanceAmount,
                        status: update.status,
                        isFrozen: update.isFrozen,
                        paidDate: update.paidDate,
                    },
                });
            }

            // 6c. Audit logs
            await tx.ledgerAuditLog.createMany({ data: auditLogs });
        }

        // ── 7. Generate locked Receipt Snapshot ──────────────────────────────────
        const receiptSnapshot = {
            schoolId,
            studentId,
            paymentId: payment.id,
            amountPaid,
            allocatedTotal,
            walletCredit,
            date: new Date().toISOString(),
            // FIX #5: use allocatedEntries (in-sync with allocationsToCreate) instead of entries[i]
            allocations: allocationsToCreate.map((a, i) => ({
                component: allocatedEntries[i].feeComponent.name,
                month: allocatedEntries[i].monthLabel,
                amount: a.amount,
            })),
        };

        const receiptCount = await tx.receipt.count({ where: { schoolId } });
        const receiptNumber = `RCPT-${schoolId.substring(0, 4).toUpperCase()}-${receiptCount + 1}`;

        const receipt = await tx.receipt.create({
            data: {
                schoolId,
                studentId,
                feePaymentId: payment.id,
                receiptNumber,
                receiptData: receiptSnapshot,
            },
        });

        return {
            paymentId: payment.id,
            receiptId: receipt.id,
            receiptNumber,
            allocatedToItems: allocationsToCreate.length,
            walletCredited: walletCredit,
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

        // ── 1. Fetch payment + allocations ───────────────────────────────────────
        const payment = await tx.feePayment.findUnique({
            where: { id: paymentId },
            include: {
                paymentAllocations: { include: { ledgerEntry: true } },
            },
        });

        if (!payment) throw new Error("Payment not found");
        if (payment.status === "REFUNDED" || payment.status === "CANCELLED") {
            throw new Error("Payment is already reversed/cancelled");
        }

        const allocations = payment.paymentAllocations;

        // ── 2. Un-allocate ledger entries ────────────────────────────────────────
        const auditLogs = [];

        for (const alloc of allocations) {
            const entry = alloc.ledgerEntry;
            const newPaid = entry.paidAmount - alloc.amount;
            const newBalance = entry.balanceAmount + alloc.amount;

            // Check if other payments still cover this entry
            const otherAllocationsCount = await tx.paymentAllocation.count({
                where: {
                    ledgerEntryId: entry.id,
                    paymentId: { not: paymentId },
                },
            });

            const newStatus = newPaid <= 0 ? "LEDGER_UNPAID" : "LEDGER_PARTIAL";
            const isFrozen = otherAllocationsCount > 0;

            await tx.studentFeeLedger.update({
                where: { id: entry.id },
                data: {
                    paidAmount: Math.max(0, newPaid),
                    balanceAmount: newBalance,
                    status: newStatus,
                    isFrozen,
                    paidDate: newPaid <= 0 ? null : entry.paidDate,
                },
            });

            let logEntry = {
                ledgerEntryId: entry.id,
                action: "LEDGER_REVERSED",
                oldValue: { balance: Number(entry.balanceAmount), status: entry.status },
                newValue: { balance: Number(newBalance), status: newStatus },
                remarks: `Reversal of payment ${payment.receiptNumber || payment.id}. Reason: ${reason}`,
            };
            if (reversedBy && String(reversedBy).toUpperCase() !== "SYSTEM") {
                logEntry.doneBy = reversedBy;
            }
            auditLogs.push(logEntry);
        }

        // ── 3. Reverse excess wallet credit ─────────────────────────────────────
        const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
        const walletCreditToReverse = payment.amount - totalAllocated;

        if (walletCreditToReverse > 0) {
            await tx.studentWallet.update({
                where: { studentId: payment.studentId },
                data: { balance: { decrement: walletCreditToReverse } },
            });
        }

        // ── 4. Record reversal + audit ───────────────────────────────────────────
        await tx.paymentReversal.create({
            data: { paymentId, amount: payment.amount, reason, reversedBy },
        });

        if (auditLogs.length > 0) {
            await tx.ledgerAuditLog.createMany({ data: auditLogs });
        }

        // ── 5. Update StudentFee header ──────────────────────────────────────────
        const studentFee = await tx.studentFee.findFirst({
            where: { studentId: payment.studentId, academicYearId: payment.academicYearId },
        });

        if (studentFee) {
            const newPaidTotal = Math.max(0, studentFee.paidAmount - payment.amount);
            const newBalanceAmt = studentFee.balanceAmount + payment.amount;
            const newFeeStatus =
                newPaidTotal <= 0
                    ? "UNPAID"
                    : newBalanceAmt <= 0
                        ? "PAID"
                        : "PARTIAL";

            await tx.studentFee.update({
                where: { id: studentFee.id },
                data: {
                    paidAmount: newPaidTotal,
                    balanceAmount: newBalanceAmt,
                    status: newFeeStatus,
                },
            });
        }

        // ── 6. Mark payment as refunded ──────────────────────────────────────────
        await tx.feePayment.update({
            where: { id: paymentId },
            data: { status: "REFUNDED" },
        });

        return {
            reversedAllocations: allocations.length,
            walletDebited: walletCreditToReverse,
        };
    });
}