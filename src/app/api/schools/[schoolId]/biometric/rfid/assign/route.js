// app/api/schools/[schoolId]/biometric/rfid/assign/route.js
// Single RFID card assignment

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * POST - Assign RFID card to user
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const {
            userId,
            cardUid,
            cardNumber,
            cardType = 'MIFARE',
            deviceId,
            syncToDevice = true,
        } = body;

        // Validation
        if (!userId || !cardUid) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, cardUid' },
                { status: 400 }
            );
        }

        // Validate card UID format (alphanumeric, 8-20 chars typically)
        if (!/^[A-Fa-f0-9]{4,32}$/.test(cardUid)) {
            return NextResponse.json(
                { error: 'Invalid card UID format. Must be hexadecimal (4-32 characters)' },
                { status: 400 }
            );
        }

        // Check if card already assigned (globally unique)
        const existingCard = await prisma.rfidIdentityMap.findFirst({
            where: { cardUid, isActive: true },
            include: {
                user: { select: { name: true, email: true } },
            },
        });

        if (existingCard) {
            return NextResponse.json(
                {
                    error: 'Card already assigned',
                    assignedTo: existingCard.user.name || existingCard.user.email,
                    assignedAt: existingCard.assignedAt,
                },
                { status: 409 }
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
                status: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found in this school' },
                { status: 404 }
            );
        }

        if (user.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Cannot assign card to inactive user' },
                { status: 400 }
            );
        }

        // Revoke any existing primary cards for this user
        await prisma.rfidIdentityMap.updateMany({
            where: { userId, isActive: true, isPrimary: true },
            data: { isPrimary: false },
        });

        // Get device if specified, otherwise use first enabled device
        let targetDevice = null;
        if (deviceId) {
            targetDevice = await prisma.biometricDevice.findFirst({
                where: { id: deviceId, schoolId, supportsRfid: true },
            });
        } else {
            targetDevice = await prisma.biometricDevice.findFirst({
                where: { schoolId, supportsRfid: true, isEnabled: true },
            });
        }

        // Sync to device if available
        let syncResult = null;
        if (syncToDevice && targetDevice) {
            try {
                // First check if user is mapped to device
                const mapping = await prisma.biometricIdentityMap.findFirst({
                    where: { userId, deviceId: targetDevice.id },
                });

                if (mapping) {
                    const client = createISAPIClient(targetDevice);
                    syncResult = await client.assignCard(mapping.deviceUserId, cardUid);
                } else {
                    syncResult = { success: false, error: 'User not mapped to this device' };
                }
            } catch (error) {
                syncResult = { success: false, error: error.message };
            }
        }

        // Create RFID mapping
        const rfidMapping = await prisma.rfidIdentityMap.create({
            data: {
                schoolId,
                userId,
                deviceId: targetDevice?.id,
                cardUid: cardUid.toUpperCase(),
                cardNumber,
                cardType,
                isActive: true,
                isPrimary: true,
            },
        });

        // Update biometric identity map to reflect card status
        if (targetDevice) {
            await prisma.biometricIdentityMap.updateMany({
                where: { userId, deviceId: targetDevice.id },
                data: { hasCard: true },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'RFID card assigned successfully',
            mapping: {
                id: rfidMapping.id,
                userId: rfidMapping.userId,
                cardUidMasked: '****' + rfidMapping.cardUid.slice(-4),
                cardType: rfidMapping.cardType,
                isPrimary: rfidMapping.isPrimary,
                deviceId: rfidMapping.deviceId,
                assignedAt: rfidMapping.assignedAt,
            },
            userName: user.student?.name || user.name || user.email,
            syncResult,
        });
    } catch (error) {
        console.error('[RFID Assign] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to assign RFID card' },
            { status: 500 }
        );
    }
}
