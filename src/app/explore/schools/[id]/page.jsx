
import SchoolProfileClient from '@/components/explore/SchoolProfileClient';

// Helper to get Base URL
const getBaseUrl = () => {
    // Force localhost in development or if explicitly set
    if (process.env.NODE_ENV === 'development') {
        return 'http://localhost:3000';
    }
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return url.replace(/\/$/, ''); // Remove trailing slash
};

// Generate dynamic metadata for SEO
export async function generateMetadata(props) {
    const params = await props.params;
    const { id } = params;

    try {
        const baseUrl = getBaseUrl();
        const response = await fetch(`${baseUrl}/api/public/schools/${id}`, { next: { revalidate: 600 } });

        if (!response.ok) return { title: 'School Not Found' };

        const data = await response.json();
        const schoolName = data?.school?.name || 'School Profile';
        const location = data?.school?.location || '';
        const rating = data?.overallRating ? `${data.overallRating.toFixed(1)}/5` : 'Not Rated';

        return {
            title: `${schoolName} - ${location}`,
            description: `Read verified reviews and explore facilities at ${schoolName} in ${location}. Rated ${rating} by parents.`,
            openGraph: {
                title: `${schoolName} | EduBreezy Explorer`,
                description: `Everything you need to know about ${schoolName}. Admissions, Fees, Reviews, and more.`,
                images: [data?.school?.profilePicture || '/edu_ex.png'],
            }
        };
    } catch (error) {
        console.error('SEO Fetch Error:', error);
        return {
            title: 'School Profile | EduBreezy',
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
    const { id } = params;

    // Server-side fetch (deduped with generateMetadata if URLs match)
    const school = await getSchool(id);

    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? 'http://school.localhost:3000' : 'https://school.edubreezy.com';

    // JSON-LD for School
    const jsonLd = school ? {
        '@context': 'https://schema.org',
        '@type': 'School',
        name: school.school?.name,
        image: school.school?.profilePicture ? [school.school.profilePicture] : [],
        description: school.description || `School profile for ${school.school?.name}`,
        address: {
            '@type': 'PostalAddress',
            streetAddress: school.school?.location, // Assuming full address in location for now
            addressCountry: 'IN'
        },
        telephone: school.school?.contactNumber,
        url: `${baseUrl}/explore/schools/${id}`,
        aggregateRating: school.overallRating > 0 ? {
            '@type': 'AggregateRating',
            ratingValue: school.overallRating.toFixed(1),
            reviewCount: school._count?.ratings || 0,
            bestRating: '5',
            worstRating: '1'
        } : undefined,
        priceRange: school.minFee && school.maxFee ? `₹${school.minFee} - ₹${school.maxFee}` : undefined,
    } : null;

    return (
        <>
            {jsonLd && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            )}
            <SchoolProfileClient schoolId={id} initialData={school} />
        </>
    );
}
