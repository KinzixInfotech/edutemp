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
                    // Correct flow: Check CardInfo/Search for card existence (userInfo.cards is unreliable)
                    let userCard = null;
                    try {
                        const cardResult = await client.searchCards();
                        console.log(`[Sync] searchCards result: found ${cardResult.cards?.length || 0} cards total.`);

                        if (cardResult.cards && cardResult.cards.length > 0) {
                            // Log the first few cards to see format (debug only)
                            if (cardResult.cards.length > 0) {
                                console.log('[Sync] Sample card data:', JSON.stringify(cardResult.cards[0]));
                            }

                            userCard = cardResult.cards.find(c => c.employeeNo === mapping.deviceUserId);
                            if (userCard) {
                                console.log('[Sync] ✅ Found card for user:', userCard.cardNo);
                            } else {
                                console.warn(`[Sync] ❌ User ${mapping.deviceUserId} NOT found in card list of ${cardResult.cards.length} cards.`);
                            }
                        } else {
                            console.warn('[Sync] ⚠️ No cards returned from device search.');
                        }
                    } catch (e) {
                        console.warn('[Sync] Card search failed:', e.message);
                    }

                    // 2. Check Fingerprints
                    // Search is NOT supported on this device (400 Invalid Operation) - trust userInfo count
                    const fpCount = userInfo.fingerprints || 0;
                    console.log('[Sync] Using UserInfo FP count:', fpCount, 'for user:', mapping.deviceUserId);

                    // Update mapping with actual enrollment data
                    await prisma.biometricIdentityMap.update({
                        where: { id: mapping.id },
                        data: {
                            fingerprintCount: fpCount,
                            // Priority: Card search result (userCard) > UserInfo count (unreliable)
                            hasCard: !!userCard || (userInfo.cards || 0) > 0,
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
                            // Return explicit 1 if card found, else use UserInfo fallback
                            cards: userCard ? 1 : (userInfo.cards || 0),
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
