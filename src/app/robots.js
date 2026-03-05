// src/app/robots.js
// Dynamic robots.txt for EduBreezy - subdomain aware

import { headers } from 'next/headers';

export default async function robots() {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    // Determine if this is the school subdomain
    const isAtlasDomain = host.includes('atlas.edubreezy.com') || host.includes('atlas.localhost');

    // Use appropriate base URL based on domain
    const baseUrl = isAtlasDomain
        ? 'https://atlas.edubreezy.com'
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com');

    if (isAtlasDomain) {
        // Robots.txt for atlas.edubreezy.com
        return {
            rules: [
                {
                    userAgent: '*',
                    allow: '/',
                    disallow: [
                        '/api/',
                        '/login',
                        '/profile',
                    ],
                },
                {
                    userAgent: 'Googlebot',
                    allow: [
                        '/',
                        '/explore',
                        '/explore/schools',
                        '/explore/schools/*',
                    ],
                    disallow: [
                        '/api/',
                    ],
                },
            ],
            sitemap: `${baseUrl}/sitemap.xml`,
            host: baseUrl,
        };
    }

    // Robots.txt for main edubreezy.com domain
    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/api/',
                    '/dashboard/',
                    '/auth/',
                    '/login',
                    '/signup',
                    '/schoollogin',
                    '/reset-password',
                    '/verify/',
                    '/explore/', // Redirect to atlas subdomain
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: [
                    '/api/',
                    '/dashboard/',
                    '/explore/', // Should go to atlas subdomain
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
