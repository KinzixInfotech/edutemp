// src/app/robots.js
// Dynamic robots.txt for EduBreezy

export default function robots() {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edubreezy.com';

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
                    '/reset-password',
                    '/verify/',
                ],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: [
                    '/api/',
                    '/dashboard/',
                ],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
