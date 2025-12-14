// app/api/schools/transport/location/update/route.js
// Driver updates location during trip (high frequency)

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(req) {
    try {
        const data = await req.json();
        const { vehicleId, tripId, transportStaffId, latitude, longitude, speed, heading, accuracy } = data;

        if (!vehicleId || latitude === undefined || longitude === undefined) {
            return NextResponse.json({
                error: 'Missing required fields: vehicleId, latitude, longitude'
            }, { status: 400 });
        }

        // Store in database
        const location = await prisma.vehicleLocation.create({
            data: {
                vehicleId,
                tripId,
                transportStaffId,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                speed: speed ? parseFloat(speed) : null,
                heading: heading ? parseFloat(heading) : null,
                accuracy: accuracy ? parseFloat(accuracy) : null,
            },
        });

        // Also cache latest location in Redis for real-time access
        const locationData = {
            vehicleId,
            tripId,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            speed,
            heading,
            timestamp: new Date().toISOString(),
        };
        await redis.set(`vehicle-location:${vehicleId}`, JSON.stringify(locationData), { ex: 300 }); // 5 min TTL

        return NextResponse.json({ success: true, location });
    } catch (error) {
        console.error('Error updating vehicle location:', error);
        return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
    }
}
