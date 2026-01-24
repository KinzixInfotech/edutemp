// ============================================
// FILE: app/api/cron/event-reminders/route.js
// OPTIMIZED Cron job for large schools
// Handles BOTH "Night Before" (Upcoming) and "Day Of" (Today) notifications
// Uses shared notificationHelper for reliable delivery
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// Configuration
const CONFIG = {
    PARALLEL_SCHOOLS: 3,
    NOTIFICATION_TIMEOUT: 55000,
};

export async function GET(request) {
    const startTime = Date.now();

    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // Allow local testing or valid secret
        if (process.env.NODE_ENV === 'production' && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[CRON] Event reminders started');

        const now = new Date();
        const serverTodayStart = new Date(now);
        serverTodayStart.setHours(0, 0, 0, 0);

        const serverTodayEnd = new Date(serverTodayStart);
        serverTodayEnd.setDate(serverTodayStart.getDate() + 1);

        const serverTomorrowStart = new Date(serverTodayEnd);
        const serverTomorrowEnd = new Date(serverTomorrowStart);
        serverTomorrowEnd.setDate(serverTomorrowStart.getDate() + 1);

        // Fetch events for TODAY and TOMORROW
        const events = await prisma.calendarEvent.findMany({
            where: {
                deletedAt: null,
                status: 'SCHEDULED',
                startDate: {
                    gte: serverTodayStart,
                    lt: serverTomorrowEnd,
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
                isAllDay: true,
                location: true,
                targetAudience: true,
                priority: true,
                school: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                targets: { // Select targeting info
                    select: {
                        userId: true,
                        classId: true,
                        sectionId: true,
                        roleId: true,
                    },
                },
                reminders: { // Check existing reminders to ensure idempotency
                    select: {
                        reminderTime: true, // 0 for today, 1440 for tomorrow
                        isSent: true
                    }
                }
            },
            orderBy: {
                schoolId: 'asc',
            },
        });

        console.log(`[CRON] Found ${events.length} potential events`);

        if (events.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active events found for day/tomorrow',
                executionTime: Date.now() - startTime,
            });
        }

        // Filter and categorize events
        const eventsToProcess = [];

        for (const event of events) {
            const eventDate = new Date(event.startDate);
            const isToday = eventDate >= serverTodayStart && eventDate < serverTodayEnd;
            const isTomorrow = eventDate >= serverTomorrowStart && eventDate < serverTomorrowEnd;

            // Determine needed reminder type
            // 0 = Day of event
            // 1440 = Day before event (24 hours)

            if (isToday) {
                const alreadySent = event.reminders.some(r => r.reminderTime === 0 && r.isSent);
                if (!alreadySent) {
                    eventsToProcess.push({ ...event, reminderType: 'TODAY', reminderTime: 0 });
                }
            } else if (isTomorrow) {
                const alreadySent = event.reminders.some(r => r.reminderTime === 1440 && r.isSent);
                if (!alreadySent) {
                    eventsToProcess.push({ ...event, reminderType: 'UPCOMING', reminderTime: 1440 });
                }
            }
        }

        console.log(`[CRON] Processing ${eventsToProcess.length} pending notifications`);

        if (eventsToProcess.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'All relevant notifications already sent',
                executionTime: Date.now() - startTime,
            });
        }

        // Group by school
        const eventsBySchool = groupEventsBySchool(eventsToProcess);
        const schoolResults = [];
        let totalSent = 0;
        let totalErrors = 0;

        // Process in chunks of Schools
        const schoolIds = Object.keys(eventsBySchool);

        for (let i = 0; i < schoolIds.length; i += CONFIG.PARALLEL_SCHOOLS) {
            const batchIds = schoolIds.slice(i, i + CONFIG.PARALLEL_SCHOOLS);

            const batchPromises = batchIds.map(async (schoolId) => {
                const schoolEvents = eventsBySchool[schoolId];
                const schoolRes = {
                    schoolId,
                    schoolName: schoolEvents[0]?.school?.name,
                    sent: 0,
                    errors: 0,
                    details: []
                };

                for (const event of schoolEvents) {
                    try {
                        const res = await processEvent(event);
                        schoolRes.sent += res.successCount;
                        schoolRes.details.push({
                            title: event.title,
                            type: event.reminderType,
                            count: res.successCount
                        });
                    } catch (err) {
                        console.error(`[EVENT ERROR ${event.id}]`, err);
                        schoolRes.errors++;
                        schoolRes.details.push({
                            title: event.title,
                            error: err.message
                        });
                    }
                }
                return schoolRes;
            });

            const results = await Promise.all(batchPromises);
            schoolResults.push(...results);

            // Accumulate stats
            results.forEach(r => {
                totalSent += r.sent;
                totalErrors += r.errors;
            });
        }

        return NextResponse.json({
            success: true,
            stats: {
                eventsChecked: events.length,
                pendingProcessing: eventsToProcess.length,
                totalSent,
                totalErrors,
                executionTime: Date.now() - startTime
            },
            details: schoolResults
        });

    } catch (error) {
        console.error('[CRON FATAL]', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// -------------------------------------------------------------
// CORE PROCESSING LOGIC
// -------------------------------------------------------------

async function processEvent(event) {
    // 1. Prepare Target Options
    const targetOptions = buildTargetOptions(event);

    // 2. Prepare Message Content
    const isUpcoming = event.reminderType === 'UPCOMING';
    const titlePrefix = isUpcoming ? 'Upcoming: ' : 'Happening Today: ';

    // Format Friendly Date/Time
    const eventDate = new Date(event.startDate);
    const dayName = isUpcoming ? 'Tomorrow' : 'Today';
    const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = event.isAllDay ? 'All Day' : event.startTime ? `at ${event.startTime}` : '';

    const title = `${titlePrefix}${event.title}`;
    const message = `${dayName}, ${dateStr} ${timeStr}${event.location ? ` • ${event.location}` : ''}`.trim();

    // 3. Send Notification via Helper
    // This reuses the robust logic in notificationHelper (DB creation + Push + Batching)
    const result = await sendNotification({
        schoolId: event.schoolId,
        title,
        message,
        type: 'EVENT', // Uses general type or specific EVENT type if added to helper
        priority: 'NORMAL',
        icon: '📅',
        targetOptions,
        metadata: {
            eventId: event.id,
            reminderType: event.reminderType,
            type: 'CALENDAR_EVENT', // For app routing
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
            startDate: event.startDate.toISOString(),
            isAllDay: event.isAllDay,
        }
    });

    // 4. Mark as Sent (Strict Idempotency)
    // We strictly record it as sent if the helper didn't throw (even if count is 0, we attempted)
    // This allows the cron to move on.
    if (result.success) {
        await prisma.eventReminder.create({
            data: {
                eventId: event.id,
                reminderType: 'DUE_SOON', // Using generic type
                reminderTime: event.reminderTime, // 0 or 1440
                scheduledAt: new Date(),
                isSent: true,
                sentAt: new Date(),
            }
        });
    }

    return {
        successCount: result.count || 0,
        failureCount: 0
    };
}

function buildTargetOptions(event) {
    const { targetAudience, targets } = event;
    const options = {};

    // 1. Specific Targets from Relation
    if (targets && targets.length > 0) {
        const userIds = targets.map(t => t.userId).filter(Boolean);
        const classIds = targets.map(t => t.classId).filter(Boolean);
        const sectionIds = targets.map(t => t.sectionId).filter(Boolean);
        const roleIds = targets.map(t => t.roleId).filter(Boolean);

        if (userIds.length) options.userIds = userIds;
        if (classIds.length) options.classIds = classIds;
        if (sectionIds.length) options.sectionIds = sectionIds;
        if (roleIds.length) options.roleIds = roleIds;

        return options;
    }

    // 2. General Audience Fallback
    switch (targetAudience) {
        case 'ALL':
            options.allUsers = true;
            break;
        case 'STUDENTS':
            options.userTypes = ['STUDENT'];
            break;
        case 'TEACHERS':
            options.userTypes = ['TEACHER', 'TEACHING_STAFF'];
            break;
        case 'PARENTS':
            options.userTypes = ['PARENT'];
            break;
        case 'STAFF':
            options.userTypes = ['TEACHING_STAFF', 'NON_TEACHING_STAFF'];
            break;
    }

    return options;
}

function groupEventsBySchool(events) {
    return events.reduce((acc, event) => {
        if (!acc[event.schoolId]) acc[event.schoolId] = [];
        acc[event.schoolId].push(event);
        return acc;
    }, {});
}
