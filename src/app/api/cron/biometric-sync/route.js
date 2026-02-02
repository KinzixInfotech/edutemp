// app/api/cron/biometric-sync/route.js
// QStash-powered polling worker for biometric attendance events

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createISAPIClient } from '@/lib/biometric/isapi-client';
import { getCache, setCache, generateKey } from '@/lib/cache';
import crypto from 'crypto';

// Configuration
const CONFIG = {
    BATCH_SIZE: 100,
    MAX_EVENTS_PER_POLL: 500,
    PARALLEL_DEVICES: 3,
    CACHE_TTL: 300, // 5 minutes
    TIMEOUT: 30000, // 30s per device
};

// IST Timezone offset
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Get current IST date
const getISTDate = () => {
    const now = new Date();
    const istTime = new Date(now.getTime() + IST_OFFSET_MS);
    return new Date(istTime.toISOString().split('T')[0]);
};

// Generate event hash for deduplication
const generateEventHash = (deviceId, deviceUserId, eventTime) => {
    const data = `${deviceId}:${deviceUserId}:${eventTime.toISOString()}`;
    return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * GET - Main polling endpoint (called by QStash cron)
 */
export async function GET(request) {
    const startTime = Date.now();

    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[Biometric Sync] Starting poll...');

        // Get all enabled devices
        const devices = await prisma.biometricDevice.findMany({
            where: { isEnabled: true },
            select: {
                id: true,
                schoolId: true,
                name: true,
                ipAddress: true,
                port: true,
                username: true,
                password: true,
                connectionType: true,
                lastSyncedAt: true,
                pollingInterval: true,
            },
        });

        console.log(`[Biometric Sync] Found ${devices.length} enabled devices`);

        if (devices.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No enabled devices to poll',
                stats: { devicesPolled: 0, eventsProcessed: 0 },
                executionTime: Date.now() - startTime,
            });
        }

        let totalEventsProcessed = 0;
        let totalErrors = 0;
        const deviceResults = [];

        // Process devices in parallel batches
        for (let i = 0; i < devices.length; i += CONFIG.PARALLEL_DEVICES) {
            const batch = devices.slice(i, i + CONFIG.PARALLEL_DEVICES);

            const batchPromises = batch.map(async (device) => {
                try {
                    const result = await pollDevice(device);
                    totalEventsProcessed += result.eventsProcessed;
                    return {
                        deviceId: device.id,
                        deviceName: device.name,
                        schoolId: device.schoolId,
                        ...result,
                    };
                } catch (error) {
                    console.error(`[Biometric Sync] Device ${device.id} error:`, error.message);
                    totalErrors++;
                    return {
                        deviceId: device.id,
                        deviceName: device.name,
                        success: false,
                        error: error.message,
                    };
                }
            });

            const batchResults = await Promise.allSettled(batchPromises);
            batchResults.forEach((r) => {
                if (r.status === 'fulfilled') {
                    deviceResults.push(r.value);
                }
            });
        }

        const executionTime = Date.now() - startTime;
        console.log(`[Biometric Sync] Completed in ${executionTime}ms - Events: ${totalEventsProcessed}`);

        return NextResponse.json({
            success: true,
            message: 'Biometric sync completed',
            stats: {
                devicesPolled: devices.length,
                eventsProcessed: totalEventsProcessed,
                errors: totalErrors,
                executionTime,
            },
            devices: deviceResults,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Biometric Sync] Critical error:', error);
        return NextResponse.json(
            {
                error: 'Biometric sync failed',
                message: error.message,
                executionTime: Date.now() - startTime,
            },
            { status: 500 }
        );
    }
}

/**
 * Poll a single device for events
 */
async function pollDevice(device) {
    const client = createISAPIClient(device);

    // Determine start time for polling
    let sinceTime = device.lastSyncedAt;
    if (!sinceTime) {
        // First sync: get events from last 24 hours
        sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    try {
        // Fetch events from device
        const { events, hasMore } = await client.getAcsEvents(sinceTime, CONFIG.MAX_EVENTS_PER_POLL);

        console.log(`[Device ${device.id}] Fetched ${events.length} events (hasMore: ${hasMore})`);

        if (events.length === 0) {
            // Update last sync time even if no events
            await prisma.biometricDevice.update({
                where: { id: device.id },
                data: {
                    lastSyncedAt: new Date(),
                    lastSyncStatus: 'SUCCESS',
                    lastErrorMessage: null,
                },
            });
            return { success: true, eventsProcessed: 0, newEvents: 0 };
        }

        // Process events
        let newEvents = 0;
        let processedEvents = 0;
        let attendanceCreated = 0;

        for (const event of events) {
            if (!event.deviceUserId) continue;

            const eventHash = generateEventHash(device.id, event.deviceUserId, event.eventTime);

            // Check for duplicate
            const existing = await prisma.biometricAttendanceEvent.findUnique({
                where: { eventHash },
            });

            if (existing) continue;
            newEvents++;

            // Find user mapping
            const mapping = await prisma.biometricIdentityMap.findFirst({
                where: {
                    deviceId: device.id,
                    deviceUserId: event.deviceUserId,
                    isActive: true,
                },
            });

            // Store raw event
            const storedEvent = await prisma.biometricAttendanceEvent.create({
                data: {
                    schoolId: device.schoolId,
                    deviceId: device.id,
                    deviceUserId: event.deviceUserId,
                    eventType: event.eventType,
                    eventTime: event.eventTime,
                    rawEventId: event.rawEventId,
                    rawPayload: event.raw,
                    eventHash,
                    resolvedUserId: mapping?.userId,
                    processedAt: mapping ? new Date() : null,
                    processingError: mapping ? null : 'User not mapped',
                },
            });

            // Create attendance record if user is mapped
            if (mapping) {
                const attendanceResult = await processAttendanceEvent(
                    device.schoolId,
                    mapping.userId,
                    event.eventTime,
                    storedEvent.id
                );
                if (attendanceResult.created || attendanceResult.updated) {
                    attendanceCreated++;
                }
            }

            processedEvents++;
        }

        // Update device sync status
        await prisma.biometricDevice.update({
            where: { id: device.id },
            data: {
                lastSyncedAt: new Date(),
                lastSyncStatus: 'SUCCESS',
                lastErrorMessage: null,
            },
        });

        return {
            success: true,
            eventsProcessed: processedEvents,
            newEvents,
            attendanceCreated,
            hasMore,
        };
    } catch (error) {
        // Update device with error
        await prisma.biometricDevice.update({
            where: { id: device.id },
            data: {
                lastSyncStatus: 'FAILED',
                lastErrorMessage: error.message,
            },
        });
        throw error;
    }
}

/**
 * Process attendance event - create check-in or check-out
 */
async function processAttendanceEvent(schoolId, userId, eventTime, biometricEventId) {
    const eventDate = getISTDate();
    const eventTimeIST = new Date(eventTime.getTime() + IST_OFFSET_MS);

    // Check existing attendance for today
    const existingAttendance = await prisma.attendance.findUnique({
        where: {
            userId_schoolId_date: {
                userId,
                schoolId,
                date: eventDate,
            },
        },
    });

    // Get attendance config for grace period
    const config = await getCachedAttendanceConfig(schoolId);

    if (!existingAttendance) {
        // First event of day = Check-in
        const startTime = config?.defaultStartTime || '09:00';
        const [startHour, startMin] = startTime.split(':').map(Number);
        const gracePeriod = config?.gracePeriodMinutes || 15;

        const scheduledStart = new Date(eventDate);
        scheduledStart.setHours(startHour, startMin, 0, 0);
        scheduledStart.setTime(scheduledStart.getTime() + IST_OFFSET_MS);

        const lateThreshold = new Date(scheduledStart.getTime() + gracePeriod * 60 * 1000);
        const isLate = eventTimeIST > lateThreshold;
        const lateByMinutes = isLate
            ? Math.floor((eventTimeIST - scheduledStart) / (60 * 1000))
            : 0;

        await prisma.attendance.create({
            data: {
                userId,
                schoolId,
                date: eventDate,
                status: 'PRESENT',
                checkInTime: eventTime,
                isLateCheckIn: isLate,
                lateByMinutes,
                markedAt: new Date(),
                remarks: 'Biometric check-in',
                deviceInfo: { source: 'biometric', eventId: biometricEventId },
                requiresApproval: false,
                approvalStatus: 'NOT_REQUIRED',
            },
        });

        return { created: true };
    } else if (!existingAttendance.checkOutTime) {
        // Has check-in, no check-out = This is check-out
        const checkInTime = existingAttendance.checkInTime;
        const workingHours = checkInTime
            ? (eventTime - checkInTime) / (1000 * 60 * 60)
            : 0;

        await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
                checkOutTime: eventTime,
                workingHours: Math.round(workingHours * 100) / 100,
            },
        });

        return { updated: true };
    }

    // Already has both check-in and check-out - ignore
    return { ignored: true };
}

/**
 * Get cached attendance config
 */
async function getCachedAttendanceConfig(schoolId) {
    const cacheKey = generateKey('attendance', 'config', schoolId);
    let config = await getCache(cacheKey);

    if (!config) {
        config = await prisma.attendanceConfig.findUnique({
            where: { schoolId },
        });
        if (config) {
            await setCache(cacheKey, config, CONFIG.CACHE_TTL);
        }
    }

    return config;
}
