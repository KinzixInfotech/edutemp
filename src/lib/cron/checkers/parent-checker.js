/**
 * Parent Notification Checker (Optimized for Vercel Serverless)
 * 
 * Checks conditions for parent notifications:
 * - Child marked absent
 * - Child marked late  
 * - Fee due soon (3 days, 1 day)
 * - Fee overdue
 * 
 * Optimizations:
 * - Reverse lookup map: studentUserId → parentUserIds[] (O(1) lookup)
 * - DB-level filtering (markedAt, dueDate) — no JS post-filtering
 * - Single merged query for absent + late attendance
 * - Single merged query for upcoming + overdue fees
 * - Parallel DB queries via Promise.all
 * - Cursor-based batching for large datasets
 */

import prisma from "@/lib/prisma";
import { getDateKey } from "../cron-notification-service";

const BATCH_SIZE = 1000;

/**
 * Build a reverse lookup: studentUserId → [{ parentUserId, studentName }]
 * This makes parent lookup O(1) instead of iterating all parents for every record.
 */
async function buildStudentToParentMap(schoolId) {
    const studentParentMap = new Map(); // studentUserId → [{ parentUserId, studentName }]
    let cursor = undefined;

    while (true) {
        const links = await prisma.studentParentLink.findMany({
            where: {
                student: { schoolId },
                isActive: true,
            },
            select: {
                id: true,
                parent: { select: { userId: true } },
                student: { select: { userId: true, name: true } },
            },
            take: BATCH_SIZE,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: { id: 'asc' },
        });

        if (links.length === 0) break;

        for (const link of links) {
            const sid = link.student.userId;
            if (!studentParentMap.has(sid)) {
                studentParentMap.set(sid, []);
            }
            studentParentMap.get(sid).push({
                parentUserId: link.parent.userId,
                studentName: link.student.name,
            });
        }

        if (links.length < BATCH_SIZE) break;
        cursor = links[links.length - 1].id;
    }

    return studentParentMap;
}

/**
 * Emit parent notifications for a given student attendance record.
 * Uses the pre-built reverse map for O(1) lookup.
 */
function emitAttendanceNotifications(record, studentParentMap, dateKey) {
    const entries = studentParentMap.get(record.userId);
    if (!entries) return [];

    const notifications = [];
    const isAbsent = record.status === 'ABSENT';

    for (const { parentUserId, studentName } of entries) {
        if (isAbsent) {
            notifications.push({
                userId: parentUserId,
                ruleType: 'CHILD_ABSENT',
                ruleKey: `child_absent_${dateKey}_${record.userId}`,
                title: '❌ Child Marked Absent',
                message: `${studentName} was marked absent today.`,
                type: 'ATTENDANCE',
                priority: 'HIGH',
                icon: '❌',
                actionUrl: '/child/attendance',
            });
        } else {
            // LATE
            const lateMsg = record.lateByMinutes
                ? `${studentName} was marked late today (${record.lateByMinutes} mins).`
                : `${studentName} was marked late today.`;

            notifications.push({
                userId: parentUserId,
                ruleType: 'CHILD_LATE',
                ruleKey: `child_late_${dateKey}_${record.userId}`,
                title: '⚠️ Child Marked Late',
                message: lateMsg,
                type: 'ATTENDANCE',
                priority: 'NORMAL',
                icon: '⚠️',
                actionUrl: '/child/attendance',
            });
        }
    }

    return notifications;
}

/**
 * Emit upcoming fee notifications (due in 1 or 3 days).
 * These are per-installment since they're infrequent.
 */
function emitUpcomingFeeNotifications(installment, studentParentMap, dateKey, today) {
    const studentUserId = installment.studentFee.student.userId;
    const entries = studentParentMap.get(studentUserId);
    if (!entries) return [];

    const balance = installment.amount - installment.paidAmount;
    const dueDate = new Date(installment.dueDate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilDue !== 3 && daysUntilDue !== 1) return [];

    const notifications = [];
    for (const { parentUserId } of entries) {
        notifications.push({
            userId: parentUserId,
            ruleType: 'FEE_DUE_SOON',
            ruleKey: `fee_due_${daysUntilDue}d_${dateKey}_${installment.id}`,
            title: '💰 Fee Payment Reminder',
            message: `Fee ₹${balance.toLocaleString('en-IN')} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`,
            type: 'FEE',
            priority: 'HIGH',
            icon: '💰',
            actionUrl: '/fees',
        });
    }
    return notifications;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Consolidate overdue installments into ONE notification per student per parent.
 * 
 * Single overdue:  "Fee ₹5,916 overdue for Apr. Please pay immediately."
 * Multiple overdue: "Fees overdue for Jan, Feb, Mar — total ₹17,750. Please pay immediately."
 */
function emitConsolidatedOverdueNotifications(overdueInstallments, studentParentMap, dateKey) {
    // Group overdue installments by studentUserId
    const byStudent = new Map(); // studentUserId → [{ month, balance, id }]

    for (const inst of overdueInstallments) {
        const studentUserId = inst.studentFee.student.userId;
        if (!studentParentMap.has(studentUserId)) continue;

        if (!byStudent.has(studentUserId)) {
            byStudent.set(studentUserId, []);
        }

        const dueDate = new Date(inst.dueDate);
        byStudent.get(studentUserId).push({
            month: MONTH_NAMES[dueDate.getMonth()],
            balance: inst.amount - inst.paidAmount,
            id: inst.id,
        });
    }

    const notifications = [];

    for (const [studentUserId, items] of byStudent) {
        const entries = studentParentMap.get(studentUserId);
        if (!entries) continue;

        const totalBalance = items.reduce((sum, i) => sum + i.balance, 0);
        // Dedupe months (multiple installments might fall in same month)
        const uniqueMonths = [...new Set(items.map(i => i.month))];
        // Stable ruleKey: sort installment IDs so key is deterministic
        const sortedIds = items.map(i => i.id).sort().join('_');

        let message;
        if (uniqueMonths.length === 1) {
            message = `Fee ₹${totalBalance.toLocaleString('en-IN')} overdue for ${uniqueMonths[0]}. Please pay immediately.`;
        } else {
            message = `Fees overdue for ${uniqueMonths.join(', ')} — total ₹${totalBalance.toLocaleString('en-IN')}. Please pay immediately.`;
        }

        for (const { parentUserId } of entries) {
            notifications.push({
                userId: parentUserId,
                ruleType: 'FEE_OVERDUE',
                ruleKey: `fee_overdue_${dateKey}_${studentUserId}`,
                title: uniqueMonths.length === 1 ? '🚨 Fee Overdue' : `🚨 ${uniqueMonths.length} Fees Overdue`,
                message,
                type: 'FEE',
                priority: 'HIGH',
                icon: '🚨',
                actionUrl: '/fees',
            });
        }
    }

    return notifications;
}

/**
 * Check all parent notification conditions.
 * Optimized for Vercel serverless: minimal DB round-trips, no N² loops,
 * filtering pushed to DB, parallel queries, cursor-based batching.
 */
export async function checkParentNotifications(schoolId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(today);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Step 1: Build reverse lookup map (batched)
    const studentParentMap = await buildStudentToParentMap(schoolId);

    if (studentParentMap.size === 0) return [];

    // Step 2: Run attendance + fee queries in parallel
    const [attendanceRecords, feeInstallments] = await Promise.all([
        // Single query: absent OR late, filtered by markedAt in DB
        prisma.attendance.findMany({
            where: {
                schoolId,
                date: today,
                status: { in: ['ABSENT', 'LATE'] },
                markedAt: { gte: thirtyMinsAgo },
                user: { student: { isNot: null } },
            },
            select: {
                userId: true,
                status: true,
                lateByMinutes: true,
            },
        }),

        // Single query: upcoming (due in 1-3 days) OR overdue
        prisma.studentFeeInstallment.findMany({
            where: {
                studentFee: { schoolId },
                OR: [
                    // Upcoming: due between today and 3 days from now
                    {
                        status: { in: ['PENDING', 'PARTIAL'] },
                        dueDate: { gte: today, lte: threeDaysFromNow },
                    },
                    // Overdue
                    {
                        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
                        dueDate: { lt: today },
                        isOverdue: true,
                    },
                ],
            },
            select: {
                id: true,
                amount: true,
                paidAmount: true,
                dueDate: true,
                studentFee: {
                    select: {
                        student: { select: { userId: true } },
                    },
                },
            },
        }),
    ]);

    // Step 3: Build notifications using O(1) lookups
    const notifications = [];

    // Attendance notifications (per-record)
    for (const record of attendanceRecords) {
        notifications.push(...emitAttendanceNotifications(record, studentParentMap, dateKey));
    }

    // Split fee installments into upcoming vs overdue
    const upcomingInstallments = [];
    const overdueInstallments = [];

    for (const inst of feeInstallments) {
        const dueDate = new Date(inst.dueDate);
        if (dueDate < today) {
            overdueInstallments.push(inst);
        } else {
            upcomingInstallments.push(inst);
        }
    }

    // Upcoming: one notification per installment (rare, max 1-2)
    for (const inst of upcomingInstallments) {
        notifications.push(...emitUpcomingFeeNotifications(inst, studentParentMap, dateKey, today));
    }

    // Overdue: ONE consolidated notification per student per parent
    notifications.push(...emitConsolidatedOverdueNotifications(overdueInstallments, studentParentMap, dateKey));

    return notifications;
}
