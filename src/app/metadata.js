import { baseUrl } from "./layout";

export const metadata = {
    // Core metadata
    title: {
        default: "EduBreezy – India’s Leading AI Powered School Management ERP",
        template: "%s | EduBreezy"
    },
    description: "EduBreezy is India's leading school management platform. Find and compare schools, read verified parent reviews, manage admissions, fees, attendance, and more. Edu Breezy simplifies education.",

    // Keywords for search (including variations)
    keywords: [
        "edubreezy", "edu breezy", "edu-breezy", "EduBreezy",
        "school management software", "school erp", "school explorer",
        "find schools near me", "school reviews", "school admissions",
        "school fees", "parent reviews", "education platform",
        "school management system india", "best school management app"
    ],

    // Authors and publisher
    authors: [{ name: "Kinzix Infotech", url: "https://www.kinzix.com" }],
    creator: "Kinzix Infotech",
    publisher: "EduBreezy",

    // Favicon and icons
    icons: {
        icon: [
            { url: "/favicon.ico", sizes: "48x48" },
        ],
        shortcut: "/favicon.ico",
    },

    // Manifest for PWA
    manifest: "/site.webmanifest",

    // Open Graph for social sharing
    openGraph: {
        type: "website",
        locale: "en_IN",
        url: baseUrl,
        siteName: "EduBreezy",
        title: "EduBreezy - AI-Powered School Management ERP",
        description: "From attendance to payroll — manage your entire school on one smart platform. AI-driven automation, live bus tracking, exam analytics, digital fees, and a seamless parent app, all with a modern user interface.",
        images: [
            {
                url: `${baseUrl}/by.png`,
                secureUrl: `${baseUrl}/by.png`,
                width: 1200,
                height: 630,
                alt: "EduBreezy - School Management Platform",
                type: "image/png",
            },
        ],
    },

    // Facebook App ID (optional but recommended for better insights)
    other: {
        'fb:app_id': process.env.NEXT_PUBLIC_FB_APP_ID || '',
    },

    // Twitter Card
    twitter: {
        card: "summary_large_image",
        title: "EduBreezy - AI-Powered School Management ERP",
        description: "From attendance to payroll — manage your entire school on one smart platform. AI-driven automation, live bus tracking, exam analytics, digital fees, and a seamless parent app, all with a modern user interface.",
        images: [`${baseUrl}/by.png`],
        creator: "@edubreezy",
    },

    // Robots
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },

    // Verification (add your actual verification codes)
    verification: {
        google: process.env.GOOGLE_SITE_VERIFICATION || "",
        // yandex: "yandex-verification-code",
        // bing: "bing-verification-code",
    },

    // Canonical and alternates
    metadataBase: new URL(baseUrl),
    alternates: {
        canonical: "/",
    },

    // Category
    category: "education",
};
