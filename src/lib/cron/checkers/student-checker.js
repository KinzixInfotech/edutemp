/**
 * Student Notification Checker
 * 
 * Checks conditions for student notifications:
 * - Marked absent today
 * - Marked late today
 * - Exam tomorrow
 */

import prisma from "@/lib/prisma";
import { getDateKey } from "../cron-notification-service";

/**
 * Check all student notification conditions
 */
export async function checkStudentNotifications(schoolId) {
    const notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(today);

    // 1. MARKED_ABSENT - Students marked absent today
    const absentAttendance = await prisma.attendance.findMany({
        where: {
            schoolId,
            date: today,
            status: 'ABSENT',
            user: { student: { isNot: null } }
        },
        select: {
            userId: true,
            markedAt: true
        }
    });

    // Only notify if marked within last 30 minutes (avoid duplicate notifications)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

    for (const record of absentAttendance) {
        if (record.markedAt >= thirtyMinsAgo) {
            notifications.push({
                userId: record.userId,
                ruleType: 'MARKED_ABSENT',
                ruleKey: `marked_absent_${dateKey}_${record.userId}`,
                title: '❌ Marked Absent',
                message: 'You were marked absent today.',
                type: 'ATTENDANCE',
                priority: 'NORMAL',
                icon: '❌',
                actionUrl: '/attendance'
            });
        }
    }

    // 2. MARKED_LATE - Students marked late today
    const lateAttendance = await prisma.attendance.findMany({
        where: {
            schoolId,
            date: today,
            status: 'LATE',
            user: { student: { isNot: null } }
        },
        select: {
            userId: true,
            markedAt: true,
            lateByMinutes: true
        }
    });

    for (const record of lateAttendance) {
        if (record.markedAt >= thirtyMinsAgo) {
            const lateMsg = record.lateByMinutes
                ? `You were marked late today (${record.lateByMinutes} minutes).`
                : 'You were marked late today.';

            notifications.push({
                userId: record.userId,
                ruleType: 'MARKED_LATE',
                ruleKey: `marked_late_${dateKey}_${record.userId}`,
                title: '⚠️ Marked Late',
                message: lateMsg,
                type: 'ATTENDANCE',
                priority: 'NORMAL',
                icon: '⚠️',
                actionUrl: '/attendance'
            });
        }
    }

    // 3. EXAM_TOMORROW - Exams scheduled for tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tomorrowExams = await prisma.examSubject.findMany({
        where: {
            date: {
                gte: tomorrow,
                lte: tomorrowEnd
            },
            exam: {
                schoolId,
                status: 'SCHEDULED'
            }
        },
        include: {
            exam: {
                select: {
                    title: true,
                    classes: { select: { id: true } }
                }
            },
            subject: { select: { subjectName: true } }
        }
    });

    // Get students in exam classes
    for (const examSubject of tomorrowExams) {
        const classIds = examSubject.exam.classes.map(c => c.id);

        if (classIds.length === 0) continue;

        const students = await prisma.student.findMany({
            where: {
                schoolId,
                classId: { in: classIds }
            },
            select: { userId: true }
        });

        for (const student of students) {
            notifications.push({
                userId: student.userId,
                ruleType: 'EXAM_TOMORROW',
                ruleKey: `exam_tomorrow_${getDateKey(tomorrow)}_${examSubject.id}_${student.userId}`,
                title: '📚 Exam Tomorrow',
                message: `Exam tomorrow: ${examSubject.subject.subjectName} at ${examSubject.startTime || '9:30 AM'}.`,
                type: 'EXAM',
                priority: 'HIGH',
                icon: '📚',
                actionUrl: '/exams'
            });
        }
    }

    return notifications;
}
