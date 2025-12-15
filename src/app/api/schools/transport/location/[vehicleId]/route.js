// app/api/schools/transport/location/[vehicleId]/route.js
// Get current location of a vehicle (for parents tracking)

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(req, props) {
    const params = await props.params;
    const { vehicleId } = params;
    const { searchParams } = new URL(req.url);
    const includeHistory = searchParams.get('history') === 'true';
    const historyLimit = parseInt(searchParams.get('historyLimit')) || 50;

    // Validate vehicleId
    if (!vehicleId || vehicleId === 'undefined' || vehicleId === 'null') {
        return NextResponse.json({ error: 'Valid vehicleId is required' }, { status: 400 });
    }

    try {
        // Try Redis first for latest location
        const cached = await redis.get(`vehicle-location:${vehicleId}`);
        let currentLocation = cached ? JSON.parse(cached) : null;

        // If no Redis cache, get from database
        if (!currentLocation) {
            const latestLocation = await prisma.vehicleLocation.findFirst({
                where: { vehicleId },
                orderBy: { timestamp: 'desc' },
                select: { latitude: true, longitude: true, speed: true, heading: true, timestamp: true, tripId: true },
            });
            currentLocation = latestLocation;
        }

        // Get vehicle info
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicleId },
            select: { id: true, licensePlate: true, model: true, status: true },
        });

        if (!vehicle) {
            return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        }

        // Get active trip if any
        const activeTrip = await prisma.busTrip.findFirst({
            where: {
                vehicleId,
                status: 'IN_PROGRESS',
            },
            select: {
                id: true,
                tripType: true,
                startedAt: true,
                driver: { select: { name: true, contactNumber: true } },
                conductor: { select: { name: true, contactNumber: true } },
                route: {
                    select: {
                        name: true,
                        busStops: {
                            where: { isActive: true },
                            orderBy: { orderIndex: 'asc' },
                            select: { id: true, name: true, orderIndex: true, latitude: true, longitude: true, pickupTime: true, dropTime: true },
                        },
                    },
                },
            },
        });

        let locationHistory = [];
        if (includeHistory && activeTrip) {
            locationHistory = await prisma.vehicleLocation.findMany({
                where: { tripId: activeTrip.id },
                orderBy: { timestamp: 'desc' },
                take: historyLimit,
                select: { latitude: true, longitude: true, speed: true, timestamp: true },
            });
        }

        return NextResponse.json({
            vehicle,
            currentLocation,
            activeTrip,
            locationHistory,
            lastUpdated: currentLocation?.timestamp || null,
        });
    } catch (error) {
        console.error('Error fetching vehicle location:', error);
        return NextResponse.json({ error: 'Failed to fetch vehicle location' }, { status: 500 });
    }
}
