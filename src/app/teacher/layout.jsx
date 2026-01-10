import TeacherClientWrapper from '@/components/teacher/TeacherClientWrapper';

export const metadata = {
    metadataBase: new URL('https://teacher.edubreezy.com'),
    title: {
        template: '%s | EduBreezy Teacher Portal',
        default: 'EduBreezy Teacher Portal - Marks Entry & Exam Management',
    },
    description: 'Teacher portal for EduBreezy schools. Enter marks, view assigned exams, manage grades, and track student performance securely.',
    keywords: [
        'edubreezy teacher',
        'teacher portal',
        'marks entry',
        'exam management',
        'grade entry',
        'teacher dashboard',
        'school teacher portal',
        'online marks entry',
        'student grades',
        'exam evaluation',
    ],
    applicationName: 'EduBreezy Teacher Portal',
    authors: [{ name: 'EduBreezy', url: 'https://www.edubreezy.com' }],
    creator: 'EduBreezy',
    publisher: 'EduBreezy',
    generator: 'Next.js',
    category: 'Education',
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/favicon.ico", sizes: "192x192" },
        ],
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
    },
    alternates: {
        canonical: 'https://teacher.edubreezy.com',
    },
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        url: 'https://teacher.edubreezy.com',
        siteName: 'EduBreezy Teacher Portal',
        title: 'EduBreezy Teacher Portal - Marks Entry & Exam Management',
        description: 'Enter marks, view assigned exams, and manage student grades securely.',
        images: [
            {
                url: 'https://teacher.edubreezy.com/by.png',
                width: 512,
                height: 512,
                alt: 'EduBreezy Teacher Portal',
                type: 'image/png',
            },
        ],
    },
    robots: {
        index: true,
        follow: true,
    },
    other: {
        'theme-color': '#0569ff',
        'mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-title': 'EduBreezy Teacher',
    },
};

// JSON-LD Structured Data
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'EduBreezy Teacher Portal',
    alternateName: 'EduBreezy Marks Entry Portal',
    description: 'Teacher portal for marks entry and exam management in EduBreezy schools.',
    url: 'https://teacher.edubreezy.com',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    provider: {
        '@type': 'Organization',
        name: 'EduBreezy',
        url: 'https://www.edubreezy.com',
    },
    featureList: [
        'Marks Entry',
        'Exam Management',
        'Grade Calculation',
        'Student Performance',
        'Assigned Exams View',
    ],
};

export default function TeacherLayout({ children }) {
    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <TeacherClientWrapper>
                {children}
            </TeacherClientWrapper>
        </>
    );
}
