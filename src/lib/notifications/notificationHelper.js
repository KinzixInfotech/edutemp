
// lib/notifications/notificationHelper.js
import prisma from "@/lib/prisma";
import { messaging } from "@/lib/firebase-admin";
import { Client } from "@upstash/qstash";

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

// Initialize QStash client
// Fallback to fetch if SDK fails or env vars missing
let qstashClient;
try {
    if (process.env.QSTASH_URL && process.env.QSTASH_TOKEN) {
        qstashClient = new Client({
            baseUrl: "https://qstash-us-east-1.upstash.io",
            token: process.env.QSTASH_TOKEN,
        });
    }
} catch (e) {
    console.warn("QStash client init failed", e);
}

/**
 * Enqueue notification job to background worker
 */
export async function enqueueNotificationJob(payload) {
    try {
        const baseUrl = process.env.APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.edubreezy.com');
        const workerUrl = `${baseUrl}/api/workers/notification`;

        console.log('[Notification] Enqueuing job to:', workerUrl);

        // Don't send localhost URLs to QStash cloud (it can't reach them)
        const isLocal = workerUrl.includes('localhost') || workerUrl.includes('127.0.0.1');

        if (qstashClient && !isLocal) {
            await qstashClient.publishJSON({
                url: workerUrl,
                body: payload,
                retries: 2,
            });
        } else {
            // Fallback: Post directly if QStash not configured or using localhost
            console.log('[Notification] Direct worker call (async)', isLocal ? '[Localhost Detected]' : '[No QStash]');
            fetch(workerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.error('Direct worker call failed', e));
        }

        return { success: true, queued: true };
    } catch (error) {
        console.error('Failed to enqueue notification job:', error);
        // Fallback: Run inline if queue fails (safety net)
        console.log('[Notification] Falling back to inline processing');
        return processNotificationJob(payload);
    }
}

/**
 * Enqueue a delayed retry job with exponential backoff
 * @param {Object} payload - Retry job payload
 * @param {number} attempt - Current attempt number (1, 2, 3...)
 * @param {number} maxAttempts - Maximum retry attempts (default: 3)
 */
export async function enqueueDelayedRetry(payload, attempt = 1, maxAttempts = 3) {
    if (attempt > maxAttempts) {
        console.log(`[Retry] Max attempts (${maxAttempts}) reached, giving up on retry`);
        return { success: false, reason: 'max_attempts_reached' };
    }

    try {
        const baseUrl = process.env.APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://www.edubreezy.com');
        const workerUrl = `${baseUrl}/api/workers/notification`;

        // Exponential backoff: 30s, 2min, 8min
        const delaySeconds = Math.pow(4, attempt - 1) * 30; // 30, 120, 480 seconds

        console.log(`[Retry] Scheduling retry attempt ${attempt}/${maxAttempts} with ${delaySeconds}s delay`);

        const isLocal = workerUrl.includes('localhost') || workerUrl.includes('127.0.0.1');

        if (qstashClient && !isLocal) {
            await qstashClient.publishJSON({
                url: workerUrl,
                body: {
                    ...payload,
                    retryAttempt: attempt,
                    maxAttempts
                },
                delay: delaySeconds, // QStash delay in seconds
                retries: 1,
            });
            console.log(`[Retry] ✅ Queued retry ${attempt} with ${delaySeconds}s delay`);
        } else {
            // For localhost, use setTimeout (won't survive server restart)
            console.log(`[Retry] Using setTimeout for local retry (${delaySeconds}s)`);
            setTimeout(() => {
                fetch(workerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, retryAttempt: attempt, maxAttempts })
                }).catch(e => console.error('[Retry] Local retry failed', e));
            }, delaySeconds * 1000);
        }

        return { success: true, scheduled: true, attempt, delaySeconds };
    } catch (error) {
        console.error('[Retry] Failed to schedule retry:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send notification to users (Wrapper)
 * Validates inputs and enqueues background job
 */
export async function sendNotification(params) {
    try {
        // Validate required fields
        if (!params.schoolId || !params.title || !params.message) {
            throw new Error('schoolId, title, and message are required');
        }

        // Enqueue the heavy lifting
        return enqueueNotificationJob(params);
    } catch (error) {
        console.error('Send notification error:', error);
        throw error;
    }
}

/**
 * Process notification job (Worker Logic)
 * Contains the original heavy DB and FCM logic
 */
export async function processNotificationJob({
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
    imageUrl = null,
    sendPush = true,
    jobType = null, // New field to distinguish job types
    ...otherParams // catch-all for bulk params
}) {
    // DISPATCHER: Handle different job types
    if (jobType === 'BULK_ATTENDANCE') {
        return processBulkAttendanceJob({ ...otherParams, jobType });
    }

    if (jobType === 'HPC_ASSESSMENT') {
        return processHPCAssessmentJob({ ...otherParams, jobType });
    }

    if (jobType === 'PUSH_RETRY') {
        return processPushRetryJob({ ...otherParams, jobType });
    }

    // STANDARD NOTIFICATION LOGIC
    console.log(`[Worker] Processing notification: "${title}" for school ${schoolId}`);
    try {
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
                imageUrl,
                data: {
                    type,
                    actionUrl,
                    imageUrl,
                    senderId: senderId || null, // Include sender for self-broadcast detection
                    ...metadata
                }
            });
        }

        return {
            success: true,
            count: notifications.count,
            targetUserIds
        };

    } catch (error) {
        console.error('[Worker] Process notification error:', error);
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
                    // Query User table directly for ADMIN role
                    const admins = await prisma.user.findMany({
                        where: {
                            schoolId,
                            role: { name: 'ADMIN' }
                        },
                        select: { id: true }
                    });
                    admins.forEach(a => userIdSet.add(a.id));
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
 * @param {Object} params
 * @param {string[]} params.userIds - User IDs to send to
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification body
 * @param {string} params.imageUrl - Optional image URL (must be HTTPS and publicly accessible)
 * @param {Object} params.data - Additional data payload
 * @param {number} params.retryAttempt - Current retry attempt (0 = first try)
 * @param {number} params.maxAttempts - Max retry attempts
 */
async function sendPushNotifications({
    userIds,
    title,
    message,
    imageUrl = null,
    data = {},
    retryAttempt = 0,
    maxAttempts = 3
}) {
    try {
        // Get FCM tokens for users
        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds },
                fcmToken: { not: null }
            },
            select: { id: true, fcmToken: true }
        });

        const validUsers = users.filter(u => u.fcmToken);
        const tokens = validUsers.map(u => u.fcmToken);

        if (tokens.length === 0) {
            console.log('No FCM tokens found for push notification');
            return { success: true, sent: 0, failed: 0 };
        }

        // Sanitize data (FCM requires all values to be strings)
        const stringifiedData = Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined) {
                acc[key] = String(value);
            }
            return acc;
        }, {
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            title, // Add title to data
            body: message // Add body to data
        });

        // Send to Firebase Cloud Messaging
        const attemptLabel = retryAttempt > 0 ? ` (Retry ${retryAttempt})` : '';
        console.log(`[Push${attemptLabel}] Sending to ${tokens.length} devices`);
        console.log(`[Push] Targeting User IDs:`, validUsers.map(u => u.id));

        // Build FCM message with optional image support
        const fcmMessage = {
            tokens,
            notification: {
                title,
                body: message,
                ...(imageUrl && { image: imageUrl }),
            },
            data: stringifiedData,
            android: {
                notification: {
                    channelId: 'default',
                    priority: 'high',
                    ...(imageUrl && { image: imageUrl }),
                },
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        contentAvailable: true,
                        'mutable-content': 1,
                    },
                },
                ...(imageUrl && {
                    fcm_options: {
                        image: imageUrl,
                    },
                }),
            },
        };

        const response = await messaging.sendEachForMulticast(fcmMessage);

        console.log(`[Push${attemptLabel}] Sent: ${response.successCount}, Failed: ${response.failureCount}`);

        // Track failures by type
        const invalidTokenUserIds = [];  // Invalid/expired tokens - cleanup
        const retryableUserIds = [];      // Temporary failures - retry

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const userId = validUsers[idx].id;
                    const errorCode = resp.error?.code;
                    const errorMsg = resp.error?.message;

                    console.error(`[Push] Failed for user ${userId}:`, errorCode || errorMsg);

                    // Categorize the failure
                    if (errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token' ||
                        errorMsg?.includes('NotRegistered')) {
                        // Invalid token - needs cleanup, don't retry
                        invalidTokenUserIds.push(userId);
                    } else if (
                        errorCode === 'messaging/internal-error' ||
                        errorCode === 'messaging/server-unavailable' ||
                        errorCode === 'messaging/quota-exceeded' ||
                        errorCode === 'messaging/too-many-requests' ||
                        errorMsg?.includes('timeout') ||
                        errorMsg?.includes('network')
                    ) {
                        // Temporary failure - can retry
                        retryableUserIds.push(userId);
                    }
                    // Other errors (invalid payload, etc.) - don't retry
                }
            });

            // Cleanup invalid tokens
            if (invalidTokenUserIds.length > 0) {
                console.log(`[Push] Cleaning up ${invalidTokenUserIds.length} invalid tokens`);
                await prisma.user.updateMany({
                    where: { id: { in: invalidTokenUserIds } },
                    data: { fcmToken: null }
                });
            }

            // Queue retry for temporary failures (if not maxed out)
            if (retryableUserIds.length > 0 && retryAttempt < maxAttempts) {
                console.log(`[Push] Queueing retry for ${retryableUserIds.length} failed users`);

                await enqueueDelayedRetry({
                    jobType: 'PUSH_RETRY',
                    userIds: retryableUserIds,
                    title,
                    message,
                    imageUrl,
                    data
                }, retryAttempt + 1, maxAttempts);
            } else if (retryableUserIds.length > 0) {
                console.log(`[Push] Max retries reached, ${retryableUserIds.length} users will not receive push`);
            }
        }

        return {
            success: true,
            sent: response.successCount,
            failed: response.failureCount,
            invalidTokens: invalidTokenUserIds.length,
            retryQueued: retryableUserIds.length
        };

    } catch (error) {
        console.error('[Push] Error:', error);

        // Queue retry on total failure (if not maxed out)
        if (retryAttempt < maxAttempts) {
            console.log(`[Push] Total failure, queueing retry for all ${userIds.length} users`);
            await enqueueDelayedRetry({
                jobType: 'PUSH_RETRY',
                userIds,
                title,
                message,
                imageUrl,
                data
            }, retryAttempt + 1, maxAttempts);
        }

        return { success: false, error: error.message };
    }
}

/**
 * Process push notification retry job
 * Called by background worker for retry attempts
 */
async function processPushRetryJob({
    userIds,
    title,
    message,
    imageUrl,
    data,
    retryAttempt = 1,
    maxAttempts = 3
}) {
    console.log(`[Worker] Processing PUSH_RETRY for ${userIds?.length || 0} users (attempt ${retryAttempt}/${maxAttempts})`);

    if (!userIds || userIds.length === 0) {
        return { success: true, message: 'No users to retry' };
    }

    return sendPushNotifications({
        userIds,
        title,
        message,
        imageUrl,
        data,
        retryAttempt,
        maxAttempts
    });
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

export async function notifyNoticePublished({ schoolId, noticeTitle, targetOptions, senderId, imageUrl = null }) {
    return sendNotification({
        schoolId,
        title: 'New Notice',
        message: noticeTitle,
        type: 'NOTICE',
        priority: 'NORMAL',
        icon: '📌',
        targetOptions,
        senderId,
        imageUrl,
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

/**
 * Notify Admin, Principal, Director when a new leave request is created
 */
export async function notifyLeaveRequestCreated({
    schoolId,
    userId,
    userName,
    leaveType,
    startDate,
    endDate,
    totalDays,
    senderId
}) {
    const startFormatted = new Date(startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short'
    });
    const endFormatted = new Date(endDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });

    return sendNotification({
        schoolId,
        title: 'New Leave Request',
        message: `${userName} has requested ${leaveType.toLowerCase()} leave (${totalDays} days) from ${startFormatted} to ${endFormatted}`,
        type: 'LEAVE',
        priority: 'HIGH',
        icon: '📝',
        targetOptions: {
            roleNames: ['ADMIN', 'PRINCIPAL', 'DIRECTOR']
        },
        senderId,
        metadata: {
            userId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            requestType: 'LEAVE_REQUEST'
        },
        actionUrl: '/leave-management'
    });
}

/**
 * Notify Admin, Principal, Director when a new regularization request is created
 */
export async function notifyRegularizationRequestCreated({
    schoolId,
    userId,
    userName,
    date,
    requestedStatus,
    reason,
    senderId
}) {
    const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });

    return sendNotification({
        schoolId,
        title: 'Attendance Regularization Request',
        message: `${userName} has requested attendance regularization for ${dateFormatted} (${requestedStatus.toLowerCase()})`,
        type: 'ATTENDANCE',
        priority: 'HIGH',
        icon: '🔄',
        targetOptions: {
            roleNames: ['ADMIN', 'PRINCIPAL', 'DIRECTOR']
        },
        senderId,
        metadata: {
            userId,
            date,
            requestedStatus,
            reason,
            requestType: 'REGULARIZATION_REQUEST'
        },
        actionUrl: '/regularization'
    });
}

/**
 * Notify user when their leave request is rejected
 */
export async function notifyLeaveRejected({
    schoolId,
    userId,
    leaveType,
    startDate,
    endDate,
    reason
}) {
    return sendNotification({
        schoolId,
        title: 'Leave Request Rejected',
        message: `Your ${leaveType.toLowerCase()} leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()} has been rejected${reason ? `: ${reason}` : ''}`,
        type: 'LEAVE',
        priority: 'HIGH',
        icon: '❌',
        targetOptions: { userIds: [userId] },
        metadata: { leaveType, startDate, endDate, reason },
        actionUrl: '/leaves'
    });
}

/**
 * Notify teacher when their regularization request is approved
 */
export async function notifyRegularizationApproved({
    schoolId,
    userId,
    date,
    status,
    remarks
}) {
    const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });

    return sendNotification({
        schoolId,
        title: 'Regularization Approved ✅',
        message: `Your attendance regularization for ${dateFormatted} has been approved${remarks ? `. Remarks: ${remarks}` : ''}`,
        type: 'ATTENDANCE',
        priority: 'NORMAL',
        icon: '✅',
        targetOptions: { userIds: [userId] },
        metadata: { date, status, remarks },
        actionUrl: '/attendance'
    });
}

/**
 * Notify teacher when their regularization request is rejected
 */
export async function notifyRegularizationRejected({
    schoolId,
    userId,
    date,
    reason
}) {
    const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    });

    return sendNotification({
        schoolId,
        title: 'Regularization Rejected',
        message: `Your attendance regularization for ${dateFormatted} has been rejected${reason ? `: ${reason}` : ''}`,
        type: 'ATTENDANCE',
        priority: 'HIGH',
        icon: '❌',
        targetOptions: { userIds: [userId] },
        metadata: { date, reason },
        actionUrl: '/attendance'
    });
}

/**
 * Notify teacher when assigned as an evaluator
 */
export async function notifyEvaluatorAssigned({
    schoolId,
    teacherId,
    examTitle,
    subjectName,
    className,
    examId,
    senderId
}) {
    await sendNotification({
        schoolId,
        title: 'New Evaluator Assignment',
        message: `You have been assigned to evaluate ${subjectName} for ${className} in "${examTitle}". Check in teacher portal: https://teacher.edubreezy.com/`,
        type: 'EXAM',
        priority: 'HIGH',
        icon: '📝',
        targetOptions: {
            userIds: [teacherId]
        },
        senderId,
        metadata: {
            examId,
            examTitle,
            subjectName,
            className,
            assignmentType: 'EVALUATOR'
        },
        actionUrl: 'https://teacher.edubreezy.com/'
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

export async function notifyInvigilatorAssigned({ schoolId, teacherId, examName, date, hallName, senderId }) {
    return sendNotification({
        schoolId,
        title: 'Invigilation Duty Assigned',
        message: `You have been assigned as invigilator for ${examName} on ${new Date(date).toLocaleDateString()} in ${hallName}.`,
        type: 'EXAM_DUTY',
        priority: 'HIGH',
        icon: '👀',
        targetOptions: { userIds: [teacherId] },
        senderId,
        metadata: { examName, date, hallName },
        actionUrl: '/teacher-portal/exams/invigilation'
    });
}

/**
 * Notify parents and students when an offline exam is published
 */
export async function notifyExamPublished({ schoolId, examId, examTitle, startDate, classIds, senderId }) {
    const formattedDate = new Date(startDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const message = `The exam schedule for "${examTitle}" (starting ${formattedDate}) has been published. Please check the timetable.`;

    // Target students of these classes + their parents
    return sendNotification({
        schoolId,
        title: 'Exam Schedule Published',
        message,
        type: 'EXAM',
        priority: 'HIGH',
        icon: '📅',
        targetOptions: {
            classIds: classIds.map(id => parseInt(id)),
            userTypes: ['STUDENT'],
            includeParents: true // FETCH parents too
        },
        senderId,
        metadata: {
            examId,
            examTitle,
            startDate,
            type: 'EXAM_PUBLISHED'
        },
        actionUrl: `/exams/${examId}`
    });
}

/**
 * Notify admins about a new form submission
 */
export async function notifyFormSubmission({
    schoolId,
    formTitle,
    applicantName,
    submissionId,
    formId
}) {
    return sendNotification({
        schoolId,
        title: 'New Form Submission',
        message: `${applicantName} has submitted "${formTitle}"`,
        type: 'GENERAL',
        priority: 'NORMAL',
        icon: '📝',
        targetOptions: {
            roleNames: ['ADMIN']
        },
        metadata: {
            submissionId,
            formId,
            formTitle,
            applicantName,
            actionUrl: `/dashboard/forms/${formId}/submissions`
        },
        actionUrl: `/dashboard/forms/${formId}/submissions`
    });
}

/**
 * OPTIMIZED: Notify students and parents when attendance is marked
 * Uses batching, parallel processing, and non-blocking execution
 * 
 * @param {Object} params
 * @param {string} params.schoolId - School ID
 * @param {Array} params.attendanceRecords - Array of { userId, status, studentName }
 * @param {string} params.date - Attendance date
 * @param {string} params.markedBy - Teacher user ID
 * @param {string} params.className - Class name for notification
 */
export async function processBulkAttendanceJob({
    schoolId,
    attendanceRecords,
    date,
    markedBy,
    className = ''
}) {
    try {
        console.log(`[Worker] Starting Bulk Attendance for ${attendanceRecords.length} students...`);
        const startTime = Date.now();

        if (!attendanceRecords || attendanceRecords.length === 0) {
            return;
        }

        const dateFormatted = new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        // OPTIMIZATION 1: Batch fetch all parent links in ONE query
        const studentUserIds = attendanceRecords.map(r => r.userId);

        const [parentLinks, studentInfo] = await Promise.all([
            prisma.studentParentLink.findMany({
                where: {
                    student: {
                        userId: { in: studentUserIds },
                        schoolId
                    },
                    isActive: true
                },
                select: {
                    student: {
                        select: { userId: true, name: true }
                    },
                    parent: {
                        select: { userId: true }
                    }
                }
            }),
            prisma.student.findMany({
                where: {
                    userId: { in: studentUserIds },
                    schoolId
                },
                select: {
                    userId: true,
                    name: true
                }
            })
        ]);

        // Build student name map
        const studentNameMap = new Map();
        studentInfo.forEach(s => studentNameMap.set(s.userId, s.name));

        // Build parent-student relationship map
        const studentToParents = new Map();
        parentLinks.forEach(link => {
            const studentId = link.student.userId;
            if (!studentToParents.has(studentId)) {
                studentToParents.set(studentId, []);
            }
            studentToParents.get(studentId).push(link.parent.userId);
        });

        // OPTIMIZATION 2: Group records by status for batch processing
        const recordsByStatus = attendanceRecords.reduce((acc, record) => {
            const status = record.status;
            if (!acc[status]) acc[status] = [];
            acc[status].push({
                ...record,
                studentName: record.studentName || studentNameMap.get(record.userId) || 'Student'
            });
            return acc;
        }, {});

        // OPTIMIZATION 3: Prepare all notifications in memory first
        const allNotifications = [];
        const allPushTargets = [];

        for (const [status, records] of Object.entries(recordsByStatus)) {
            for (const record of records) {
                const statusEmoji = status === 'PRESENT' ? '✅' : status === 'ABSENT' ? '❌' : '⏰';
                const statusText = status === 'PRESENT' ? 'present' : status === 'ABSENT' ? 'absent' : 'late';

                // Student notification
                allNotifications.push({
                    senderId: markedBy,
                    receiverId: record.userId,
                    title: `Attendance Marked ${statusEmoji}`,
                    message: `You have been marked ${statusText} for ${dateFormatted}${className ? ` in ${className}` : ''}`,
                    type: 'ATTENDANCE',
                    priority: status === 'ABSENT' ? 'HIGH' : 'NORMAL',
                    icon: statusEmoji,
                    actionUrl: '/attendance',
                    metadata: JSON.stringify({ status, date }),
                    isRead: false,
                    schoolId
                });
                allPushTargets.push(record.userId);

                // Parent notifications (if any linked)
                const parentIds = studentToParents.get(record.userId) || [];
                for (const parentId of parentIds) {
                    allNotifications.push({
                        senderId: markedBy,
                        receiverId: parentId,
                        title: `Attendance: ${record.studentName} ${statusEmoji}`,
                        message: `${record.studentName} was marked ${statusText} on ${dateFormatted}`,
                        type: 'ATTENDANCE',
                        priority: status === 'ABSENT' ? 'HIGH' : 'NORMAL',
                        icon: statusEmoji,
                        actionUrl: '/child/attendance',
                        metadata: JSON.stringify({ status, date, studentId: record.userId }),
                        isRead: false,
                        schoolId
                    });
                    allPushTargets.push(parentId);
                }
            }
        }

        // OPTIMIZATION 4: Batch insert notifications (chunks of 100)
        const BATCH_SIZE = 100;
        const notificationBatches = [];
        for (let i = 0; i < allNotifications.length; i += BATCH_SIZE) {
            notificationBatches.push(allNotifications.slice(i, i + BATCH_SIZE));
        }

        // Insert all batches in parallel
        await Promise.allSettled(
            notificationBatches.map(batch =>
                prisma.notification.createMany({ data: batch })
                    .catch(err => console.error('[Attendance Notification] Batch insert error:', err))
            )
        );

        console.log(`[Worker] Created ${allNotifications.length} notifications`);

        // OPTIMIZATION 5: Send push notifications in background (non-blocking)
        const uniquePushTargets = [...new Set(allPushTargets)];

        // Batch push notifications too
        const pushBatches = [];
        for (let i = 0; i < uniquePushTargets.length; i += 500) {
            pushBatches.push(uniquePushTargets.slice(i, i + 500));
        }

        // Process push batches with Promise.allSettled for resilience
        for (const batch of pushBatches) {
            sendPushNotificationsOptimized({
                userIds: batch,
                title: 'Attendance Update',
                message: `Attendance has been marked for ${dateFormatted}`,
                data: { type: 'ATTENDANCE', date }
            }).catch(err => console.error('[Attendance Push] Error:', err));
        }

        const duration = Date.now() - startTime;
        console.log(`[Worker] Completed Bulk Attendance in ${duration}ms`);
        return { success: true, count: allNotifications.length };

    } catch (error) {
        console.error('[Worker] Bulk attendance error:', error);
        throw error;
    }
}

/**
 * OPTIMIZED: Notify students and parents when attendance is marked
 * Uses background queue
 */
export async function notifyBulkAttendanceMarked(params) {
    // Wrap params in a job object to distinguish from standard notifications
    return enqueueNotificationJob({
        jobType: 'BULK_ATTENDANCE',
        ...params
    });
}

/**
 * Optimized push notification sender with connection pooling
 */
async function sendPushNotificationsOptimized({ userIds, title, message, data = {} }) {
    try {
        // Fetch FCM tokens in bulk
        const users = await prisma.user.findMany({
            where: {
                id: { in: userIds },
                fcmToken: { not: null }
            },
            select: { id: true, fcmToken: true }
        });

        const validUsers = users.filter(u => u.fcmToken);
        if (validUsers.length === 0) return;

        const tokens = validUsers.map(u => u.fcmToken);

        // Sanitize data
        const stringifiedData = Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined) {
                acc[key] = String(value);
            }
            return acc;
        }, { click_action: 'FLUTTER_NOTIFICATION_CLICK', title, body: message });

        // Send multicast (more efficient than individual sends)
        const response = await messaging.sendEachForMulticast({
            tokens,
            notification: { title, body: message },
            data: stringifiedData,
            android: { notification: { channelId: 'default', priority: 'high' } },
            apns: { payload: { aps: { sound: 'default', contentAvailable: true } } }
        });

        console.log(`[Push] Sent to ${response.successCount}/${tokens.length} devices`);

        // Cleanup invalid tokens in background
        if (response.failureCount > 0) {
            const invalidUserIds = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const errorCode = resp.error?.code;
                    if (errorCode === 'messaging/registration-token-not-registered' ||
                        errorCode === 'messaging/invalid-registration-token') {
                        invalidUserIds.push(validUsers[idx].id);
                    }
                }
            });

            if (invalidUserIds.length > 0) {
                prisma.user.updateMany({
                    where: { id: { in: invalidUserIds } },
                    data: { fcmToken: null }
                }).catch(e => console.error('[Push] Token cleanup error:', e));
            }
        }
    } catch (error) {
        console.error('[Push Optimized] Error:', error);
    }
}

/**
 * Notify Admin and Librarian when a book is requested
 */
export async function notifyBookRequested({
    schoolId,
    userName,
    bookTitle,
    userType,
    senderId,
    parentName
}) {
    let message = `${userName} (${userType.toLowerCase()}) requested "${bookTitle}"`;

    if (parentName) {
        message = `${parentName} requested "${bookTitle}" for ${userName} (${userType.toLowerCase()})`;
    }

    return sendNotification({
        schoolId,
        title: 'New Book Request',
        message,
        type: 'LIBRARY',
        priority: 'NORMAL',
        icon: '📚',
        targetOptions: {
            roleNames: ['ADMIN', 'LIBRARIAN']
        },
        senderId,
        metadata: {
            bookTitle,
            userName,
            userType,
            parentName,
            requestType: 'BOOK_REQUEST'
        },
        actionUrl: '/library/requests'
    });
}

/**
 * Notify parents when bus trip starts
 * @param {string} schoolId - School ID
 * @param {string} tripId - Trip ID
 * @param {string} vehicleId - Vehicle ID
 * @param {string} routeName - Route name
 * @param {string} tripType - PICKUP or DROP
 * @param {string} licensePlate - Vehicle license plate
 */
export async function notifyTripStarted({
    schoolId,
    tripId,
    routeId,
    vehicleId,
    routeName,
    tripType,
    licensePlate
}) {
    try {
        console.log(`[Trip Start] Starting notification for tripId: ${tripId}, routeId: ${routeId}`);

        // Get all students assigned to this route
        const students = await prisma.studentRouteAssignment.findMany({
            where: {
                routeId
            },
            include: {
                student: {
                    include: {
                        studentParentLinks: {
                            where: { isActive: true },
                            include: {
                                parent: {
                                    select: { userId: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        console.log(`[Trip Start] Found ${students.length} student assignments for vehicle ${vehicleId}`);

        // Extract unique parent user IDs
        const parentIds = new Set();
        students.forEach(assignment => {
            console.log(`[Trip Start] Student: ${assignment.student?.id}, parentLinks: ${assignment.student?.studentParentLinks?.length || 0}`);
            assignment.student.studentParentLinks.forEach(link => {
                if (link.parent?.userId) {
                    parentIds.add(link.parent.userId);
                }
            });
        });

        if (parentIds.size === 0) {
            console.log('[Trip Start] No parents found to notify - check if students are assigned to vehicle and have active parent links');
            return;
        }

        const tripTypeText = tripType === 'PICKUP' ? 'Pick-up' : 'Drop';

        console.log(`[Trip Start] Sending notification to ${parentIds.size} parents: ${Array.from(parentIds).join(', ')}`);

        await sendNotification({
            schoolId,
            title: `🚌 Bus ${tripTypeText} Started`,
            message: `${licensePlate} (${routeName}) has started the ${tripTypeText.toLowerCase()} trip`,
            type: 'TRANSPORT',
            priority: 'HIGH',
            icon: '🚌',
            targetOptions: {
                userIds: Array.from(parentIds)
            },
            metadata: {
                tripId,
                vehicleId,
                routeName,
                tripType,
                licensePlate,
                eventType: 'TRIP_STARTED'
            },
            actionUrl: `/transport/track/${tripId}`
        });

        console.log(`[Trip Start] ✅ Successfully notified ${parentIds.size} parents for ${licensePlate}`);
    } catch (error) {
        console.error('[Trip Start] Notification error:', error);
        // Don't throw - notification failure shouldn't block trip start
    }
}

/**
 * Notify parents when bus is approaching their child's stop
 * @param {string} schoolId - School ID
 * @param {string} tripId - Trip ID
 * @param {string} stopId - Bus stop ID
 * @param {string} stopName - Stop name
 * @param {number} etaMinutes - Estimated time in minutes
 * @param {string} tripType - PICKUP or DROP
 * @param {string} licensePlate - Vehicle license plate
 */
export async function notifyApproachingStop({
    schoolId,
    tripId,
    stopId,
    stopName,
    etaMinutes,
    tripType,
    licensePlate
}) {
    try {
        // Get students at this specific stop for this trip
        const students = await prisma.studentStopAssignment.findMany({
            where: {
                stopId: stopId,
                isActive: true
            },
            include: {
                student: {
                    select: {
                        name: true,
                        studentParentLinks: {
                            where: { isActive: true },
                            include: {
                                parent: {
                                    select: { userId: true }
                                }
                            }
                        }
                    }
                }
            }
        });

        if (students.length === 0) {
            console.log(`[Approaching Stop] No students found at ${stopName}`);
            return;
        }

        // Notify each parent individually with child's name
        let notificationsSent = 0;
        for (const assignment of students) {
            const childName = assignment.student.name;
            const parentIds = assignment.student.studentParentLinks.map(link => link.parent.userId);

            if (parentIds.length === 0) continue;

            const message = etaMinutes <= 2
                ? `${licensePlate} is arriving at ${stopName} now!`
                : `${licensePlate} will reach ${stopName} in ~${etaMinutes} minutes`;

            await sendNotification({
                schoolId,
                title: `🚌 Bus Approaching - ${childName}`,
                message,
                type: 'TRANSPORT',
                priority: etaMinutes <= 2 ? 'URGENT' : 'HIGH',
                icon: '📍',
                targetOptions: {
                    userIds: parentIds
                },
                metadata: {
                    tripId,
                    stopId,
                    stopName,
                    etaMinutes,
                    tripType,
                    childName,
                    licensePlate,
                    eventType: 'APPROACHING_STOP'
                },
                actionUrl: `/transport/track/${tripId}`
            });

            notificationsSent += parentIds.length;
        }

        console.log(`[Approaching Stop] Notified ${notificationsSent} parents for stop: ${stopName}`);
    } catch (error) {
        console.error('[Approaching Stop] Notification error:', error);
        // Don't throw - notification failure shouldn't block location tracking
    }
}

/**
 * Notify student and their parents when HPC/SEL assessment is updated by teacher
 * Uses QStash background worker for processing
 * @param {Object} params
 * @param {string} params.schoolId - School ID
 * @param {string} params.studentId - Student ID (from Student table)
 * @param {string} params.studentName - Student name
 * @param {string} params.teacherName - Teacher name who assessed
 * @param {string} params.teacherId - Teacher user ID (for senderId)
 * @param {number} params.termNumber - Term number (1 or 2)
 * @param {number} params.assessmentCount - Number of parameters assessed
 */
export async function notifyHPCAssessmentUpdated(params) {
    console.log(`[HPC Notification] Queueing notification for student ${params.studentId}`);

    // Enqueue to background worker via QStash
    return enqueueNotificationJob({
        jobType: 'HPC_ASSESSMENT',
        ...params
    });
}

/**
 * Process HPC Assessment notification job (Worker Logic)
 * Called by background worker via QStash
 */
export async function processHPCAssessmentJob({
    schoolId,
    studentId,
    studentName,
    teacherName,
    teacherId,
    termNumber,
    assessmentCount
}) {
    try {
        console.log(`[Worker] Processing HPC Assessment notification for student ${studentId}, term ${termNumber}`);

        // Get student's userId and their parent links
        const student = await prisma.student.findUnique({
            where: { id: studentId },
            select: {
                userId: true,
                name: true,
                studentParentLinks: {
                    where: { isActive: true },
                    select: {
                        parent: {
                            select: { userId: true }
                        }
                    }
                }
            }
        });

        if (!student) {
            console.log(`[Worker] Student not found: ${studentId}`);
            return { success: false, reason: 'Student not found' };
        }

        const studentUserId = student.userId;
        const finalStudentName = studentName || student.name || 'Student';
        const parentIds = student.studentParentLinks.map(link => link.parent.userId);
        const allTargetIds = [studentUserId, ...parentIds];

        const termText = termNumber === 1 ? 'Term 1' : 'Term 2';
        const title = '📊 Progress Report Updated';
        const message = `${teacherName || 'Teacher'} has updated ${finalStudentName}'s Holistic Progress Card for ${termText}. ${assessmentCount} areas assessed.`;

        // Create in-app notifications
        await prisma.notification.createMany({
            data: allTargetIds.map(userId => ({
                senderId: teacherId || null,
                receiverId: userId,
                title,
                message,
                type: 'GENERAL',
                priority: 'NORMAL',
                icon: '📊',
                actionUrl: '/hpc',
                metadata: JSON.stringify({
                    studentId,
                    termNumber,
                    assessmentCount,
                    eventType: 'HPC_ASSESSMENT_UPDATED'
                }),
                isRead: false,
                schoolId,
            }))
        });

        // Send push notifications
        await sendPushNotificationsOptimized({
            userIds: allTargetIds,
            title,
            message,
            data: {
                type: 'HPC',
                studentId,
                termNumber: String(termNumber),
                eventType: 'HPC_ASSESSMENT_UPDATED'
            }
        });

        console.log(`[Worker] ✅ HPC notification sent to student and ${parentIds.length} parent(s) for ${finalStudentName}`);
        return { success: true, count: allTargetIds.length };

    } catch (error) {
        console.error('[Worker] HPC Assessment notification error:', error);
        throw error;
    }
}