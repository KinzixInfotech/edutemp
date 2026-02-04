// app/api/schools/[schoolId]/biometric/agent-key/route.js
// Generate or retrieve the biometric agent API key for a school

import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * GET - Get current agent key (masked) or status
 */
export async function GET(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { biometricAgentKey: true }
        });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        if (!school.biometricAgentKey) {
            return NextResponse.json({
                hasKey: false,
                message: 'No agent key generated. Use POST to create one.'
            });
        }

        // Return masked key for display
        const key = school.biometricAgentKey;
        const masked = key.substring(0, 8) + '...' + key.substring(key.length - 4);

        return NextResponse.json({
            hasKey: true,
            maskedKey: masked,
            message: 'Agent key exists. Use POST with regenerate=true to create a new one.'
        });

    } catch (error) {
        console.error('[Agent Key] GET error:', error);
        return NextResponse.json(
            { error: 'Failed to get agent key', message: error.message },
            { status: 500 }
        );
    }
}

/**
 * POST - Generate new agent key
 * Body: { regenerate?: boolean }
 */
export async function POST(req, props) {
    const params = await props.params;
    const { schoolId } = params;

    try {
        const body = await req.json().catch(() => ({}));
        const { regenerate } = body;

        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { biometricAgentKey: true, name: true }
        });

        if (!school) {
            return NextResponse.json({ error: 'School not found' }, { status: 404 });
        }

        // Check if key exists and regenerate not requested
        if (school.biometricAgentKey && !regenerate) {
            return NextResponse.json({
                error: 'Agent key already exists',
                message: 'Set regenerate=true in body to create a new key (will invalidate the old one)'
            }, { status: 400 });
        }

        // Generate new key
        const newKey = `ebz_agent_${crypto.randomBytes(32).toString('hex')}`;

        await prisma.school.update({
            where: { id: schoolId },
            data: { biometricAgentKey: newKey }
        });

        console.log(`[Agent Key] Generated new key for school ${school.name}`);

        return NextResponse.json({
            success: true,
            agentKey: newKey,
            message: 'Agent key generated successfully. Save this key securely - it will not be shown again.',
            usage: {
                header: 'X-Agent-Key',
                endpoint: `/api/schools/${schoolId}/biometric/ingest`
            }
        });

    } catch (error) {
        console.error('[Agent Key] POST error:', error);
        return NextResponse.json(
            { error: 'Failed to generate agent key', message: error.message },
            { status: 500 }
        );
    }
}
