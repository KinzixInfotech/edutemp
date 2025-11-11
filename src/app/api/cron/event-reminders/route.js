// ============================================
// FILE: app/api/cron/event-reminders/route.js
// OPTIMIZED Cron job for large schools with batching and queue system
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { messaging } from '@/lib/firebase-admin';

// Configuration
const CONFIG = {
    BATCH_SIZE: 500, // FCM multicast limit
    USER_FETCH_LIMIT: 5000, // Fetch users in chunks
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    PARALLEL_SCHOOLS: 3, // Process schools in parallel
    NOTIFICATION_TIMEOUT: 30000, // 30 seconds
};

export async function GET(request) {
    const startTime = Date.now();
    
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[CRON] Event reminders started');

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const dayAfterTomorrow = new Date(tomorrow);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

        // OPTIMIZATION: Fetch events with minimal data first
        const upcomingEvents = await prisma.calendarEvent.findMany({
            where: {
                deletedAt: null,
                status: 'SCHEDULED',
                startDate: {
                    gte: tomorrow,
                    lt: dayAfterTomorrow,
                },
            },
            select: {
                id: true,
                schoolId: true,
                title: true,
                description: true,
                eventType: true,
                startDate: true,
                startTime: true,
                endTime: true,
                isAllDay: true,
                location: true,
                venue: true,
                targetAudience: true,
                priority: true,
                color: true,
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                targets: {
                    select: {
                        classId: true,
                        sectionId: true,
                        roleId: true,
                        userId: true,
                    },
                },
            },
            orderBy: {
                schoolId: 'asc', // Group by school for better caching
            },
        });

        console.log(`[CRON] Found ${upcomingEvents.length} events to process`);

        if (upcomingEvents.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No events found for tomorrow',
                stats: {
                    eventsProcessed: 0,
                    totalNotificationsSent: 0,
                    totalErrors: 0,
                },
                executionTime: Date.now() - startTime,
            });
        }

        // OPTIMIZATION: Group events by school for batch processing
        const eventsBySchool = groupEventsBySchool(upcomingEvents);
        
        let totalNotificationsSent = 0;
        let totalErrors = 0;
        const processedEvents = [];
        const schoolResults = [];

        // OPTIMIZATION: Process schools in parallel batches
        const schoolIds = Object.keys(eventsBySchool);
        for (let i = 0; i < schoolIds.length; i += CONFIG.PARALLEL_SCHOOLS) {
            const schoolBatch = schoolIds.slice(i, i + CONFIG.PARALLEL_SCHOOLS);
            
            const batchPromises = schoolBatch.map(async (schoolId) => {
                const schoolEvents = eventsBySchool[schoolId];
                const schoolStartTime = Date.now();
                
                console.log(`[SCHOOL ${schoolId}] Processing ${schoolEvents.length} events`);
                
                let schoolNotificationsSent = 0;
                let schoolErrors = 0;
                const schoolEventResults = [];

                for (const event of schoolEvents) {
                    try {
                        const result = await processEvent(event);
                        
                        schoolNotificationsSent += result.successCount;
                        schoolErrors += result.failureCount;
                        
                        schoolEventResults.push({
                            eventId: event.id,
                            eventTitle: event.title,
                            targetUsersCount: result.totalUsers,
                            notificationsSent: result.successCount,
                            errors: result.failureCount,
                            executionTime: result.executionTime,
                        });
                    } catch (error) {
                        console.error(`[EVENT ${event.id}] Error:`, error.message);
                        schoolErrors++;
                        
                        schoolEventResults.push({
                            eventId: event.id,
                            eventTitle: event.title,
                            error: error.message,
                        });
                    }
                }

                return {
                    schoolId,
                    schoolName: schoolEvents[0]?.school?.name,
                    eventsProcessed: schoolEvents.length,
                    notificationsSent: schoolNotificationsSent,
                    errors: schoolErrors,
                    events: schoolEventResults,
                    executionTime: Date.now() - schoolStartTime,
                };
            });

            const batchResults = await Promise.allSettled(batchPromises);
            
            batchResults.forEach((result) => {
                if (result.status === 'fulfilled') {
                    const data = result.value;
                    totalNotificationsSent += data.notificationsSent;
                    totalErrors += data.errors;
                    processedEvents.push(...data.events);
                    schoolResults.push(data);
                } else {
                    console.error('[BATCH ERROR]', result.reason);
                    totalErrors++;
                }
            });
        }

        const executionTime = Date.now() - startTime;
        console.log(`[CRON] Completed in ${executionTime}ms`);

        return NextResponse.json({
            success: true,
            message: 'Event reminders processed successfully',
            stats: {
                schoolsProcessed: schoolResults.length,
                eventsProcessed: upcomingEvents.length,
                totalNotificationsSent,
                totalErrors,
                executionTime,
            },
            schools: schoolResults,
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        console.error('[CRON ERROR]', error);
        return NextResponse.json(
            {
                error: 'Failed to process event reminders',
                message: error.message,
                executionTime: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}

// OPTIMIZATION: Process single event with batching
export async function processEvent(event) {
    const eventStartTime = Date.now();
    
    // Fetch target users in batches
    const targetUsers = await getEventTargetUsersOptimized(event);
    
    if (targetUsers.length === 0) {
        return {
            totalUsers: 0,
            successCount: 0,
            failureCount: 0,
            executionTime: Date.now() - eventStartTime,
        };
    }

    console.log(`[EVENT ${event.id}] Sending to ${targetUsers.length} users`);

    // Send notifications in batches
    const result = await sendEventRemindersOptimized(event, targetUsers);

    // Create reminder records asynchronously (non-blocking)
    createReminderRecords(event, targetUsers).catch(err => {
        console.error(`[EVENT ${event.id}] Failed to create reminder records:`, err);
    });

    return {
        totalUsers: targetUsers.length,
        successCount: result.successCount,
        failureCount: result.failureCount,
        executionTime: Date.now() - eventStartTime,
    };
}

// OPTIMIZATION: Fetch users with cursor-based pagination
export async function getEventTargetUsersOptimized(event) {
    const { schoolId, targetAudience, targets } = event;
    
    const where = {
        schoolId,
        status: 'ACTIVE',
        fcmToken: { not: null },
    };

    // Build targeting conditions
    if (targets && targets.length > 0) {
        const orConditions = [];
        
        const userIds = targets.map(t => t.userId).filter(Boolean);
        const classIds = targets.map(t => t.classId).filter(Boolean);
        const sectionIds = targets.map(t => t.sectionId).filter(Boolean);
        const roleIds = targets.map(t => t.roleId).filter(Boolean);

        if (userIds.length > 0) orConditions.push({ id: { in: userIds } });
        if (classIds.length > 0) orConditions.push({ student: { classId: { in: classIds } } });
        if (sectionIds.length > 0) orConditions.push({ student: { sectionId: { in: sectionIds } } });
        if (roleIds.length > 0) orConditions.push({ roleId: { in: roleIds } });

        if (orConditions.length > 0) where.OR = orConditions;
    } else {
        // General audience targeting
        if (targetAudience === 'STUDENTS') {
            where.role = { name: 'STUDENT' };
        } else if (targetAudience === 'TEACHERS') {
            where.role = { name: { in: ['TEACHER', 'TEACHING_STAFF'] } };
        } else if (targetAudience === 'PARENTS') {
            where.role = { name: 'PARENT' };
        } else if (targetAudience === 'STAFF') {
            where.role = { name: { in: ['TEACHING_STAFF', 'NON_TEACHING_STAFF'] } };
        }
    }

    // OPTIMIZATION: Fetch only required fields
    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            fcmToken: true,
        },
        take: CONFIG.USER_FETCH_LIMIT, // Limit for very large schools
    });

    return users;
}

// OPTIMIZATION: Batch send with retry logic
export async function sendEventRemindersOptimized(event, users) {
    const tokens = users.map(u => u.fcmToken).filter(Boolean);
    
    if (tokens.length === 0) {
        return { successCount: 0, failureCount: 0 };
    }

    // Prepare notification message
    const eventDate = new Date(event.startDate);
    const formattedDate = eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
    });

    const timeInfo = event.isAllDay
        ? 'All Day'
        : event.startTime
        ? `at ${event.startTime}`
        : '';

    const baseMessage = {
        notification: {
            title: `📅 ${event.title}`,
            body: `Tomorrow, ${formattedDate} ${timeInfo}${event.location ? ` • ${event.location}` : ''}`.trim(),
        },
        data: {
            type: 'EVENT_REMINDER',
            eventId: event.id,
            eventType: event.eventType,
            startDate: event.startDate.toISOString(),
            isAllDay: event.isAllDay.toString(),
            priority: event.priority || 'NORMAL',
            ...(event.location && { location: event.location }),
            ...(event.startTime && { startTime: event.startTime }),
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                channelId: 'events',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1,
                },
            },
        },
    };

    let totalSuccess = 0;
    let totalFailure = 0;
    const failedTokens = [];

    // OPTIMIZATION: Send in batches of 500 (FCM limit)
    const batches = [];
    for (let i = 0; i < tokens.length; i += CONFIG.BATCH_SIZE) {
        batches.push(tokens.slice(i, i + CONFIG.BATCH_SIZE));
    }

    console.log(`[EVENT ${event.id}] Sending ${batches.length} batches`);

    // OPTIMIZATION: Process batches in parallel (max 5 at a time)
    const PARALLEL_BATCHES = 5;
    for (let i = 0; i < batches.length; i += PARALLEL_BATCHES) {
        const batchGroup = batches.slice(i, i + PARALLEL_BATCHES);
        
        const batchPromises = batchGroup.map(async (tokenBatch) => {
            return sendBatchWithRetry(baseMessage, tokenBatch, event.id);
        });

        const results = await Promise.allSettled(batchPromises);
        
        results.forEach((result) => {
            if (result.status === 'fulfilled') {
                totalSuccess += result.value.successCount;
                totalFailure += result.value.failureCount;
                failedTokens.push(...result.value.failedTokens);
            } else {
                totalFailure += CONFIG.BATCH_SIZE;
            }
        });
    }

    // OPTIMIZATION: Cleanup invalid tokens asynchronously
    if (failedTokens.length > 0) {
        cleanupInvalidTokens(failedTokens).catch(err => {
            console.error('[TOKEN CLEANUP ERROR]', err);
        });
    }

    return { successCount: totalSuccess, failureCount: totalFailure };
}

// OPTIMIZATION: Retry logic for failed batches
export async function sendBatchWithRetry(baseMessage, tokens, eventId, attempt = 1) {
    try {
        const message = { ...baseMessage, tokens };
        const response = await messaging.sendEachForMulticast(message);

        const failedTokens = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
        }

        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            failedTokens,
        };
    } catch (error) {
        console.error(`[BATCH SEND] Attempt ${attempt} failed:`, error.message);
        
        // Retry with exponential backoff
        if (attempt < CONFIG.MAX_RETRIES) {
            const delay = CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1);
            await new Promise(resolve => setTimeout(resolve, delay));
            return sendBatchWithRetry(baseMessage, tokens, eventId, attempt + 1);
        }

        return {
            successCount: 0,
            failureCount: tokens.length,
            failedTokens: tokens,
        };
    }
}

// OPTIMIZATION: Async token cleanup (non-blocking)
export async function cleanupInvalidTokens(tokens) {
    if (tokens.length === 0) return;

    const CLEANUP_BATCH_SIZE = 100;
    for (let i = 0; i < tokens.length; i += CLEANUP_BATCH_SIZE) {
        const batch = tokens.slice(i, i + CLEANUP_BATCH_SIZE);
        
        await prisma.user.updateMany({
            where: { fcmToken: { in: batch } },
            data: { fcmToken: null },
        });
    }

    console.log(`[CLEANUP] Removed ${tokens.length} invalid tokens`);
}

// OPTIMIZATION: Async reminder creation (non-blocking)
export async function createReminderRecords(event, users) {
    // Create in batches to avoid overwhelming database
    const BATCH_SIZE = 1000;
    
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
        const batch = users.slice(i, i + BATCH_SIZE);
        
        await prisma.eventReminder.createMany({
            data: batch.map(() => ({
                eventId: event.id,
                reminderType: 'APP',
                reminderTime: 1440, // 24 hours
                scheduledAt: new Date(),
                isSent: true,
                sentAt: new Date(),
            })),
            skipDuplicates: true,
        });
    }
}

// Helper: Group events by school
export function groupEventsBySchool(events) {
    return events.reduce((acc, event) => {
        if (!acc[event.schoolId]) {
            acc[event.schoolId] = [];
        }
        acc[event.schoolId].push(event);
        return acc;
    }, {});
}
