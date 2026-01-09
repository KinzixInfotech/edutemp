/**
 * Principal Notification Checker
 * 
 * Checks conditions for principal notifications:
 * - Attendance incomplete for classes
 * - Auto-absent executed
 * - Teachers not marked attendance
 * - Exams scheduled today
 */

import prisma from "@/lib/prisma";
import { getDateKey } from "../cron-notification-service";

/**
 * Check all principal notification conditions
 */
export async function checkPrincipalNotifications(schoolId) {
    const notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(today);
    const currentHour = new Date().getHours();

    // Get principal user
    const principal = await prisma.principal.findFirst({
        where: { schoolId },
        select: { userId: true }
    });

    if (!principal) return notifications;

    // Get attendance config
    const config = await prisma.attendanceConfig.findUnique({
        where: { schoolId }
    });

    // Get all classes
    const classes = await prisma.class.findMany({
        where: { schoolId },
        select: { id: true, className: true }
    });

    // Get today's bulk attendance
    const bulkAttendance = await prisma.bulkAttendance.findMany({
        where: { schoolId, date: today },
        select: { classId: true }
    });
    const markedClassIds = new Set(bulkAttendance.map(b => b.classId));

    // 1. ATTENDANCE_INCOMPLETE - 30 min before auto-close
    if (config) {
        const [autoHour, autoMin] = config.autoMarkTime.split(':').map(Number);
        const currentMinutes = currentHour * 60 + new Date().getMinutes();
        const autoMinutes = autoHour * 60 + autoMin;
        const minutesBefore = autoMinutes - currentMinutes;

        if (minutesBefore > 0 && minutesBefore <= 30) {
            const pendingClasses = classes.filter(c => !markedClassIds.has(c.id));

            if (pendingClasses.length > 0) {
                notifications.push({
                    userId: principal.userId,
                    ruleType: 'ATTENDANCE_INCOMPLETE',
                    ruleKey: `attendance_incomplete_${dateKey}`,
                    title: '⏰ Attendance Pending',
                    message: `Attendance pending for ${pendingClasses.length} class${pendingClasses.length > 1 ? 'es' : ''}.`,
                    type: 'ATTENDANCE',
                    priority: 'HIGH',
                    icon: '⏰',
                    metadata: { classNames: pendingClasses.map(c => c.className).join(', ') },
                    actionUrl: '/attendance/overview'
                });
            }
        }
    }

    // 2. TEACHERS_PENDING - Teachers who haven't checked in (once per day at 10 AM)
    if (currentHour === 10) {
        const teachersNotCheckedIn = await prisma.teachingStaff.findMany({
            where: {
                schoolId,
                user: {
                    attendance: {
                        none: {
                            date: today,
                            checkInTime: { not: null }
                        }
                    }
                }
            },
            select: { userId: true, name: true }
        });

        if (teachersNotCheckedIn.length > 0) {
            notifications.push({
                userId: principal.userId,
                ruleType: 'TEACHERS_PENDING',
                ruleKey: `teachers_pending_${dateKey}`,
                title: '👨‍🏫 Teacher Attendance',
                message: `${teachersNotCheckedIn.length} teacher${teachersNotCheckedIn.length > 1 ? 's have' : ' has'} not marked attendance.`,
                type: 'ATTENDANCE',
                priority: 'NORMAL',
                icon: '👨‍🏫',
                actionUrl: '/staff/attendance'
            });
        }
    }

    // 3. EXAM_DAY - Morning notification about today's exams
    if (currentHour >= 7 && currentHour < 9) {
        const todayExams = await prisma.examSubject.findMany({
            where: {
                date: today,
                exam: { schoolId, status: 'SCHEDULED' }
            },
            include: {
                exam: {
                    select: {
                        title: true,
                        classes: { select: { className: true } }
                    }
                },
                subject: { select: { subjectName: true } }
            }
        });

        if (todayExams.length > 0) {
            const classNames = [...new Set(todayExams.flatMap(e => e.exam.classes.map(c => c.className)))];

            notifications.push({
                userId: principal.userId,
                ruleType: 'EXAM_DAY',
                ruleKey: `exam_day_${dateKey}`,
                title: '📋 Exams Today',
                message: `Exams scheduled today for ${classNames.length} class${classNames.length > 1 ? 'es' : ''}.`,
                type: 'EXAM',
                priority: 'HIGH',
                icon: '📋',
                metadata: { classes: classNames.join(', ') },
                actionUrl: '/exams'
            });
        }
    }

    return notifications;
}
