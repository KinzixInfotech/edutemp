// app/api/schools/transport/student-assignments/route.js
// Handles fetching student transport assignments including vehicle, route, and stop information
// GET: Fetch student assignment with vehicle and stop details
// Query params: schoolId (required), studentId (required or optional)
// Response: { assignments: [...] }

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { remember, generateKey } from '@/lib/cache';

const CACHE_TTL = 300; // 5 minutes - assignments don't change often

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        // Generate cache key based on params
        const cacheKey = generateKey('student-transport-assignments', { schoolId, studentId: studentId || 'all' });

        const transformedAssignments = await remember(cacheKey, async () => {
            const where = { schoolId };
            if (studentId) where.studentId = studentId;

            // Fetch student route assignments with related data
            const assignments = await prisma.studentRouteAssignment.findMany({
                where,
                select: {
                    id: true,
                    studentId: true,
                    routeId: true,
                    schoolId: true,
                    assignedAt: true,
                    student: {
                        select: {
                            userId: true,
                            name: true,
                            class: { select: { className: true } },
                            section: { select: { name: true } },
                        },
                    },
                    route: {
                        select: {
                            id: true,
                            name: true,
                            vehicle: {
                                select: {
                                    id: true,
                                    licensePlate: true,
                                    model: true,
                                    capacity: true,
                                    status: true,
                                },
                            },
                            busStops: {
                                select: {
                                    id: true,
                                    name: true,
                                    latitude: true,
                                    longitude: true,
                                    address: true,
                                    landmark: true,
                                    pickupTime: true,
                                    dropTime: true,
                                    orderIndex: true,
                                },
                                orderBy: { orderIndex: 'asc' },
                            },
                        },
                    },
                },
                orderBy: { assignedAt: 'desc' },
            });

            // Get stop assignments for these students
            const studentIds = assignments.map(a => a.studentId);
            const stopAssignments = await prisma.studentStopAssignment.findMany({
                where: {
                    studentId: { in: studentIds },
                    isActive: true,
                },
                select: {
                    studentId: true,
                    routeId: true,
                    stopId: true,
                    stop: {
                        select: {
                            id: true,
                            name: true,
                            latitude: true,
                            longitude: true,
                            address: true,
                            pickupTime: true,
                            dropTime: true,
                        },
                    },
                },
            });

            // Create a map for quick lookup
            const stopMap = {};
            stopAssignments.forEach(sa => {
                stopMap[`${sa.studentId}-${sa.routeId}`] = sa.stop;
            });

            // Transform the data to include vehicle and stop at top level
            return assignments.map(assignment => ({
                ...assignment,
                vehicle: assignment.route?.vehicle || null,
                stop: stopMap[`${assignment.studentId}-${assignment.routeId}`] || null,
            }));
        }, CACHE_TTL);

        return NextResponse.json({ assignments: transformedAssignments }, {
            headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate' },
        });
    } catch (error) {
        console.error('Error fetching student assignments:', error);
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }
}
