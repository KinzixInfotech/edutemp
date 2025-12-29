// app/layout.js
import { useAuth } from "@/context/AuthContext";
import ClientProduct from "./ClientProduct";
import "./product.css";
// import ClientLayout from "./ClientLayout";
import { Toaster } from "@/components/ui/sonner"
import LoaderPage from "@/components/loader-page";
import Provider from "./Provider";
import NavigationProgress from "./components/NavigationProgress";
import PageTransitionLoader from "@/components/PageTransitionLoader";
import { Suspense } from "react";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://edubreezy.com';

export const metadata = {
  // Core metadata
  title: {
    default: "EduBreezy – India’s Leading School Management ERP & Explorer Platform",
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
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.ico", sizes: "192x192" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },

  // Manifest for PWA
  manifest: "/manifest.json",

  // Open Graph for social sharing
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: baseUrl,
    siteName: "EduBreezy",
    title: "EduBreezy - School Management & Explorer Platform",
    description: "EduBreezy is India's leading school management platform. Find and compare schools, read verified parent reviews, manage admissions, fees, attendance, and more. Edu Breezy simplifies education",
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
    title: "EduBreezy - School Management & Explorer Platform",
    description: "EduBreezy is India's leading school management platform. Find and compare schools, read verified parent reviews, manage admissions, fees, attendance, and more. Edu Breezy simplifies education",
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

export default function RootLayout({ children }) {
  // JSON-LD structured data for Google site name
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "EduBreezy",
    "alternateName": ["Edu Breezy", "EduBreezy School Management"],
    "url": "https://www.edubreezy.com"
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EduBreezy",
    "alternateName": "Edu Breezy",
    "url": "https://www.edubreezy.com",
    "logo": "https://edubreezy.com/favicon.ico",
    "sameAs": [
      "https://twitter.com/edubreezy",
      "https://facebook.com/edubreezy"
    ],
    "description": "India's leading school management platform"
  };

  return (
    <Provider>
      <html lang="en" suppressHydrationWarning={true}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Cedarville+Cursive&family=Edu+NSW+ACT+Cursive:wght@400..700&display=swap" rel="stylesheet" />
          {/* JSON-LD for site name in Google */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
        </head>
        <body className="min-h-screen flex flex-col">
          <ClientProduct>{children}</ClientProduct>
          <Suspense fallback={<div />}>
            <NavigationProgress />
            <PageTransitionLoader />
          </Suspense>
          <Toaster
            theme="system"
            toastOptions={{
              classNames: {
                description: "text-sm mt-1 !text-black dark:!text-white",
              },
            }}
          />
        </body>
      </html>
    </Provider>
  );
}
