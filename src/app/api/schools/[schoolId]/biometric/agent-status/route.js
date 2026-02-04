// app/api/schools/[schoolId]/biometric/agent-status/route.js
// Get agent connection status and info

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

/**
 * GET - Get agent status including last sync time and connection health
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        // Get school with agent key status
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: {
                id: true,
                name: true,
                biometricAgentKey: true,
            }
        });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        // Get all devices and their last sync times
        const devices = await prisma.biometricDevice.findMany({
            where: { schoolId, isEnabled: true },
            select: {
                id: true,
                name: true,
                lastSyncedAt: true,
                lastSyncStatus: true,
                lastErrorMessage: true,
            }
        });

        // Calculate agent status
        const hasAgentKey = !!school.biometricAgentKey;
        const maskedKey = hasAgentKey
            ? school.biometricAgentKey.substring(0, 12) + '...' + school.biometricAgentKey.slice(-4)
            : null;

        // Determine overall status based on device sync times
        let overallStatus = 'NOT_CONFIGURED';
        let lastActivity = null;

        if (hasAgentKey && devices.length > 0) {
            const syncTimes = devices
                .filter(d => d.lastSyncedAt)
                .map(d => new Date(d.lastSyncedAt));

            if (syncTimes.length > 0) {
                lastActivity = new Date(Math.max(...syncTimes));
                const minutesSinceSync = (Date.now() - lastActivity.getTime()) / (1000 * 60);

                if (minutesSinceSync <= 5) {
                    overallStatus = 'CONNECTED';
                } else if (minutesSinceSync <= 30) {
                    overallStatus = 'RECENT';
                } else if (minutesSinceSync <= 1440) { // 24 hours
                    overallStatus = 'STALE';
                } else {
                    overallStatus = 'OFFLINE';
                }
            } else {
                overallStatus = 'WAITING';
            }
        } else if (hasAgentKey) {
            overallStatus = 'NO_DEVICES';
        }

        return NextResponse.json({
            success: true,
            agent: {
                enabled: hasAgentKey,
                maskedKey,
                status: overallStatus,
                lastActivity,
                statusMessage: getStatusMessage(overallStatus),
            },
            devices: devices.map(d => ({
                id: d.id,
                name: d.name,
                lastSyncedAt: d.lastSyncedAt,
                lastSyncStatus: d.lastSyncStatus,
                error: d.lastErrorMessage,
            })),
            config: {
                schoolId,
                cloudUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com',
                pollIntervalMs: 120000,
            }
        });

    } catch (error) {
        console.error('[Agent Status] Error:', error);
        return NextResponse.json(
            { error: 'Failed to get agent status', message: error.message },
            { status: 500 }
        );
    }
}

function getStatusMessage(status) {
    switch (status) {
        case 'CONNECTED': return 'Agent connected and syncing';
        case 'RECENT': return 'Agent connected (last sync >5 min ago)';
        case 'STALE': return 'Agent may be offline (last sync >30 min ago)';
        case 'OFFLINE': return 'Agent offline (no sync in 24+ hours)';
        case 'WAITING': return 'Agent configured, waiting for first sync';
        case 'NO_DEVICES': return 'No biometric devices configured';
        case 'NOT_CONFIGURED': return 'Agent not configured';
        default: return 'Unknown status';
    }
}
