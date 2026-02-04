// app/api/cron/biometric-sync/route.js
// QStash-powered polling worker for biometric attendance events

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createISAPIClient } from '@/lib/biometric/isapi-client';
import { getCache, setCache, generateKey } from '@/lib/cache';
import { sendNotification } from '@/lib/notifications/notificationHelper';
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

        // Get all enabled devices for schools with biometric attendance enabled
        const devices = await prisma.biometricDevice.findMany({
            where: {
                isEnabled: true,
                school: {
                    attendanceConfig: {
                        enableBiometricAttendance: true
                    }
                }
            },
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

// QStash sends POST by default
export async function POST(request) {
    return GET(request);
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
        // Fetch ALL types of events (fingerprint + card + face)
        const { events, hasMore } = await client.getAllAcsEvents(sinceTime, CONFIG.MAX_EVENTS_PER_POLL);

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
            await prisma.biometricAttendanceEvent.create({
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

            // Update live attendance immediately if user is mapped
            if (mapping) {
                await updateLiveAttendance(device.schoolId, mapping.userId, event.eventTime);
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
 * Update live attendance - create/update attendance record immediately
 * Students: Only P/A (Present/Absent) - first punch marks present, subsequent ignored
 * Staff: Check-in/Check-out times - first punch = in, subsequent = out
 */
async function updateLiveAttendance(schoolId, userId, eventTime) {
    // Get date in IST
    const eventTimeIST = new Date(eventTime.getTime() + IST_OFFSET_MS);
    const dateStr = eventTimeIST.toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const eventDate = new Date(Date.UTC(y, m - 1, d));

    // Format time for notification (e.g., "9:05 AM")
    const timeFormatted = eventTimeIST.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });

    try {
        // Get user info - check if student or staff
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                role: { select: { name: true } },
                student: {
                    select: {
                        id: true, // Check if student record exists
                        studentParentLinks: {
                            where: { isActive: true },
                            select: { parent: { select: { userId: true } } }
                        }
                    }
                }
            }
        });

        const userName = user?.name || 'User';
        const isStudent = !!user?.student?.id; // True if student record exists
        const roleName = user?.role?.name?.toUpperCase() || '';
        const isStudentRole = roleName === 'STUDENT';

        // Final check: is this a student?
        const isStudentUser = isStudent || isStudentRole;

        // Get parent IDs for notification (students only)
        const parentIds = user?.student?.studentParentLinks?.map(l => l.parent.userId) || [];

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

        if (!existingAttendance) {
            // First punch of day - mark present (for all)
            await prisma.attendance.create({
                data: {
                    userId,
                    schoolId,
                    date: eventDate,
                    status: 'PRESENT',
                    checkInTime: isStudentUser ? null : eventTime, // Only staff get check-in time
                    markedAt: new Date(),
                    remarks: isStudentUser ? 'Biometric present (live)' : 'Biometric check-in (live)',
                    deviceInfo: { source: 'biometric', live: true, isStudent: isStudentUser },
                    requiresApproval: false,
                    approvalStatus: 'NOT_REQUIRED',
                    isBiometricEntry: true,
                    isBiometricFinalized: false,
                },
            });
            console.log(`[Live Attendance] Created ${isStudentUser ? 'present' : 'check-in'} for user ${userId}`);

            // Notify user (and parents if student)
            if (isStudentUser) {
                // Student: "Marked Present" notification
                await sendNotification({
                    schoolId,
                    title: `✅ Marked Present`,
                    message: `${userName} has been marked present today`,
                    type: 'ATTENDANCE',
                    priority: 'NORMAL',
                    icon: '✅',
                    targetOptions: {
                        userIds: [userId, ...parentIds]
                    },
                    metadata: {
                        eventType: 'BIOMETRIC_PRESENT',
                        userId
                    },
                    actionUrl: '/attendance'
                });
            } else {
                // Staff: "Checked In at time" notification
                await sendNotification({
                    schoolId,
                    title: `✅ Checked In`,
                    message: `${userName} checked in at ${timeFormatted}`,
                    type: 'ATTENDANCE',
                    priority: 'NORMAL',
                    icon: '✅',
                    targetOptions: {
                        userIds: [userId]
                    },
                    metadata: {
                        eventType: 'BIOMETRIC_CHECK_IN',
                        time: timeFormatted,
                        userId
                    },
                    actionUrl: '/attendance'
                });
            }

        } else if (!existingAttendance.isBiometricFinalized && !isStudentUser) {
            // ONLY for staff: Update check-out time on subsequent punches
            // Students are ignored after first punch (already marked present)

            const checkInTime = existingAttendance.checkInTime;
            const workingHours = checkInTime
                ? (eventTime - new Date(checkInTime)) / (1000 * 60 * 60)
                : 0;

            await prisma.attendance.update({
                where: { id: existingAttendance.id },
                data: {
                    checkOutTime: eventTime,
                    workingHours: Math.round(workingHours * 100) / 100,
                },
            });
            console.log(`[Live Attendance] Updated check-out for staff ${userId}`);

            // Staff: "Checked Out at time" notification
            await sendNotification({
                schoolId,
                title: `👋 Checked Out`,
                message: `${userName} checked out at ${timeFormatted}`,
                type: 'ATTENDANCE',
                priority: 'NORMAL',
                icon: '👋',
                targetOptions: {
                    userIds: [userId]
                },
                metadata: {
                    eventType: 'BIOMETRIC_CHECK_OUT',
                    time: timeFormatted,
                    userId,
                    workingHours: Math.round(workingHours * 100) / 100
                },
                actionUrl: '/attendance'
            });
        }
        // Students with existing attendance: ignore subsequent punches (already present)
        // If already finalized, ignore new punches (shouldn't happen during day)
    } catch (error) {
        console.error(`[Live Attendance] Error for user ${userId}:`, error.message);
        // Don't throw - we still want to store the raw event even if attendance update fails
    }
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
