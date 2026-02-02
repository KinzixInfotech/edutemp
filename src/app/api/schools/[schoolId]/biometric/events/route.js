// app/api/schools/[schoolId]/biometric/events/route.js
// Biometric events API - view and manage raw events

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET - List biometric events with filtering
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const deviceId = searchParams.get('deviceId');
    const userId = searchParams.get('userId');
    const resolved = searchParams.get('resolved');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const whereClause = { schoolId };

        if (deviceId) whereClause.deviceId = deviceId;
        if (userId) whereClause.resolvedUserId = userId;
        if (resolved === 'true') {
            whereClause.resolvedUserId = { not: null };
        } else if (resolved === 'false') {
            whereClause.resolvedUserId = null;
        }

        if (startDate || endDate) {
            whereClause.eventTime = {};
            if (startDate) whereClause.eventTime.gte = new Date(startDate);
            if (endDate) whereClause.eventTime.lte = new Date(endDate);
        }

        const [events, total] = await Promise.all([
            prisma.biometricAttendanceEvent.findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id: true,
                    deviceUserId: true,
                    eventType: true,
                    eventTime: true,
                    processedAt: true,
                    processingError: true,
                    createdAt: true,
                    device: {
                        select: { id: true, name: true },
                    },
                    resolvedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            student: { select: { name: true } },
                        },
                    },
                },
                orderBy: { eventTime: 'desc' },
            }),
            prisma.biometricAttendanceEvent.count({ where: whereClause }),
        ]);

        return NextResponse.json({
            success: true,
            events: events.map((e) => ({
                id: e.id,
                deviceUserId: e.deviceUserId,
                eventType: e.eventType,
                eventTime: e.eventTime,
                deviceName: e.device.name,
                resolvedUser: e.resolvedUser
                    ? {
                        id: e.resolvedUser.id,
                        name:
                            e.resolvedUser.student?.name ||
                            e.resolvedUser.name ||
                            e.resolvedUser.email,
                    }
                    : null,
                isResolved: !!e.resolvedUser,
                processedAt: e.processedAt,
                error: e.processingError,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Biometric Events] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch events' },
            { status: 500 }
        );
    }
}

/**
 * POST - Manually resolve unresolved events
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { eventId, userId } = body;

        if (!eventId || !userId) {
            return NextResponse.json(
                { error: 'Missing eventId or userId' },
                { status: 400 }
            );
        }

        // Verify event exists
        const event = await prisma.biometricAttendanceEvent.findFirst({
            where: { id: eventId, schoolId },
        });

        if (!event) {
            return NextResponse.json(
                { error: 'Event not found' },
                { status: 404 }
            );
        }

        // Verify user exists
        const user = await prisma.user.findFirst({
            where: { id: userId, schoolId },
            select: { id: true, name: true },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Update event
        await prisma.biometricAttendanceEvent.update({
            where: { id: eventId },
            data: {
                resolvedUserId: userId,
                processedAt: new Date(),
                processingError: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Event resolved successfully',
            eventId,
            userId,
            userName: user.name,
        });
    } catch (error) {
        console.error('[Biometric Events] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to resolve event' },
            { status: 500 }
        );
    }
}
