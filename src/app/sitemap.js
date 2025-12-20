// src/app/sitemap.js
// Dynamic sitemap for EduBreezy - includes all school pages for indexing

import prisma from '@/lib/prisma';

export default async function sitemap() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edubreezy.com';
    const schoolBaseUrl = process.env.NODE_ENV === 'development'
        ? 'http://school.localhost:3000'
        : 'https://school.edubreezy.com';

    // Static pages
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

    // School Explorer pages
    const explorerPages = [
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

    // Dynamic school pages - fetch all public schools
    let schoolPages = [];
    try {
        const schools = await prisma.school.findMany({
            where: {
                // Only include schools that should be indexed
                // Add any conditions for public/active schools
            },
            select: {
                id: true,
                updatedAt: true,
                name: true,
            },
            take: 10000, // Limit to prevent timeout
        });

        schoolPages = schools.map((school) => ({
            url: `${schoolBaseUrl}/explore/schools/${school.id}`,
            lastModified: school.updatedAt || new Date(),
            changeFrequency: 'weekly',
            priority: 0.8,
        }));
    } catch (error) {
        console.error('Sitemap: Error fetching schools:', error);
    }

    return [...staticPages, ...explorerPages, ...schoolPages];
}
