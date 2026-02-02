// app/api/schools/[schoolId]/biometric/devices/route.js
// Device management API: List and Create biometric devices

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { testDeviceConnection } from '@/lib/biometric/isapi-client';

/**
 * GET - List all biometric devices for a school
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const devices = await prisma.biometricDevice.findMany({
            where: { schoolId },
            select: {
                id: true,
                name: true,
                deviceType: true,
                ipAddress: true,
                port: true,
                connectionType: true,
                isEnabled: true,
                pollingInterval: true,
                lastSyncedAt: true,
                lastSyncStatus: true,
                lastErrorMessage: true,
                supportsFingerprint: true,
                supportsRfid: true,
                supportsFace: true,
                createdAt: true,
                updatedAt: true,
                // Exclude sensitive fields: username, password
                _count: {
                    select: {
                        identityMaps: true,
                        rfidMaps: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            devices: devices.map((device) => ({
                ...device,
                mappedUsers: device._count.identityMaps,
                mappedCards: device._count.rfidMaps,
                _count: undefined,
            })),
        });
    } catch (error) {
        console.error('[Biometric Devices] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch devices' },
            { status: 500 }
        );
    }
}

/**
 * POST - Add a new biometric device
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json();
        const {
            name,
            deviceType,
            ipAddress,
            port = 80,
            username,
            password,
            connectionType = 'HTTP',
            pollingInterval = 60,
            supportsFingerprint = true,
            supportsRfid = true,
            supportsFace = false,
            testBeforeSave = true,
        } = body;

        // Validation
        if (!name || !deviceType || !ipAddress || !username || !password) {
            return NextResponse.json(
                { error: 'Missing required fields: name, deviceType, ipAddress, username, password' },
                { status: 400 }
            );
        }

        if (!['FINGERPRINT', 'RFID', 'COMBO'].includes(deviceType)) {
            return NextResponse.json(
                { error: 'Invalid deviceType. Must be FINGERPRINT, RFID, or COMBO' },
                { status: 400 }
            );
        }

        // Validate IP address format
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!ipRegex.test(ipAddress)) {
            return NextResponse.json(
                { error: 'Invalid IP address format' },
                { status: 400 }
            );
        }

        // Check for duplicate device (same IP:port in this school)
        const existingDevice = await prisma.biometricDevice.findFirst({
            where: {
                schoolId,
                ipAddress,
                port,
            },
        });

        if (existingDevice) {
            return NextResponse.json(
                { error: 'A device with this IP address and port already exists' },
                { status: 409 }
            );
        }

        // Optional: Test connection before saving
        let connectionTestResult = null;
        if (testBeforeSave) {
            connectionTestResult = await testDeviceConnection({
                ipAddress,
                port,
                username,
                password,
                connectionType,
            });

            if (testBeforeSave && connectionTestResult?.success === false) {
                return NextResponse.json(
                    {
                        error: 'Device connection test failed',
                        connectionError: connectionTestResult.error,
                    },
                    { status: 422 }
                );
            }
        }

        // Create device
        const device = await prisma.biometricDevice.create({
            data: {
                schoolId,
                name,
                deviceType,
                ipAddress,
                port,
                username,
                password, // TODO: Consider encrypting in production
                connectionType,
                pollingInterval,
                supportsFingerprint,
                supportsRfid,
                supportsFace,
                isEnabled: true,
                lastSyncStatus: 'NEVER_SYNCED',
            },
            select: {
                id: true,
                name: true,
                deviceType: true,
                ipAddress: true,
                port: true,
                connectionType: true,
                isEnabled: true,
                pollingInterval: true,
                supportsFingerprint: true,
                supportsRfid: true,
                supportsFace: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Device added successfully',
            device,
            connectionTest: connectionTestResult,
        });
    } catch (error) {
        console.error('[Biometric Devices] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to add device' },
            { status: 500 }
        );
    }
}
