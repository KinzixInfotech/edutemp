/**
 * Director Notification Checker
 * 
 * Checks conditions for director notifications:
 * - Daily school summary (evening)
 * - Revenue below threshold
 * - Compliance risk (attendance < 75%)
 * - Critical automation failures
 */

import prisma from "@/lib/prisma";
import { getDateKey } from "../cron-notification-service";

/**
 * Check all director notification conditions
 */
export async function checkDirectorNotifications(schoolId) {
    const notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(today);
    const currentHour = new Date().getHours();

    // Get director user
    const director = await prisma.director.findFirst({
        where: { schoolId },
        select: { userId: true }
    });

    if (!director) return notifications;

    // 1. DAILY_SUMMARY - Evening summary at 6 PM
    if (currentHour === 18) {
        // Calculate today's attendance percentage
        const totalStudents = await prisma.student.count({
            where: { schoolId }
        });

        const presentToday = await prisma.attendance.count({
            where: {
                schoolId,
                date: today,
                status: { in: ['PRESENT', 'LATE'] },
                user: { student: { isNot: null } }
            }
        });

        const attendancePercent = totalStudents > 0
            ? Math.round((presentToday / totalStudents) * 100)
            : 0;

        // Calculate pending fees
        const pendingFees = await prisma.studentFee.aggregate({
            where: {
                schoolId,
                status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] }
            },
            _sum: { balanceAmount: true }
        });

        const pendingAmount = pendingFees._sum.balanceAmount || 0;
        const formattedAmount = pendingAmount >= 100000
            ? `₹${(pendingAmount / 100000).toFixed(1)}L`
            : `₹${pendingAmount.toLocaleString('en-IN')}`;

        notifications.push({
            userId: director.userId,
            ruleType: 'DAILY_SUMMARY',
            ruleKey: `daily_summary_${dateKey}`,
            title: '📊 Daily Summary',
            message: `Today: ${attendancePercent}% attendance, ${formattedAmount} fee pending.`,
            type: 'GENERAL',
            priority: 'NORMAL',
            icon: '📊',
            metadata: { attendancePercent, pendingAmount },
            actionUrl: '/dashboard'
        });
    }

    // 2. COMPLIANCE_RISK - Attendance below 75% (check at 2 PM)
    if (currentHour === 14) {
        const totalStudents = await prisma.student.count({
            where: { schoolId }
        });

        const presentToday = await prisma.attendance.count({
            where: {
                schoolId,
                date: today,
                status: { in: ['PRESENT', 'LATE'] },
                user: { student: { isNot: null } }
            }
        });

        const attendancePercent = totalStudents > 0
            ? Math.round((presentToday / totalStudents) * 100)
            : 100;

        if (attendancePercent < 75) {
            notifications.push({
                userId: director.userId,
                ruleType: 'COMPLIANCE_RISK',
                ruleKey: `compliance_risk_${dateKey}`,
                title: '⚠️ Attendance Alert',
                message: `Attendance compliance issue: Only ${attendancePercent}% present today.`,
                type: 'ATTENDANCE',
                priority: 'HIGH',
                icon: '⚠️',
                metadata: { attendancePercent },
                actionUrl: '/attendance/analytics'
            });
        }
    }

    // 3. REVENUE_BELOW_TARGET - Check at 7 PM
    if (currentHour === 19) {
        // Get today's collections
        const todayStart = new Date(today);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const todayCollections = await prisma.feePayment.aggregate({
            where: {
                schoolId,
                status: 'SUCCESS',
                paymentDate: { gte: todayStart, lte: todayEnd }
            },
            _sum: { amount: true }
        });

        const collected = todayCollections._sum.amount || 0;

        // Get expected (configurable threshold - for now using 10000 as default)
        const expectedDaily = 10000;

        if (collected < expectedDaily) {
            const formattedCollected = collected >= 100000
                ? `₹${(collected / 100000).toFixed(1)}L`
                : `₹${collected.toLocaleString('en-IN')}`;

            notifications.push({
                userId: director.userId,
                ruleType: 'REVENUE_BELOW_TARGET',
                ruleKey: `revenue_low_${dateKey}`,
                title: '💰 Revenue Alert',
                message: `Fee collection (${formattedCollected}) below expected today.`,
                type: 'FEE',
                priority: 'NORMAL',
                icon: '💰',
                actionUrl: '/fees/dashboard'
            });
        }
    }

    return notifications;
}

/**
 * Send critical automation failure alert
 * Called from other cron jobs when they fail
 */
export async function notifyAutomationFailure(schoolId, errorMessage) {
    const dateKey = getDateKey();

    const director = await prisma.director.findFirst({
        where: { schoolId },
        select: { userId: true }
    });

    if (!director) return null;

    return {
        userId: director.userId,
        ruleType: 'AUTOMATION_FAILURE',
        ruleKey: `automation_failure_${dateKey}_${Date.now()}`,
        title: '🚨 System Alert',
        message: `Automation failed: ${errorMessage.substring(0, 100)}`,
        type: 'GENERAL',
        priority: 'CRITICAL', // Bypasses quiet hours
        icon: '🚨',
        metadata: { error: errorMessage },
        actionUrl: '/admin/logs'
    };
}
