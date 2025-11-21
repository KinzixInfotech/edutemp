// lib/notifications/notificationHelper.js
import prisma from "@/lib/prisma";

/**
 * Send notification to users
 * @param {Object} params - Notification parameters
 * @param {string} params.schoolId - School ID
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} params.type - Notification type (SYLLABUS, ASSIGNMENT, FEE, EXAM, GENERAL, etc.)
 * @param {string} params.priority - Priority level (LOW, NORMAL, HIGH, URGENT)
 * @param {Object} params.targetOptions - Targeting options
 * @param {string[]} params.targetOptions.userIds - Specific user IDs
 * @param {number[]} params.targetOptions.classIds - Class IDs
 * @param {number[]} params.targetOptions.sectionIds - Section IDs
 * @param {number[]} params.targetOptions.roleIds - Role IDs
 * @param {boolean} params.targetOptions.allUsers - Send to all school users
 * @param {string} params.senderId - Sender user ID
 * @param {Object} params.metadata - Additional metadata (optional)
 * @param {string} params.icon - Emoji icon for notification
 * @param {string} params.actionUrl - Deep link or action URL (optional)
 * @param {boolean} params.sendPush - Send push notification (default: true)
 * @returns {Promise<Object>} - Created notifications
 */
export async function sendNotification({
    schoolId,
    title,
    message,
    type = 'GENERAL',
    priority = 'NORMAL',
    targetOptions = {},
    senderId,
    metadata = {},
    icon = '📢',
    actionUrl = null,
    sendPush = true
}) {
    try {
        // Validate required fields
        if (!schoolId || !title || !message) {
            throw new Error('schoolId, title, and message are required');
        }

        // Get target user IDs based on targeting options
        const targetUserIds = await getTargetUserIds(schoolId, targetOptions);

        if (targetUserIds.length === 0) {
            console.warn('No target users found for notification');
            return { success: true, count: 0, notifications: [] };
        }

        // Create notifications for all target users
        const notifications = await prisma.notification.createMany({
            data: targetUserIds.map(userId => ({
                senderId: senderId || null,
                receiverId: userId,
                title,
                message,
                type,
                priority,
                icon,
                actionUrl,
                metadata: JSON.stringify(metadata),
                isRead: false,
                schoolId,
            }))
        });

        // Send push notifications if enabled
        if (sendPush) {
            await sendPushNotifications({
                userIds: targetUserIds,
                title,
                message,
                data: { type, actionUrl, ...metadata }
            });
        }

        return {
            success: true,
            count: notifications.count,
            targetUserIds
        };
    } catch (error) {
        console.error('Send notification error:', error);
        throw error;
    }
}

/**
 * Get target user IDs based on targeting options
 */
// async function getTargetUserIds(schoolId, targetOptions) {
//     const {
//         userIds = [],
//         classIds = [],
//         sectionIds = [],
//         roleIds = [],
//         roleNames = [], // NEW: Target by role names like ['Teacher', 'Student', 'Parent']
//         userTypes = [], // NEW: Target by user types ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN']
//         allUsers = false,
//         includeParents = false // NEW: Include parents of students
//     } = targetOptions;

//     const whereConditions = { schoolId, deletedAt: null, status: 'ACTIVE' };
//     const userIdSet = new Set(userIds);

//     // If specific user IDs provided, use them
//     if (userIds.length > 0) {
//         return Array.from(userIdSet);
//     }

//     // If all users flag is set
//     if (allUsers) {
//         const users = await prisma.user.findMany({
//             where: whereConditions,
//             select: { id: true }
//         });
//         return users.map(u => u.id);
//     }

//     // Build query conditions
//     const orConditions = [];

//     // Target by role IDs
//     if (roleIds.length > 0) {
//         orConditions.push({ roleId: { in: roleIds } });
//     }

//     // Target by role names (e.g., 'Teacher', 'Student', 'Admin')
//     if (roleNames.length > 0) {
//         const roles = await prisma.role.findMany({
//             where: { name: { in: roleNames } },
//             select: { id: true }
//         });
//         const foundRoleIds = roles.map(r => r.id);
//         if (foundRoleIds.length > 0) {
//             orConditions.push({ roleId: { in: foundRoleIds } });
//         }
//     }

//     // Target by user types (STUDENT, TEACHER, PARENT, etc.)
//     if (userTypes.length > 0) {
//         for (const userType of userTypes) {
//             switch (userType.toUpperCase()) {
//                 case 'TEACHER':
//                 case 'TEACHING_STAFF':
//                     const teachers = await prisma.teachingStaff.findMany({
//                         where: { schoolId },
//                         select: { userId: true }
//                     });
//                     teachers.forEach(t => userIdSet.add(t.userId));
//                     break;

//                 case 'STUDENT':
//                     const students = await prisma.student.findMany({
//                         where: { schoolId },
//                         select: { userId: true }
//                     });
//                     students.forEach(s => userIdSet.add(s.userId));
//                     break;

//                 case 'PARENT':
//                     const parents = await prisma.parent.findMany({
//                         where: { schoolId },
//                         select: { userId: true }
//                     });
//                     parents.forEach(p => userIdSet.add(p.userId));
//                     break;

//                 case 'ADMIN':
//                     const admins = await prisma.admin.findMany({
//                         where: { schoolId },
//                         select: { userId: true }
//                     });
//                     admins.forEach(a => userIdSet.add(a.userId));
//                     break;

//                 case 'NON_TEACHING_STAFF':
//                     const nonTeachingStaff = await prisma.nonTeachingStaff.findMany({
//                         where: { schoolId },
//                         select: { userId: true }
//                     });
//                     nonTeachingStaff.forEach(n => userIdSet.add(n.userId));
//                     break;
//             }
//         }
//     }

//     // Target by classes (get all students in these classes)
//     if (classIds.length > 0) {
//         const students = await prisma.student.findMany({
//             where: {
//                 schoolId,
//                 classId: { in: classIds }
//             },
//             select: { userId: true }
//         });
//         students.forEach(s => userIdSet.add(s.userId));

//         // Also get teachers of these classes if specified
//         const teachers = await prisma.class.findMany({
//             where: {
//                 schoolId,
//                 id: { in: classIds }
//             },
//             select: { 
//                 teachingStaffUserId: true,
//                 sections: {
//                     select: {
//                         teachingStaffUserId: true
//                     }
//                 }
//             }
//         });
//         teachers.forEach(cls => {
//             if (cls.teachingStaffUserId) {
//                 userIdSet.add(cls.teachingStaffUserId);
//             }
//             cls.sections.forEach(sec => {
//                 if (sec.teachingStaffUserId) {
//                     userIdSet.add(sec.teachingStaffUserId);
//                 }
//             });
//         });

//         // Include parents if requested
//         if (includeParents) {
//             const parentLinks = await prisma.studentParentLink.findMany({
//                 where: {
//                     student: {
//                         classId: { in: classIds },
//                         schoolId
//                     },
//                     isActive: true
//                 },
//                 select: {
//                     parent: {
//                         select: { userId: true }
//                     }
//                 }
//             });
//             parentLinks.forEach(link => userIdSet.add(link.parent.userId));
//         }
//     }

//     // Target by sections (get all students in these sections)
//     if (sectionIds.length > 0) {
//         const students = await prisma.student.findMany({
//             where: {
//                 schoolId,
//                 sectionId: { in: sectionIds }
//             },
//             select: { userId: true }
//         });
//         students.forEach(s => userIdSet.add(s.userId));

//         // Also get teachers of these sections
//         const sections = await prisma.section.findMany({
//             where: {
//                 schoolId,
//                 id: { in: sectionIds }
//             },
//             select: { teachingStaffUserId: true }
//         });
//         sections.forEach(sec => {
//             if (sec.teachingStaffUserId) {
//                 userIdSet.add(sec.teachingStaffUserId);
//             }
//         });

//         // Include parents if requested
//         if (includeParents) {
//             const parentLinks = await prisma.studentParentLink.findMany({
//                 where: {
//                     student: {
//                         sectionId: { in: sectionIds },
//                         schoolId
//                     },
//                     isActive: true
//                 },
//                 select: {
//                     parent: {
//                         select: { userId: true }
//                     }
//                 }
//             });
//             parentLinks.forEach(link => userIdSet.add(link.parent.userId));
//         }
//     }

//     // Get users by role conditions if specified
//     if (orConditions.length > 0) {
//         const users = await prisma.user.findMany({
//             where: {
//                 ...whereConditions,
//                 OR: orConditions
//             },
//             select: { id: true }
//         });
//         users.forEach(u => userIdSet.add(u.id));
//     }

//     return Array.from(userIdSet);
// }
async function getTargetUserIds(schoolId, targetOptions) {
    const {
        userIds = [],
        classIds = [],
        sectionIds = [],
        roleIds = [],
        roleNames = [],
        userTypes = [], // ['STUDENT', 'TEACHER', 'PARENT', 'ADMIN']
        allUsers = false,
        includeParents = false // Only when targeting students
    } = targetOptions;

    const userIdSet = new Set(userIds);
    const whereConditions = { schoolId, deletedAt: null, status: 'ACTIVE' };

    // 1. Direct user IDs
    if (userIds.length > 0) {
        return Array.from(userIdSet);
    }

    // 2. All users in school
    if (allUsers) {
        const users = await prisma.user.findMany({
            where: whereConditions,
            select: { id: true }
        });
        users.forEach(u => userIdSet.add(u.id));
        return Array.from(userIdSet);
    }

    // Helper: Check if we're exclusively targeting students
    const targetingOnlyStudents = userTypes.length === 1 && userTypes[0] === 'STUDENT';
    const targetingTeachers = userTypes.includes('TEACHER') || userTypes.includes('TEACHING_STAFF');
    const targetingParents = userTypes.includes('PARENT') || includeParents;

    // 3. Target by classIds
    if (classIds.length > 0) {
        // Always add students if class is targeted
        const students = await prisma.student.findMany({
            where: { schoolId, classId: { in: classIds } },
            select: { userId: true }
        });
        students.forEach(s => userIdSet.add(s.userId));

        // Only add teachers if NOT targeting only students
        if (!targetingOnlyStudents) {
            const classes = await prisma.class.findMany({
                where: { schoolId, id: { in: classIds } },
                select: {
                    teachingStaffUserId: true,
                    sections: {
                        select: { teachingStaffUserId: true }
                    }
                }
            });

            classes.forEach(cls => {
                if (cls.teachingStaffUserId) userIdSet.add(cls.teachingStaffUserId);
                cls.sections.forEach(sec => {
                    if (sec.teachingStaffUserId) userIdSet.add(sec.teachingStaffUserId);
                });
            });
        }

        // Add parents only if explicitly requested or targeting parents
        if (targetingParents || includeParents) {
            const parentLinks = await prisma.studentParentLink.findMany({
                where: {
                    student: {
                        classId: { in: classIds },
                        schoolId
                    },
                    isActive: true
                },
                select: {
                    parent: {
                        select: { userId: true }
                    }
                }
            });
            parentLinks.forEach(link => userIdSet.add(link.parent.userId));
        }
    }

    // 4. Target by sectionIds
    if (sectionIds.length > 0) {
        const students = await prisma.student.findMany({
            where: { schoolId, sectionId: { in: sectionIds } },
            select: { userId: true }
        });
        students.forEach(s => userIdSet.add(s.userId));

        if (!targetingOnlyStudents) {
            const sections = await prisma.section.findMany({
                where: {
                    schoolId,
                    id: { in: sectionIds }
                },
                select: { teachingStaffUserId: true }
            });
            sections.forEach(sec => {
                if (sec.teachingStaffUserId) userIdSet.add(sec.teachingStaffUserId);
            });
        }

        if (targetingParents || includeParents) {
            const parentLinks = await prisma.studentParentLink.findMany({
                where: {
                    student: {
                        sectionId: { in: sectionIds },
                        schoolId
                    },
                    isActive: true
                },
                select: {
                    parent: { select: { userId: true } }
                }
            });
            parentLinks.forEach(link => userIdSet.add(link.parent.userId));
        }
    }

    // 5. Target by userTypes (fallback if no class/section)
    if (userTypes.length > 0 && classIds.length === 0 && sectionIds.length === 0) {
        for (const type of userTypes) {
            switch (type.toUpperCase()) {
                case 'TEACHER':
                case 'TEACHING_STAFF':
                    const teachers = await prisma.teachingStaff.findMany({
                        where: { schoolId },
                        select: { userId: true }
                    });
                    teachers.forEach(t => userIdSet.add(t.userId));
                    break;

                case 'STUDENT':
                    const allStudents = await prisma.student.findMany({
                        where: { schoolId },
                        select: { userId: true }
                    });
                    allStudents.forEach(s => userIdSet.add(s.userId));
                    break;

                case 'PARENT':
                    const parents = await prisma.parent.findMany({
                        where: { schoolId },
                        select: { userId: true }
                    });
                    parents.forEach(p => userIdSet.add(p.userId));
                    break;

                case 'ADMIN':
                    const admins = await prisma.admin.findMany({
                        where: { schoolId },
                        select: { userId: true }
                    });
                    admins.forEach(a => userIdSet.add(a.userId));
                    break;
            }
        }
    }

    // 6. Role-based targeting
    const orConditions = [];
    if (roleIds.length > 0) orConditions.push({ roleId: { in: roleIds } });
    if (roleNames.length > 0) {
        const roles = await prisma.role.findMany({
            where: { name: { in: roleNames } },
            select: { id: true }
        });
        if (roles.length > 0) {
            orConditions.push({ roleId: { in: roles.map(r => r.id) } });
        }
    }

    if (orConditions.length > 0) {
        const users = await prisma.user.findMany({
            where: { ...whereConditions, OR: orConditions },
            select: { id: true }
        });
        users.forEach(u => userIdSet.add(u.id));
    }

    return Array.from(userIdSet);
}
/**
 * Send push notifications via FCM
 */
async function sendPushNotifications({ userIds, title, message, data = {} }) {
    try {
        // Get FCM tokens for users
        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds },
                fcmToken: { not: null }
            },
            select: { fcmToken: true }
        });

        const tokens = users.map(u => u.fcmToken).filter(Boolean);

        if (tokens.length === 0) {
            console.log('No FCM tokens found for push notification');
            return;
        }

        // Send to Firebase Cloud Messaging (implement based on your FCM setup)
        // This is a placeholder - implement based on your FCM configuration
        console.log(`Sending push notification to ${tokens.length} devices`);

        // Example FCM implementation (uncomment when FCM is configured):
        /*
        const admin = require('firebase-admin');
        await admin.messaging().sendMulticast({
            tokens,
            notification: { title, body: message },
            data
        });
        */
    } catch (error) {
        console.error('Push notification error:', error);
        // Don't throw error - push notification failure shouldn't break the flow
    }
}

/**
 * Shorthand functions for common notification types
 */

// NEW: Send notification only to teachers
export async function notifyTeachers({ schoolId, title, message, senderId, metadata = {}, actionUrl = null }) {
    return sendNotification({
        schoolId,
        title,
        message,
        type: 'GENERAL',
        priority: 'NORMAL',
        icon: '👨‍🏫',
        targetOptions: { userTypes: ['TEACHER'] }, // Only teachers
        senderId,
        metadata,
        actionUrl
    });
}

// Send syllabus notification to specific class teachers
export async function notifySyllabusToTeachers({ schoolId, classId, className, senderId, fileName }) {
    return sendNotification({
        schoolId,
        title: 'Syllabus Updated',
        message: `Syllabus for ${className} has been updated: ${fileName}`,
        type: 'SYLLABUS',
        icon: 'teacher',
        targetOptions: {
            classIds: [classId],
            userTypes: ['TEACHER']
        },
        senderId,
        actionUrl: `/syllabus/${classId}`
    });
}

// Send syllabus notification to students (original function)
export async function notifySyllabusUploaded({ schoolId, classId, className, senderId, fileName }) {
    return sendNotification({
        schoolId,
        title: 'New Syllabus Uploaded',
        message: `Syllabus for ${className} has been uploaded: ${fileName}`,
        type: 'SYLLABUS',
        icon: 'book',
        targetOptions: {
            classIds: [classId],
            userTypes: ['STUDENT'] // Teachers automatically excluded now
        },
        senderId,
        actionUrl: `/syllabus/${classId}`
    });
}
export async function notifySyllabusToClass({
    schoolId,
    classId,
    className,
    senderId,
    fileName = 'Syllabus document'
}) {
    const classIdNum = parseInt(classId);

    // 1. Notify Teachers
    await sendNotification({
        schoolId,
        title: 'Syllabus Updated',
        message: `Syllabus for ${className} has been updated: ${fileName}`,
        type: 'SYLLABUS',
        icon: 'teacher',
        senderId,
        actionUrl: `/syllabusview`,
        targetOptions: {
            classIds: [classIdNum],
            userTypes: ['TEACHER']
        }
    });

    // 2. Notify Students + ALL their active Parents
    await sendNotification({
        schoolId,
        title: 'New Syllabus Uploaded',
        message: `Syllabus for ${className} is now available: ${fileName}`,
        type: 'SYLLABUS',
        icon: 'book',
        senderId,
        actionUrl: `/syllabusview`,
        targetOptions: {
            classIds: [classIdNum],
            userTypes: ['STUDENT'],
            includeParents: true   // This brings in all linked parents
        }
    });
}
// Send to both students and parents
export async function notifySyllabusToStudentsAndParents({ schoolId, classId, className, senderId, fileName }) {
    return sendNotification({
        schoolId,
        title: 'New Syllabus Uploaded',
        message: `Syllabus for ${className} has been uploaded: ${fileName}`,
        type: 'SYLLABUS',
        priority: 'NORMAL',
        icon: '📚',
        targetOptions: {
            classIds: [classId],
            userTypes: ['STUDENT'],
            includeParents: true
        },
        senderId,
        metadata: { classId, fileName },
        actionUrl: `/syllabus/${classId}`
    });
}

export async function notifyAssignmentCreated({ schoolId, classId, sectionId, title, dueDate, senderId }) {
    return sendNotification({
        schoolId,
        title: 'New Assignment',
        message: `Assignment "${title}" has been created. Due date: ${new Date(dueDate).toLocaleDateString()}`,
        type: 'ASSIGNMENT',
        priority: 'HIGH',
        icon: '📝',
        targetOptions: { sectionIds: [sectionId] },
        senderId,
        metadata: { classId, sectionId, dueDate },
        actionUrl: `/assignments`
    });
}

export async function notifyFeeReminder({ schoolId, studentIds, amount, dueDate }) {
    return sendNotification({
        schoolId,
        title: 'Fee Payment Reminder',
        message: `Your fee payment of ₹${amount} is due on ${new Date(dueDate).toLocaleDateString()}`,
        type: 'FEE',
        priority: 'HIGH',
        icon: '💰',
        targetOptions: { userIds: studentIds },
        metadata: { amount, dueDate },
        actionUrl: '/fees'
    });
}

export async function notifyExamSchedule({ schoolId, classIds, examName, examDate, senderId }) {
    return sendNotification({
        schoolId,
        title: 'Exam Scheduled',
        message: `${examName} has been scheduled for ${new Date(examDate).toLocaleDateString()}`,
        type: 'EXAM',
        priority: 'URGENT',
        icon: '📋',
        targetOptions: { classIds },
        senderId,
        metadata: { examName, examDate },
        actionUrl: '/exams'
    });
}

export async function notifyAttendanceMarked({ schoolId, studentIds, date, status }) {
    return sendNotification({
        schoolId,
        title: 'Attendance Updated',
        message: `Your attendance has been marked as ${status} for ${new Date(date).toLocaleDateString()}`,
        type: 'ATTENDANCE',
        priority: 'NORMAL',
        icon: '✅',
        targetOptions: { userIds: studentIds },
        metadata: { date, status },
        actionUrl: '/attendance'
    });
}

export async function notifyNoticePublished({ schoolId, noticeTitle, targetOptions, senderId }) {
    return sendNotification({
        schoolId,
        title: 'New Notice',
        message: noticeTitle,
        type: 'NOTICE',
        priority: 'NORMAL',
        icon: '📌',
        targetOptions,
        senderId,
        actionUrl: '/notices'
    });
}

export async function notifyLeaveApproved({ schoolId, userId, leaveType, startDate, endDate }) {
    return sendNotification({
        schoolId,
        title: 'Leave Approved',
        message: `Your ${leaveType} leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()} has been approved`,
        type: 'LEAVE',
        priority: 'NORMAL',
        icon: '✅',
        targetOptions: { userIds: [userId] },
        metadata: { leaveType, startDate, endDate },
        actionUrl: '/leaves'
    });
}

// Add to lib/notifications/notificationHelper.js

/**
 * Notify homework assignment to students and parents
 */
export async function notifyHomeworkAssigned({
    schoolId,
    classId,
    sectionId,
    className,
    sectionName,
    title,
    subjectName,
    dueDate,
    senderId,
    teacherName
}) {
    const classIdNum = parseInt(classId);
    const sectionIdNum = sectionId ? parseInt(sectionId) : null;

    // Format due date
    const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Create message
    const targetText = sectionName
        ? `${className} - ${sectionName}`
        : className;

    const subjectText = subjectName ? ` (${subjectName})` : '';

    const message = `New homework assigned for ${targetText}${subjectText}. Due: ${dueDateFormatted}`;

    // Build target options
    const targetOptions = {
        classIds: [classIdNum],
        userTypes: ['STUDENT'],
        includeParents: true
    };

    if (sectionIdNum) {
        targetOptions.sectionIds = [sectionIdNum];
    }

    // Send notification
    await sendNotification({
        schoolId,
        title: `New Homework: ${title}`,
        message,
        type: 'ASSIGNMENT',
        priority: 'HIGH',
        icon: '📝',
        targetOptions,
        senderId,
        metadata: {
            classId,
            sectionId,
            title,
            subjectName,
            dueDate,
            teacherName
        },
        actionUrl: '/homework'
    });
}

/**
 * Notify homework due reminder
 */
export async function notifyHomeworkDueReminder({
    schoolId,
    homeworkId,
    studentIds,
    title,
    dueDate
}) {
    const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });

    const daysLeft = Math.ceil((new Date(dueDate) - new Date()) / (1000 * 60 * 60 * 24));

    let message = `Reminder: "${title}" is due on ${dueDateFormatted}`;
    if (daysLeft === 0) {
        message = `⚠️ "${title}" is due today!`;
    } else if (daysLeft === 1) {
        message = `⚠️ "${title}" is due tomorrow!`;
    } else if (daysLeft < 0) {
        message = `⚠️ "${title}" is overdue!`;
    }

    await sendNotification({
        schoolId,
        title: 'Homework Due Reminder',
        message,
        type: 'ASSIGNMENT',
        priority: daysLeft <= 1 ? 'URGENT' : 'HIGH',
        icon: '⏰',
        targetOptions: {
            userIds: studentIds,
            includeParents: true
        },
        metadata: { homeworkId, dueDate, daysLeft },
        actionUrl: `/homework/${homeworkId}`
    });
}

/**
 * Notify homework submission received
 */
export async function notifyHomeworkSubmitted({
    schoolId,
    teacherId,
    studentName,
    homeworkTitle,
    className
}) {
    await sendNotification({
        schoolId,
        title: 'Homework Submitted',
        message: `${studentName} from ${className} has submitted "${homeworkTitle}"`,
        type: 'ASSIGNMENT',
        priority: 'NORMAL',
        icon: '✅',
        targetOptions: { userIds: [teacherId] },
        metadata: { studentName, homeworkTitle, className },
        actionUrl: '/homework/submissions'
    });
}

/**
 * Notify homework evaluated
 */
export async function notifyHomeworkEvaluated({
    schoolId,
    studentId,
    homeworkTitle,
    grade,
    feedback
}) {
    const message = grade
        ? `Your homework "${homeworkTitle}" has been graded: ${grade}`
        : `Your homework "${homeworkTitle}" has been evaluated`;

    await sendNotification({
        schoolId,
        title: 'Homework Evaluated',
        message,
        type: 'ASSIGNMENT',
        priority: 'NORMAL',
        icon: '📊',
        targetOptions: {
            userIds: [studentId],
            includeParents: true
        },
        metadata: { homeworkTitle, grade, feedback },
        actionUrl: '/homework'
    });
}
// Export all notification types as enum
export const NOTIFICATION_TYPES = {
    GENERAL: 'GENERAL',
    SYLLABUS: 'SYLLABUS',
    ASSIGNMENT: 'ASSIGNMENT',
    FEE: 'FEE',
    EXAM: 'EXAM',
    ATTENDANCE: 'ATTENDANCE',
    NOTICE: 'NOTICE',
    LEAVE: 'LEAVE',
    TRANSPORT: 'TRANSPORT',
    LIBRARY: 'LIBRARY',
    ADMISSION: 'ADMISSION',
    EVENT: 'EVENT',
};

export const NOTIFICATION_PRIORITIES = {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT',
};