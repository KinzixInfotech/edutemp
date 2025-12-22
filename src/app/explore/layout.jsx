
import ExploreClientWrapper from '@/components/explore/ExploreClientWrapper';

export const metadata = {
    metadataBase: new URL('https://school.edubreezy.com'),
    title: {
        template: '%s | EduBreezy School Explorer',
        default: 'EduBreezy School Explorer - Find Top Rated Schools',
    },
    description: 'Discover and compare the best schools for your child. Verified reviews, real-time rankings, and detailed insights powered by EduBreezy ERP.',
    keywords: ['school explorer', 'find schools', 'school rankings', 'verified school reviews', 'edubreezy'],
    alternates: {
        canonical: '/explore',
    },
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        url: 'https://school.edubreezy.com/explore',
        siteName: 'EduBreezy School Explorer',
        title: 'EduBreezy School Explorer - Find Top Rated Schools',
        description: 'Discover and compare the best schools for your child. Verified reviews, real-time rankings, and detailed insights.',
        images: [
            {
                url: '/edu_ex.png',
                width: 1200,
                height: 630,
                alt: 'EduBreezy School Explorer',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'EduBreezy School Explorer',
        description: 'Find the perfect school for your child with verified reviews and rankings.',
        images: ['/edu_ex.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function ExploreLayout({ children }) {
    return (
        <ExploreClientWrapper>
            {children}
        </ExploreClientWrapper>
    );
}
