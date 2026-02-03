// app/api/schools/[schoolId]/biometric/mapping/route.js
// User-Device Mapping API: List and Create mappings

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * GET - List all user-device mappings for a school
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;
    const { searchParams } = new URL(req.url);

    const deviceId = searchParams.get('deviceId');
    const userId = searchParams.get('userId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    try {
        const whereClause = { schoolId };
        if (deviceId) whereClause.deviceId = deviceId;
        if (userId) whereClause.userId = userId;

        const [mappings, total] = await Promise.all([
            prisma.biometricIdentityMap.findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: { select: { name: true } },
                            student: {
                                select: {
                                    name: true,
                                    class: { select: { className: true } },
                                    section: { select: { name: true } },
                                },
                            },
                            teacher: {
                                select: { department: true },
                            },
                            // Include actual RFID cards for this user
                            rfidIdentityMaps: {
                                where: { isActive: true },
                                select: { id: true },
                            },
                        },
                    },
                    device: {
                        select: {
                            id: true,
                            name: true,
                            deviceType: true,
                        },
                    },
                },
                orderBy: { enrolledAt: 'desc' },
            }),
            prisma.biometricIdentityMap.count({ where: whereClause }),
        ]);

        return NextResponse.json({
            success: true,
            mappings: mappings.map((m) => ({
                id: m.id,
                userId: m.userId,
                deviceId: m.deviceId,
                deviceUserId: m.deviceUserId,
                fingerprintCount: m.fingerprintCount,
                // Use device-synced hasCard OR actual RFID card records
                hasCard: m.hasCard || (m.user.rfidIdentityMaps?.length || 0) > 0,
                hasFace: m.hasFace,
                isActive: m.isActive,
                enrolledAt: m.enrolledAt,
                user: {
                    id: m.user.id,
                    name: m.user.student?.name || m.user.name || m.user.email,
                    role: m.user.role.name,
                    class: m.user.student?.class?.className,
                    section: m.user.student?.section?.name,
                    department: m.user.teacher?.department,
                },
                device: m.device,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('[Biometric Mapping] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch mappings' },
            { status: 500 }
        );
    }
}

/**
 * POST - Create user-device mapping
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { userId, deviceId, deviceUserId, syncToDevice = true } = body;

        // Validation
        if (!userId || !deviceId) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, deviceId' },
                { status: 400 }
            );
        }

        // Verify user exists and belongs to school
        const user = await prisma.user.findFirst({
            where: { id: userId, schoolId },
            select: {
                id: true,
                name: true,
                email: true,
                student: { select: { name: true } },
                teacher: { select: { userId: true, name: true } },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in this school' },
                { status: 404 }
            );
        }

        // Verify device exists and belongs to school
        const device = await prisma.biometricDevice.findFirst({
            where: { id: deviceId, schoolId },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found in this school' },
                { status: 404 }
            );
        }

        // Generate deviceUserId if not provided (use ERP user ID)
        const effectiveDeviceUserId = deviceUserId || userId.replace(/-/g, '').slice(0, 20);

        // Check for existing mapping
        const existingMapping = await prisma.biometricIdentityMap.findFirst({
            where: {
                OR: [
                    { userId, deviceId },
                    { deviceId, deviceUserId: effectiveDeviceUserId },
                ],
            },
        });

        if (existingMapping) {
            return NextResponse.json(
                { error: 'Mapping already exists for this user or device user ID' },
                { status: 409 }
            );
        }

        // Optionally sync to device
        let syncResult = null;
        if (syncToDevice) {
            try {
                const client = createISAPIClient(device);
                const userName = user.student?.name || user.name || user.email;
                syncResult = await client.createUser(effectiveDeviceUserId, userName);
            } catch (syncError) {
                console.error('[Biometric Mapping] Sync to device failed:', syncError.message);
                syncResult = { success: false, error: syncError.message };
            }
        }

        // Create mapping in database
        const mapping = await prisma.biometricIdentityMap.create({
            data: {
                schoolId,
                userId,
                deviceId,
                deviceUserId: effectiveDeviceUserId,
                fingerprintCount: 0,
                hasCard: false,
                hasFace: false,
                isActive: true,
            },
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        student: { select: { name: true } },
                    },
                },
                device: {
                    select: { name: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: 'User mapped to device successfully',
            mapping: {
                id: mapping.id,
                userId: mapping.userId,
                deviceId: mapping.deviceId,
                deviceUserId: mapping.deviceUserId,
                userName: mapping.user.student?.name || mapping.user.name || mapping.user.email,
                deviceName: mapping.device.name,
            },
            syncResult,
        });
    } catch (error) {
        console.error('[Biometric Mapping] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to create mapping' },
            { status: 500 }
        );
    }
}
