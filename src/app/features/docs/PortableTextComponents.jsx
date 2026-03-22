'use client';
import React from 'react';
import Link from 'next/link';
import { urlFor } from '@/sanity/imageUrl';

// ─── Helper: extract YouTube ID ───
function getYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?/]+)/
  );
  return match ? match[1] : null;
}

// ─── Helper: slugify text for heading IDs ───
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

// ─── Custom Portable Text Components ───
export const portableTextComponents = {
  // Block-level rendering
  block: {
    h2: ({ children, value }) => {
      const text = value?.children?.map((c) => c.text).join('') || '';
      const id = slugify(text);
      return (
        <h2
          id={id}
          className="text-2xl font-bold text-[#1a1a2e] mt-10 mb-4 scroll-mt-28 border-b border-gray-100 pb-3"
        >
          {children}
        </h2>
      );
    },
    h3: ({ children, value }) => {
      const text = value?.children?.map((c) => c.text).join('') || '';
      const id = slugify(text);
      return (
        <h3
          id={id}
          className="text-xl font-semibold text-[#1a1a2e] mt-8 mb-3 scroll-mt-28"
        >
          {children}
        </h3>
      );
    },
    h4: ({ children, value }) => {
      const text = value?.children?.map((c) => c.text).join('') || '';
      const id = slugify(text);
      return (
        <h4
          id={id}
          className="text-lg font-semibold text-[#1a1a2e] mt-6 mb-2 scroll-mt-28"
        >
          {children}
        </h4>
      );
    },
    normal: ({ children }) => (
      <p className="text-gray-600 text-base leading-relaxed mb-4">{children}</p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-[#0569ff] pl-4 py-2 my-4 bg-blue-50/50 rounded-r-lg italic text-gray-600">
        {children}
      </blockquote>
    ),
  },

  // List rendering
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-gray-600 pl-2">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-600 pl-2">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },

  // Inline marks/decorators
  marks: {
    strong: ({ children }) => <strong className="font-bold text-[#1a1a2e]">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    code: ({ children }) => (
      <code className="bg-gray-100 text-[#e11d48] px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    // Internal link annotation
    internalLink: ({ value, children }) => {
      const slug = value?.slug;
      if (!slug) return <span>{children}</span>;
      return (
        <Link
          href={`/features/docs/${slug}`}
          className="text-[#0569ff] hover:underline font-medium"
        >
          {children}
        </Link>
      );
    },
    // External link annotation
    externalLink: ({ value, children }) => {
      const { url, openInNewTab } = value || {};
      return (
        <a
          href={url}
          target={openInNewTab ? '_blank' : '_self'}
          rel={openInNewTab ? 'noopener noreferrer' : undefined}
          className="text-[#0569ff] hover:underline font-medium inline-flex items-center gap-1"
        >
          {children}
          {openInNewTab && (
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
        </a>
      );
    },
  },

  // Custom block types
  types: {
    // Image block
    image: ({ value }) => {
      if (!value?.asset) return null;
      const imageUrl = urlFor(value).width(800).auto('format').url();
      return (
        <figure className="my-6">
          <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <img
              src={imageUrl}
              alt={value.alt || ''}
              className="w-full h-auto"
              loading="lazy"
            />
          </div>
          {value.caption && (
            <figcaption className="text-sm text-gray-500 text-center mt-2 italic">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },

    // Video block
    video: ({ value }) => {
      const { videoType, url, file, caption } = value || {};

      let videoContent = null;

      if (videoType === 'youtube' && url) {
        const youtubeId = getYouTubeId(url);
        if (youtubeId) {
          videoContent = (
            <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}`}
                title={caption || 'Video'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          );
        }
      } else if (videoType === 'iframe' && url) {
        videoContent = (
          <div className="aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <iframe
              src={url}
              title={caption || 'Video'}
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        );
      } else if (videoType === 'upload' && file?.asset) {
        videoContent = (
          <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <video controls className="w-full">
              <source src={file.asset.url} />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      }

      if (!videoContent) return null;

      return (
        <figure className="my-6">
          {videoContent}
          {caption && (
            <figcaption className="text-sm text-gray-500 text-center mt-2 italic">
              {caption}
            </figcaption>
          )}
        </figure>
      );
    },

    // Callout block
    callout: ({ value }) => {
      const { type = 'info', title, text } = value || {};

      const styles = {
        info: {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: '💡',
          titleColor: 'text-blue-800',
          textColor: 'text-blue-700',
        },
        warning: {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: '⚠️',
          titleColor: 'text-amber-800',
          textColor: 'text-amber-700',
        },
        tip: {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: '✅',
          titleColor: 'text-green-800',
          textColor: 'text-green-700',
        },
        note: {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: '📝',
          titleColor: 'text-gray-800',
          textColor: 'text-gray-700',
        },
      };

      const s = styles[type] || styles.info;

      return (
        <div className={`${s.bg} ${s.border} border rounded-xl p-4 my-6`}>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">{s.icon}</span>
            <div className="flex-1 min-w-0">
              {title && (
                <p className={`font-semibold ${s.titleColor} mb-1`}>{title}</p>
              )}
              <p className={`${s.textColor} text-sm leading-relaxed`}>{text}</p>
            </div>
          </div>
        </div>
      );
    },
  },
};

// ─── Helper: Extract headings from Portable Text for TOC ───
export function extractHeadings(body) {
  if (!body || !Array.isArray(body)) return [];

  return body
    .filter(
      (block) =>
        block._type === 'block' &&
        (block.style === 'h2' || block.style === 'h3')
    )
    .map((block) => {
      const text = block.children?.map((c) => c.text).join('') || '';
      return {
        id: slugify(text),
        text,
        level: block.style, // 'h2' or 'h3'
      };
    });
}
