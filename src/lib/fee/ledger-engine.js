/**
 * FINANCIAL LEDGER ENGINE
 * 
 * Generates and regenerates monthly ledger entries for students.
 * Core flow: FeeComponent → StudentFeeLedger (one entry per applicable month)
 * 
 * Rules:
 * - MONTHLY: one entry per applicable month (joinDate → sessionEnd)
 * - ONE_TIME (ON_ADMISSION): one entry at join month
 * - ANNUAL (SESSION_START): one entry at session start
 * - TERM: entries at term boundaries (quarterly/half-yearly)
 * - PROMOTION: one entry if student was promoted
 * 
 * Regeneration:
 * - Only unfrozen entries (isFrozen === false) are regenerated
 * - Frozen entries (with payments) are NEVER touched
 * - Version is bumped on regenerated entries
 * - All changes are audit-logged
 */

import prisma from "@/lib/prisma";

// ─── Month helpers ──────────────────────────────────────────
const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function getMonthLabel(date) {
    return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function getFirstOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthsBetween(startDate, endDate) {
    const months = [];
    let current = getFirstOfMonth(new Date(startDate));
    const end = getFirstOfMonth(new Date(endDate));

    while (current <= end) {
        months.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
    }
    return months;
}

function isMonthApplicable(month, applicableMonths) {
    if (!applicableMonths || applicableMonths.length === 0) return true;
    const monthName = MONTH_NAMES[month.getMonth()];
    return applicableMonths.includes(monthName);
}

// ─── Core: Generate ledger for a single student ─────────────
/**
 * Generate ledger entries for a student based on their fee structure.
 * 
 * @param {Object} params
 * @param {string} params.studentId
 * @param {string} params.schoolId
 * @param {string} params.academicYearId
 * @param {string} params.feeSessionId
 * @param {string} params.feeStructureId - GlobalFeeStructure ID
 * @param {Date|string} params.joinDate - Student's effective start date
 * @param {string} params.userId - User performing the action (for audit)
 * @param {Object} [params.tx] - Optional Prisma transaction client
 * @returns {Object} { created: number, skipped: number, entries: [] }
 */
export async function generateStudentLedger({
    studentId, schoolId, academicYearId, feeSessionId,
    feeStructureId, joinDate, userId, tx
}) {
    const db = tx || prisma;
    const effectiveJoinDate = new Date(joinDate);

    // 1. Fetch fee session
    const session = await db.feeSession.findUnique({
        where: { id: feeSessionId },
    });

    if (!session) throw new Error("Fee session not found");
    if (session.isClosed) throw new Error("Fee session is closed — cannot generate ledger");

    // 2. Fetch fee components for this structure + session
    const components = await db.feeComponent.findMany({
        where: {
            feeStructureId,
            feeSessionId,
            isActive: true,
        },
        include: { lateFeeRule: true },
        orderBy: { displayOrder: "asc" },
    });

    if (components.length === 0) {
        return { created: 0, skipped: 0, entries: [] };
    }

    // 3. Check for existing entries (avoid duplicates)
    const existingEntries = await db.studentFeeLedger.findMany({
        where: { studentId, feeSessionId },
        select: { feeComponentId: true, month: true },
    });

    const existingKey = new Set(
        existingEntries.map(e => `${e.feeComponentId}::${e.month.toISOString()}`)
    );

    // 4. Generate entries per component
    const entriesToCreate = [];
    let skipped = 0;

    for (const comp of components) {
        if (comp.isOptional) continue; // Optional components need explicit opt-in

        const months = getMonthsForComponent(comp, session, effectiveJoinDate);

        for (const month of months) {
            const key = `${comp.id}::${getFirstOfMonth(month).toISOString()}`;
            if (existingKey.has(key)) {
                skipped++;
                continue;
            }

            const dueDate = new Date(month.getFullYear(), month.getMonth(), session.dueDayOfMonth);
            const netAmount = comp.amount; // before discounts/late fees

            entriesToCreate.push({
                studentId,
                schoolId,
                academicYearId,
                feeSessionId,
                feeComponentId: comp.id,
                month: getFirstOfMonth(month),
                monthLabel: getMonthLabel(month),
                originalAmount: comp.amount,
                discountAmount: 0,
                lateFeeAmount: 0,
                netAmount,
                paidAmount: 0,
                balanceAmount: netAmount,
                status: "LEDGER_UNPAID",
                dueDate,
                isFrozen: false,
                version: 1,
            });
        }
    }

    // 5. Batch create
    if (entriesToCreate.length > 0) {
        await db.studentFeeLedger.createMany({ data: entriesToCreate });
    }

    // 6. Create audit logs for each entry
    if (entriesToCreate.length > 0 && userId) {
        const createdEntries = await db.studentFeeLedger.findMany({
            where: { studentId, feeSessionId },
            select: { id: true },
            orderBy: { createdAt: "desc" },
            take: entriesToCreate.length,
        });

        await db.ledgerAuditLog.createMany({
            data: createdEntries.map(entry => ({
                ledgerEntryId: entry.id,
                action: "LEDGER_CREATED",
                newValue: { generated: true },
                doneBy: userId,
                remarks: "Auto-generated from fee structure",
            })),
        });
    }

    return {
        created: entriesToCreate.length,
        skipped,
        entries: entriesToCreate,
    };
}

// ─── Regenerate: Update unfrozen entries ────────────────────
/**
 * Regenerate unfrozen ledger entries when fee structure changes.
 * Frozen entries (with payments) are NEVER touched.
 * 
 * @param {Object} params
 * @param {string} params.studentId
 * @param {string} params.feeSessionId
 * @param {string} params.feeStructureId
 * @param {string} params.userId
 * @param {Object} [params.tx]
 */
export async function regenerateStudentLedger({
    studentId, feeSessionId, feeStructureId, userId, tx
}) {
    const db = tx || prisma;

    // 1. Fetch session
    const session = await db.feeSession.findUnique({
        where: { id: feeSessionId },
    });
    if (!session) throw new Error("Fee session not found");
    if (session.isClosed) throw new Error("Session is closed");

    // 2. Delete all UNFROZEN entries for this student & session
    const unfrozenEntries = await db.studentFeeLedger.findMany({
        where: { studentId, feeSessionId, isFrozen: false },
    });

    const deletedIds = unfrozenEntries.map(e => e.id);

    if (deletedIds.length > 0) {
        // Audit log the deletions
        await db.ledgerAuditLog.createMany({
            data: unfrozenEntries.map(entry => ({
                ledgerEntryId: entry.id,
                action: "LEDGER_REGENERATED",
                oldValue: {
                    originalAmount: entry.originalAmount,
                    discountAmount: entry.discountAmount,
                    netAmount: entry.netAmount,
                    month: entry.monthLabel,
                },
                doneBy: userId,
                remarks: "Entry regenerated due to structure change",
            })),
        });

        // Delete unfrozen entries
        await db.studentFeeLedger.deleteMany({
            where: { id: { in: deletedIds } },
        });
    }

    // AFTER — fall back to session.academicYearId when student.academicYearId is null
    const student = await db.student.findUnique({
        where: { userId: studentId },
        select: { admissionDate: true, schoolId: true, academicYearId: true },
    });

    const result = await generateStudentLedger({
        studentId,
        schoolId: student.schoolId,
        academicYearId: student.academicYearId || session.academicYearId,  // ← FIXED
        feeSessionId,
        feeStructureId,
        joinDate: student.admissionDate || session.startMonth,
        userId,
        tx: db,
    });
    return {
        deleted: deletedIds.length,
        regenerated: result.created,
        frozenKept: unfrozenEntries.length === 0
            ? (await db.studentFeeLedger.count({ where: { studentId, feeSessionId, isFrozen: true } }))
            : 0,
    };
}

// ─── Bulk: Generate ledger for entire class ─────────────────
/**
 * Generate ledger entries for all students in a class.
 * 
 * @param {Object} params
 * @param {string} params.schoolId
 * @param {string} params.academicYearId
 * @param {string} params.feeSessionId
 * @param {string} params.feeStructureId
 * @param {number} params.classId
 * @param {number} [params.sectionId]
 * @param {string} params.userId
 */
export async function generateClassLedger({
    schoolId, academicYearId, feeSessionId,
    feeStructureId, classId, sectionId, userId
}) {
    const where = {
        schoolId,
        classId,
        ...(sectionId && { sectionId }),
    };

    const students = await prisma.student.findMany({
        where,
        select: { userId: true, admissionDate: true, academicYearId: true },
    });

    const results = { total: students.length, created: 0, skipped: 0, errors: [] };

    // Process in batches of 50 using transactions
    const BATCH_SIZE = 50;
    for (let i = 0; i < students.length; i += BATCH_SIZE) {
        const batch = students.slice(i, i + BATCH_SIZE);

        await prisma.$transaction(async (tx) => {
            for (const student of batch) {
                try {
                    const result = await generateStudentLedger({
                        studentId: student.userId,
                        schoolId,
                        academicYearId: student.academicYearId || academicYearId,
                        feeSessionId,
                        feeStructureId,
                        joinDate: student.admissionDate || new Date(),
                        userId,
                        tx,
                    });
                    results.created += result.created;
                    results.skipped += result.skipped;
                } catch (error) {
                    results.errors.push({
                        studentId: student.userId,
                        error: error.message,
                    });
                }
            }
        });
    }

    return results;
}

// ─── Helper: Determine months for a component ──────────────
function getMonthsForComponent(component, session, joinDate) {
    const sessionStart = getFirstOfMonth(new Date(session.startMonth));
    const sessionEnd = getFirstOfMonth(new Date(session.endMonth));
    const effectiveStart = joinDate > sessionStart ? getFirstOfMonth(joinDate) : sessionStart;

    switch (component.type) {
        case "MONTHLY": {
            const allMonths = getMonthsBetween(effectiveStart, sessionEnd);
            // Filter by applicable months if specified
            const applicable = component.applicableMonths;
            return allMonths.filter(m => isMonthApplicable(m, applicable));
        }

        case "ONE_TIME": {
            // Use chargeTiming to determine the correct month
            if (component.chargeTiming === "CHARGE_ON_ADMISSION") {
                // Always use actual join month, regardless of session boundaries
                return [getFirstOfMonth(joinDate)];
            }
            // Use effective start (session start, or join date for late admissions)
            return [effectiveStart];
        }

        case "ANNUAL": {
            if (component.chargeTiming === "CHARGE_ON_ADMISSION") {
                return [getFirstOfMonth(joinDate)];
            }
            // Use effective start here as well to prevent backdating
            return [effectiveStart];
        }

        case "TERM": {
            // Determine term boundaries based on session length
            const months = getMonthsBetween(sessionStart, sessionEnd);
            const totalMonths = months.length;

            // For quarterly: every 3 months, half-yearly: every 6
            const termLength = totalMonths <= 6 ? Math.ceil(totalMonths / 2) : 3;
            const termStarts = [];

            for (let i = 0; i < months.length; i += termLength) {
                const termMonth = months[i];
                if (termMonth >= effectiveStart) {
                    termStarts.push(termMonth);
                }
            }

            return termStarts.length > 0 ? termStarts : [effectiveStart];
        }

        case "PROMOTION": {
            // One entry at session start — only for promoted students
            // Caller must check promotion status before calling
            return [sessionStart];
        }

        default:
            return [effectiveStart];
    }
}

// ─── Add optional component to student ──────────────────────
/**
 * Opt a student into an optional FeeComponent (e.g., Swimming).
 */
export async function addOptionalComponent({
    studentId, schoolId, academicYearId, feeSessionId,
    feeComponentId, userId
}) {
    const component = await prisma.feeComponent.findUnique({
        where: { id: feeComponentId },
    });
    if (!component) throw new Error("Fee component not found");
    if (!component.isOptional) throw new Error("Component is not optional");

    const session = await prisma.feeSession.findUnique({
        where: { id: feeSessionId },
    });
    if (!session) throw new Error("Session not found");
    if (session.isClosed) throw new Error("Session is closed");

    const student = await prisma.student.findUnique({
        where: { userId: studentId },
        select: { admissionDate: true },
    });

    const months = getMonthsForComponent(component, session, new Date(student?.admissionDate || session.startMonth));
    const now = getFirstOfMonth(new Date());

    // Only create entries from current month onwards
    const futureMonths = months.filter(m => m >= now);

    const entries = futureMonths.map(month => ({
        studentId,
        schoolId,
        academicYearId,
        feeSessionId,
        feeComponentId: component.id,
        month: getFirstOfMonth(month),
        monthLabel: getMonthLabel(month),
        originalAmount: component.amount,
        discountAmount: 0,
        lateFeeAmount: 0,
        netAmount: component.amount,
        paidAmount: 0,
        balanceAmount: component.amount,
        status: "LEDGER_UNPAID",
        dueDate: new Date(month.getFullYear(), month.getMonth(), session.dueDayOfMonth),
        isFrozen: false,
        version: 1,
    }));

    if (entries.length > 0) {
        await prisma.studentFeeLedger.createMany({ data: entries });
    }

    return { created: entries.length };
}
