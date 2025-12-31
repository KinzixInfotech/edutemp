import PayClientWrapper from '@/components/pay/PayClientWrapper';

export const metadata = {
    metadataBase: new URL('https://pay.edubreezy.com'),
    title: {
        template: '%s | EduBreezy Pay - School Fee Payment Portal',
        default: 'EduBreezy Pay - Online School Fee Payment Portal | Pay Fees Securely',
    },
    description: 'Pay your school fees online instantly with EduBreezy Pay. Secure payment portal for students and parents. UPI, Cards, Net Banking accepted. View fee details, download receipts, and track payment history.',
    keywords: [
        'edubreezy pay',
        'pay fees edubreezy',
        'school fee payment',
        'online fee payment',
        'edubreezy fee payment',
        'pay school fees online',
        'student fee portal',
        'school fees online payment',
        'education fee payment',
        'tuition fee payment',
        'school payment portal',
        'fee payment app',
        'online school payment',
        'pay fees online india',
        'school management fee',
        'edubreezy school fees',
        'secure fee payment',
        'upi fee payment',
        'school fee receipt'
    ],
    applicationName: 'EduBreezy Pay',
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
        canonical: 'https://pay.edubreezy.com',
        languages: {
            'en-IN': 'https://pay.edubreezy.com',
        },
    },
    openGraph: {
        type: 'website',
        locale: 'en_IN',
        url: 'https://pay.edubreezy.com',
        siteName: 'EduBreezy Pay',
        title: 'EduBreezy Pay - Online School Fee Payment Portal',
        description: 'Pay your school fees online instantly. Secure payment with UPI, Cards & Net Banking. Download receipts and track payment history.',
        images: [
            {
                url: '/og-pay.png',
                width: 1200,
                height: 630,
                alt: 'EduBreezy Pay - School Fee Payment Portal',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@edubreezy',
        creator: '@edubreezy',
        title: 'EduBreezy Pay - Online School Fee Payment Portal',
        description: 'Pay your school fees online securely. UPI, Cards, Net Banking accepted.',
        images: ['/og-pay.png'],
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    verification: {
        google: 'your-google-verification-code', // Add your verification code
    },
    other: {
        'theme-color': '#0569ff',
        'mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-capable': 'yes',
        'apple-mobile-web-app-status-bar-style': 'default',
        'apple-mobile-web-app-title': 'EduBreezy Pay',
        'format-detection': 'telephone=no',
    },
};

// JSON-LD Structured Data for SEO
const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'EduBreezy Pay',
    alternateName: 'EduBreezy Fee Payment Portal',
    description: 'Online school fee payment portal for students and parents. Pay fees securely using UPI, Cards, and Net Banking.',
    url: 'https://pay.edubreezy.com',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Any',
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'INR',
    },
    provider: {
        '@type': 'Organization',
        name: 'EduBreezy',
        url: 'https://www.edubreezy.com',
        logo: 'https://www.edubreezy.com/by.png',
        sameAs: [
            'https://twitter.com/edubreezy',
            'https://facebook.com/edubreezy',
            'https://instagram.com/edubreezy',
            'https://linkedin.com/company/edubreezy'
        ]
    },
    featureList: [
        'Online Fee Payment',
        'Multiple Payment Methods',
        'Instant Receipt Generation',
        'Payment History',
        'Secure Transactions',
        'UPI Payments',
        'Card Payments',
        'Net Banking'
    ],
    screenshot: 'https://pay.edubreezy.com/og-pay.png',
    aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '1250',
        bestRating: '5',
        worstRating: '1'
    }
};

// BreadcrumbList for better navigation indexing
const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
        {
            '@type': 'ListItem',
            position: 1,
            name: 'EduBreezy',
            item: 'https://www.edubreezy.com'
        },
        {
            '@type': 'ListItem',
            position: 2,
            name: 'Pay Fees',
            item: 'https://pay.edubreezy.com'
        }
    ]
};

// FAQ Schema for common questions
const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
        {
            '@type': 'Question',
            name: 'How do I pay my school fees online with EduBreezy?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Visit pay.edubreezy.com, enter your school code, login with your admission number and password, select the installments to pay, and complete payment using UPI, Cards, or Net Banking.'
            }
        },
        {
            '@type': 'Question',
            name: 'What payment methods are accepted on EduBreezy Pay?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'EduBreezy Pay accepts UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards (Visa, Mastercard, RuPay), Net Banking, and popular wallets.'
            }
        },
        {
            '@type': 'Question',
            name: 'Is EduBreezy Pay secure?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'Yes, EduBreezy Pay uses 256-bit SSL encryption and is PCI-DSS compliant. All transactions are processed through certified payment gateways.'
            }
        },
        {
            '@type': 'Question',
            name: 'How do I get a receipt after paying fees?',
            acceptedAnswer: {
                '@type': 'Answer',
                text: 'After successful payment, you can download the receipt instantly from the dashboard. Receipts are also sent to your registered email.'
            }
        }
    ]
};

export default function PayLayout({ children }) {
    return (
        <>
            {/* JSON-LD Structured Data */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <PayClientWrapper>
                {children}
            </PayClientWrapper>
        </>
    );
}
