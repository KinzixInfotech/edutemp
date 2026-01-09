// lib/cron/checkers/bus-status-checker.js
// Checks bus states and sends notifications on state changes
// With throttling for repeated alerts and night hour suppression

import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

// School geo-radius in meters (for "reached school" detection)
const SCHOOL_RADIUS_METERS = 150;

// Calculate distance between two coordinates (Haversine formula)
function getDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Edge Case #15: Check if current time is within normal operating hours
function isOperatingHours() {
    const hour = new Date().getHours();
    // Operating hours: 6 AM to 6 PM (adjust as needed)
    return hour >= 6 && hour < 18;
}

export async function checkBusStatus(schoolId) {
    const notifications = [];

    // Edge Case #15: Suppress all bus alerts during night hours
    if (!isOperatingHours()) {
        return notifications; // Don't process any alerts
    }

    try {
        // Get school coordinates
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { latitude: true, longitude: true, name: true },
        });

        // Get all active trips for this school
        const activeTrips = await prisma.busTrip.findMany({
            where: {
                status: 'IN_PROGRESS',
                vehicle: { schoolId },
            },
            include: {
                vehicle: { select: { id: true, licensePlate: true, lastLocationTime: true } },
                route: {
                    select: {
                        name: true,
                        studentRouteAssignments: {
                            where: { student: { isActive: true } },
                            select: {
                                student: {
                                    select: {
                                        userId: true,
                                        parent: { select: { userId: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                driver: { select: { name: true } },
            },
        });

        const now = new Date();

        for (const trip of activeTrips) {
            const vehicleId = trip.vehicleId;
            const lastUpdate = trip.vehicle.lastLocationTime;
            const routeName = trip.route?.name || 'Bus';

            // Collect user IDs to notify (students + parents on this route)
            const userIds = [];
            trip.route?.studentRouteAssignments?.forEach(sra => {
                if (sra.student.userId) userIds.push(sra.student.userId);
                if (sra.student.parent?.userId) userIds.push(sra.student.parent.userId);
            });

            // Check 1: BUS_STARTED (trip just started, not yet notified)
            if (!trip.lastNotifyState && trip.startedAt) {
                const startedMinutesAgo = (now - new Date(trip.startedAt)) / 60000;
                if (startedMinutesAgo < 10) { // Within last 10 minutes
                    userIds.forEach(userId => {
                        notifications.push({
                            userId,
                            title: '🚌 Bus Started',
                            message: `${routeName} ${trip.tripType.toLowerCase()} has started. Driver: ${trip.driver?.name || 'N/A'}`,
                            priority: 'HIGH',
                            ruleKey: `BUS_STARTED_${trip.id}`,
                            ruleType: 'BUS_STARTED',
                            metadata: { tripId: trip.id, vehicleId },
                        });
                    });

                    // Update trip state
                    await prisma.busTrip.update({
                        where: { id: trip.id },
                        data: { lastNotifyState: 'STARTED' },
                    });
                }
            }

            // Check 2: BUS_OFFLINE (no update in 10+ minutes during trip)
            // Edge Case #14: Don't spam - check Redis for last alert
            if (lastUpdate) {
                const minutesSinceUpdate = (now - new Date(lastUpdate)) / 60000;
                const offlineAlertKey = `bus-offline-alert:${vehicleId}`;
                const lastOfflineAlert = await redis.get(offlineAlertKey);

                // Alert if offline AND not already alerted
                if (minutesSinceUpdate > 10 && !lastOfflineAlert && trip.lastNotifyState !== 'OFFLINE') {
                    // Notify parents
                    userIds.forEach(userId => {
                        notifications.push({
                            userId,
                            title: '⚠️ Bus Location Unavailable',
                            message: `${routeName} location not updated for ${Math.round(minutesSinceUpdate)} minutes.`,
                            priority: 'HIGH',
                            ruleKey: `BUS_OFFLINE_${trip.id}`,
                            ruleType: 'BUS_OFFLINE',
                            metadata: { tripId: trip.id, vehicleId },
                        });
                    });

                    // Update trip state
                    await prisma.busTrip.update({
                        where: { id: trip.id },
                        data: { lastNotifyState: 'OFFLINE' },
                    });

                    // Edge Case #14: Set Redis flag to prevent repeated alerts (expires in 2 hours)
                    await redis.set(offlineAlertKey, new Date().toISOString(), { ex: 7200 });
                }

                // If bus came back online, clear the alert flag
                if (minutesSinceUpdate < 5 && trip.lastNotifyState === 'OFFLINE') {
                    await redis.del(offlineAlertKey);
                    await prisma.busTrip.update({
                        where: { id: trip.id },
                        data: { lastNotifyState: 'STARTED' }, // Reset state
                    });
                }
            }

            // Check 3: BUS_REACHED_SCHOOL (if school has coordinates)
            if (school?.latitude && school?.longitude && trip.lastNotifyState !== 'REACHED_SCHOOL') {
                const latestLoc = await prisma.vehicleLocation.findFirst({
                    where: { vehicleId },
                    orderBy: { timestamp: 'desc' },
                    select: { latitude: true, longitude: true },
                });

                if (latestLoc) {
                    const distance = getDistanceMeters(
                        latestLoc.latitude, latestLoc.longitude,
                        school.latitude, school.longitude
                    );

                    if (distance <= SCHOOL_RADIUS_METERS) {
                        userIds.forEach(userId => {
                            notifications.push({
                                userId,
                                title: '🏫 Bus Reached School',
                                message: `${routeName} has arrived at ${school.name}.`,
                                priority: 'NORMAL',
                                ruleKey: `BUS_REACHED_${trip.id}`,
                                ruleType: 'BUS_REACHED_SCHOOL',
                                metadata: { tripId: trip.id, vehicleId },
                            });
                        });

                        await prisma.busTrip.update({
                            where: { id: trip.id },
                            data: { lastNotifyState: 'REACHED_SCHOOL' },
                        });
                    }
                }
            }
        }

        // Check 4: Admin notification for buses offline during scheduled trips
        // Edge Case #14: Only send once per day
        const adminAlertKey = `admin-bus-offline:${schoolId}:${now.toISOString().split('T')[0]}`;
        const adminAlertSent = await redis.get(adminAlertKey);

        if (!adminAlertSent) {
            const admins = await prisma.user.findMany({
                where: {
                    schoolId,
                    role: { name: { in: ['ADMIN', 'PRINCIPAL'] } },
                    isActive: true,
                },
                select: { id: true },
            });

            const offlineBuses = activeTrips.filter(t => {
                if (!t.vehicle.lastLocationTime) return true;
                return (now - new Date(t.vehicle.lastLocationTime)) / 60000 > 15;
            });

            if (offlineBuses.length > 0) {
                admins.forEach(admin => {
                    notifications.push({
                        userId: admin.id,
                        title: '🔴 Bus Tracking Alert',
                        message: `${offlineBuses.length} bus(es) have no location updates for 15+ minutes.`,
                        priority: 'HIGH',
                        ruleKey: `ADMIN_BUS_OFFLINE_${schoolId}_${now.toISOString().split('T')[0]}`,
                        ruleType: 'ADMIN_BUS_OFFLINE',
                        metadata: { busCount: offlineBuses.length },
                    });
                });

                // Set flag to prevent repeat alerts today
                await redis.set(adminAlertKey, 'sent', { ex: 86400 }); // 24 hours
            }
        }

    } catch (error) {
        console.error('Error in bus status checker:', error);
    }

    return notifications;
}
