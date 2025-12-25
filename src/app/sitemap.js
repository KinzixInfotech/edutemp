// src/app/sitemap.js
// Dynamic sitemap for EduBreezy - includes all school pages for indexing
// Optimized for large databases with streaming/chunking

import prisma from '@/lib/prisma';

// Force dynamic rendering to avoid build-time database queries
export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

// For very large sitemaps (50k+ URLs), Google recommends splitting into multiple files
// This implementation handles up to ~50,000 URLs which is Google's limit per sitemap

export default async function sitemap() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edubreezy.com';
    const schoolBaseUrl = process.env.NODE_ENV === 'development'
        ? 'http://school.localhost:3000'
        : 'https://school.edubreezy.com';

    // Static pages - always included
    const staticPages = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/about`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
        {
            url: `${baseUrl}/partners`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/privacy-policy`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly',
            priority: 0.3,
        },
    ];

    // School Explorer pages (school.edubreezy.com subdomain)
    const explorerPages = [
        {
            url: schoolBaseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${schoolBaseUrl}/explore`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
        {
            url: `${schoolBaseUrl}/explore/schools`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 0.9,
        },
    ];

    // Skip database query during build time
    if (process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('[Sitemap] Skipping database query during build');
        return [...staticPages, ...explorerPages];
    }

    // Dynamic school pages - fetch in batches for large databases
    let schoolPages = [];
    try {
        const BATCH_SIZE = 5000;
        let cursor = undefined;
        let hasMore = true;

        while (hasMore && schoolPages.length < 45000) { // Leave room for static pages
            const schools = await prisma.schoolPublicProfile.findMany({
                where: { isPubliclyVisible: true },
                select: {
                    schoolId: true,
                    slug: true,
                    updatedAt: true,
                },
                take: BATCH_SIZE,
                skip: cursor ? 1 : 0,
                cursor: cursor ? { id: cursor } : undefined,
                orderBy: { id: 'asc' }
            });

            if (schools.length === 0) {
                hasMore = false;
                break;
            }

            const batchPages = schools.map((school) => ({
                url: `${schoolBaseUrl}/explore/schools/${school.slug || school.schoolId}`,
                lastModified: school.updatedAt || new Date(),
                changeFrequency: 'weekly',
                priority: 0.8,
            }));

            schoolPages = [...schoolPages, ...batchPages];

            if (schools.length < BATCH_SIZE) {
                hasMore = false;
            } else {
                cursor = schools[schools.length - 1].id;
            }
        }

        console.log(`[Sitemap] Generated ${schoolPages.length} school URLs`);

    } catch (error) {
        console.error('Sitemap: Error fetching schools:', error);
        // Return static pages only if database fails
    }

    return [...staticPages, ...explorerPages, ...schoolPages];
}
