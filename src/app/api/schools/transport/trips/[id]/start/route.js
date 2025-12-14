// app/api/schools/transport/trips/[id]/start/route.js
// Driver starts a trip

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

export async function POST(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const data = await req.json();
        const { driverId, latitude, longitude } = data;

        const trip = await prisma.busTrip.findUnique({
            where: { id },
            include: { route: { select: { schoolId: true } } }
        });

        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        if (trip.status !== 'SCHEDULED') {
            return NextResponse.json({ error: 'Trip cannot be started. Current status: ' + trip.status }, { status: 400 });
        }

        if (driverId && trip.driverId !== driverId) {
            return NextResponse.json({ error: 'Only the assigned driver can start this trip' }, { status: 403 });
        }

        const updatedTrip = await prisma.$transaction(async (tx) => {
            // Update trip status
            const updated = await tx.busTrip.update({
                where: { id },
                data: {
                    status: 'IN_PROGRESS',
                    startedAt: new Date(),
                },
                include: {
                    vehicle: { select: { id: true, licensePlate: true } },
                    route: { select: { id: true, name: true } },
                    driver: { select: { id: true, name: true } },
                },
            });

            // Log initial location if provided
            if (latitude !== undefined && longitude !== undefined) {
                await tx.vehicleLocation.create({
                    data: {
                        vehicleId: trip.vehicleId,
                        tripId: id,
                        transportStaffId: trip.driverId,
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude),
                    },
                });
            }

            return updated;
        });

        await invalidatePattern(`bus-trips:*schoolId:${trip.route.schoolId}*`);

        return NextResponse.json({ success: true, trip: updatedTrip, message: 'Trip started successfully' });
    } catch (error) {
        console.error('Error starting trip:', error);
        return NextResponse.json({ error: 'Failed to start trip' }, { status: 500 });
    }
}
