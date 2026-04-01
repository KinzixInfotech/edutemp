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

export const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.edubreezy.com';
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
        "url": "https://atlas.edubreezy.com/explore"
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
          <meta name="facebook-domain-verification" content="ztcrr8bo64h6o5wo2fk5vxtdf09ial" />
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
          <link href="https://fonts.googleapis.com/css2?family=Google+Sans+Flex:opsz,wght@6..144,1..1000&family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
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
