// app/api/schools/transport/notify-approaching/route.js
// API endpoint to notify parents when bus is approaching their child's stop

import { notifyApproachingStop } from '@/lib/notifications/notificationHelper';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req) {
    try {
        const { tripId, stopId, stopName, etaMinutes, tripType, licensePlate } = await req.json();

        if (!tripId || !stopId || !stopName) {
            return NextResponse.json(
                { error: 'tripId, stopId, and stopName are required' },
                { status: 400 }
            );
        }

        // Get school ID from trip
        const trip = await prisma.busTrip.findUnique({
            where: { id: tripId },
            select: { schoolId: true, route: { select: { schoolId: true } } }
        });

        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        const schoolId = trip.route?.schoolId || trip.schoolId;

        // Send notification to parents
        await notifyApproachingStop({
            schoolId,
            tripId,
            stopId,
            stopName,
            etaMinutes: etaMinutes || 5,
            tripType,
            licensePlate
        });

        return NextResponse.json({ success: true, message: 'Notifications sent' });
    } catch (error) {
        console.error('Error sending approaching notification:', error);
        return NextResponse.json(
            { error: 'Failed to send notification', details: error.message },
            { status: 500 }
        );
    }
}
