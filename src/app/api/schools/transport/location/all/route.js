// app/api/schools/transport/location/all/route.js
// Admin endpoint: Get all buses with latest locations, driver, stops, assigned children

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(req) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status'); // MOVING, IDLE, OFFLINE, all

    if (!schoolId) {
        return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
    }

    try {
        // Get all vehicles for school with routes and permanent assignments
        const vehicles = await prisma.vehicle.findMany({
            where: {
                schoolId,
                status: 'active',
                ...(search && {
                    OR: [
                        { licensePlate: { contains: search, mode: 'insensitive' } },
                        { model: { contains: search, mode: 'insensitive' } },
                    ]
                })
            },
            select: {
                id: true,
                licensePlate: true,
                model: true,
                capacity: true,
                trackingStatus: true,
                lastLocationTime: true,
                routes: {
                    select: {
                        id: true,
                        name: true,
                        busStops: {
                            select: { id: true, name: true, pickupTime: true, dropTime: true, latitude: true, longitude: true },
                            orderBy: { orderIndex: 'asc' },
                        },
                        _count: { select: { studentAssignments: true } },
                    },
                },
                // Get permanent route assignments with driver/conductor
                routeAssignments: {
                    where: { isActive: true },
                    take: 1, // Just get the first active assignment
                    select: {
                        id: true,
                        route: { select: { id: true, name: true } },
                        driver: {
                            select: {
                                id: true,
                                name: true,
                                contactNumber: true,
                                licenseNumber: true
                            }
                        },
                        conductor: {
                            select: { id: true, name: true, contactNumber: true },
                        },
                    },
                },
            },
        });

        // Fetch latest locations and active trips in parallel
        const vehicleIds = vehicles.map(v => v.id);

        const [locations, activeTrips] = await Promise.all([
            // Try Redis first for each vehicle
            Promise.all(vehicleIds.map(async (vId) => {
                const cached = await redis.get(`vehicle-location:${vId}`);
                if (cached) {
                    const parsed = (typeof cached === 'string') ? JSON.parse(cached) : cached;
                    return { vehicleId: vId, ...parsed };
                }

                // Fallback to DB
                const loc = await prisma.vehicleLocation.findFirst({
                    where: { vehicleId: vId },
                    orderBy: { timestamp: 'desc' },
                    select: { latitude: true, longitude: true, speed: true, heading: true, timestamp: true },
                });
                return loc ? { vehicleId: vId, ...loc } : null;
            })),

            prisma.busTrip.findMany({
                where: {
                    vehicleId: { in: vehicleIds },
                    status: 'IN_PROGRESS',
                },
                select: {
                    id: true,
                    vehicleId: true,
                    tripType: true,
                    startedAt: true,
                    route: {
                        select: {
                            name: true,
                            busStops: {
                                select: { id: true, name: true, latitude: true, longitude: true, pickupTime: true, dropTime: true },
                                orderBy: { orderIndex: 'asc' },
                            },
                        }
                    },
                    driver: {
                        select: {
                            id: true,
                            name: true,
                            contactNumber: true,
                            licenseNumber: true,
                        }
                    },
                    conductor: {
                        select: { id: true, name: true, contactNumber: true },
                    },
                },
            }),
        ]);

        // Map active trips by vehicleId
        const tripMap = {};
        activeTrips.forEach(t => { tripMap[t.vehicleId] = t; });

        // Build response
        const now = Date.now();
        let busesWithLocation = vehicles.map(vehicle => {
            const loc = locations.find(l => l?.vehicleId === vehicle.id);
            const activeTrip = tripMap[vehicle.id] || null;
            const route = vehicle.routes?.[0]; // Primary route
            const assignment = vehicle.routeAssignments?.[0]; // Permanent assignment

            // Calculate seconds since last update
            let secondsAgo = null;
            let status = vehicle.trackingStatus || 'OFFLINE';

            if (loc?.timestamp) {
                secondsAgo = Math.round((now - new Date(loc.timestamp).getTime()) / 1000);
                // If no update in 10 minutes, mark as OFFLINE
                if (secondsAgo > 600) {
                    status = 'OFFLINE';
                }
            }

            // Count assigned students
            const assignedStudents = route?._count?.studentAssignments || 0;

            // Get stops from active trip or primary route
            const stops = activeTrip?.route?.busStops || route?.busStops || [];

            // Get driver from active trip OR permanent assignment
            const tripDriver = activeTrip?.driver;
            const assignedDriver = assignment?.driver;
            const driver = tripDriver || assignedDriver;

            // Get conductor from active trip OR permanent assignment
            const tripConductor = activeTrip?.conductor;
            const assignedConductor = assignment?.conductor;
            const conductor = tripConductor || assignedConductor;

            return {
                id: vehicle.id,
                licensePlate: vehicle.licensePlate,
                model: vehicle.model,
                capacity: vehicle.capacity,
                status,
                location: loc ? {
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    speed: loc.speed,
                    heading: loc.heading,
                } : null,
                secondsAgo,
                assignedStudents,
                routeName: activeTrip?.route?.name || assignment?.route?.name || route?.name || null,
                totalStops: stops.length,
                stops: stops.slice(0, 5), // First 5 stops for preview
                // Driver info (from active trip or permanent assignment)
                driver: driver ? {
                    id: driver.id,
                    name: driver.name,
                    phone: driver.contactNumber,
                    license: driver.licenseNumber,
                } : null,
                // Conductor info
                conductor: conductor ? {
                    id: conductor.id,
                    name: conductor.name,
                    phone: conductor.contactNumber,
                } : null,
                // Active trip info (only if running)
                activeTrip: activeTrip ? {
                    id: activeTrip.id,
                    tripType: activeTrip.tripType,
                    routeName: activeTrip.route?.name,
                    startedAt: activeTrip.startedAt,
                } : null,
            };
        });

        // Apply status filter
        if (statusFilter && statusFilter !== 'all') {
            busesWithLocation = busesWithLocation.filter(b => b.status === statusFilter);
        }

        // Stats
        const totalBuses = vehicles.length;
        const activeBuses = busesWithLocation.filter(b => b.activeTrip).length;
        const onlineBuses = busesWithLocation.filter(b => b.status !== 'OFFLINE').length;
        const offlineBuses = totalBuses - onlineBuses;

        return NextResponse.json({
            buses: busesWithLocation,
            total: busesWithLocation.length,
            stats: {
                total: totalBuses,
                active: activeBuses,
                online: onlineBuses,
                offline: offlineBuses,
            },
        });

    } catch (error) {
        console.error('Error fetching all bus locations:', error);
        return NextResponse.json({ error: 'Failed to fetch bus locations' }, { status: 500 });
    }
}
