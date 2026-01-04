/**
 * AI Settings API
 * CRUD for per-school AI settings
 * 
 * GET /api/admin/ai-settings?schoolId=xxx - Get settings
 * PUT /api/admin/ai-settings - Update settings
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Helper to verify admin access
async function verifyAdminAccess(request, schoolId) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Unauthorized', status: 401 };
    }

    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return { error: 'Unauthorized', status: 401 };
    }

    const fullUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { role: true },
    });

    if (!fullUser) {
        return { error: 'User not found', status: 404 };
    }

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(fullUser.role.name)) {
        return { error: 'Access denied. Admin role required.', status: 403 };
    }

    if (fullUser.role.name !== 'SUPER_ADMIN' && fullUser.schoolId !== schoolId) {
        return { error: 'Access denied to this school', status: 403 };
    }

    return { user: fullUser };
}

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
