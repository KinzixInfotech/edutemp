// app/api/schools/transport/trips/[id]/complete/route.js
// Driver completes a trip

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

export async function POST(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        // Handle empty body gracefully
        let data = {};
        try {
            data = await req.json();
        } catch (e) {
            // No body provided, that's okay
        }
        const { driverId, notes } = data;

        const trip = await prisma.busTrip.findUnique({
            where: { id },
            include: { route: { select: { schoolId: true } } }
        });

        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        if (trip.status !== 'IN_PROGRESS') {
            return NextResponse.json({ error: 'Trip cannot be completed. Current status: ' + trip.status }, { status: 400 });
        }

        if (driverId && trip.driverId !== driverId) {
            return NextResponse.json({ error: 'Only the assigned driver can complete this trip' }, { status: 403 });
        }

        const updatedTrip = await prisma.busTrip.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
                ...(notes && { notes: trip.notes ? `${trip.notes}\n${notes}` : notes }),
            },
            include: {
                vehicle: { select: { id: true, licensePlate: true } },
                route: { select: { id: true, name: true } },
                driver: { select: { id: true, name: true } },
                _count: { select: { attendanceRecords: true } },
            },
        });

        await invalidatePattern(`bus-trips:*schoolId:${trip.route.schoolId}*`);

        return NextResponse.json({ success: true, trip: updatedTrip, message: 'Trip completed successfully' });
    } catch (error) {
        console.error('Error completing trip:', error);
        return NextResponse.json({ error: 'Failed to complete trip' }, { status: 500 });
    }
}
