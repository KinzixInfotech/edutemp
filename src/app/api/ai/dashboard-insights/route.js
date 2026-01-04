/**
 * AI Dashboard Insights API
 * Returns AI-generated insights for the dashboard (Admin-only)
 * 
 * GET /api/ai/dashboard-insights?schoolId=xxx
 * 
 * Rules:
 * - Only ADMIN / SUPER_ADMIN roles
 * - Only if aiAllowed === true (not on holidays/Sundays)
 * - Uses Gemini Flash-Lite
 * - Max 1 AI run/day/school
 * - Cached by schoolId + date + dayType
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateDashboardInsights } from '@/lib/ai/insightsGenerator';
import prisma from '@/lib/prisma';

// Initialize Supabase for auth
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');

        if (!schoolId) {
            return NextResponse.json(
                { error: 'schoolId is required' },
                { status: 400 }
            );
        }

        // Get auth token from header
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get full user with role
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            include: { role: true },
        });

        if (!fullUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        // Check role - Only ADMIN and SUPER_ADMIN
        const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
        if (!allowedRoles.includes(fullUser.role.name)) {
            return NextResponse.json(
                { error: 'Access denied. Admin role required.' },
                { status: 403 }
            );
        }

        // Verify school access
        if (fullUser.role.name !== 'SUPER_ADMIN' && fullUser.schoolId !== schoolId) {
            return NextResponse.json(
                { error: 'Access denied to this school' },
                { status: 403 }
            );
        }

        // Get school name for context
        const school = await prisma.school.findUnique({
            where: { id: schoolId },
            select: { name: true },
        });

        // Check if force refresh requested
        const forceRefresh = searchParams.get('force') === 'true';
        if (forceRefresh) {
            console.log('🔄 Force refresh requested - clearing cache');
            const { invalidateInsightsCache } = await import('@/lib/ai/insightsGenerator');
            await invalidateInsightsCache(schoolId);
        }

        // Generate insights
        const result = await generateDashboardInsights({
            schoolId,
            userId: fullUser.id,
            userRole: fullUser.role.name,
            schoolName: school?.name,
        });

        if (result.error) {
            return NextResponse.json(
                {
                    error: result.error,
                    dayType: result.dayType,
                    aiAllowed: false,
                },
                { status: 200 }
            );
        }

        return NextResponse.json({
            summary: result.summary,
            insights: result.insights,
            cached: result.cached,
            dayType: result.dayType,
            aiUsed: result.aiUsed,
            reason: result.reason,
        });
    } catch (error) {
        console.error('AI insights error:', error);
        return NextResponse.json(
            { error: 'Failed to generate insights' },
            { status: 500 }
        );
    }
}
