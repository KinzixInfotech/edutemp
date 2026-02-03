import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const { deviceId } = await req.json();

        // 1. Get devices to sync
        const whereClause = { schoolId, isEnabled: true };
        if (deviceId) whereClause.id = deviceId;

        const devices = await prisma.biometricDevice.findMany({
            where: whereClause,
            include: {
                identityMaps: {
                    include: { user: true }
                }
            }
        });

        if (devices.length === 0) {
            return NextResponse.json({ error: 'No enabled devices found' }, { status: 404 });
        }

        const results = [];

        for (const device of devices) {
            const deviceResult = {
                deviceId: device.id,
                deviceName: device.name,
                processed: 0,
                created: 0,
                updated: 0,
                errors: [],
                enrollmentUpdated: 0
            };

            try {
                const client = createISAPIClient(device);

                // STEP 1: Fetch ALL cards for device (CardInfo/Search)
                // This is the reliable source for card existance, ignore UserInfo.cards
                const cardMap = new Map();
                try {
                    const cardSearch = await client.searchCards();
                    if (cardSearch.cards) {
                        for (const card of cardSearch.cards) {
                            if (!cardMap.has(card.employeeNo)) {
                                cardMap.set(card.employeeNo, []);
                            }
                            cardMap.get(card.employeeNo).push(card.cardNo);
                        }
                    }
                } catch (cardError) {
                    console.warn(`[Bulk Sync] Failed to fetch cards for device ${device.id}:`, cardError.message);
                }

                // 2. Iterate mappings for this device
                for (const mapping of device.identityMaps) {
                    deviceResult.processed++;
                    try {
                        const { deviceUserId } = mapping;
                        const userName = mapping.user.student?.name || mapping.user.name || "User";

                        // A. Push User to Device (Ensure existence)
                        const userCheck = await client.getUserInfo(deviceUserId);

                        if (!userCheck.found) {
                            await client.createUser(deviceUserId, userName);
                            deviceResult.created++;
                        } else if (userCheck.user.name !== userName) {
                            // Update name if mismatch
                            await client.createUser(deviceUserId, userName); // acts as upsert
                            deviceResult.updated++;
                        }

                        // B. Pull Enrollment Status
                        // Cards: Check against the CardInfo map we built
                        const userCards = cardMap.get(deviceUserId) || [];
                        const hasCard = userCards.length > 0;

                        // Fingerprints: Check UserInfo (numOfFP) - reliable on DS-K1
                        const fpCount = userCheck.fingerprints || 0;

                        // C. Update DB
                        await prisma.biometricIdentityMap.update({
                            where: { id: mapping.id },
                            data: {
                                hasCard: hasCard,
                                fingerprintCount: fpCount,
                                hasFace: (userCheck.faces || 0) > 0,
                                // lastSyncedAt, syncResult removed (not in schema)
                            }
                        });

                        deviceResult.enrollmentUpdated++;

                    } catch (userError) {
                        deviceResult.errors.push(`User ${mapping.deviceUserId}: ${userError.message}`);
                    }
                }

                // Update device last sync
                await prisma.biometricDevice.update({
                    where: { id: device.id },
                    data: { lastSyncedAt: new Date(), lastSyncStatus: 'SUCCESS' }
                });

            } catch (deviceError) {
                deviceResult.error = deviceError.message;
                await prisma.biometricDevice.update({
                    where: { id: device.id },
                    data: { lastSyncStatus: 'FAILED', lastErrorMessage: deviceError.message }
                });
            }
            results.push(deviceResult);
        }

        return NextResponse.json({
            success: true,
            results,
            message: "Bulk user sync completed"
        });

    } catch (error) {
        console.error('[Bulk User Sync] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
