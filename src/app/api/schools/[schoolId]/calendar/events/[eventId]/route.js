// ============================================
// FILE: app/api/schools/[schoolId]/calendar/events/[eventId]/route.js
// ============================================

import prisma from "@/lib/prisma";

// GET: Fetch single event
export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId, eventId } = params;

        const event = await prisma.calendarEvent.findFirst({
            where: {
                id: eventId,
                schoolId,
                deletedAt: null,
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        profilePicture: true,
                    },
                },
                targets: {
                    include: {
                        class: true,
                        section: true,
                        role: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                reminders: true,
            },
        });

        if (!event) {
            return new Response(
                JSON.stringify({ error: 'Event not found' }),
                { status: 404 }
            );
        }

        return new Response(JSON.stringify({ event }), { status: 200 });
    } catch (error) {
        console.error('Fetch Event Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to fetch event' }),
            { status: 500 }
        );
    }
}

// PATCH: Update event
export async function PATCH(req, props) {
    const params = await props.params;
    try {
        const { schoolId, eventId } = params;
        const body = await req.json();

        const event = await prisma.calendarEvent.update({
            where: {
                id: eventId,
                schoolId,
            },
            data: {
                ...body,
                updatedAt: new Date(),
            },
        });

        return new Response(
            JSON.stringify({
                message: 'Event updated successfully',
                event,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Update Event Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to update event' }),
            { status: 500 }
        );
    }
}

// DELETE: Delete event
export async function DELETE(req, props) {
    const params = await props.params;
    try {
        const { schoolId, eventId } = params;

        await prisma.calendarEvent.update({
            where: {
                id: eventId,
                schoolId,
            },
            data: {
                deletedAt: new Date(),
                status: 'CANCELLED',
            },
        });

        return new Response(
            JSON.stringify({ message: 'Event deleted successfully' }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Delete Event Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to delete event' }),
            { status: 500 }
        );
    }
}

