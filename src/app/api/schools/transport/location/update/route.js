// app/api/schools/transport/location/update/route.js
// Driver updates location during trip - with GPS validation and edge case handling

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

// Haversine formula to calculate distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req) {
    try {
        const data = await req.json();
        const { vehicleId, tripId, transportStaffId, latitude, longitude, speed, heading, accuracy } = data;

        if (!vehicleId || latitude === undefined || longitude === undefined) {
            return NextResponse.json({
                error: 'Missing required fields: vehicleId, latitude, longitude'
            }, { status: 400 });
        }

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const spd = (speed !== undefined && speed !== null) ? parseFloat(speed) : null;
        const hdg = (heading !== undefined && heading !== null) ? parseFloat(heading) : null;
        const acc = (accuracy !== undefined && accuracy !== null) ? parseFloat(accuracy) : null;

        // ===== EDGE CASE #1: GPS junk data validation =====
        // Reject (0, 0) - null island
        if (lat === 0 && lon === 0) {
            return NextResponse.json({ error: 'Invalid coordinates: null island (0, 0)' }, { status: 400 });
        }
        // Validate coordinate range
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return NextResponse.json({ error: 'Invalid coordinates: out of range' }, { status: 400 });
        }

        // Get last location from Redis for validation
        const cachedStr = await redis.get(`vehicle-location:${vehicleId}`);
        const lastLoc = (typeof cachedStr === 'string' && cachedStr) ? JSON.parse(cachedStr) : (cachedStr || null);
        const serverTimestamp = new Date(); // Use server time, not device (Edge Case #17)

        // ===== EDGE CASE #1: Teleport detection =====
        if (lastLoc?.latitude && lastLoc?.longitude && lastLoc?.timestamp) {
            const distance = getDistance(lastLoc.latitude, lastLoc.longitude, lat, lon);
            const timeDiff = (serverTimestamp.getTime() - new Date(lastLoc.timestamp).getTime()) / 1000;

            // Max realistic speed: 150 km/h = 41.67 m/s
            // If moved faster than 50 m/s (180 km/h), likely GPS jump
            if (timeDiff > 0 && distance / timeDiff > 50) {
                console.warn(`GPS teleport detected for vehicle ${vehicleId}: ${distance}m in ${timeDiff}s`);
                // Don't reject, but keep last valid location - just update timestamp
                await redis.set(`vehicle-location:${vehicleId}`, JSON.stringify({
                    ...lastLoc,
                    timestamp: serverTimestamp.toISOString(),
                    teleportSkipped: true,
                }), { ex: 300 });
                return NextResponse.json({ success: true, skipped: 'teleport_detected', lastValidLocation: lastLoc });
            }
        }

        // Determine tracking status based on speed
        // Speed > 2 m/s (7.2 km/h) = MOVING, otherwise IDLE
        const trackingStatus = (spd !== null && spd > 2) ? 'MOVING' : 'IDLE';

        // ===== EDGE CASE #4: Skip duplicates =====
        // Only skip if location AND status are the same. A bus stopping (Change in status) is a valid update.
        if (lastLoc?.latitude === lat && lastLoc?.longitude === lon) {
            const lastStatus = lastLoc.trackingStatus || 'IDLE';
            if (lastStatus === trackingStatus) {
                // Same location AND same status, just update timestamp without DB write
                await redis.set(`vehicle-location:${vehicleId}`, JSON.stringify({
                    ...lastLoc,
                    timestamp: serverTimestamp.toISOString(),
                }), { ex: 300 });
                return NextResponse.json({ success: true, skipped: 'duplicate_location' });
            }
        }

        // Upsert: Only keep latest location per vehicle (no history bloat)
        const existingLocation = await prisma.vehicleLocation.findFirst({
            where: tripId ? { tripId } : { vehicleId },
            orderBy: { timestamp: 'desc' },
        });

        // Clean data objects to avoid undefined values passed to Prisma
        const locationData = {
            latitude: lat,
            longitude: lon,
            speed: spd,
            heading: hdg,
            accuracy: acc,
            timestamp: serverTimestamp,
        };
        // Only include optional relations if they exist and are defined
        if (tripId && tripId !== 'undefined' && tripId !== 'null') {
            locationData.tripId = tripId;
        }
        // Don't include transportStaffId unless we're sure it's valid - client may send user ID by mistake

        let location;
        if (existingLocation) {
            // Update existing location
            location = await prisma.vehicleLocation.update({
                where: { id: existingLocation.id },
                data: locationData,
            });
        } else {
            // Create new location record
            location = await prisma.vehicleLocation.create({
                data: {
                    vehicleId,
                    ...locationData
                },
            });
        }

        // Update vehicle tracking status
        await prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                trackingStatus,
                lastLocationTime: serverTimestamp,
            },
        });

        // Cache latest location in Redis for real-time access (5 min TTL)
        const redisPayload = {
            vehicleId,
            tripId,
            latitude: lat,
            longitude: lon,
            speed: spd,
            heading: hdg,
            trackingStatus,
            timestamp: serverTimestamp.toISOString(),
        };
        await redis.set(`vehicle-location:${vehicleId}`, JSON.stringify(redisPayload), { ex: 300 });

        // ===== EDGE CASE #14: Clear offline alert flag on recovery =====
        if (trackingStatus === 'MOVING' || trackingStatus === 'IDLE') {
            await redis.del(`bus-offline-alert:${vehicleId}`);
        }

        return NextResponse.json({ success: true, location, trackingStatus });
    } catch (error) {
        console.error('Error updating vehicle location:', error);
        return NextResponse.json({ error: 'Failed to update location', details: error.message }, { status: 500 });
    }
}
