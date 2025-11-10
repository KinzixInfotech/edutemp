// ============================================
// FILE: app/api/schools/[schoolId]/calendar/events/route.js
// ============================================

import { NextResponse } from "next/server";
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
                    status: 'ACTIVE',
                },
            },
            orderBy: { lastUsedAt: 'desc' },
        });

        if (gmailAccount && gmailAccount.accessToken) {
            try {
                googleEvents = await fetchGoogleCalendarEvents(
                    gmailAccount.accessToken,
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

        return NextResponse.json({
            events: allEvents,
            total: allEvents.length,
            customCount: transformedCustomEvents.length,
            googleCount: transformedGoogleEvents.length,
            hasGoogleCalendar: !!gmailAccount,
        });
    } catch (error) {
        console.error('Calendar Events Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch events' },
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
            return NextResponse.json(
                { error: 'Title and start date are required' },
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

        return NextResponse.json({
            message: 'Event created successfully',
            event,
        }, { status: 201 });
    } catch (error) {
        console.error('Create Event Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create event' },
            { status: 500 }
        );
    }
}



// ============================================
// HELPER: Fetch Google Calendar Events
// ============================================

async function fetchGoogleCalendarEvents(accessToken, startDate, endDate) {
    try {
        const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
        const timeMax = endDate ? new Date(endDate).toISOString() : undefined;

        const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
        url.searchParams.append('timeMin', timeMin);
        if (timeMax) {
            url.searchParams.append('timeMax', timeMax);
        }
        url.searchParams.append('singleEvents', 'true');
        url.searchParams.append('orderBy', 'startTime');
        url.searchParams.append('maxResults', '50');

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Google Calendar events');
        }

        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error('Google Calendar API Error:', error);
        return [];
    }
}
