// app/api/schools/[schoolId]/biometric/devices/[deviceId]/route.js
// Single device management: Get, Update, Delete

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET - Get single device details
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId, deviceId } = params;

    try {
        const device = await prisma.biometricDevice.findFirst({
            where: {
                id: deviceId,
                schoolId,
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
                lastSyncedAt: true,
                lastSyncStatus: true,
                lastErrorMessage: true,
                supportsFingerprint: true,
                supportsRfid: true,
                supportsFace: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        identityMaps: true,
                        rfidMaps: true,
                        events: true,
                    },
                },
            },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            device: {
                ...device,
                mappedUsers: device._count.identityMaps,
                mappedCards: device._count.rfidMaps,
                totalEvents: device._count.events,
                _count: undefined,
            },
        });
    } catch (error) {
        console.error('[Biometric Device] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch device' },
            { status: 500 }
        );
    }
}

/**
 * PUT - Update device settings
 */
export async function PUT(req, props) {
    const params = await props.params;
    const { schoolId, deviceId } = params;

    try {
        const body = await req.json();
        const {
            name,
            ipAddress,
            port,
            username,
            password,
            connectionType,
            pollingInterval,
            isEnabled,
            supportsFingerprint,
            supportsRfid,
            supportsFace,
        } = body;

        // Check device exists and belongs to school
        const existingDevice = await prisma.biometricDevice.findFirst({
            where: { id: deviceId, schoolId },
        });

        if (!existingDevice) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        // Build update data (only include provided fields)
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (ipAddress !== undefined) {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            if (!ipRegex.test(ipAddress)) {
                return NextResponse.json(
                    { error: 'Invalid IP address format' },
                    { status: 400 }
                );
            }
            updateData.ipAddress = ipAddress;
        }
        if (port !== undefined) updateData.port = port;
        if (username !== undefined) updateData.username = username;
        if (password !== undefined) updateData.password = password;
        if (connectionType !== undefined) updateData.connectionType = connectionType;
        if (pollingInterval !== undefined) {
            if (pollingInterval < 30 || pollingInterval > 3600) {
                return NextResponse.json(
                    { error: 'Polling interval must be between 30 and 3600 seconds' },
                    { status: 400 }
                );
            }
            updateData.pollingInterval = pollingInterval;
        }
        if (isEnabled !== undefined) updateData.isEnabled = isEnabled;
        if (supportsFingerprint !== undefined) updateData.supportsFingerprint = supportsFingerprint;
        if (supportsRfid !== undefined) updateData.supportsRfid = supportsRfid;
        if (supportsFace !== undefined) updateData.supportsFace = supportsFace;

        // Check for IP conflict if IP/port changed
        if (updateData.ipAddress || updateData.port) {
            const conflictDevice = await prisma.biometricDevice.findFirst({
                where: {
                    schoolId,
                    ipAddress: updateData.ipAddress || existingDevice.ipAddress,
                    port: updateData.port || existingDevice.port,
                    NOT: { id: deviceId },
                },
            });

            if (conflictDevice) {
                return NextResponse.json(
                    { error: 'Another device with this IP address and port already exists' },
                    { status: 409 }
                );
            }
        }

        const updatedDevice = await prisma.biometricDevice.update({
            where: { id: deviceId },
            data: updateData,
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
                updatedAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Device updated successfully',
            device: updatedDevice,
        });
    } catch (error) {
        console.error('[Biometric Device] PUT error:', error);
        return NextResponse.json(
            { error: 'Failed to update device' },
            { status: 500 }
        );
    }
}

/**
 * DELETE - Remove device and all related mappings
 */
export async function DELETE(req, props) {
    const params = await props.params;
    const { schoolId, deviceId } = params;

    try {
        // Check device exists and belongs to school
        const device = await prisma.biometricDevice.findFirst({
            where: { id: deviceId, schoolId },
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        identityMaps: true,
                        rfidMaps: true,
                    },
                },
            },
        });

        if (!device) {
            return NextResponse.json(
                { error: 'Device not found' },
                { status: 404 }
            );
        }

        // Delete device (cascade will handle related records)
        await prisma.biometricDevice.delete({
            where: { id: deviceId },
        });

        return NextResponse.json({
            success: true,
            message: 'Device deleted successfully',
            deletedDevice: {
                id: device.id,
                name: device.name,
                mappingsRemoved: device._count.identityMaps + device._count.rfidMaps,
            },
        });
    } catch (error) {
        console.error('[Biometric Device] DELETE error:', error);
        return NextResponse.json(
            { error: 'Failed to delete device' },
            { status: 500 }
        );
    }
}
