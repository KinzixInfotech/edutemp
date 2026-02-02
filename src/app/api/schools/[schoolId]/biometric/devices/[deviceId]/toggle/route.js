// app/api/schools/[schoolId]/biometric/devices/[deviceId]/toggle/route.js
// Toggle device enabled/disabled status

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * POST - Toggle device enabled status
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, deviceId } = params;

    try {
        const body = await req.json();
        const { isEnabled } = body;

        if (typeof isEnabled !== 'boolean') {
            return NextResponse.json(
                { error: 'isEnabled must be a boolean' },
                { status: 400 }
            );
        }

        // Check device exists and belongs to school
        const device = await prisma.biometricDevice.findFirst({
            where: { id: deviceId, schoolId },
            select: { id: true, name: true, isEnabled: true },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        // Update enabled status
        const updatedDevice = await prisma.biometricDevice.update({
            where: { id: deviceId },
            data: { isEnabled },
            select: {
                id: true,
                name: true,
                isEnabled: true,
                updatedAt: true,
            },
        });

        const action = isEnabled ? 'enabled' : 'disabled';

        return NextResponse.json({
            success: true,
            message: `Device ${action} successfully`,
            device: updatedDevice,
        });
    } catch (error) {
        console.error('[Biometric Device Toggle] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to toggle device status' },
            { status: 500 }
        );
    }
}
