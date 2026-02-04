// app/api/schools/[schoolId]/biometric/reprocess/route.js
// Re-process stored biometric events into attendance records

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/notificationHelper';

// IST Timezone offset
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/**
 * POST - Re-process stored events into attendance
 * Body: { date?: string, userId?: string }
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json().catch(() => ({}));
        const { date, userId } = body;

        // Build query for events that have resolved users but no processedAt
        const whereClause = {
            schoolId,
            resolvedUserId: { not: null },
        };

        // Filter by date (default: last 7 days)
        if (date) {
            const targetDate = new Date(date);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            whereClause.eventTime = {
                gte: targetDate,
                lt: nextDay,
            };
        } else {
            whereClause.eventTime = {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            };
        }

        if (userId) {
            whereClause.resolvedUserId = userId;
        }

        // Get all events
        const events = await prisma.biometricAttendanceEvent.findMany({
            where: whereClause,
            orderBy: { eventTime: 'asc' },
            include: {
                resolvedUser: {
                    select: {
                        id: true,
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
                }
            }
        });

        console.log(`[Reprocess] Found ${events.length} events to process`);

        let created = 0;
        let updated = 0;
        let skipped = 0;

        // Group events by user and date
        const eventsByUserDate = {};
        for (const event of events) {
            const userId = event.resolvedUserId;
            const eventTimeIST = new Date(event.eventTime.getTime() + IST_OFFSET_MS);
            const dateStr = eventTimeIST.toISOString().split('T')[0];
            const key = `${userId}:${dateStr}`;

            if (!eventsByUserDate[key]) {
                eventsByUserDate[key] = {
                    userId,
                    dateStr,
                    events: [],
                    user: event.resolvedUser,
                };
            }
            eventsByUserDate[key].events.push(event);
        }

        // Process each user-date group
        for (const key of Object.keys(eventsByUserDate)) {
            const { userId, dateStr, events: userEvents, user } = eventsByUserDate[key];
            const [y, m, d] = dateStr.split('-').map(Number);
            const eventDate = new Date(Date.UTC(y, m - 1, d));

            // Sort events by time
            userEvents.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));

            const firstEvent = userEvents[0];
            const lastEvent = userEvents[userEvents.length - 1];

            // Check if student or staff
            const isStudent = !!user?.student?.userId;
            const roleName = user?.role?.name?.toUpperCase() || '';
            const isStudentUser = isStudent || roleName === 'STUDENT';

            // Check existing attendance
            const existingAttendance = await prisma.attendance.findUnique({
                where: {
                    userId_schoolId_date: {
                        userId,
                        schoolId,
                        date: eventDate,
                    },
                },
            });

            if (existingAttendance) {
                // Already has attendance - skip or update
                if (existingAttendance.isBiometricEntry) {
                    skipped++;
                    continue;
                }
                // Non-biometric attendance exists, skip
                skipped++;
                continue;
            }

            // Create attendance
            const checkInTime = isStudentUser ? null : new Date(firstEvent.eventTime);
            const checkOutTime = isStudentUser ? null : (userEvents.length > 1 ? new Date(lastEvent.eventTime) : null);

            let workingHours = 0;
            if (checkInTime && checkOutTime) {
                workingHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
            }

            await prisma.attendance.create({
                data: {
                    userId,
                    schoolId,
                    date: eventDate,
                    status: 'PRESENT',
                    checkInTime,
                    checkOutTime,
                    workingHours: Math.round(workingHours * 100) / 100,
                    markedAt: new Date(),
                    remarks: isStudentUser ? 'Biometric present (reprocessed)' : 'Biometric attendance (reprocessed)',
                    deviceInfo: { source: 'biometric', reprocessed: true, eventsCount: userEvents.length },
                    requiresApproval: false,
                    approvalStatus: 'NOT_REQUIRED',
                    isBiometricEntry: true,
                    isBiometricFinalized: false,
                },
            });

            created++;
            console.log(`[Reprocess] Created attendance for user ${userId} on ${dateStr}`);

            // Mark events as processed
            await prisma.biometricAttendanceEvent.updateMany({
                where: { id: { in: userEvents.map(e => e.id) } },
                data: { processedAt: new Date() },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Events reprocessed into attendance',
            stats: {
                eventsFound: events.length,
                attendanceCreated: created,
                attendanceUpdated: updated,
                skipped,
            },
        });
    } catch (error) {
        console.error('[Reprocess] Error:', error);
        return NextResponse.json(
            { error: 'Failed to reprocess events', message: error.message },
            { status: 500 }
        );
    }
}
