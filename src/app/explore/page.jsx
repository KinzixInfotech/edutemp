import ExploreHomeClient from '@/components/explore/ExploreHomeClient';
import { headers } from 'next/headers';

export async function generateMetadata() {
    const headersList = await headers();
    const host = headersList.get('host') || 'school.edubreezy.com';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    return {
        metadataBase: new URL(baseUrl),
        title: 'Best Schools in Your Area | EduBreezy School Explorer',
        description: 'Find top-rated schools near you. Compare fees, facilities, and reviews. Verified admission information for schools in your city like Hazaribagh and more.',
        keywords: 'best schools, school admission, school fees, private schools, list of schools, EduBreezy, Hazaribagh schools',
        openGraph: {
            title: 'Find the Best Schools for Your Child | EduBreezy',
            description: 'Browse verified schools, compare facilities, and view transparent fee structures—all in one modern platform.',
            type: 'website',
            url: `${baseUrl}/explore`,
            images: ['/edu_ex.png'],
        },
        alternates: {
            canonical: `${baseUrl}/explore`,
        },
        robots: {
            index: true,
            follow: true,
            googleBot: {
                index: true,
                follow: true,
            },
        },
    };
}

export default function SchoolExplorerHome() {
    // Determine base URL for Explorer (subdomain)
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'http://school.localhost:3000' : 'https://school.edubreezy.com';

    // Structured Data (JSON-LD) for SEO
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: 'EduBreezy School Explorer',
        url: baseUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: `${baseUrl}/explore/schools?q={search_term_string}`,
            'query-input': 'required name=search_term_string'
        },
        description: 'Find top-rated schools near you. Compare fees, facilities, and reviews.'
    };

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <ExploreHomeClient />
        </>
    );
}

