/**
 * AI Settings API
 * CRUD for per-school AI settings
 * 
 * GET /api/admin/ai-settings?schoolId=xxx - Get settings
 * PUT /api/admin/ai-settings - Update settings
 */

import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/api-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        const auth = await verifyAdminAccess(request, schoolId);
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        let settings = await prisma.aiSettings.findUnique({
            where: { schoolId },
        });

        // Return defaults if no settings exist
        if (!settings) {
            settings = {
                id: null,
                schoolId,
                aiEnabled: true,
                allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
                dailyLimit: 1,
                monthlyTokenLimit: null,
                model: 'gemini-1.5-flash',
                createdAt: null,
                updatedAt: null,
            };
        }

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Get AI settings error:', error);
        return NextResponse.json({ error: 'Failed to get AI settings' }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { schoolId, aiEnabled, allowedRoles, dailyLimit, monthlyTokenLimit } = body;

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        const auth = await verifyAdminAccess(request, schoolId);
        if (auth.error) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const settings = await prisma.aiSettings.upsert({
            where: { schoolId },
            update: {
                aiEnabled: aiEnabled ?? true,
                allowedRoles: allowedRoles ?? ['SUPER_ADMIN', 'ADMIN'],
                dailyLimit: dailyLimit ?? 1,
                monthlyTokenLimit: monthlyTokenLimit ?? null,
            },
            create: {
                schoolId,
                aiEnabled: aiEnabled ?? true,
                allowedRoles: allowedRoles ?? ['SUPER_ADMIN', 'ADMIN'],
                dailyLimit: dailyLimit ?? 1,
                monthlyTokenLimit: monthlyTokenLimit ?? null,
            },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Update AI settings error:', error);
        return NextResponse.json({ error: 'Failed to update AI settings' }, { status: 500 });
    }
}
