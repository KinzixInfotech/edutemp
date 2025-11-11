// ============================================
// FILE: app/api/cron/event-reminders/test/route.js
// Test endpoint (remove in production)
// ============================================

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processEvent } from '../route';


export async function POST(request) {
    try {
        const body = await request.json();
        const { eventId } = body;

        if (!eventId) {
            return NextResponse.json({ error: 'eventId required' }, { status: 400 });
        }

        const event = await prisma.calendarEvent.findUnique({
            where: { id: eventId },
            include: {
                school: true,
                targets: true,
            },
        });

        if (!event) {
            return NextResponse.json({ error: 'Event not found' }, { status: 404 });
        }

        const result = await processEvent(event);

        return NextResponse.json({
            success: true,
            event: {
                id: event.id,
                title: event.title,
            },
            targetUsersCount: result.totalUsers,
            notificationsSent: result.successCount,
            errors: result.failureCount,
            executionTime: result.executionTime,
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}