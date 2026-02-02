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
                        // Cards
                        let hasCard = false;
                        try {
                            // Try global search (or filtered if supported)
                            // We use searchCards with generous limit, filtering locally
                            // Optimization: In a real bulk sync, we should fetch ALL cards once.
                            // For reliable per-user sync, we trigger search here.
                            const cardResult = await client.searchCards(100);
                            if (cardResult.cards) {
                                hasCard = cardResult.cards.some(c => c.employeeNo === deviceUserId);
                            }
                        } catch (e) {
                            // Ignore card search error
                        }

                        // Fingerprints
                        let fpCount = 0;
                        try {
                            const fpResult = await client.searchFingerprints(100);
                            const userFps = fpResult.fingerprints?.filter(fp => fp.employeeNo === deviceUserId) || [];
                            fpCount = userFps.length;
                        } catch (e) {
                            // Fallback
                            fpCount = userCheck.fingerprints || 0;
                        }

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
