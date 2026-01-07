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
import { verifyAdminAccess } from '@/lib/api-auth';
import { generateDashboardInsights } from '@/lib/ai/insightsGenerator';
import prisma from '@/lib/prisma';

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

        // Use shared auth utility - reduces code and ensures consistency
        const auth = await verifyAdminAccess(request, schoolId);
        if (auth.error) return auth.response;

        const { user: fullUser } = auth;

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
