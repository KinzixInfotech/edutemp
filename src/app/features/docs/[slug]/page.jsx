import { createClient } from "@sanity/client";
import Script from "next/script";
import DocsPageClient from "./DocsPageClient";

// Server-side Sanity client for SEO metadata
const serverClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: "2024-01-01",
  useCdn: true,
});

const SEO_QUERY = `
  *[_type == "docs" && slug.current == $slug][0] {
    title,
    subtitle,
    description,
    tags,
    metaTitle,
    metaDescription,
    _updatedAt,
    _createdAt,
    "categoryTitle": category->title,
    "ogImage": body[_type == "image"][0].asset->url,
    "featureTitles": keyFeatures.features[].title
  }
`;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const doc = await serverClient.fetch(SEO_QUERY, { slug });

  if (!doc) {
    return {
      title: "Documentation | EduBreezy",
      description: "Explore EduBreezy features and documentation.",
    };
  }

  const title = doc.metaTitle || `${doc.title} — ${doc.categoryTitle || "Features"} | EduBreezy`;
  const description = doc.metaDescription || doc.description || doc.subtitle || `Learn about ${doc.title} in EduBreezy ERP.`;
  const keywords = [
    ...(doc.tags || []),
    doc.title,
    doc.categoryTitle,
    "EduBreezy",
    "ERP",
    "school management",
    "education software",
  ].filter(Boolean);

  const ogImage = doc.ogImage || "https://www.edubreezy.com/og-default.png";

  return {
    title,
    description,
    keywords: keywords.join(", "),
    openGraph: {
      title,
      description,
      url: `https://www.edubreezy.com/features/docs/${slug}`,
      siteName: "EduBreezy",
      type: "article",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: doc.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    alternates: {
      canonical: `https://www.edubreezy.com/features/docs/${slug}`,
    },
  };
}

export default async function DocsSlugPage({ params }) {
  const { slug } = await params;
  const doc = await serverClient.fetch(SEO_QUERY, { slug });

  // Schema.org: TechArticle + BreadcrumbList structured data
  const jsonLd = doc
    ? {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: doc.title,
        description: doc.description || doc.subtitle || `Learn about ${doc.title} in EduBreezy ERP.`,
        image: doc.ogImage || undefined,
        datePublished: doc._createdAt,
        dateModified: doc._updatedAt,
        author: {
          "@type": "Organization",
          name: "EduBreezy",
          url: "https://www.edubreezy.com",
        },
        publisher: {
          "@type": "Organization",
          name: "EduBreezy",
          url: "https://www.edubreezy.com",
          logo: {
            "@type": "ImageObject",
            url: "https://www.edubreezy.com/favicon.ico",
          },
        },
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": `https://www.edubreezy.com/features/docs/${slug}`,
        },
        keywords: [
          ...(doc.tags || []),
          doc.categoryTitle,
          "EduBreezy",
          "school ERP",
        ]
          .filter(Boolean)
          .join(", "),
        articleSection: doc.categoryTitle || "Features",
        about: {
          "@type": "SoftwareApplication",
          name: "EduBreezy",
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web, Android, iOS",
        },
      }
    : null;

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://www.edubreezy.com",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Features",
        item: "https://www.edubreezy.com/features",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Documentation",
        item: "https://www.edubreezy.com/features/docs",
      },
      ...(doc
        ? [
            {
              "@type": "ListItem",
              position: 4,
              name: doc.title,
              item: `https://www.edubreezy.com/features/docs/${slug}`,
            },
          ]
        : []),
    ],
  };

  return (
    <>
      {jsonLd && (
        <Script
          id="docs-article-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <Script
        id="docs-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <DocsPageClient initialSlug={slug} />
    </>
  );
}
