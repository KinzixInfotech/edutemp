/**
 * AI Usage Logs API
 * Returns AI usage logs for audit purposes
 * 
 * GET /api/admin/ai-usage?schoolId=xxx&limit=50&offset=0
 */

import { NextResponse } from 'next/server';
import { verifyAdminAccess } from '@/lib/api-auth';
import prisma from '@/lib/prisma';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const schoolId = searchParams.get('schoolId');
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const feature = searchParams.get('feature'); // Optional filter
        const startDate = searchParams.get('startDate'); // Optional filter
        const endDate = searchParams.get('endDate'); // Optional filter

        if (!schoolId) {
            return NextResponse.json({ error: 'schoolId is required' }, { status: 400 });
        }

        // Use shared auth utility - reduces code and ensures consistency
        const auth = await verifyAdminAccess(request, schoolId);
        if (auth.error) return auth.response;

        // Build where clause
        const where = { schoolId };

        if (feature) {
            where.feature = feature;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.createdAt.lte = new Date(endDate);
            }
        }

        // Get logs with user info
        const [logs, total] = await Promise.all([
            prisma.aiUsageLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: Math.min(limit, 100), // Max 100
                skip: offset,
            }),
            prisma.aiUsageLog.count({ where }),
        ]);

        // Calculate summary stats
        const stats = await prisma.aiUsageLog.aggregate({
            where,
            _sum: {
                totalTokens: true,
                costUsd: true,
            },
            _count: {
                id: true,
            },
        });

        return NextResponse.json({
            logs: logs.map(log => ({
                id: log.id,
                date: log.createdAt,
                feature: log.feature,
                model: log.model,
                inputTokens: log.inputTokens,
                outputTokens: log.outputTokens,
                totalTokens: log.totalTokens,
                costUsd: log.costUsd,
                cached: log.cached,
                userName: log.user?.name || 'Unknown',
                userEmail: log.user?.email,
                userRole: log.userRole,
            })),
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + logs.length < total,
            },
            summary: {
                totalCalls: stats._count.id,
                totalTokens: stats._sum.totalTokens || 0,
                totalCost: stats._sum.costUsd || 0,
            },
        });
    } catch (error) {
        console.error('Get AI usage logs error:', error);
        return NextResponse.json({ error: 'Failed to get AI usage logs' }, { status: 500 });
    }
}
