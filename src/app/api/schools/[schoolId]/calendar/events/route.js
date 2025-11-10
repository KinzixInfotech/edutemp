// ============================================
// FILE: app/api/schools/[schoolId]/calendar/events/route.js
// ============================================

import { google } from "googleapis";
import prisma from "@/lib/prisma";

// GET: Fetch all events (Custom + Google Calendar)
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);

        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const type = searchParams.get('type'); // 'upcoming', 'all', 'month'

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
        const gmailAccount = await prisma.gmailAccount.findFirst({
            where: {
                user: {
                    
                    schoolId,
                    // status: 'ACTIVE',
                },
            },
            orderBy: { lastUsedAt: 'desc' },
        });
        console.log(gmailAccount, schoolId,'gmail');

        if (gmailAccount && gmailAccount.accessToken) {
            try {
                googleEvents = await fetchGoogleCalendarEvents(
                    gmailAccount.accessToken,
                    gmailAccount.refreshToken,
                    gmailAccount.id,
                    startDate,
                    endDate
                );
            } catch (error) {
                console.error('Google Calendar fetch error:', error);
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

        const transformedGoogleEvents = googleEvents.map(event => ({
            id: `google-${event.id}`,
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            allDay: !event.start.dateTime,
            location: event.location,
            color: '#EA4335', // Google red
            eventType: 'CUSTOM',
            category: 'OTHER',
            priority: 'NORMAL',
            status: 'SCHEDULED',
            source: 'google',
            htmlLink: event.htmlLink,
        }));

        const allEvents = [...transformedCustomEvents, ...transformedGoogleEvents];

        // Sort by start date
        allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));

        return new Response(
            JSON.stringify({
                events: allEvents,
                total: allEvents.length,
                customCount: transformedCustomEvents.length,
                googleCount: transformedGoogleEvents.length,
                hasGoogleCalendar: !!gmailAccount,
            }),
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

        // If token expired, try to refresh
        if (error.code === 401 && refreshToken) {
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

                // Retry with new token
                return fetchGoogleCalendarEvents(credentials.access_token, refreshToken, accountId, startDate, endDate);
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                throw refreshError;
            }
        }

        throw error;
    }
}