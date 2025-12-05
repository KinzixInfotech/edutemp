
import SchoolProfileClient from '@/components/explore/SchoolProfileClient';

// Generate dynamic metadata for SEO
export async function generateMetadata(props) {
    const params = await props.params;
    const { id } = params;

    try {
        // Use absolute URL for server-side fetch
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/public/schools/${id}`, { next: { revalidate: 60 } });

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

export default async function SchoolProfilePage(props) {
    const params = await props.params;
    const { id } = params;

    return <SchoolProfileClient schoolId={id} />;
}
