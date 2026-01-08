// ============================================
// FILE: app/api/schools/[schoolId]/calendar/events/route.js
// ============================================

import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { remember, generateKey, invalidatePattern } from "@/lib/cache";

// GET: Fetch all events (Custom + Google Calendar)
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);

        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const type = searchParams.get('type'); // 'upcoming', 'all', 'month'

        const cacheKey = generateKey('calendar:events', { schoolId, startDate, endDate, type });

        const result = await remember(cacheKey, async () => {
            // Build date filter
            const dateFilter = {};
            if (startDate && endDate) {
                dateFilter.startDate = { gte: new Date(startDate) };
                dateFilter.endDate = { lte: new Date(endDate) };
            } else if (type === 'upcoming') {
                dateFilter.startDate = { gte: new Date() };
            }

            // Fetch custom events from database
            const customEvents = await prisma.calendarEvent.findMany({
                where: {
                    schoolId,
                    deletedAt: null,
                    status: { not: 'CANCELLED' },
                    ...dateFilter,
                },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    targets: {
                        include: {
                            class: true,
                            section: true,
                            role: true,
                        },
                    },
                },
                orderBy: { startDate: 'asc' },
            });

            // Fetch Google Calendar events (if user is authenticated)
            let googleEvents = [];
            let googleCalendarError = false;
            const gmailAccount = await prisma.gmailAccount.findFirst({
                where: {
                    user: {

                        schoolId,
                        // status: 'ACTIVE',
                    },
                },
                orderBy: { lastUsedAt: 'desc' },
            });
            console.log(gmailAccount, schoolId, 'gmail');

            if (gmailAccount && gmailAccount.accessToken) {
                try {
                    googleEvents = await fetchGoogleCalendarEvents(
                        gmailAccount.accessToken,
                        gmailAccount.refreshToken,
                        gmailAccount.id,
                        startDate,
                        endDate
                    );
                    // If we got here without events and there was a token, likely an error occurred
                    if (googleEvents.length === 0 && gmailAccount.accessToken) {
                        // This could be a normal empty result, but we check for token validity
                        // The fetchGoogleCalendarEvents function returns [] on error
                    }
                } catch (error) {
                    console.error('Google Calendar fetch error:', error);
                    googleCalendarError = true;
                    // Continue without Google events if fetch fails
                }
            }


            // Transform and combine events
            const transformedCustomEvents = customEvents.map(event => ({
                id: event.id,
                title: event.title,
                description: event.description,
                start: event.startDate,
                end: event.endDate,
                startTime: event.startTime,
                endTime: event.endTime,
                allDay: event.isAllDay,
                location: event.location,
                venue: event.venue,
                color: event.color,
                eventType: event.eventType,
                category: event.category,
                priority: event.priority,
                status: event.status,
                isRecurring: event.isRecurring,
                recurrenceRule: event.recurrenceRule,
                targetAudience: event.targetAudience,
                isPublic: event.isPublic,
                source: 'custom',
                createdBy: event.createdBy,
                targets: event.targets,
            }));

            const transformedGoogleEvents = googleEvents.map(event => {
                // Detect if this is a holiday based on description or title
                const description = (event.description || '').toLowerCase();
                const title = (event.summary || '').toLowerCase();
                const isHoliday = description.includes('holiday') ||
                    description.includes('observance') ||
                    title.includes('holiday') ||
                    // Common Indian holidays that should be marked
                    title.includes('diwali') ||
                    title.includes('holi') ||
                    title.includes('christmas') ||
                    title.includes('independence day') ||
                    title.includes('republic day') ||
                    title.includes('gandhi jayanti') ||
                    title.includes('dussehra') ||
                    title.includes('eid');

                return {
                    id: `google-${event.id}`,
                    title: event.summary || 'Untitled Event',
                    description: event.description || '',
                    start: event.start.dateTime || event.start.date,
                    end: event.end.dateTime || event.end.date,
                    startDate: event.start.date || (event.start.dateTime ? event.start.dateTime.split('T')[0] : null),
                    allDay: !event.start.dateTime,
                    location: event.location,
                    color: isHoliday ? '#EF4444' : '#EA4335', // Red for holidays, Google red for others
                    eventType: isHoliday ? 'HOLIDAY' : 'CUSTOM',
                    category: 'OTHER',
                    priority: 'NORMAL',
                    status: 'SCHEDULED',
                    source: 'google',
                    htmlLink: event.htmlLink,
                };
            });

            const allEvents = [...transformedCustomEvents, ...transformedGoogleEvents];

            // Sort by start date
            allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

            // Determine if there's a Google Calendar issue (account exists but no events and error occurred)
            const googleCalendarHasIssue = !!gmailAccount && googleCalendarError;

            return {
                events: allEvents,
                total: allEvents.length,
                customCount: transformedCustomEvents.length,
                googleCount: transformedGoogleEvents.length,
                hasGoogleCalendar: !!gmailAccount && !googleCalendarError, // Only true if working
                googleCalendarError: googleCalendarHasIssue, // New: indicates sync issue
            };
        }, 300); // 5 minutes cache

        return new Response(
            JSON.stringify(result),
            { status: 200 }
        );
    } catch (error) {
        console.error('Calendar Events Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to fetch events' }),
            { status: 500 }
        );
    }
}

// POST: Create new custom event
export async function POST(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const body = await req.json();

        const {
            title,
            description,
            eventType,
            category,
            startDate,
            endDate,
            startTime,
            endTime,
            isAllDay,
            location,
            venue,
            color,
            priority,
            targetAudience,
            isPublic,
            isRecurring,
            recurrenceRule,
            targets,
            reminders,
            createdById,
            sendPushNotification,
        } = body;

        // Validate required fields
        if (!title || !startDate) {
            return new Response(
                JSON.stringify({ error: 'Title and start date are required' }),
                { status: 400 }
            );
        }

        const event = await prisma.$transaction(async (tx) => {
            // Create event
            const newEvent = await tx.calendarEvent.create({
                data: {
                    schoolId,
                    title,
                    description,
                    eventType: eventType || 'CUSTOM',
                    category: category || 'OTHER',
                    startDate: new Date(startDate),
                    endDate: endDate ? new Date(endDate) : new Date(startDate),
                    startTime,
                    endTime,
                    isAllDay: isAllDay || false,
                    location,
                    venue,
                    color: color || '#3B82F6',
                    priority: priority || 'NORMAL',
                    targetAudience: targetAudience || 'ALL',
                    isPublic: isPublic !== false,
                    isRecurring: isRecurring || false,
                    recurrenceRule,
                    createdById,
                    status: 'SCHEDULED',
                },
            });

            // Create targets
            if (targets && targets.length > 0) {
                await tx.calendarEventTarget.createMany({
                    data: targets.map(target => ({
                        eventId: newEvent.id,
                        classId: target.classId,
                        sectionId: target.sectionId,
                        roleId: target.roleId,
                        userId: target.userId,
                    })),
                });
            }

            // Create reminders
            if (reminders && reminders.length > 0) {
                const reminderData = reminders.map(reminder => {
                    const eventDate = new Date(startDate);
                    const scheduledAt = new Date(eventDate.getTime() - (reminder.minutesBefore * 60 * 1000));

                    return {
                        eventId: newEvent.id,
                        reminderType: reminder.type || 'EMAIL',
                        reminderTime: reminder.minutesBefore,
                        scheduledAt,
                    };
                });

                await tx.eventReminder.createMany({
                    data: reminderData,
                });
            }


            return newEvent;
        });

        await invalidatePattern(`calendar:*${schoolId}*`);

        return new Response(
            JSON.stringify({
                message: 'Event created successfully',
                event,
            }),
            { status: 201 }
        );
    } catch (error) {
        console.error('Create Event Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to create event' }),
            { status: 500 }
        );
    }
}


// ============================================
// HELPER: Fetch Google Calendar Events using googleapis
// ============================================

async function fetchGoogleCalendarEvents(accessToken, refreshToken, accountId, startDate, endDate) {
    try {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
        const timeMax = endDate ? new Date(endDate).toISOString() : undefined;

        const response = await calendar.events.list({
            calendarId: 'en.indian#holiday@group.v.calendar.google.com',
            timeMin,
            timeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 50,
        });

        // Update last used timestamp
        await prisma.gmailAccount.update({
            where: { id: accountId },
            data: { lastUsedAt: new Date() },
        });

        return response.data.items || [];
    } catch (error) {
        console.error('Google Calendar API Error:', error);

        const errorCode = error.code || error.response?.status;
        const errorMessage = error.message || '';

        // Handle invalid_grant (400) or unauthorized (401) - token is expired/revoked
        if (errorCode === 400 || errorCode === 401 || errorMessage.includes('invalid_grant')) {
            console.log('Token expired or invalid, attempting refresh for account:', accountId);

            if (refreshToken) {
                try {
                    const oauth2Client = new google.auth.OAuth2(
                        process.env.GOOGLE_CLIENT_ID,
                        process.env.GOOGLE_CLIENT_SECRET
                    );

                    oauth2Client.setCredentials({ refresh_token: refreshToken });
                    const { credentials } = await oauth2Client.refreshAccessToken();

                    // Update token in database
                    await prisma.gmailAccount.update({
                        where: { id: accountId },
                        data: {
                            accessToken: credentials.access_token,
                            lastUsedAt: new Date(),
                        },
                    });

                    console.log('Token refreshed successfully, retrying...');

                    // Retry with new token
                    return fetchGoogleCalendarEvents(credentials.access_token, refreshToken, accountId, startDate, endDate);
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);

                    // Mark the account as needing re-authentication
                    try {
                        // Get the gmail account to find the school
                        const gmailAccount = await prisma.gmailAccount.findUnique({
                            where: { id: accountId },
                            include: { user: { select: { schoolId: true } } }
                        });

                        // Create a notification for admins about the failed token
                        if (gmailAccount?.user?.schoolId) {
                            await createAdminNotification(
                                gmailAccount.user.schoolId,
                                'Google Calendar Disconnected',
                                'Your Google Calendar connection has expired. Please reconnect to continue syncing holidays. Go to Settings > School Configuration to reconnect.',
                                'GENERAL'
                            );
                        }
                    } catch (notifyError) {
                        console.error('Failed to create admin notification:', notifyError);
                    }

                    // Throw a specific error so caller knows sync failed
                    const syncError = new Error('GOOGLE_CALENDAR_SYNC_ERROR');
                    syncError.code = 'SYNC_ERROR';
                    throw syncError;
                }
            } else {
                console.log('No refresh token available, returning empty events');
                // Throw error to indicate sync issue
                const syncError = new Error('GOOGLE_CALENDAR_SYNC_ERROR');
                syncError.code = 'SYNC_ERROR';
                throw syncError;
            }
        }

        // Handle rate limiting (403 with specific reason)
        if (errorCode === 403 || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            console.error('Google API rate limit exceeded');

            try {
                const gmailAccount = await prisma.gmailAccount.findUnique({
                    where: { id: accountId },
                    include: { user: { select: { schoolId: true } } }
                });

                if (gmailAccount?.user?.schoolId) {
                    await createAdminNotification(
                        gmailAccount.user.schoolId,
                        'Google Calendar Rate Limit',
                        'Google Calendar API rate limit has been exceeded. Consider using a different Google account or wait 24 hours. Go to Settings > School Configuration to manage your connection.',
                        'GENERAL'
                    );
                }
            } catch (notifyError) {
                console.error('Failed to create rate limit notification:', notifyError);
            }

            // Throw error for rate limit
            const syncError = new Error('GOOGLE_CALENDAR_RATE_LIMIT');
            syncError.code = 'RATE_LIMIT';
            throw syncError;
        }

        // For other errors, throw to indicate sync issue
        console.error('Unhandled Google Calendar error, throwing sync error');
        const syncError = new Error('GOOGLE_CALENDAR_SYNC_ERROR');
        syncError.code = 'SYNC_ERROR';
        throw syncError;
    }
}

// Helper function to create admin notifications
async function createAdminNotification(schoolId, title, message, type = 'GENERAL') {
    try {
        // Find admin users for this school
        const adminRoles = await prisma.role.findMany({
            where: {
                name: { in: ['ADMIN', 'SUPER_ADMIN'] }
            },
            select: { id: true }
        });

        const adminUsers = await prisma.user.findMany({
            where: {
                schoolId,
                roleId: { in: adminRoles.map(r => r.id) },
                status: 'ACTIVE'
            },
            select: { id: true }
        });

        // Create notifications for each admin
        if (adminUsers.length > 0) {
            await prisma.notification.createMany({
                data: adminUsers.map(admin => ({
                    receiverId: admin.id, // Fixed: was userId, should be receiverId
                    schoolId,             // Added: required field
                    title,
                    message,
                    type,
                    priority: 'HIGH',
                    icon: '⚠️',
                    isRead: false,
                })),
                skipDuplicates: true
            });
            console.log(`Created ${type} notification for ${adminUsers.length} admins:`, title);
        }
    } catch (error) {
        console.error('Failed to create admin notification:', error);
    }
}