// app/api/schools/[schoolId]/biometric/sync/route.js
// Manual sync trigger for biometric devices

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';
import crypto from 'crypto';

// IST Timezone offset
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Generate event hash for deduplication
const generateEventHash = (deviceId, deviceUserId, eventTime) => {
    const data = `${deviceId}:${deviceUserId}:${eventTime.toISOString()}`;
    return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * POST - Trigger manual sync for a device or all devices
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { deviceId, sinceDays = 1 } = body;

        // Build query
        const whereClause = { schoolId, isEnabled: true };
        if (deviceId) whereClause.id = deviceId;

        const devices = await prisma.biometricDevice.findMany({
            where: whereClause,
        });

        if (devices.length === 0) {
            return NextResponse.json(
                { error: 'No enabled devices found' },
                { status: 404 }
            );
        }

        const sinceTime = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
        const results = [];

        for (const device of devices) {
            try {
                const client = createISAPIClient(device);
                const { events } = await client.getAcsEvents(sinceTime, 500);

                let newEvents = 0;
                let duplicates = 0;
                let attendanceCreated = 0;

                for (const event of events) {
                    if (!event.deviceUserId) continue;

                    const eventHash = generateEventHash(device.id, event.deviceUserId, event.eventTime);

                    // Check for duplicate
                    const existing = await prisma.biometricAttendanceEvent.findUnique({
                        where: { eventHash },
                    });

                    if (existing) {
                        duplicates++;
                        continue;
                    }

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

                    newEvents++;

                    // Process attendance if mapped
                    if (mapping) {
                        const result = await processAttendanceEvent(
                            device.schoolId,
                            mapping.userId,
                            event.eventTime
                        );
                        if (result.created || result.updated) {
                            attendanceCreated++;
                        }
                    }
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

                results.push({
                    deviceId: device.id,
                    deviceName: device.name,
                    success: true,
                    totalEvents: events.length,
                    newEvents,
                    duplicates,
                    attendanceCreated,
                });
            } catch (error) {
                await prisma.biometricDevice.update({
                    where: { id: device.id },
                    data: {
                        lastSyncStatus: 'FAILED',
                        lastErrorMessage: error.message,
                    },
                });

                results.push({
                    deviceId: device.id,
                    deviceName: device.name,
                    success: false,
                    error: error.message,
                });
            }
        }

        const successCount = results.filter((r) => r.success).length;
        const totalNewEvents = results.reduce((sum, r) => sum + (r.newEvents || 0), 0);

        return NextResponse.json({
            success: true,
            message: `Synced ${successCount}/${devices.length} devices`,
            summary: {
                devicesTotal: devices.length,
                devicesSuccess: successCount,
                newEventsTotal: totalNewEvents,
            },
            results,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[Manual Sync] POST error:', error);
        return NextResponse.json(
            { error: 'Sync failed', details: error.message },
            { status: 500 }
        );
    }
}

/**
 * GET - Get sync status for devices
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const devices = await prisma.biometricDevice.findMany({
            where: { schoolId },
            select: {
                id: true,
                name: true,
                isEnabled: true,
                lastSyncedAt: true,
                lastSyncStatus: true,
                lastErrorMessage: true,
                pollingInterval: true,
            },
            orderBy: { lastSyncedAt: 'desc' },
        });

        // Get recent event counts
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const eventCounts = await prisma.biometricAttendanceEvent.groupBy({
            by: ['deviceId'],
            where: {
                schoolId,
                createdAt: { gte: oneDayAgo },
            },
            _count: true,
        });

        const countMap = new Map(eventCounts.map((e) => [e.deviceId, e._count]));

        return NextResponse.json({
            success: true,
            devices: devices.map((d) => ({
                ...d,
                recentEvents: countMap.get(d.id) || 0,
                nextSyncDue: d.lastSyncedAt
                    ? new Date(d.lastSyncedAt.getTime() + d.pollingInterval * 1000)
                    : null,
            })),
        });
    } catch (error) {
        console.error('[Sync Status] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to get sync status' },
            { status: 500 }
        );
    }
}

// Helper: Process attendance event
async function processAttendanceEvent(schoolId, userId, eventTime) {
    const istOffset = 5.5 * 60 * 60 * 1000;
    const eventDate = new Date(eventTime.getTime() + istOffset);
    eventDate.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
        where: {
            userId_schoolId_date: {
                userId,
                schoolId,
                date: eventDate,
            },
        },
    });

    if (!existing) {
        await prisma.attendance.create({
            data: {
                userId,
                schoolId,
                date: eventDate,
                status: 'PRESENT',
                checkInTime: eventTime,
                markedAt: new Date(),
                remarks: 'Manual biometric sync',
                requiresApproval: false,
                approvalStatus: 'NOT_REQUIRED',
            },
        });
        return { created: true };
    } else if (!existing.checkOutTime) {
        const workingHours = existing.checkInTime
            ? (eventTime - existing.checkInTime) / (1000 * 60 * 60)
            : 0;

        await prisma.attendance.update({
            where: { id: existing.id },
            data: {
                checkOutTime: eventTime,
                workingHours: Math.round(workingHours * 100) / 100,
            },
        });
        return { updated: true };
    }

    return { ignored: true };
}
