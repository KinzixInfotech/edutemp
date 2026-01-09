/**
 * Parent Notification Checker
 * 
 * Checks conditions for parent notifications:
 * - Child marked absent
 * - Child marked late  
 * - Fee due soon (3 days, 1 day)
 * - Fee overdue
 */

import prisma from "@/lib/prisma";
import { getDateKey } from "../cron-notification-service";

/**
 * Check all parent notification conditions
 */
export async function checkParentNotifications(schoolId) {
    const notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(today);
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Get all parent-student links
    const parentLinks = await prisma.studentParentLink.findMany({
        where: {
            student: { schoolId },
            isActive: true
        },
        select: {
            parentId: true,
            parent: { select: { userId: true, name: true } },
            student: {
                select: {
                    userId: true,
                    name: true,
                    classId: true
                }
            }
        }
    });

    // Create parent-student map
    const parentStudentMap = new Map();
    for (const link of parentLinks) {
        if (!parentStudentMap.has(link.parent.userId)) {
            parentStudentMap.set(link.parent.userId, []);
        }
        parentStudentMap.get(link.parent.userId).push({
            studentUserId: link.student.userId,
            studentName: link.student.name,
            classId: link.student.classId
        });
    }

    // 1. CHILD_ABSENT - Get today's absent students
    const absentAttendance = await prisma.attendance.findMany({
        where: {
            schoolId,
            date: today,
            status: 'ABSENT',
            user: { student: { isNot: null } }
        },
        select: { userId: true, markedAt: true }
    });

    for (const record of absentAttendance) {
        if (record.markedAt >= thirtyMinsAgo) {
            // Find parent(s) for this student
            for (const [parentUserId, students] of parentStudentMap) {
                const student = students.find(s => s.studentUserId === record.userId);
                if (student) {
                    notifications.push({
                        userId: parentUserId,
                        ruleType: 'CHILD_ABSENT',
                        ruleKey: `child_absent_${dateKey}_${record.userId}`,
                        title: '❌ Child Marked Absent',
                        message: `${student.studentName} was marked absent today.`,
                        type: 'ATTENDANCE',
                        priority: 'HIGH',
                        icon: '❌',
                        actionUrl: '/child/attendance'
                    });
                }
            }
        }
    }

    // 2. CHILD_LATE - Get today's late students
    const lateAttendance = await prisma.attendance.findMany({
        where: {
            schoolId,
            date: today,
            status: 'LATE',
            user: { student: { isNot: null } }
        },
        select: { userId: true, markedAt: true, lateByMinutes: true }
    });

    for (const record of lateAttendance) {
        if (record.markedAt >= thirtyMinsAgo) {
            for (const [parentUserId, students] of parentStudentMap) {
                const student = students.find(s => s.studentUserId === record.userId);
                if (student) {
                    const lateMsg = record.lateByMinutes
                        ? `${student.studentName} was marked late today (${record.lateByMinutes} mins).`
                        : `${student.studentName} was marked late today.`;

                    notifications.push({
                        userId: parentUserId,
                        ruleType: 'CHILD_LATE',
                        ruleKey: `child_late_${dateKey}_${record.userId}`,
                        title: '⚠️ Child Marked Late',
                        message: lateMsg,
                        type: 'ATTENDANCE',
                        priority: 'NORMAL',
                        icon: '⚠️',
                        actionUrl: '/child/attendance'
                    });
                }
            }
        }
    }

    // 3. FEE_DUE_SOON - Check installments due in 3 days or 1 day
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const upcomingInstallments = await prisma.studentFeeInstallment.findMany({
        where: {
            studentFee: { schoolId },
            status: { in: ['PENDING', 'PARTIAL'] },
            dueDate: {
                gte: today,
                lte: threeDaysFromNow
            }
        },
        select: {
            id: true,
            amount: true,
            paidAmount: true,
            dueDate: true,
            studentFee: {
                select: {
                    studentId: true,
                    student: { select: { name: true, userId: true } }
                }
            }
        }
    });

    for (const installment of upcomingInstallments) {
        const balance = installment.amount - installment.paidAmount;
        const dueDate = new Date(installment.dueDate);
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilDue === 3 || daysUntilDue === 1) {
            const studentUserId = installment.studentFee.student.userId;

            for (const [parentUserId, students] of parentStudentMap) {
                if (students.some(s => s.studentUserId === studentUserId)) {
                    notifications.push({
                        userId: parentUserId,
                        ruleType: 'FEE_DUE_SOON',
                        ruleKey: `fee_due_${daysUntilDue}d_${dateKey}_${installment.id}`,
                        title: '💰 Fee Payment Reminder',
                        message: `Fee ₹${balance.toLocaleString('en-IN')} due in ${daysUntilDue} day${daysUntilDue > 1 ? 's' : ''}.`,
                        type: 'FEE',
                        priority: 'HIGH',
                        icon: '💰',
                        actionUrl: '/fees'
                    });
                }
            }
        }
    }

    // 4. FEE_OVERDUE - Check overdue unpaid fees (once per day)
    const overdueInstallments = await prisma.studentFeeInstallment.findMany({
        where: {
            studentFee: { schoolId },
            status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
            dueDate: { lt: today },
            isOverdue: true
        },
        select: {
            id: true,
            amount: true,
            paidAmount: true,
            studentFee: {
                select: {
                    studentId: true,
                    student: { select: { name: true, userId: true } }
                }
            }
        }
    });

    for (const installment of overdueInstallments) {
        const balance = installment.amount - installment.paidAmount;
        const studentUserId = installment.studentFee.student.userId;

        for (const [parentUserId, students] of parentStudentMap) {
            if (students.some(s => s.studentUserId === studentUserId)) {
                notifications.push({
                    userId: parentUserId,
                    ruleType: 'FEE_OVERDUE',
                    ruleKey: `fee_overdue_${dateKey}_${installment.id}`,
                    title: '🚨 Fee Overdue',
                    message: `Fee ₹${balance.toLocaleString('en-IN')} is overdue. Please pay immediately.`,
                    type: 'FEE',
                    priority: 'HIGH',
                    icon: '🚨',
                    actionUrl: '/fees'
                });
            }
        }
    }

    return notifications;
}
