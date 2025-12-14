// app/api/schools/transport/attendance/route.js
// Handles bus attendance
// GET: Get attendance for a trip/date/student
// POST: Mark attendance for a student at a stop

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { generateKey, remember, invalidatePattern } from '@/lib/cache';

const CACHE_TTL = 60; // 1 minute

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const tripId = searchParams.get('tripId');
    const studentId = searchParams.get('studentId');
    const stopId = searchParams.get('stopId');
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');

    if (!schoolId && !tripId && !studentId) {
        return NextResponse.json({ error: 'At least one filter required: schoolId, tripId, or studentId' }, { status: 400 });
    }

    try {
        const cacheKey = generateKey('bus-attendance', { tripId, studentId, stopId, date });

        const data = await remember(cacheKey, async () => {
            const where = {
                ...(tripId && { tripId }),
                ...(studentId && { studentId }),
                ...(stopId && { stopId }),
                ...(status && { status }),
                ...(date && { markedAt: { gte: new Date(date), lt: new Date(new Date(date).getTime() + 86400000) } }),
                ...((startDate || endDate) && {
                    markedAt: {
                        ...(startDate && { gte: new Date(startDate) }),
                        ...(endDate && { lte: new Date(endDate) }),
                    },
                }),
                ...(schoolId && { route: { schoolId } }),
            };

            const attendance = await prisma.busAttendance.findMany({
                where,
                include: {
                    student: { select: { userId: true, name: true, admissionNo: true, class: { select: { className: true } } } },
                    stop: { select: { id: true, name: true, orderIndex: true } },
                    trip: { select: { id: true, tripType: true, date: true } },
                    markedBy: { select: { id: true, name: true, role: true } },
                },
                orderBy: { markedAt: 'desc' },
            });

            return { attendance, total: attendance.length };
        }, CACHE_TTL);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching bus attendance:', error);
        return NextResponse.json({ error: 'Failed to fetch bus attendance' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const data = await req.json();
        const { tripId, studentId, stopId, status, markedById, latitude, longitude, notes } = data;

        // Validation
        if (!tripId || !studentId || !stopId || !status || !markedById) {
            return NextResponse.json({
                error: 'Missing required fields: tripId, studentId, stopId, status, markedById'
            }, { status: 400 });
        }

        if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        // Get trip details
        const trip = await prisma.busTrip.findUnique({
            where: { id: tripId },
            select: { id: true, tripType: true, routeId: true, route: { select: { schoolId: true } } }
        });
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Check for existing attendance
        const existingAttendance = await prisma.busAttendance.findUnique({
            where: { studentId_tripId: { studentId, tripId } }
        });

        let attendance;
        if (existingAttendance) {
            // Update existing
            attendance = await prisma.busAttendance.update({
                where: { id: existingAttendance.id },
                data: {
                    status,
                    stopId,
                    markedById,
                    markedAt: new Date(),
                    latitude,
                    longitude,
                    notes,
                },
                include: {
                    student: { select: { userId: true, name: true } },
                    stop: { select: { id: true, name: true } },
                },
            });
        } else {
            // Create new
            attendance = await prisma.busAttendance.create({
                data: {
                    tripId,
                    studentId,
                    stopId,
                    routeId: trip.routeId,
                    tripType: trip.tripType,
                    status,
                    markedById,
                    latitude,
                    longitude,
                    notes,
                },
                include: {
                    student: { select: { userId: true, name: true } },
                    stop: { select: { id: true, name: true } },
                },
            });
        }

        await invalidatePattern(`bus-attendance:*tripId:${tripId}*`);

        return NextResponse.json({ success: true, attendance }, { status: existingAttendance ? 200 : 201 });
    } catch (error) {
        console.error('Error marking bus attendance:', error);
        return NextResponse.json({ error: 'Failed to mark bus attendance: ' + error.message }, { status: 500 });
    }
}
