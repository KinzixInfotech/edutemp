// app/api/schools/transport/trips/[id]/route.js
// Handles GET, PUT for single trip

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

export async function GET(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const trip = await prisma.busTrip.findUnique({
            where: { id },
            include: {
                vehicle: { select: { id: true, licensePlate: true, model: true, capacity: true } },
                route: {
                    select: {
                        id: true,
                        name: true,
                        schoolId: true,
                        busStops: {
                            where: { isActive: true },
                            orderBy: { orderIndex: 'asc' },
                            select: { id: true, name: true, orderIndex: true, pickupTime: true, dropTime: true, latitude: true, longitude: true }
                        }
                    }
                },
                driver: { select: { id: true, name: true, contactNumber: true, profilePicture: true } },
                conductor: { select: { id: true, name: true, contactNumber: true, profilePicture: true } },
                attendanceRecords: {
                    include: {
                        student: { select: { userId: true, name: true, admissionNo: true } },
                        stop: { select: { id: true, name: true, orderIndex: true } },
                    },
                    orderBy: { markedAt: 'desc' }
                },
                locationLog: {
                    orderBy: { timestamp: 'desc' },
                    take: 100,
                    select: { latitude: true, longitude: true, speed: true, timestamp: true }
                },
            },
        });

        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        return NextResponse.json({ trip });
    } catch (error) {
        console.error('Error fetching trip:', error);
        return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 });
    }
}

export async function PUT(req, props) {
    const params = await props.params;
    const { id } = params;

    try {
        const data = await req.json();
        const { status, notes, conductorId } = data;

        const existingTrip = await prisma.busTrip.findUnique({
            where: { id },
            include: { route: { select: { schoolId: true } } }
        });
        if (!existingTrip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        const trip = await prisma.busTrip.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { notes }),
                ...(conductorId !== undefined && { conductorId }),
            },
            include: {
                vehicle: { select: { id: true, licensePlate: true } },
                route: { select: { id: true, name: true } },
                driver: { select: { id: true, name: true } },
                conductor: { select: { id: true, name: true } },
            },
        });

        await invalidatePattern(`bus-trips:*schoolId:${existingTrip.route.schoolId}*`);

        return NextResponse.json({ success: true, trip });
    } catch (error) {
        console.error('Error updating trip:', error);
        return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 });
    }
}
