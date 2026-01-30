import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * GET /api/mobile/dashboard/transport
 * Consolidated dashboard API for Driver/Conductor roles
 * Returns: staff profile, vehicle, trips, events in single response
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');
        const userId = searchParams.get('userId');

        if (!schoolId || !userId) {
            return NextResponse.json(
                { error: 'Missing required parameters: schoolId, userId' },
                { status: 400 }
            );
        }

        // Get transport staff info first to determine role
        const staff = await prisma.transportStaff.findFirst({
            where: { userId, schoolId },
            include: {
                user: { select: { name: true, email: true, profilePicture: true } }
            }
        });

        if (!staff) {
            return NextResponse.json({ error: 'Transport staff not found' }, { status: 404 });
        }

        const isDriver = staff.role === 'DRIVER';
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const startDate = weekAgo.toISOString().split('T')[0];

        // Execute all queries in parallel
        const [
            vehicleData,
            tripsData,
            eventsData,
            routeData
        ] = await Promise.all([
            fetchVehicle(staff.id, isDriver),
            fetchTrips(schoolId, staff.id, isDriver, startDate, today),
            fetchUpcomingEvents(schoolId),
            fetchRoute(staff.id, isDriver)
        ]);

        return NextResponse.json({
            success: true,
            data: {
                staff: {
                    id: staff.id,
                    name: staff.name,
                    role: staff.role,
                    employeeId: staff.employeeId,
                    licenseNumber: staff.licenseNumber,
                    licenseExpiry: staff.licenseExpiry,
                    contactNumber: staff.contactNumber,
                    profilePicture: staff.user?.profilePicture
                },
                vehicle: vehicleData,
                route: routeData,
                trips: tripsData,
                events: eventsData
            }
        });

    } catch (error) {
        console.error('Transport dashboard error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard data', details: error.message },
            { status: 500 }
        );
    }
}

async function fetchVehicle(staffId, isDriver) {
    try {
        // Get vehicle from route assignment
        const assignment = isDriver
            ? await prisma.routeAssignment.findFirst({
                where: { driverId: staffId, status: 'ACTIVE' },
                include: { vehicle: true }
            })
            : await prisma.routeAssignment.findFirst({
                where: { conductorId: staffId, status: 'ACTIVE' },
                include: { vehicle: true }
            });

        if (!assignment?.vehicle) return null;

        const v = assignment.vehicle;
        return {
            id: v.id,
            licensePlate: v.licensePlate,
            model: v.model,
            capacity: v.capacity,
            fuelType: v.fuelType,
            mileage: v.mileage,
            status: v.status
        };
    } catch (error) {
        console.error('fetchVehicle error:', error);
        return null;
    }
}

async function fetchRoute(staffId, isDriver) {
    try {
        const assignment = isDriver
            ? await prisma.routeAssignment.findFirst({
                where: { driverId: staffId, status: 'ACTIVE' },
                include: {
                    route: {
                        include: {
                            stops: { orderBy: { stopOrder: 'asc' } }
                        }
                    }
                }
            })
            : await prisma.routeAssignment.findFirst({
                where: { conductorId: staffId, status: 'ACTIVE' },
                include: {
                    route: {
                        include: {
                            stops: { orderBy: { stopOrder: 'asc' } }
                        }
                    }
                }
            });

        if (!assignment?.route) return null;

        const r = assignment.route;
        return {
            id: r.id,
            name: r.name,
            description: r.description,
            totalStops: r.stops?.length || 0,
            stops: r.stops?.map(s => ({
                id: s.id,
                name: s.name,
                arrivalTime: s.arrivalTime,
                order: s.stopOrder
            }))
        };
    } catch (error) {
        console.error('fetchRoute error:', error);
        return null;
    }
}

async function fetchTrips(schoolId, staffId, isDriver, startDate, endDate) {
    try {
        const whereClause = isDriver
            ? { schoolId, driverId: staffId }
            : { schoolId, conductorId: staffId };

        const trips = await prisma.trip.findMany({
            where: {
                ...whereClause,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate)
                }
            },
            orderBy: { date: 'desc' },
            take: 10,
            include: {
                route: { select: { name: true } },
                vehicle: { select: { licensePlate: true } }
            }
        });

        // Calculate stats
        const totalTrips = trips.length;
        const completedTrips = trips.filter(t => t.status === 'COMPLETED').length;
        const todayTrips = trips.filter(t => {
            const tripDate = new Date(t.date).toISOString().split('T')[0];
            return tripDate === endDate;
        });

        return {
            trips: trips.map(t => ({
                id: t.id,
                date: t.date,
                type: t.type,
                status: t.status,
                route: t.route?.name,
                vehicle: t.vehicle?.licensePlate,
                startTime: t.startTime,
                endTime: t.endTime
            })),
            stats: {
                totalTrips,
                completedTrips,
                todayTrips: todayTrips.length
            }
        };
    } catch (error) {
        console.error('fetchTrips error:', error);
        return { trips: [], stats: { totalTrips: 0, completedTrips: 0, todayTrips: 0 } };
    }
}

async function fetchUpcomingEvents(schoolId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const events = await prisma.calendarEvent.findMany({
            where: {
                schoolId,
                startDate: { gte: today }
            },
            orderBy: { startDate: 'asc' },
            take: 5,
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                category: true,
                color: true,
                location: true,
                isAllDay: true
            }
        });

        return events;
    } catch (error) {
        console.error('fetchUpcomingEvents error:', error);
        return [];
    }
}
