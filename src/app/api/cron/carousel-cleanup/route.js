/**
 * Carousel Cleanup Cron API
 * 
 * Automatically deletes expired carousel images from both database and UploadThing storage.
 * Optimized for speed — uses batch DB deletion and parallel storage cleanup.
 * 
 * Usage:
 * - pg_cron: SELECT net.http_get('https://yourapp.com/api/cron/carousel-cleanup?secret=XXX')
 * - Manual: GET /api/cron/carousel-cleanup?secret=XXX
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { utapi } from '@/lib/server-uploadthing';
import { delCache, generateKey } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Extract UploadThing file key from URL
function extractFileKey(fileUrl) {
    if (!fileUrl) return null;
    try {
        const urlParts = fileUrl.split('/');
        return urlParts[urlParts.length - 1] || null;
    } catch {
        return null;
    }
}

export async function GET(req) {
    const startTime = Date.now();

    try {
        // Verify cron secret
        const { searchParams } = new URL(req.url);
        const secret = searchParams.get('secret');
        const authHeader = req.headers.get('authorization');

        const expectedSecret = process.env.CRON_SECRET;
        const providedSecret = secret || authHeader?.replace('Bearer ', '');

        if (!expectedSecret || providedSecret !== expectedSecret) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log('[CarouselCleanup] Starting cleanup...');

        // 1. Find all expired carousel images in ONE query
        const expiredImages = await prisma.schoolCarouselImage.findMany({
            where: {
                expiryDate: {
                    not: null,
                    lte: new Date(),
                },
            },
            select: {
                id: true,
                imageUrl: true,
                schoolId: true,
            },
        });

        if (expiredImages.length === 0) {
            return NextResponse.json({
                success: true,
                deleted: 0,
                duration: `${Date.now() - startTime}ms`,
            });
        }

        console.log(`[CarouselCleanup] Found ${expiredImages.length} expired images.`);

        // 2. Collect all file keys for batch UploadThing deletion
        const fileKeys = expiredImages
            .map(img => extractFileKey(img.imageUrl))
            .filter(Boolean);

        // 3. Collect all IDs for batch DB deletion
        const expiredIds = expiredImages.map(img => img.id);

        // 4. Collect affected school IDs for cache invalidation
        const affectedSchools = [...new Set(expiredImages.map(img => img.schoolId))];

        // 5. Run storage deletion and DB deletion in parallel
        const [storageResult, dbResult] = await Promise.allSettled([
            // Batch delete from UploadThing (handles up to 100 at a time internally)
            fileKeys.length > 0
                ? utapi.deleteFiles(fileKeys).catch(err => {
                    console.error('[CarouselCleanup] Storage batch delete error:', err);
                    return { deletedCount: 0 };
                })
                : Promise.resolve({ deletedCount: 0 }),

            // Batch delete from DB in ONE query
            prisma.schoolCarouselImage.deleteMany({
                where: { id: { in: expiredIds } },
            }),
        ]);

        // 6. Invalidate cache for affected schools (parallel)
        await Promise.allSettled(
            affectedSchools.map(schoolId => {
                const cacheKey = generateKey('school_carousel', { schoolId });
                return delCache(cacheKey);
            })
        );

        const duration = Date.now() - startTime;
        const dbDeleted = dbResult.status === 'fulfilled' ? dbResult.value.count : 0;

        console.log(
            `[CarouselCleanup] Done in ${duration}ms: ` +
            `${dbDeleted} DB rows, ${fileKeys.length} storage files, ` +
            `${affectedSchools.length} schools`
        );

        return NextResponse.json({
            success: true,
            found: expiredImages.length,
            dbDeleted,
            storageFiles: fileKeys.length,
            affectedSchools: affectedSchools.length,
            duration: `${duration}ms`,
        });
    } catch (error) {
        console.error('[CarouselCleanup] Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            duration: `${Date.now() - startTime}ms`,
        }, { status: 500 });
    }
}

export async function POST(req) {
    return GET(req);
}
