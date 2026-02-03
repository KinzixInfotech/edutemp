// app/api/schools/[schoolId]/biometric/devices/[deviceId]/calibrate/route.js
// Device calibration API - sync time with server and manage time/date format settings

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { createISAPIClient } from '@/lib/biometric/isapi-client';

/**
 * GET - Get device current time and format settings
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, deviceId } = params;

    try {
        const device = await prisma.biometricDevice.findFirst({
            where: { id: deviceId, schoolId },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        const client = createISAPIClient(device);
        const result = await client.getDeviceTime();

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to get device time' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            deviceId: device.id,
            deviceName: device.name,
            deviceTime: result.deviceTime,
            timezone: result.timezone,
            timeFormat: result.timeFormat,
            dateFormat: result.dateFormat,
            serverTime: new Date(),
            timeDiff: result.deviceTime ?
                Math.abs(new Date() - result.deviceTime) / 1000 : null, // seconds
        });
    } catch (error) {
        console.error('[Device Calibrate] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to get device time' },
            { status: 500 }
        );
    }
}

/**
 * POST - Sync device time with server time and optionally set format
 * Body: { timeFormat?: '12hour' | '24hour', dateFormat?: 'DD-MM-YYYY' | 'MM-DD-YYYY' | 'YYYY-MM-DD' }
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId, deviceId } = params;

    try {
        const body = await req.json().catch(() => ({}));
        const { timeFormat, dateFormat } = body;

        const device = await prisma.biometricDevice.findFirst({
            where: { id: deviceId, schoolId },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        const client = createISAPIClient(device);

        // Get current device time before sync
        const beforeSync = await client.getDeviceTime();

        // Sync time with optional format settings
        const serverTime = new Date();
        const options = {};
        if (timeFormat) options.timeFormat = timeFormat;
        if (dateFormat) options.dateFormat = dateFormat;

        console.log('[Calibrate API] Received body:', { timeFormat, dateFormat });
        console.log('[Calibrate API] Options to send:', options);

        const result = await client.setDeviceTime(serverTime, options);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to set device time' },
                { status: 500 }
            );
        }

        // Get device time after sync to verify
        const afterSync = await client.getDeviceTime();

        return NextResponse.json({
            success: true,
            message: 'Device time synchronized successfully',
            deviceId: device.id,
            deviceName: device.name,
            before: {
                deviceTime: beforeSync.deviceTime,
                timeFormat: beforeSync.timeFormat,
                dateFormat: beforeSync.dateFormat,
                timeDiff: beforeSync.deviceTime ?
                    Math.round((serverTime - beforeSync.deviceTime) / 1000) : null,
            },
            after: {
                deviceTime: afterSync.deviceTime,
                timeFormat: afterSync.timeFormat,
                dateFormat: afterSync.dateFormat,
                timeDiff: afterSync.deviceTime ?
                    Math.round((serverTime - afterSync.deviceTime) / 1000) : null,
            },
            serverTime,
        });
    } catch (error) {
        console.error('[Device Calibrate] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to calibrate device' },
            { status: 500 }
        );
    }
}
