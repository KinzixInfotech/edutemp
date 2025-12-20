// app/api/schools/transport/trips/route.js
// Handles CRUD for Bus Trips
// GET: List trips with filtering by date, route, status
// POST: Create/schedule new trip

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, remember, invalidatePattern } from '@/lib/cache';

const CACHE_TTL = 60; // 1 minute for trips (more dynamic)

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const routeId = searchParams.get('routeId');
    const vehicleId = searchParams.get('vehicleId');
    const driverId = searchParams.get('driverId');
    const conductorId = searchParams.get('conductorId');
    const status = searchParams.get('status');
    const tripType = searchParams.get('tripType');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = (page - 1) * limit;

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        const cacheKey = generateKey('bus-trips', { schoolId, routeId, vehicleId, status, date, page, limit });

        const data = await remember(cacheKey, async () => {
            const where = {
                route: { schoolId },
                ...(routeId && { routeId }),
                ...(vehicleId && { vehicleId }),
                ...(driverId && { driverId }),
                ...(conductorId && { conductorId }),
                ...(status && { status }),
                ...(tripType && { tripType }),
                ...(date && { date: new Date(date) }),
                ...((startDate || endDate) && {
                    date: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) }),
                    },
                }),
            };

            const [trips, total] = await Promise.all([
                prisma.busTrip.findMany({
                    where,
                    include: {
                        vehicle: { select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true, rcExpiry: true, insuranceExpiry: true, pucExpiry: true, maintenanceDue: true } },
                        route: { select: { id: true, name: true } },
                        driver: { select: { id: true, name: true, contactNumber: true } },
                        conductor: { select: { id: true, name: true, contactNumber: true } },
                        _count: { select: { attendanceRecords: true } },
                    },
                    skip,
                    take: limit,
                    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
                }),
                prisma.busTrip.count({ where }),
            ]);

            return { trips, total, page, limit, totalPages: Math.ceil(total / limit) };
        }, CACHE_TTL);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching trips:', error);
        return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const { vehicleId, routeId, driverId, conductorId, tripType, date, notes } = data;

        // Validation
        if (!vehicleId || !routeId || !driverId || !tripType || !date) {
            return NextResponse.json({
                error: 'Missing required fields: vehicleId, routeId, driverId, tripType, date'
            }, { status: 400 });
        }

        if (!['PICKUP', 'DROP'].includes(tripType)) {
            return NextResponse.json({ error: 'Invalid tripType. Must be PICKUP or DROP' }, { status: 400 });
        }

        // Verify all entities exist
        const [vehicle, route, driver, conductor] = await Promise.all([
            prisma.vehicle.findUnique({ where: { id: vehicleId } }),
            prisma.route.findUnique({ where: { id: routeId }, select: { id: true, schoolId: true } }),
            prisma.transportStaff.findUnique({ where: { id: driverId } }),
            conductorId ? prisma.transportStaff.findUnique({ where: { id: conductorId } }) : null,
        ]);

        if (!vehicle) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
        if (!route) return NextResponse.json({ error: 'Route not found' }, { status: 404 });
        if (!driver) return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
        if (conductorId && !conductor) return NextResponse.json({ error: 'Conductor not found' }, { status: 404 });

        // Check for duplicate trip
        const existingTrip = await prisma.busTrip.findUnique({
            where: { vehicleId_routeId_tripType_date: { vehicleId, routeId, tripType, date: new Date(date) } }
        });
        if (existingTrip) {
            return NextResponse.json({ error: 'A trip for this vehicle, route, and type already exists for this date' }, { status: 400 });
        }

        const trip = await prisma.busTrip.create({
            data: {
                vehicleId,
                routeId,
                driverId,
                conductorId,
                tripType,
                date: new Date(date),
                status: 'SCHEDULED',
                notes,
            },
            include: {
                vehicle: { select: { id: true, licensePlate: true, model: true, capacity: true, fuelType: true, mileage: true, rcExpiry: true, insuranceExpiry: true, pucExpiry: true, maintenanceDue: true } },
                route: { select: { id: true, name: true } },
                driver: { select: { id: true, name: true } },
                conductor: { select: { id: true, name: true } },
            },
        });

        await invalidatePattern(`bus-trips:*schoolId:${route.schoolId}*`);

        return NextResponse.json({ success: true, trip }, { status: 201 });
    } catch (error) {
        console.error('Error creating trip:', error);
        return NextResponse.json({ error: 'Failed to create trip: ' + error.message }, { status: 500 });
    }
}
