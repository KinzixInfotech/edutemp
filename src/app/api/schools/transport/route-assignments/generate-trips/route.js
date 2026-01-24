// Generate Trips from Permanent Route Assignments
// POST: Creates PICKUP and DROP trips for all active assignments for a given date

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// Helper to get day name
const getDayName = (date) => {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
};

export async function POST(req) {
    try {
        const data = await req.json();
        const { schoolId, date, senderId, skipValidation } = data;

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        // Default to today if no date provided
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setHours(0, 0, 0, 0);

        const dayName = getDayName(targetDate);
        const dateStr = targetDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });

        // === SKIP VALIDATION CHECKS (unless explicitly bypassed) ===
        if (!skipValidation) {
            // 1. Check SchoolCalendar for the date
            const calendarEntry = await prisma.schoolCalendar.findUnique({
                where: {
                    schoolId_date: {
                        schoolId,
                        date: targetDate
                    }
                }
            });

            // Check if it's a holiday
            if (calendarEntry?.isHoliday) {
                return NextResponse.json({
                    success: false,
                    skippedReason: 'HOLIDAY',
                    message: `${dateStr} is a holiday: ${calendarEntry.holidayName || 'School Holiday'}`,
                    created: 0,
                    skipped: 0
                });
            }

            // 2. Check if it's a working day based on SchoolCalendar.dayType
            // If calendar entry exists, check dayType. If no entry, default to allowing trips.
            if (calendarEntry && calendarEntry.dayType !== 'WORKING_DAY') {
                return NextResponse.json({
                    success: false,
                    skippedReason: 'NON_WORKING_DAY',
                    message: `${dateStr} is not a working day (${calendarEntry.dayType})`,
                    created: 0,
                    skipped: 0
                });
            }

            // 3. Check BusServiceSuspension
            const suspension = await prisma.busServiceSuspension.findFirst({
                where: {
                    schoolId,
                    startDate: { lte: targetDate },
                    endDate: { gte: targetDate }
                }
            });

            if (suspension) {
                return NextResponse.json({
                    success: false,
                    skippedReason: 'SERVICE_SUSPENDED',
                    message: `Bus service is suspended: ${suspension.reason}`,
                    created: 0,
                    skipped: 0
                });
            }
        }

        // Get all active route assignments
        const assignments = await prisma.routeAssignment.findMany({
            where: {
                schoolId,
                isActive: true,
            },
            include: {
                route: { select: { id: true, name: true } },
                vehicle: { select: { id: true, licensePlate: true } },
                driver: { select: { id: true, userId: true, name: true } },
                conductor: { select: { id: true, userId: true, name: true } },
            }
        });

        if (assignments.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No active permanent assignments found',
                created: 0,
                skipped: 0,
            });
        }

        const createdTrips = [];
        const skippedTrips = [];
        const driverNotifications = new Map(); // Map to aggregate notifications per driver

        // Create PICKUP and DROP trips for each assignment
        for (const assignment of assignments) {
            for (const tripType of ['PICKUP', 'DROP']) {
                try {
                    // Check if trip already exists for this route/vehicle/type/date
                    const existingTrip = await prisma.busTrip.findFirst({
                        where: {
                            routeId: assignment.routeId,
                            vehicleId: assignment.vehicleId,
                            tripType,
                            date: targetDate,
                        }
                    });

                    if (existingTrip) {
                        skippedTrips.push({
                            route: assignment.route.name,
                            tripType,
                            reason: 'Trip already exists'
                        });
                        continue;
                    }

                    // Create the trip
                    const trip = await prisma.busTrip.create({
                        data: {
                            vehicleId: assignment.vehicleId,
                            routeId: assignment.routeId,
                            driverId: assignment.driverId,
                            conductorId: assignment.conductorId,
                            tripType,
                            status: 'SCHEDULED',
                            date: targetDate,
                        }
                    });

                    createdTrips.push({
                        id: trip.id,
                        route: assignment.route.name,
                        tripType,
                        driver: assignment.driver.name,
                    });

                    // Aggregate notifications per driver
                    const driverId = assignment.driver.userId;
                    if (!driverNotifications.has(driverId)) {
                        driverNotifications.set(driverId, {
                            driverName: assignment.driver.name,
                            trips: []
                        });
                    }
                    driverNotifications.get(driverId).trips.push({
                        route: assignment.route.name,
                        tripType,
                        vehicle: assignment.vehicle.licensePlate
                    });

                } catch (error) {
                    // Skip on unique constraint violation (trip already exists)
                    if (error.code === 'P2002') {
                        skippedTrips.push({
                            route: assignment.route.name,
                            tripType,
                            reason: 'Trip already exists'
                        });
                    } else {
                        console.error(`Error creating trip for ${assignment.route.name} ${tripType}:`, error);
                        skippedTrips.push({
                            route: assignment.route.name,
                            tripType,
                            reason: error.message
                        });
                    }
                }
            }
        }

        // Send notifications to drivers about their trips
        // (dateStr already defined above)

        for (const [driverUserId, data] of driverNotifications) {
            const tripCount = data.trips.length;
            const routeNames = [...new Set(data.trips.map(t => t.route))].join(', ');

            await sendNotification({
                schoolId,
                title: `📅 ${tripCount} Trip${tripCount > 1 ? 's' : ''} Scheduled`,
                message: `You have ${tripCount} trip${tripCount > 1 ? 's' : ''} scheduled for ${dateStr} on route${tripCount > 1 ? 's' : ''}: ${routeNames}`,
                type: 'TRANSPORT',
                priority: 'HIGH',
                icon: '📅',
                targetOptions: { userIds: [driverUserId] },
                senderId,
                metadata: {
                    date: targetDate.toISOString(),
                    tripCount,
                    routes: routeNames
                },
                actionUrl: '/transport/trips'
            });
        }

        return NextResponse.json({
            success: true,
            message: `Generated ${createdTrips.length} trips for ${dateStr}`,
            date: targetDate.toISOString(),
            created: createdTrips.length,
            skipped: skippedTrips.length,
            trips: createdTrips,
            skippedDetails: skippedTrips,
            notifiedDrivers: driverNotifications.size,
        });

    } catch (error) {
        console.error('Error generating trips from assignments:', error);
        return NextResponse.json({
            error: 'Failed to generate trips',
            details: error.message
        }, { status: 500 });
    }
}
