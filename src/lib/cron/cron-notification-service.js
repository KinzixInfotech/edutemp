/**
 * Cron Notification Service
 * 
 * Orchestrates all cron-based push notifications:
 * - Runs all role checkers in parallel
 * - Enforces rate limiting (max 3/day/user)
 * - Respects quiet hours (22:00-07:00) except CRITICAL
 * - Uses existing notificationHelper for FCM
 * 
 * Called by Supabase pg_cron every 5 minutes
 */

import prisma from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications/notificationHelper";
import { checkTeacherNotifications } from "./checkers/teacher-checker";
import { checkStudentNotifications } from "./checkers/student-checker";
import { checkParentNotifications } from "./checkers/parent-checker";
import { checkPrincipalNotifications } from "./checkers/principal-checker";
import { checkDirectorNotifications } from "./checkers/director-checker";
import { checkBusStatus } from "./checkers/bus-status-checker";

// Constants
const MAX_DAILY_NOTIFICATIONS = 3;
const QUIET_HOURS_START = 22; // 10 PM
const QUIET_HOURS_END = 7;    // 7 AM
const BATCH_SIZE = 100;       // Process notifications in batches

/**
 * Main cron notification processor
 */
export async function processCronNotifications() {
    const startTime = Date.now();
    const stats = {
        processed: 0,
        sent: 0,
        skipped: 0,
        rateLimited: 0,
        errors: 0,
        schools: 0
    };

    try {
        // Get all active schools
        const schools = await prisma.school.findMany({
            where: { deletedAt: null },
            select: { id: true, name: true }
        });

        stats.schools = schools.length;

        // Process each school in parallel (batched)
        const schoolBatches = chunkArray(schools, 10);

        for (const batch of schoolBatches) {
            await Promise.all(
                batch.map(school => processSchoolNotifications(school, stats))
            );
        }

        console.log(`[CronNotifications] Completed in ${Date.now() - startTime}ms`, stats);
        return stats;

    } catch (error) {
        console.error("[CronNotifications] Fatal error:", error);
        stats.errors++;
        throw error;
    }
}

/**
 * Process notifications for a single school
 */
async function processSchoolNotifications(school, stats) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Run all checkers in parallel
        const [
            teacherNotifs,
            studentNotifs,
            parentNotifs,
            principalNotifs,
            directorNotifs,
            busNotifs
        ] = await Promise.all([
            checkTeacherNotifications(school.id).catch(e => { console.error(`[Teacher] ${e.message}`); return []; }),
            checkStudentNotifications(school.id).catch(e => { console.error(`[Student] ${e.message}`); return []; }),
            checkParentNotifications(school.id).catch(e => { console.error(`[Parent] ${e.message}`); return []; }),
            checkPrincipalNotifications(school.id).catch(e => { console.error(`[Principal] ${e.message}`); return []; }),
            checkDirectorNotifications(school.id).catch(e => { console.error(`[Director] ${e.message}`); return []; }),
            checkBusStatus(school.id).catch(e => { console.error(`[BusStatus] ${e.message}`); return []; })
        ]);

        // Combine all notifications
        const allNotifications = [
            ...teacherNotifs,
            ...studentNotifs,
            ...parentNotifs,
            ...principalNotifs,
            ...directorNotifs,
            ...busNotifs
        ];

        stats.processed += allNotifications.length;

        // Process in batches
        const batches = chunkArray(allNotifications, BATCH_SIZE);

        for (const batch of batches) {
            await processBatch(batch, school.id, today, stats);
        }

    } catch (error) {
        console.error(`[CronNotifications] School ${school.id} error:`, error);
        stats.errors++;
    }
}

/**
 * Process a batch of notifications
 */
async function processBatch(notifications, schoolId, today, stats) {
    // Filter notifications that pass all guards
    const validNotifications = [];

    for (const notif of notifications) {
        // Check quiet hours (skip non-critical during quiet hours)
        if (!isAllowedDuringQuietHours(notif.priority)) {
            stats.skipped++;
            continue;
        }

        // Check deduplication
        const isDuplicate = await checkDuplicate(notif.userId, notif.ruleKey);
        if (isDuplicate) {
            stats.skipped++;
            continue;
        }

        // Check daily limit
        const isRateLimited = await checkDailyLimit(notif.userId, today);
        if (isRateLimited) {
            stats.rateLimited++;
            continue;
        }

        validNotifications.push(notif);
    }

    // Send valid notifications
    for (const notif of validNotifications) {
        try {
            // Send via existing helper
            await sendNotification({
                schoolId,
                title: notif.title,
                message: notif.message,
                type: notif.type || 'GENERAL',
                priority: notif.priority || 'NORMAL',
                icon: notif.icon || '🔔',
                targetOptions: { userIds: [notif.userId] },
                metadata: notif.metadata || {},
                actionUrl: notif.actionUrl
            });

            // Log sent notification
            await prisma.cronNotificationLog.create({
                data: {
                    schoolId,
                    userId: notif.userId,
                    ruleType: notif.ruleType,
                    ruleKey: notif.ruleKey,
                    title: notif.title,
                    message: notif.message,
                    priority: notif.priority || 'NORMAL'
                }
            });

            // Increment daily count
            await incrementDailyCount(notif.userId, today);

            stats.sent++;

        } catch (error) {
            console.error(`[CronNotifications] Send error for ${notif.userId}:`, error.message);
            stats.errors++;
        }
    }
}

/**
 * Check if notification was already sent (deduplication)
 */
async function checkDuplicate(userId, ruleKey) {
    const existing = await prisma.cronNotificationLog.findUnique({
        where: { userId_ruleKey: { userId, ruleKey } }
    });
    return !!existing;
}

/**
 * Check if user has exceeded daily notification limit
 */
async function checkDailyLimit(userId, today) {
    const limit = await prisma.notificationDailyLimit.findUnique({
        where: { userId_date: { userId, date: today } }
    });
    return limit && limit.count >= MAX_DAILY_NOTIFICATIONS;
}

/**
 * Increment daily notification count
 */
async function incrementDailyCount(userId, today) {
    await prisma.notificationDailyLimit.upsert({
        where: { userId_date: { userId, date: today } },
        update: { count: { increment: 1 } },
        create: { userId, date: today, count: 1 }
    });
}

/**
 * Check if current time allows notifications
 */
function isAllowedDuringQuietHours(priority) {
    const hour = new Date().getHours();
    const isQuietHours = hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;

    // CRITICAL priority bypasses quiet hours
    if (priority === 'CRITICAL') return true;

    return !isQuietHours;
}

/**
 * Utility: Split array into chunks
 */
function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

/**
 * Helper: Get today's date string for rule keys
 */
export function getDateKey(date = new Date()) {
    return date.toISOString().split('T')[0];
}
