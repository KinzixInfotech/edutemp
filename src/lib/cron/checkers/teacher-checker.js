/**
 * Teacher Notification Checker
 * 
 * Checks conditions for teacher notifications:
 * - Attendance not started for assigned class
 * - Attendance auto-closed
 * - Marks entry pending
 * - Exam duty today
 * - Leave request pending too long
 */

import prisma from "@/lib/prisma";
import { getDateKey } from "../cron-notification-service";

/**
 * Check all teacher notification conditions
 */
export async function checkTeacherNotifications(schoolId) {
    const notifications = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = getDateKey(today);
    const currentHour = new Date().getHours();
    const currentMinutes = new Date().getMinutes();

    // Get attendance config
    const config = await prisma.attendanceConfig.findUnique({
        where: { schoolId }
    });

    if (!config) return notifications;

    // Get all teachers with their assigned sections
    const teachers = await prisma.teachingStaff.findMany({
        where: { schoolId },
        select: {
            userId: true,
            name: true,
            sectionsAssigned: {
                select: { id: true, name: true, classId: true, class: { select: { className: true } } }
            }
        }
    });

    // Get today's bulk attendance records
    const todaysBulkAttendance = await prisma.bulkAttendance.findMany({
        where: {
            schoolId,
            date: today
        },
        select: { sectionId: true, classId: true }
    });
    const markedSectionIds = new Set(todaysBulkAttendance.map(b => b.sectionId));

    // Parse auto-mark time (e.g., "10:00")
    const [autoHour, autoMin] = config.autoMarkTime.split(':').map(Number);
    const minutesBeforeAutoMark = (autoHour * 60 + autoMin) - (currentHour * 60 + currentMinutes);

    for (const teacher of teachers) {
        // 1. ATTENDANCE_NOT_STARTED - 15-30 min before auto-close
        if (minutesBeforeAutoMark > 15 && minutesBeforeAutoMark <= 30) {
            for (const section of teacher.sectionsAssigned) {
                if (!markedSectionIds.has(section.id)) {
                    notifications.push({
                        userId: teacher.userId,
                        ruleType: 'ATTENDANCE_NOT_STARTED',
                        ruleKey: `attendance_not_started_${dateKey}_${section.id}`,
                        title: '⏰ Attendance Reminder',
                        message: `Attendance not marked for ${section.class.className} - ${section.name}. Auto-close at ${config.autoMarkTime}.`,
                        type: 'ATTENDANCE',
                        priority: 'HIGH',
                        icon: '⏰',
                        actionUrl: '/attendance/mark'
                    });
                }
            }
        }
    }

    // 2. EXAM_DUTY_TODAY - Check exam hall invigilators
    const examDuties = await prisma.examHallInvigilator.findMany({
        where: {
            exam: {
                schoolId,
                startDate: { lte: today },
                endDate: { gte: today },
                status: 'SCHEDULED'
            }
        },
        include: {
            teacher: { select: { userId: true, name: true } },
            hall: { select: { name: true } },
            exam: {
                select: {
                    title: true,
                    subjects: {
                        where: { date: today },
                        select: { startTime: true, subject: { select: { subjectName: true } } }
                    }
                }
            }
        }
    });

    for (const duty of examDuties) {
        const subject = duty.exam.subjects[0];
        if (subject && currentHour < 9) { // Morning notification
            notifications.push({
                userId: duty.teacher.userId,
                ruleType: 'EXAM_DUTY_TODAY',
                ruleKey: `exam_duty_${dateKey}_${duty.id}`,
                title: '📋 Exam Duty Today',
                message: `You have exam duty for ${subject.subject.subjectName} at ${subject.startTime || '9:30 AM'} in ${duty.hall.name}.`,
                type: 'EXAM',
                priority: 'HIGH',
                icon: '📋',
                actionUrl: '/exams'
            });
        }
    }

    // 3. LEAVE_PENDING - Leave requests pending > 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pendingLeaves = await prisma.leaveRequest.findMany({
        where: {
            schoolId,
            status: 'PENDING',
            submittedAt: { lt: twentyFourHoursAgo }
        },
        select: {
            userId: true,
            leaveType: true,
            startDate: true,
            endDate: true,
            id: true
        }
    });

    for (const leave of pendingLeaves) {
        notifications.push({
            userId: leave.userId,
            ruleType: 'LEAVE_PENDING',
            ruleKey: `leave_pending_${dateKey}_${leave.id}`,
            title: '📝 Leave Request Pending',
            message: `Your ${leave.leaveType.toLowerCase()} leave request is still pending approval.`,
            type: 'LEAVE',
            priority: 'NORMAL',
            icon: '📝',
            actionUrl: '/leaves'
        });
    }

    return notifications;
}
