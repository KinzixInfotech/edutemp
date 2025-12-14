// app/api/schools/transport/attendance/bulk/route.js
// Bulk mark attendance for students at a stop

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';

export async function POST(req) {
    try {
        const data = await req.json();
        const { tripId, stopId, markedById, latitude, longitude, students } = data;

        // students: Array of { studentId, status, notes? }
        if (!tripId || !stopId || !markedById || !students || !Array.isArray(students) || students.length === 0) {
            return NextResponse.json({
                error: 'Missing required fields: tripId, stopId, markedById, students (array)'
            }, { status: 400 });
        }

        // Get trip details
        const trip = await prisma.busTrip.findUnique({
            where: { id: tripId },
            select: { id: true, tripType: true, routeId: true, route: { select: { schoolId: true } } }
        });
        if (!trip) {
            return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
        }

        // Process each student
        const results = await prisma.$transaction(async (tx) => {
            const attendanceResults = [];

            for (const student of students) {
                const { studentId, status, notes } = student;

                if (!['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(status)) {
                    attendanceResults.push({ studentId, error: 'Invalid status' });
                    continue;
                }

                // Upsert attendance
                const attendance = await tx.busAttendance.upsert({
                    where: { studentId_tripId: { studentId, tripId } },
                    update: {
                        status,
                        stopId,
                        markedById,
                        markedAt: new Date(),
                        latitude,
                        longitude,
                        notes,
                    },
                    create: {
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
                });

                attendanceResults.push({ studentId, status: attendance.status, success: true });
            }

            return attendanceResults;
        });

        await invalidatePattern(`bus-attendance:*tripId:${tripId}*`);

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => r.error).length;

        return NextResponse.json({
            success: true,
            message: `Marked attendance for ${successCount} students${failCount > 0 ? `, ${failCount} failed` : ''}`,
            results,
        });
    } catch (error) {
        console.error('Error bulk marking attendance:', error);
        return NextResponse.json({ error: 'Failed to mark bulk attendance' }, { status: 500 });
    }
}
