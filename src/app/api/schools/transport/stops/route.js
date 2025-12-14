// app/api/schools/transport/stops/route.js
// Handles CRUD for Bus Stops
// GET: Fetch stops for a route with order
// POST: Create new stop with schedule

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, remember, invalidatePattern } from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const routeId = searchParams.get('routeId');
    const isActive = searchParams.get('isActive');

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        const cacheKey = generateKey('bus-stops', { schoolId, routeId, isActive });

        const data = await remember(cacheKey, async () => {
            const where = {
                route: { schoolId },
                ...(routeId && { routeId }),
                ...(isActive !== null && isActive !== undefined && { isActive: isActive === 'true' }),
            };

            const stops = await prisma.busStop.findMany({
                where,
                include: {
                    route: { select: { id: true, name: true } },
                    studentAssignments: {
                        where: { isActive: true },
                        select: { id: true, studentId: true, pickupStop: true, dropStop: true }
                    },
                    _count: {
                        select: { studentAssignments: { where: { isActive: true } } }
                    }
                },
                orderBy: [{ routeId: 'asc' }, { orderIndex: 'asc' }],
            });

            return { stops, total: stops.length };
        }, CACHE_TTL);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching bus stops:', error);
        return NextResponse.json({ error: 'Failed to fetch bus stops' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const {
            routeId,
            name,
            latitude,
            longitude,
            orderIndex,
            pickupTime,
            dropTime,
            address,
            landmark,
        } = data;

        // Validation
        if (!routeId || !name || latitude === undefined || longitude === undefined || orderIndex === undefined) {
            return NextResponse.json({
                error: 'Missing required fields: routeId, name, latitude, longitude, orderIndex'
            }, { status: 400 });
        }

        // Check if route exists
        const route = await prisma.route.findUnique({
            where: { id: routeId },
            select: { id: true, schoolId: true }
        });
        if (!route) {
            return NextResponse.json({ error: 'Route not found' }, { status: 404 });
        }

        // Check for duplicate orderIndex in the same route
        const existingStop = await prisma.busStop.findUnique({
            where: { routeId_orderIndex: { routeId, orderIndex } }
        });
        if (existingStop) {
            return NextResponse.json({ error: 'A stop with this order index already exists on this route' }, { status: 400 });
        }

        const stop = await prisma.busStop.create({
            data: {
                routeId,
                name,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                orderIndex: parseInt(orderIndex),
                pickupTime,
                dropTime,
                address,
                landmark,
            },
            include: {
                route: { select: { id: true, name: true } },
            },
        });

        // Invalidate cache
        await invalidatePattern(`bus-stops:*schoolId:${route.schoolId}*`);

        return NextResponse.json({ success: true, stop }, { status: 201 });
    } catch (error) {
        console.error('Error creating bus stop:', error);
        return NextResponse.json({ error: 'Failed to create bus stop: ' + error.message }, { status: 500 });
    }
}
