// app/api/schools/[schoolId]/biometric/ingest/route.js
// Receives events pushed from Local Biometric Agents running at schools

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// IST Timezone offset
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Generate event hash for deduplication
const generateEventHash = (deviceId, deviceUserId, eventTime) => {
    const data = `${deviceId}:${deviceUserId}:${new Date(eventTime).toISOString()}`;
    return crypto.createHash('md5').update(data).digest('hex');
};

/**
 * POST - Receive events from Local Biometric Agent
 * Headers: X-Agent-Key: <school-specific-agent-key>
 * Body: { deviceId, events: [...] }
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const startTime = Date.now();

    try {
        // Validate agent API key
        const agentKey = req.headers.get('x-agent-key');

        if (!agentKey) {
            return NextResponse.json(
                { error: 'Missing X-Agent-Key header' },
                { status: 401 }
            );
        }

        // Verify agent key matches school's key
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                biometricAgentKey: true,
                attendanceConfig: {
                    select: { enableBiometricAttendance: true }
                }
            }
        });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!school.biometricAgentKey || school.biometricAgentKey !== agentKey) {
            return NextResponse.json({ error: 'Invalid agent key' }, { status: 401 });
        }

        if (!school.attendanceConfig?.enableBiometricAttendance) {
            return NextResponse.json(
                { error: 'Biometric attendance not enabled for this school' },
                { status: 400 }
            );
        }

        // Parse body
        const body = await req.json();
        const { deviceId, events, agentVersion } = body;

        if (!deviceId || !events || !Array.isArray(events)) {
            return NextResponse.json(
                { error: 'Invalid payload: deviceId and events[] required' },
                { status: 400 }
            );
        }

        console.log(`[Ingest] School ${schoolId} - Device ${deviceId} - ${events.length} events`);

        // Verify device belongs to school
        const device = await prisma.biometricDevice.findFirst({
            where: { id: deviceId, schoolId, isEnabled: true }
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found or not enabled' },
                { status: 404 }
            );
        }

        let newEvents = 0;
        let duplicates = 0;
        let attendanceCreated = 0;
        let errors = 0;

        // Process each event
        for (const event of events) {
            try {
                const { deviceUserId, eventType, eventTime, cardNo, name, rawEventId } = event;

                if (!deviceUserId || !eventTime) {
                    errors++;
                    continue;
                }

                const eventTimeDate = new Date(eventTime);
                const eventHash = generateEventHash(deviceId, deviceUserId, eventTimeDate);

                // Check for duplicate
                const existing = await prisma.biometricAttendanceEvent.findUnique({
                    where: { eventHash }
                });

                if (existing) {
                    duplicates++;
                    continue;
                }

                // Find user mapping
                const mapping = await prisma.biometricIdentityMap.findFirst({
                    where: {
                        deviceId,
                        deviceUserId: deviceUserId.toString(),
                        isActive: true
                    }
                });

                // Store raw event
                await prisma.biometricAttendanceEvent.create({
                    data: {
                        schoolId,
                        deviceId,
                        deviceUserId: deviceUserId.toString(),
                        eventType: eventType || 'CHECK_IN',
                        eventTime: eventTimeDate,
                        eventHash,
                        rawEventId: rawEventId?.toString(),
                        cardNo,
                        resolvedUserId: mapping?.userId,
                        processedAt: mapping ? new Date() : null,
                        processingError: mapping ? null : 'User not mapped'
                    }
                });

                newEvents++;

                // Create live attendance if user is mapped
                if (mapping?.userId) {
                    try {
                        await updateLiveAttendance(schoolId, mapping.userId, eventTimeDate);
                        attendanceCreated++;
                    } catch (attErr) {
                        console.error(`[Ingest] Attendance error for ${mapping.userId}:`, attErr.message);
                    }
                }
            } catch (eventError) {
                console.error(`[Ingest] Event error:`, eventError.message);
                errors++;
            }
        }

        // Update device last sync time
        await prisma.biometricDevice.update({
            where: { id: deviceId },
            data: {
                lastSyncedAt: new Date(),
                lastSyncStatus: 'SUCCESS',
                lastErrorMessage: null
            }
        });

        const executionTime = Date.now() - startTime;
        console.log(`[Ingest] Done in ${executionTime}ms - New: ${newEvents}, Duplicates: ${duplicates}`);

        return NextResponse.json({
            success: true,
            message: 'Events ingested successfully',
            stats: {
                received: events.length,
                newEvents,
                duplicates,
                attendanceCreated,
                errors,
                executionTime
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Ingest] Error:', error);
        return NextResponse.json(
            { error: 'Failed to ingest events', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * Update live attendance - same logic as biometric-sync cron
 */
async function updateLiveAttendance(schoolId, userId, eventTime) {
    const eventTimeIST = new Date(eventTime.getTime() + IST_OFFSET_MS);
    const dateStr = eventTimeIST.toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const eventDate = new Date(Date.UTC(y, m - 1, d));

    const timeFormatted = eventTimeIST.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Kolkata'
    });

    // Get user info
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            name: true,
            role: { select: { name: true } },
            student: {
                select: {
                    userId: true,
                    studentParentLinks: {
                        where: { isActive: true },
                        select: { parent: { select: { userId: true } } }
                    }
                }
            }
        }
    });

    const userName = user?.name || 'User';
    const isStudent = !!user?.student?.userId;
    const roleName = user?.role?.name?.toUpperCase() || '';
    const isStudentUser = isStudent || roleName === 'STUDENT';
    const parentIds = user?.student?.studentParentLinks?.map(l => l.parent.userId) || [];

    // Check existing attendance
    const existingAttendance = await prisma.attendance.findUnique({
        where: {
            userId_schoolId_date: { userId, schoolId, date: eventDate }
        }
    });

    if (!existingAttendance) {
        // First punch - mark present
        await prisma.attendance.create({
            data: {
                userId,
                schoolId,
                date: eventDate,
                status: 'PRESENT',
                checkInTime: isStudentUser ? null : eventTime,
                markedAt: new Date(),
                remarks: isStudentUser ? 'Biometric present (live)' : 'Biometric check-in (live)',
                deviceInfo: { source: 'biometric-agent', live: true, isStudent: isStudentUser },
                requiresApproval: false,
                approvalStatus: 'NOT_REQUIRED',
                isBiometricEntry: true,
                isBiometricFinalized: false
            }
        });

        // Send notification
        if (isStudentUser) {
            await sendNotification({
                schoolId,
                title: `✅ Marked Present`,
                message: `${userName} has been marked present today`,
                type: 'ATTENDANCE',
                priority: 'NORMAL',
                icon: '✅',
                targetOptions: { userIds: [userId, ...parentIds] },
                metadata: { eventType: 'BIOMETRIC_PRESENT', userId },
                actionUrl: '/attendance'
            });
        } else {
            await sendNotification({
                schoolId,
                title: `✅ Checked In`,
                message: `${userName} checked in at ${timeFormatted}`,
                type: 'ATTENDANCE',
                priority: 'NORMAL',
                icon: '✅',
                targetOptions: { userIds: [userId] },
                metadata: { eventType: 'BIOMETRIC_CHECK_IN', time: timeFormatted, userId },
                actionUrl: '/attendance'
            });
        }
    } else if (!existingAttendance.isBiometricFinalized && !isStudentUser) {
        // Staff: update check-out
        const checkInTime = existingAttendance.checkInTime;
        const workingHours = checkInTime
            ? (eventTime - new Date(checkInTime)) / (1000 * 60 * 60)
            : 0;

        await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
                checkOutTime: eventTime,
                workingHours: Math.round(workingHours * 100) / 100
            }
        });

        await sendNotification({
            schoolId,
            title: `👋 Checked Out`,
            message: `${userName} checked out at ${timeFormatted}`,
            type: 'ATTENDANCE',
            priority: 'NORMAL',
            icon: '👋',
            targetOptions: { userIds: [userId] },
            metadata: {
                eventType: 'BIOMETRIC_CHECK_OUT',
                time: timeFormatted,
                userId,
                workingHours: Math.round(workingHours * 100) / 100
            },
            actionUrl: '/attendance'
        });
    }
}
