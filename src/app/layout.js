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
import { Analytics } from "@vercel/analytics/next"
import FloatingDemoButton from "@/components/FloatingDemoButton";
import AOSProvider from "@/components/AosProvider";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';

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
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/web-app-manifest-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/web-app-manifest-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
    "alternateName": ["Edu Breezy", "EduBreezy ERP"],
    "url": "https://www.edubreezy.com",
    "logo": "https://edubreezy.com/favicon.ico",
    "sameAs": [
      "https://twitter.com/edubreezy",
      "https://facebook.com/edubreezy",
      "https://instagram.com/official_edubreezy"
    ],
    "description": "From attendance to payroll — manage your entire school on one smart platform. AI-driven automation, live bus tracking, exam analytics, digital fees, and a seamless parent app, all with a modern user interface."
  };

  // SiteNavigationElement to hint sitelinks to Google
  const siteNavigationSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SiteNavigationElement",
        "name": "About EduBreezy",
        "url": "https://www.edubreezy.com/about"
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Contact Us",
        "url": "https://www.edubreezy.com/contact"
      },
      {
        "@type": "SiteNavigationElement",
        "name": "School Explorer - Find Schools",
        "url": "https://school.edubreezy.com/explore"
      },
      {
        "@type": "SiteNavigationElement",
        "name": "EduBreezy Pay - Online Fees",
        "url": "https://pay.edubreezy.com"
      },
      {
        "@type": "SiteNavigationElement",
        "name": "Partner With Us",
        "url": "https://www.edubreezy.com/partners"
      }
    ]
  };

  return (
    <Provider>

      <html lang="en" suppressHydrationWarning={true}>
        <head>
          {/* Google Tag Manager */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-PN2FHJNH');`
            }}
          />
          {/* End Google Tag Manager */}
          {/* Google Analytics (gtag.js) */}
          <script async src="https://www.googletagmanager.com/gtag/js?id=G-ZMMQE5ELMX" />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-ZMMQE5ELMX');`
            }}
          />
          {/* End Google Analytics */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet" />
          {/* JSON-LD for site name in Google */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(siteNavigationSchema) }}
          />
        </head>
        <body className="min-h-screen flex flex-col">
          {/* Google Tag Manager (noscript) */}
          <noscript>
            <iframe
              src="https://www.googletagmanager.com/ns.html?id=GTM-PN2FHJNH"
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
          {/* End Google Tag Manager (noscript) */}
          {/* JavaScript disabled warning */}
          <noscript>
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(251, 191, 36, 0.15)',
              borderBottom: '1px solid rgba(251, 191, 36, 0.3)',
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                maxWidth: '80rem',
                margin: '0 auto',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#b45309' }}>
                  ⚠️ JavaScript is disabled. Please enable JavaScript to use EduBreezy.
                </span>
              </div>
            </div>
          </noscript>
          <Analytics />
          <AOSProvider />
          <ClientProduct>{children}</ClientProduct>
          <Suspense fallback={<div />}>
            <NavigationProgress />
            <PageTransitionLoader />
          </Suspense>
          <FloatingDemoButton />
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
