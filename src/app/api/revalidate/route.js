// ============================================
// API: /api/revalidate
// Busts server-side caches for a given pathname
// Called by the breadcrumb refresh button
// ============================================

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { invalidatePattern } from '@/lib/cache';

export async function POST(req) {
    try {
        const { pathname, schoolId } = await req.json();

        // 1. Bust Next.js internal cache for this path
        if (pathname) {
            revalidatePath(pathname, 'page');
        }

        // 2. Bust Redis cache based on the page
        if (schoolId) {
            // Dashboard page — bust consolidated + daily-stats
            if (pathname === '/dashboard' || pathname === '/dashboard/') {
                await invalidatePattern('dashboard-consolidated:*');
                await invalidatePattern('dashboard-daily-stats:*');
            }

            // Attendance pages
            if (pathname?.includes('/attendance') || pathname?.includes('/markattendance')) {
                await invalidatePattern(`attendance:*${schoolId}*`);
            }

            // Fees pages
            if (pathname?.includes('/fees')) {
                await invalidatePattern(`fee:*${schoolId}*`);
                await invalidatePattern(`fee-stats:*${schoolId}*`);
            }

            // Catch-all: always bust dashboard cache since it aggregates everything
            await invalidatePattern(`dashboard-consolidated:*${schoolId}*`);
        }

        return NextResponse.json({ revalidated: true, pathname });
    } catch (error) {
        console.error('[REVALIDATE ERROR]', error);
        return NextResponse.json({ revalidated: false, error: error.message }, { status: 500 });
    }
}
