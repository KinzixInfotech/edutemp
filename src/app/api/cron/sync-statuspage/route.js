

// ========================================
// STEP 4: Create app/api/cron/sync-statuspage/route.js
// ========================================

// app/api/cron/sync-statuspage/route.js
import { NextResponse } from 'next/server';

import { autoStatuspage } from '@/lib/autoStatuspageSync';
import prisma from '@/lib/prisma';
import { getHealthMetrics } from 'middleware';

export async function GET(request) {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get health metrics
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
        else if (degradedCount > totalApis * 0.2) overallStatus = 'degraded';

        const dbHealth = await checkDatabaseHealth();

        const healthReport = {
            overall: overallStatus,
            apis,
            database: dbHealth,
            summary: { totalEndpoints: apis.length, healthyCount, warningCount, degradedCount, downCount },
        };

        // Sync to Statuspage
        const result = await autoStatuspage.autoDiscoverAndSync(healthReport);

        console.log('✅ Statuspage sync completed');

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            result,
        });

    } catch (error) {
        console.error('❌ Sync failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

