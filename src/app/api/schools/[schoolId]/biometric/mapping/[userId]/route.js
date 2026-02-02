// app/api/schools/[schoolId]/biometric/mapping/[userId]/route.js
// Single user mapping management: Get, Delete

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * GET - Get mapping status for a specific user
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');

    try {
        const whereClause = { schoolId, userId };
        if (deviceId) whereClause.deviceId = deviceId;

        const mappings = await prisma.biometricIdentityMap.findMany({
            where: whereClause,
            include: {
                device: {
                    select: {
                        id: true,
                        name: true,
                        deviceType: true,
                        isEnabled: true,
                    },
                },
            },
        });

        // Also get RFID mappings for this user
        const rfidMappings = await prisma.rfidIdentityMap.findMany({
            where: { schoolId, userId, isActive: true },
            select: {
                id: true,
                cardUid: true,
                cardNumber: true,
                cardType: true,
                isPrimary: true,
                assignedAt: true,
                device: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            userId,
            biometricMappings: mappings.map((m) => ({
                id: m.id,
                deviceId: m.deviceId,
                deviceName: m.device.name,
                deviceUserId: m.deviceUserId,
                fingerprintCount: m.fingerprintCount,
                hasCard: m.hasCard,
                hasFace: m.hasFace,
                isActive: m.isActive,
                deviceEnabled: m.device.isEnabled,
                enrolledAt: m.enrolledAt,
            })),
            rfidCards: rfidMappings.map((r) => ({
                id: r.id,
                cardUidMasked: '****' + r.cardUid.slice(-4),
                cardNumber: r.cardNumber,
                cardType: r.cardType,
                isPrimary: r.isPrimary,
                deviceName: r.device?.name,
                assignedAt: r.assignedAt,
            })),
        });
    } catch (error) {
        console.error('[Biometric Mapping User] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user mapping' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Remove user mapping from device
 */
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;
    const { searchParams } = new URL(req.url);
    const deviceId = searchParams.get('deviceId');
    const removeFromDevice = searchParams.get('removeFromDevice') !== 'false';

    try {
        // Build where clause
        const whereClause = { schoolId, userId };
        if (deviceId) whereClause.deviceId = deviceId;

        // Get mappings to delete
        const mappings = await prisma.biometricIdentityMap.findMany({
            where: whereClause,
            include: {
                device: true,
            },
        });

        if (mappings.length === 0) {
            return NextResponse.json(
                { error: 'No mappings found for this user' },
                { status: 404 }
            );
        }

        // Optionally remove from devices
        const deviceResults = [];
        if (removeFromDevice) {
            for (const mapping of mappings) {
                try {
                    const client = createISAPIClient(mapping.device);
                    const result = await client.deleteUser(mapping.deviceUserId);
                    deviceResults.push({
                        deviceId: mapping.deviceId,
                        deviceName: mapping.device.name,
                        ...result,
                    });
                } catch (error) {
                    deviceResults.push({
                        deviceId: mapping.deviceId,
                        deviceName: mapping.device.name,
                        success: false,
                        error: error.message,
                    });
                }
            }
        }

        // Delete from database
        const deleted = await prisma.biometricIdentityMap.deleteMany({
            where: whereClause,
        });

        return NextResponse.json({
            success: true,
            message: `Removed ${deleted.count} mapping(s)`,
            deletedCount: deleted.count,
            deviceResults: removeFromDevice ? deviceResults : undefined,
        });
    } catch (error) {
        console.error('[Biometric Mapping User] DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to delete mapping' },
            { status: 500 }
        );
    }
}
