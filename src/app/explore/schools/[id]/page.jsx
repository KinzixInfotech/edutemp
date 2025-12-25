
import SchoolProfileClient from '@/components/explore/SchoolProfileClient';
import { redirect } from 'next/navigation';
import { isUUID } from '@/lib/slug-generator';

// Helper to get Base URL
const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000';
    }
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return url.replace(/\/$/, '');
};

const getSchoolBaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
        return 'http://school.localhost:3000';
    }
    return 'https://school.edubreezy.com';
};

// Generate dynamic metadata for SEO - Enhanced for Google ranking
export async function generateMetadata(props) {
    const params = await props.params;
    const { id } = params; // Can be slug or UUID
    const schoolBaseUrl = getSchoolBaseUrl();

    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/public/schools/${id}`, { next: { revalidate: 600 } });

        if (!response.ok) return { title: 'School Not Found | EduBreezy' };

        const data = await response.json();
        const schoolName = data?.school?.name || 'School Profile';
        const location = data?.school?.location || '';
        const rating = data?.overallRating ? `${data.overallRating.toFixed(1)}/5` : '';

        // Use slug for canonical URL, fallback to schoolId
        const urlIdentifier = data?.slug || data?.schoolId || id;
        const canonicalUrl = `${schoolBaseUrl}/explore/schools/${urlIdentifier}`;

        // Generate keywords for this school
        const keywords = [
            schoolName,
            `${schoolName} reviews`,
            `${schoolName} fees`,
            `${schoolName} admissions`,
            location,
            `schools in ${location}`,
            `best schools ${location}`,
            "EduBreezy",
            "school reviews",
            "school explorer"
        ].filter(Boolean);

        return {
            title: `${schoolName} - ${location} | EduBreezy`,
            description: `Explore ${schoolName} in ${location}${rating ? ` - Rated ${rating}` : ''}. View admissions, fees, reviews & more on EduBreezy - India's trusted school explorer.`,

            keywords: keywords,

            // Canonical URL
            alternates: {
                canonical: canonicalUrl,
            },

            // Open Graph
            openGraph: {
                title: `${schoolName} | EduBreezy School Explorer`,
                description: `Everything you need to know about ${schoolName}. Admissions, Fees, Reviews, Facilities & more on EduBreezy.`,
                url: canonicalUrl,
                siteName: 'EduBreezy',
                locale: 'en_IN',
                type: 'website',
                images: [
                    {
                        url: data?.school?.profilePicture || `${schoolBaseUrl}/edu_ex.png`,
                        width: 1200,
                        height: 630,
                        alt: `${schoolName} - EduBreezy`,
                    }
                ],
            },

            // Twitter Card
            twitter: {
                card: 'summary_large_image',
                title: `${schoolName} - ${location} | EduBreezy`,
                description: `Explore reviews, fees & admissions for ${schoolName}. Find your perfect school on EduBreezy.`,
                images: [data?.school?.profilePicture || `${schoolBaseUrl}/edu_ex.png`],
                creator: '@edubreezy',
            },

            // Robots
            robots: {
                index: true,
                follow: true,
            },
        };
    } catch (error) {
        console.error('SEO Fetch Error:', error);
        return {
            title: 'School Profile | EduBreezy',
            description: 'Find the best schools near you on EduBreezy - India\'s trusted school explorer platform.',
        };
    }
}

// 10 minute ISR for the page itself
export const revalidate = 600;

async function getSchool(id) {
    const baseUrl = getBaseUrl();
    try {
        const res = await fetch(`${baseUrl}/api/public/schools/${id}`, { next: { revalidate: 600 } });
        if (!res.ok) return null;
        return res.json();
    } catch (e) {
        console.error('[getSchool] Error:', e);
        return null;
    }
}

export default async function SchoolProfilePage(props) {
    const params = await props.params;
    const { id } = params; // Can be slug or UUID

    // Server-side fetch (deduped with generateMetadata if URLs match)
    const school = await getSchool(id);

    if (!school) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">School Not Found</h1>
                    <p className="text-gray-600 mt-2">The school you're looking for doesn't exist or has been removed.</p>
                </div>
            </div>
        );
    }

    // If accessed via UUID but school has a slug, redirect to slug URL for SEO
    if (isUUID(id) && school.slug) {
        redirect(`/explore/schools/${school.slug}`);
    }

    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'http://school.localhost:3000' : 'https://school.edubreezy.com';

    // Use slug for URLs, fallback to schoolId
    const urlIdentifier = school.slug || school.schoolId;

    // JSON-LD for Organization (EduBreezy brand consolidation)
    const organizationJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'EduBreezy',
        alternateName: ['Edu Breezy', 'EduBreezy School Explorer'],
        url: baseUrl,
        logo: `${baseUrl}/edu.png`,
        description: 'India\'s trusted school explorer platform. Find, compare, and connect with the best schools.',
        sameAs: [
            'https://www.facebook.com/edubreezy',
            'https://twitter.com/edubreezy',
            'https://www.instagram.com/edubreezy',
            'https://www.linkedin.com/company/edubreezy'
        ]
    };

    // JSON-LD for School (enhanced with better structure)
    const schoolJsonLd = school ? {
        '@context': 'https://schema.org',
        '@type': 'School',
        '@id': `${baseUrl}/explore/schools/${urlIdentifier}`,
        name: school.school?.name,
        image: school.school?.profilePicture ? [school.school.profilePicture] : [`${baseUrl}/edu_ex.png`],
        description: school.description || `Explore ${school.school?.name} on EduBreezy - India's trusted school explorer.`,
        address: {
            '@type': 'PostalAddress',
            streetAddress: school.school?.location,
            addressLocality: school.school?.location?.split(',')[0]?.trim(),
            addressRegion: school.school?.location?.split(',')[1]?.trim() || 'India',
            addressCountry: 'IN'
        },
        telephone: school.school?.contactNumber,
        url: `${baseUrl}/explore/schools/${urlIdentifier}`,
        aggregateRating: school.overallRating > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: school.overallRating.toFixed(1),
            reviewCount: school._count?.ratings || 0,
            bestRating: '5',
            worstRating: '1'
        } : undefined,
        priceRange: school.minFee && school.maxFee ? `₹${school.minFee} - ₹${school.maxFee}` : undefined,
        foundingDate: school.establishedYear ? `${school.establishedYear}` : undefined,
        numberOfEmployees: school.totalTeachers > 0 ? {
            '@type': 'QuantitativeValue',
            value: school.totalTeachers
        } : undefined,
        // Link to EduBreezy as parent organization
        isPartOf: {
            '@type': 'WebSite',
            '@id': `${baseUrl}/#website`,
            name: 'EduBreezy School Explorer',
            url: baseUrl,
        },
        // Publisher/platform reference
        publisher: {
            '@id': `${baseUrl}/#organization`
        }
    } : null;

    // JSON-LD for Sitelinks Searchbox (for Google sitelinks)
    const sitelinksSearchboxJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        name: 'EduBreezy School Explorer',
        alternateName: ['EduBreezy', 'School Explorer'],
        url: baseUrl,
        potentialAction: {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: `${baseUrl}/explore/schools?search={search_term_string}`
            },
            'query-input': 'required name=search_term_string'
        }
    };

    // JSON-LD for BreadcrumbList (SEO)
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            {
                '@type': 'ListItem',
                position: 1,
                name: 'Home',
                item: baseUrl
            },
            {
                '@type': 'ListItem',
                position: 2,
                name: 'Schools',
                item: `${baseUrl}/explore/schools`
            },
            {
                '@type': 'ListItem',
                position: 3,
                name: school.school?.name || 'School',
                item: `${baseUrl}/explore/schools/${urlIdentifier}`
            }
        ]
    };

    return (
        <>
            {/* Organization Schema (EduBreezy brand) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
            />
            {/* Sitelinks Searchbox */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(sitelinksSearchboxJsonLd) }}
            />
            {/* Breadcrumb */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            {/* School Structured Data */}
            {schoolJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }}
                />
            )}
            <SchoolProfileClient schoolId={school.schoolId} initialData={school} />
        </>
    );
}
