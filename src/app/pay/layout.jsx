import PayClientWrapper from '@/components/pay/PayClientWrapper';

export const metadata = {
    metadataBase: new URL('https://pay.edubreezy.com'),
    title: {
        template: '%s | EduBreezy Fee Payment',
        default: 'EduBreezy Pay - Fee Payment Portal',
    },
    description: 'Pay your school fees online securely with EduBreezy. View fee details, payment history, and make payments easily.',
    keywords: ['school fee payment', 'online fee payment', 'edubreezy fee', 'school fees'],
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "any" },
            { url: "/favicon.ico", sizes: "192x192" },
        ],
        shortcut: "/favicon.ico",
        apple: "/favicon.ico",
    },
    alternates: {
        canonical: '/pay',
    },
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        url: 'https://pay.edubreezy.com',
        siteName: 'EduBreezy Pay',
        title: 'EduBreezy Pay - Fee Payment Portal',
        description: 'Pay your school fees online securely with EduBreezy.',
        images: [
            {
                url: '/by.png',
                width: 1200,
                height: 630,
                alt: 'EduBreezy Fee Payment',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'EduBreezy Pay - Fee Payment Portal',
        description: 'Pay your school fees online securely.',
        images: ['/by.png'],
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function PayLayout({ children }) {
    return (
        <PayClientWrapper>
            {children}
        </PayClientWrapper>
    );
}
