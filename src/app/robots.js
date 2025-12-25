// src/app/robots.js
// Dynamic robots.txt for EduBreezy - subdomain aware

import { headers } from 'next/headers';

export default async function robots() {
    const headersList = await headers();
    const host = headersList.get('host') || '';

    // Determine if this is the school subdomain
    const isSchoolDomain = host.includes('school.edubreezy.com') || host.includes('school.localhost');

    // Use appropriate base URL based on domain
    const baseUrl = isSchoolDomain
        ? 'https://school.edubreezy.com'
        : (process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com');

    if (isSchoolDomain) {
        // Robots.txt for school.edubreezy.com
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
                    '/explore/', // Redirect to school subdomain
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: [
                    '/api/',
                    '/dashboard/',
                    '/explore/', // Should go to school subdomain
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
        host: baseUrl,
    };
}
