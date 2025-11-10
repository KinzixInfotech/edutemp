
// ============================================
// FILE: app/api/schools/[schoolId]/calendar/upcoming/route.js
// ============================================

import prisma from "@/lib/prisma";

export async function GET(req, props) {
    const params = await props.params;
    try {
        const { schoolId } = params;
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '10');

        const now = new Date();

        const upcomingEvents = await prisma.calendarEvent.findMany({
            where: {
                schoolId,
                deletedAt: null,
                status: { not: 'CANCELLED' },
                startDate: { gte: now },
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: { startDate: 'asc' },
            take: limit,
        });

        return new Response(
            JSON.stringify({
                events: upcomingEvents,
                total: upcomingEvents.length,
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error('Upcoming Events Error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to fetch upcoming events' }),
            { status: 500 }
        );
    }
}