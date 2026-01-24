// app/api/schools/transport/trips/start-on-demand/route.js
// Creates and starts a trip on-demand based on RouteAssignment
// No pre-generation needed - trip is created when driver taps Start

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { invalidatePattern } from '@/lib/cache';
import { notifyTripStarted } from '@/lib/notifications/notificationHelper';

export async function POST(req) {
    try {
        const data = await req.json();
        const { assignmentId, tripType, latitude, longitude, driverId } = data;

        // Validation
        if (!assignmentId || !tripType) {
            return NextResponse.json({
                error: 'Missing required fields: assignmentId, tripType'
            }, { status: 400 });
        }

        if (!['PICKUP', 'DROP'].includes(tripType)) {
            return NextResponse.json({ error: 'Invalid tripType. Must be PICKUP or DROP' }, { status: 400 });
        }

        // Get the route assignment
        const assignment = await prisma.routeAssignment.findUnique({
            where: { id: assignmentId },
            include: {
                route: { select: { id: true, name: true, schoolId: true } },
                vehicle: { select: { id: true, licensePlate: true, model: true } },
                driver: { select: { id: true, name: true, userId: true } },
                conductor: { select: { id: true, name: true, userId: true } }
            }
        });

        if (!assignment) {
            return NextResponse.json({ error: 'Route assignment not found' }, { status: 404 });
        }

        if (!assignment.isActive) {
            return NextResponse.json({ error: 'This route assignment is not active' }, { status: 400 });
        }

        // Verify the driver/conductor is authorized
        if (driverId && assignment.driverId !== driverId && assignment.conductorId !== driverId) {
            return NextResponse.json({ error: 'You are not assigned to this route' }, { status: 403 });
        }

        const schoolId = assignment.route.schoolId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // === VALIDATION: Check calendar, holiday, suspension ===

        // 1. Check SchoolCalendar
        const calendarEntry = await prisma.schoolCalendar.findUnique({
            where: {
                schoolId_date: {
                    schoolId,
                    date: today
                }
            }
        });

        if (calendarEntry?.isHoliday) {
            return NextResponse.json({
                error: 'Cannot start trip',
                reason: 'HOLIDAY',
                message: `Today is a holiday: ${calendarEntry.holidayName || 'School Holiday'}`
            }, { status: 400 });
        }

        if (calendarEntry && calendarEntry.dayType !== 'WORKING_DAY') {
            return NextResponse.json({
                error: 'Cannot start trip',
                reason: 'NON_WORKING_DAY',
                message: `Today is not a working day (${calendarEntry.dayType})`
            }, { status: 400 });
        }

        // 2. Check BusServiceSuspension
        const suspension = await prisma.busServiceSuspension.findFirst({
            where: {
                schoolId,
                startDate: { lte: today },
                endDate: { gte: today }
            }
        });

        if (suspension) {
            return NextResponse.json({
                error: 'Cannot start trip',
                reason: 'SERVICE_SUSPENDED',
                message: `Bus service is suspended: ${suspension.reason}`
            }, { status: 400 });
        }

        // 3. Check if trip already exists for today
        const existingTrip = await prisma.busTrip.findFirst({
            where: {
                vehicleId: assignment.vehicleId,
                routeId: assignment.routeId,
                tripType,
                date: today
            }
        });

        if (existingTrip) {
            // Trip exists - redirect to start existing trip if it's scheduled
            if (existingTrip.status === 'SCHEDULED') {
                // Start the existing trip instead
                const updatedTrip = await prisma.$transaction(async (tx) => {
                    const updated = await tx.busTrip.update({
                        where: { id: existingTrip.id },
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

                    if (latitude !== undefined && longitude !== undefined) {
                        await tx.vehicleLocation.create({
                            data: {
                                vehicleId: assignment.vehicleId,
                                tripId: existingTrip.id,
                                transportStaffId: assignment.driverId,
                                latitude: parseFloat(latitude),
                                longitude: parseFloat(longitude),
                            },
                        });
                    }

                    return updated;
                }, {
                    maxWait: 5000, // Wait max 5s for transaction to start
                    timeout: 20000 // Allow 20s for transaction to complete
                });

                await invalidatePattern(`bus-trips:*schoolId:${schoolId}*`);

                await notifyTripStarted({
                    schoolId,
                    tripId: updatedTrip.id,
                    routeId: updatedTrip.routeId,
                    vehicleId: updatedTrip.vehicle.id,
                    routeName: updatedTrip.route.name,
                    tripType: updatedTrip.tripType,
                    licensePlate: updatedTrip.vehicle.licensePlate
                });

                return NextResponse.json({
                    success: true,
                    trip: updatedTrip,
                    message: 'Existing trip started successfully'
                });
            }

            if (existingTrip.status === 'IN_PROGRESS') {
                return NextResponse.json({
                    error: 'Trip already in progress',
                    tripId: existingTrip.id
                }, { status: 400 });
            }

            if (existingTrip.status === 'COMPLETED') {
                return NextResponse.json({
                    error: `${tripType} trip already completed for today`
                }, { status: 400 });
            }
        }

        // === CREATE AND START NEW TRIP ===
        const newTrip = await prisma.$transaction(async (tx) => {
            const trip = await tx.busTrip.create({
                data: {
                    vehicleId: assignment.vehicleId,
                    routeId: assignment.routeId,
                    driverId: assignment.driverId,
                    conductorId: assignment.conductorId,
                    tripType,
                    date: today,
                    status: 'IN_PROGRESS',
                    startedAt: new Date(),
                },
                include: {
                    vehicle: { select: { id: true, licensePlate: true, model: true } },
                    route: { select: { id: true, name: true } },
                    driver: { select: { id: true, name: true } },
                    conductor: { select: { id: true, name: true } },
                },
            });

            // Log initial location if provided
            if (latitude !== undefined && longitude !== undefined) {
                await tx.vehicleLocation.create({
                    data: {
                        vehicleId: assignment.vehicleId,
                        tripId: trip.id,
                        transportStaffId: assignment.driverId,
                        latitude: parseFloat(latitude),
                        longitude: parseFloat(longitude),
                    },
                });
            }

            return trip;
        }, {
            maxWait: 5000, // Wait max 5s for transaction to start
            timeout: 20000 // Allow 20s for transaction to complete
        });

        await invalidatePattern(`bus-trips:*schoolId:${schoolId}*`);

        // Notify parents that trip has started
        await notifyTripStarted({
            schoolId,
            tripId: newTrip.id,
            routeId: newTrip.routeId,
            vehicleId: newTrip.vehicle.id,
            routeName: newTrip.route.name,
            tripType: newTrip.tripType,
            licensePlate: newTrip.vehicle.licensePlate
        });

        return NextResponse.json({
            success: true,
            trip: newTrip,
            message: `${tripType} trip created and started successfully`
        }, { status: 201 });

    } catch (error) {
        console.error('Error in start-on-demand:', error);
        return NextResponse.json({
            error: 'Failed to start trip',
            details: error.message
        }, { status: 500 });
    }
}
