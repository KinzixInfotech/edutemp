// app/api/schools/[schoolId]/biometric/devices/[deviceId]/test/route.js
// Test connection to a biometric device

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * POST - Test connection to device
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, deviceId } = params;

    try {
        // Get device with credentials
        const device = await prisma.biometricDevice.findFirst({
            where: {
                id: deviceId,
                schoolId,
            },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        // Create ISAPI client and test connection
        const client = createISAPIClient(device);
        const result = await client.testConnection();

        // Update device status based on result
        await prisma.biometricDevice.update({
            where: { id: deviceId },
            data: {
                lastSyncStatus: result.success ? 'SUCCESS' : 'FAILED',
                lastErrorMessage: result.success ? null : result.error,
                lastSyncedAt: result.success ? new Date() : undefined,
            },
        });

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: 'Connection successful',
                deviceInfo: result.deviceInfo,
                timestamp: new Date().toISOString(),
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Connection failed',
                error: result.error,
                timestamp: new Date().toISOString(),
            });
        }
    } catch (error) {
        console.error('[Biometric Device Test] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to test connection', details: error.message },
            { status: 500 }
        );
    }
}
