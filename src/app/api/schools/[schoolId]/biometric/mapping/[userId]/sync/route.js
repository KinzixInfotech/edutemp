// app/api/schools/[schoolId]/biometric/mapping/[userId]/sync/route.js
// Sync user enrollment status from device

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * POST - Sync user enrollment status from device
 * Checks if user exists on device and updates mapping with fingerprint/card/face counts
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, userId } = params;

    try {
        // Get all mappings for this user
        const mappings = await prisma.biometricIdentityMap.findMany({
            where: { schoolId, userId },
            include: {
                device: true,
                user: {
                    select: {
                        name: true,
                        email: true,
                        student: { select: { name: true } },
                    },
                },
            },
        });

        if (mappings.length === 0) {
            return NextResponse.json(
                { error: 'No device mappings found for this user' },
                { status: 404 }
            );
        }

        const results = [];

        for (const mapping of mappings) {
            const device = mapping.device;

            try {
                const client = createISAPIClient(device);
                const userInfo = await client.getUserInfo(mapping.deviceUserId);

                if (userInfo.found) {
                    // 1. Check Cards
                    let userCard = null;
                    try {
                        const cardResult = await client.searchCards();
                        if (cardResult.cards) {
                            userCard = cardResult.cards.find(c => c.employeeNo === mapping.deviceUserId);
                        }
                    } catch (e) {
                        console.error('Card search failed', e);
                    }

                    // 2. Check Fingerprints
                    let fpCount = 0;
                    try {
                        const fpResult = await client.searchFingerprints();
                        const userFps = fpResult.fingerprints?.filter(fp => fp.employeeNo === mapping.deviceUserId) || [];
                        fpCount = userFps.length;
                    } catch (e) {
                        console.error('Fingerprint search failed', e);
                        fpCount = userInfo.fingerprints || 0;
                    }

                    // Update mapping with actual enrollment data
                    await prisma.biometricIdentityMap.update({
                        where: { id: mapping.id },
                        data: {
                            fingerprintCount: fpCount,
                            hasCard: !!userCard,
                            hasFace: (userInfo.faces || 0) > 0,
                        },
                    });

                    results.push({
                        deviceId: device.id,
                        deviceName: device.name,
                        deviceUserId: mapping.deviceUserId,
                        success: true,
                        userFound: true,
                        enrollment: {
                            fingerprints: fpCount,
                            cards: userCard ? 1 : 0,
                            faces: userInfo.faces || 0,
                            name: userInfo.user?.name,
                            cardNo: userCard?.cardNo,
                        },
                    });
                } else {
                    // User not found on device
                    results.push({
                        deviceId: device.id,
                        deviceName: device.name,
                        deviceUserId: mapping.deviceUserId,
                        success: true,
                        userFound: false,
                        message: 'User not enrolled on device yet. Please enroll fingerprint/card on the physical device.',
                    });
                }
            } catch (deviceError) {
                console.error(`[Biometric Sync] Device ${device.name} error:`, deviceError.message);
                results.push({
                    deviceId: device.id,
                    deviceName: device.name,
                    success: false,
                    error: deviceError.message,
                });
            }
        }

        const userName = mappings[0].user.student?.name || mappings[0].user.name || mappings[0].user.email;

        return NextResponse.json({
            success: true,
            userId,
            userName,
            syncResults: results,
            summary: {
                total: results.length,
                synced: results.filter(r => r.success && r.userFound).length,
                notEnrolled: results.filter(r => r.success && r.userFound === false).length,
                failed: results.filter(r => !r.success).length,
            },
        });
    } catch (error) {
        console.error('[Biometric Sync] Error:', error);
        return NextResponse.json(
            { error: 'Failed to sync enrollment status' },
            { status: 500 }
        );
    }
}
