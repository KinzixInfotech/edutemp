
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
        return 'http://atlas.localhost:3000';
    }
    return 'https://atlas.edubreezy.com';
};

// Generate dynamic metadata for SEO - Enhanced for Google ranking
export async function generateMetadata(props) {
    const params = await props.params;
    const { id } = params; // Can be slug or UUID
    const schoolBaseUrl = getSchoolBaseUrl();

    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/public/schools/${id}`, {
            next: { revalidate: process.env.NODE_ENV === 'development' ? 0 : 60 }
        });

        if (!response.ok) return { title: 'School Not Found | EduBreezy' };

        const data = await response.json();
        const schoolName = data?.school?.name || 'School Profile';
        const location = data?.school?.location || '';
        const locationParts = location.split(',').map((part) => part.trim()).filter(Boolean);
        const primaryLocality = locationParts[0] || '';
        const region = locationParts[locationParts.length - 1] || '';
        const rating = data?.overallRating ? `${data.overallRating.toFixed(1)}/5` : '';
        const reviewCount = data?.reviewSummary?.totalReviews || data?._count?.ratings || 0;
        const ogImage = data?.logoImage || data?.school?.profilePicture || data?.coverImage || `${schoolBaseUrl}/edu_ex.png`;

        // Build a rich description based on provided summary, falling back to generic
        const descParts = [`Explore ${schoolName} in ${location}`];
        if (rating) descParts.push(`Rated ${rating}`);
        if (reviewCount) descParts.push(`${reviewCount} parent reviews`);
        if (data?.establishedYear) descParts.push(`Est. ${data.establishedYear}`);
        if (data?.minFee && data?.maxFee) descParts.push(`Fees ₹${data.minFee.toLocaleString('en-IN')}–₹${data.maxFee.toLocaleString('en-IN')}`);
        if (data?._count?.facilities) descParts.push(`${data._count.facilities}+ facilities`);

        const schoolDescription = data?.description || data?.tagline || '';
        const fallbackDesc = `${descParts.join(' · ')}. View admissions, fees, curriculum, reviews & more on EduBreezy.`;

        // Use school description (max 155 chars for SEO) if available
        let richDescription = fallbackDesc;
        if (schoolDescription && typeof schoolDescription === 'string' && schoolDescription.trim().length > 0) {
            const cleanDesc = schoolDescription.replace(/<[^>]*>?/gm, '').trim(); // Remove HTML tags if any
            richDescription = cleanDesc.length > 155 ? `${cleanDesc.substring(0, 152)}...` : cleanDesc;
        }

        // Use slug for canonical URL, fallback to schoolId
        const urlIdentifier = data?.slug || data?.schoolId || id;
        const canonicalUrl = `${schoolBaseUrl}/explore/schools/${urlIdentifier}`;

        // Generate keywords for this school
        const keywords = [
            schoolName,
            `${schoolName} reviews`,
            `${schoolName} fees`,
            `${schoolName} admissions`,
            `${schoolName} address`,
            `${schoolName} contact number`,
            `${schoolName} ${primaryLocality}`.trim(),
            `${schoolName} ${region}`.trim(),
            primaryLocality,
            `${primaryLocality} school`,
            `${primaryLocality} schools`,
            `${schoolName} admissions ${primaryLocality}`.trim(),
            `${schoolName} fees ${primaryLocality}`.trim(),
            location,
            `schools in ${location}`,
            `best schools ${location}`,
            region && `best schools in ${region}`,
            "EduBreezy",
            "school reviews",
            "school explorer"
        ].filter(Boolean);

        return {
            title: `${schoolName}${primaryLocality ? `, ${primaryLocality}` : ''} - Admissions, Fees, Reviews | EduBreezy`,
            description: richDescription,

            keywords: keywords,

            // Canonical URL
            alternates: {
                canonical: canonicalUrl,
            },

            // Open Graph
            openGraph: {
                title: `${schoolName}${primaryLocality ? `, ${primaryLocality}` : ''} | EduBreezy School Explorer`,
                description: richDescription,
                url: canonicalUrl,
                siteName: 'EduBreezy',
                locale: 'en_IN',
                type: 'website',
                images: [
                    {
                        url: ogImage,
                        width: 1200,
                        height: 630,
                        alt: `${schoolName} logo - EduBreezy`,
                    }
                ],
            },

            // Twitter Card
            twitter: {
                card: 'summary_large_image',
                title: `${schoolName}${primaryLocality ? `, ${primaryLocality}` : ''} - Admissions, Fees, Reviews`,
                description: richDescription,
                images: [ogImage],
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

// ISR settings: Disable caching in development, use short cache in production
export const revalidate = 60;


async function getSchool(id) {
    const baseUrl = getBaseUrl();
    try {
        const res = await fetch(`${baseUrl}/api/public/schools/${id}`, {
            next: {
                revalidate: process.env.NODE_ENV === 'development' ? 0 : 60,
                tags: [`school-profile-${id}`]
            },
            cache: process.env.NODE_ENV === 'development' ? 'no-store' : 'default'
        });
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
    const baseUrl = isDev ? 'http://atlas.localhost:3000' : 'https://atlas.edubreezy.com';

    // Use slug for URLs, fallback to schoolId
    const urlIdentifier = school.slug || school.schoolId || school.id;

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
        image: school.coverImage ? [school.coverImage] : (school.school?.profilePicture ? [school.school.profilePicture] : [`${baseUrl}/edu_ex.png`]),
        description: school.description || `Explore ${school.school?.name} on EduBreezy - India's trusted school explorer.`,
        slogan: school.tagline || undefined,
        address: {
            '@type': 'PostalAddress',
            streetAddress: school.school?.location,
            addressLocality: school.school?.location?.split(',')[0]?.trim(),
            addressRegion: school.school?.location?.split(',')[1]?.trim() || 'India',
            addressCountry: 'IN'
        },
        geo: school.latitude && school.longitude ? {
            '@type': 'GeoCoordinates',
            latitude: school.latitude,
            longitude: school.longitude
        } : undefined,
        telephone: school.school?.contactNumber,
        email: school.publicEmail || undefined,
        url: `${baseUrl}/explore/schools/${urlIdentifier}`,
        hasMap: school.latitude && school.longitude ? `https://www.google.com/maps?q=${school.latitude},${school.longitude}` : undefined,
        sameAs: Object.values(school.socials || {}).filter(Boolean),
        aggregateRating: school.overallRating > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: school.overallRating.toFixed(1),
            reviewCount: school.reviewSummary?.totalReviews || school._count?.ratings || 0,
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

    const webpageJsonLd = school ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        '@id': `${baseUrl}/explore/schools/${urlIdentifier}#webpage`,
        url: `${baseUrl}/explore/schools/${urlIdentifier}`,
        name: `${school.school?.name} - Admissions, Fees, Reviews`,
        description: school.description || school.tagline || `School profile for ${school.school?.name}`,
        isPartOf: { '@id': `${baseUrl}/#website` },
        about: {
            '@type': 'School',
            name: school.school?.name,
            address: school.school?.location,
        },
        primaryImageOfPage: (school.logoImage || school.school?.profilePicture || school.coverImage) ? {
            '@type': 'ImageObject',
            url: school.logoImage || school.school?.profilePicture || school.coverImage,
        } : undefined,
        dateModified: school.updatedAt || undefined,
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
            {webpageJsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageJsonLd) }}
                />
            )}
            <SchoolProfileClient schoolId={school.schoolId || school.id || school.slug} initialData={school} />
        </>
    );
}
