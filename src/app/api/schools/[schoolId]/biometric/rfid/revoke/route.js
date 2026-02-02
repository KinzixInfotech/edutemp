// app/api/schools/[schoolId]/biometric/rfid/revoke/route.js
// Revoke RFID card

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * POST - Revoke RFID card
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const { cardId, cardUid, reason, revokedBy, removeFromDevice = true } = body;

        // Must provide either cardId or cardUid
        if (!cardId && !cardUid) {
            return NextResponse.json(
                { error: 'Must provide cardId or cardUid' },
                { status: 400 }
            );
        }

        // Find the card
        const whereClause = { schoolId, isActive: true };
        if (cardId) whereClause.id = cardId;
        if (cardUid) whereClause.cardUid = cardUid.toUpperCase();

        const rfidMapping = await prisma.rfidIdentityMap.findFirst({
            where: whereClause,
            include: {
                device: true,
                user: { select: { name: true, email: true } },
            },
        });

        if (!rfidMapping) {
            return NextResponse.json(
                { error: 'Active RFID card not found' },
                { status: 404 }
            );
        }

        // Remove from device if specified
        let deviceResult = null;
        if (removeFromDevice && rfidMapping.device) {
            try {
                const client = createISAPIClient(rfidMapping.device);
                deviceResult = await client.deleteCard(rfidMapping.cardUid);
            } catch (error) {
                deviceResult = { success: false, error: error.message };
            }
        }

        // Revoke in database
        await prisma.rfidIdentityMap.update({
            where: { id: rfidMapping.id },
            data: {
                isActive: false,
                isPrimary: false,
                revokedAt: new Date(),
                revokedBy,
                revokeReason: reason,
            },
        });

        // Update biometric identity map if this was the only card
        const remainingCards = await prisma.rfidIdentityMap.count({
            where: { userId: rfidMapping.userId, isActive: true },
        });

        if (remainingCards === 0 && rfidMapping.deviceId) {
            await prisma.biometricIdentityMap.updateMany({
                where: { userId: rfidMapping.userId, deviceId: rfidMapping.deviceId },
                data: { hasCard: false },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'RFID card revoked successfully',
            revokedCard: {
                id: rfidMapping.id,
                cardUidMasked: '****' + rfidMapping.cardUid.slice(-4),
                userName: rfidMapping.user.name || rfidMapping.user.email,
                reason,
                revokedAt: new Date().toISOString(),
            },
            deviceResult,
        });
    } catch (error) {
        console.error('[RFID Revoke] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to revoke RFID card' },
            { status: 500 }
        );
    }
}
