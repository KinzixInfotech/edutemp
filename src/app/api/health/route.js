
// app/api/health/route.js
import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { getHealthMetrics } from 'middleware';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    try {
        const metrics = getHealthMetrics();
        const apis = Array.from(metrics.values());

        let healthyCount = 0, degradedCount = 0, downCount = 0, warningCount = 0;

        apis.forEach(api => {
            if (api.status === 'healthy') healthyCount++;
            else if (api.status === 'degraded') degradedCount++;
            else if (api.status === 'down') downCount++;
            else if (api.status === 'warning') warningCount++;
        });

        const totalApis = apis.length;
        const healthScore = totalApis > 0 ?
            (healthyCount * 100 + warningCount * 70 + degradedCount * 50) / totalApis : 100;

        let overallStatus = 'healthy';
        if (downCount > 0 || healthScore < 50) overallStatus = 'down';
        else if (degradedCount > totalApis * 0.2 || healthScore < 70) overallStatus = 'degraded';
        else if (warningCount > totalApis * 0.3 || healthScore < 85) overallStatus = 'warning';

        const dbHealth = await checkDatabaseHealth();

        const response = {
            status: overallStatus,
            healthScore: Math.round(healthScore),
            timestamp: new Date().toISOString(),
            uptime: formatUptime(process.uptime()),
            database: dbHealth,
            summary: {
                totalEndpoints: apis.length,
                healthyCount,
                warningCount,
                degradedCount,
                downCount,
            },
        };

        if (detailed) {
            response.apis = apis
                .sort((a, b) => b.totalRequests - a.totalRequests)
                .map(api => ({
                    endpoint: api.endpoint,
                    method: api.method,
                    status: api.status,
                    healthScore: api.healthScore,
                    totalRequests: api.totalRequests,
                    successRate: ((api.successCount / api.totalRequests) * 100).toFixed(2) + '%',
                    errorRate: api.healthDetails.errorRate,
                    avgResponseTime: api.healthDetails.avgResponseTime,
                    lastSuccess: api.lastSuccess,
                    lastFailure: api.lastFailure,
                }));
        }

        return NextResponse.json(response, {
            status: overallStatus === 'healthy' || overallStatus === 'warning' ? 200 : 503
        });

    } catch (error) {
        return NextResponse.json({
            status: 'error',
            message: 'Health check failed',
            error: error.message,
        }, { status: 503 });
    }
}

async function checkDatabaseHealth() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        return { status: 'healthy', message: 'Database connected' };
    } catch (error) {
        return { status: 'down', message: error.message };
    }
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
}