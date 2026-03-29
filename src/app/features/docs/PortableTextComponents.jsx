'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
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

// ─── Lightbox Context ───
// We use a simple module-level event bus so PortableText components
// can open the lightbox without prop-drilling.
let _lightboxSetter = null;
function openLightbox(data) {
  _lightboxSetter?.(data);
}
// ─── Lightbox Component ───
export function Lightbox() {
  const [state, setState] = useState(null);

  useEffect(() => {
    _lightboxSetter = setState;
    return () => { _lightboxSetter = null; };
  }, []);

  const close = useCallback(() => setState(null), []);

  const prev = useCallback(() =>
    setState((s) => s && s.items.length > 1 ? { ...s, index: (s.index - 1 + s.items.length) % s.items.length } : s), []
  );

  const next = useCallback(() =>
    setState((s) => s && s.items.length > 1 ? { ...s, index: (s.index + 1) % s.items.length } : s), []
  );

  useEffect(() => {
    if (!state) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [state, close, prev, next]);

  if (!state || typeof document === 'undefined') return null;

  const current = state.items[state.index];
  const hasMultiple = state.items.length > 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={close}
    >
      {/* Close */}
      <button
        onClick={close}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="Close"
      >
        <X size={22} />
      </button>

      {/* Prev */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          className="absolute left-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Previous"
        >
          <ChevronLeft size={26} />
        </button>
      )}

      {/* Content */}
      <div
        className="relative max-w-5xl w-full mx-4 lg:mx-16 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === 'image' ? (
          <>
            <img
              src={current.src}
              alt={current.alt || ''}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
              draggable={false}
            />
            {current.caption && (
              <p className="mt-3 text-sm text-white/60 italic text-center">{current.caption}</p>
            )}
          </>
        ) : current.type === 'youtube' ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={`https://www.youtube.com/embed/${current.videoId}?autoplay=1`}
              title={current.caption || 'Video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : current.type === 'iframe' ? (
          <div className="w-full aspect-video rounded-xl overflow-hidden shadow-2xl">
            <iframe
              src={current.src}
              title={current.caption || 'Video'}
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        ) : current.type === 'upload' ? (
          <div className="w-full rounded-xl overflow-hidden shadow-2xl">
            <video controls autoPlay className="w-full max-h-[80vh]">
              <source src={current.src} />
            </video>
          </div>
        ) : null}

        {/* Counter */}
        {hasMultiple && (
          <p className="mt-3 text-white/40 text-xs">
            {state.index + 1} / {state.items.length}
          </p>
        )}
      </div>

      {/* Next */}
      {hasMultiple && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          className="absolute right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          aria-label="Next"
        >
          <ChevronRight size={26} />
        </button>
      )}
    </div>,
    document.body
  );
}

// ─── Custom Portable Text Components ───
export const portableTextComponents = {
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
        <h3 id={id} className="text-xl font-semibold text-[#1a1a2e] mt-8 mb-3 scroll-mt-28">
          {children}
        </h3>
      );
    },
    h4: ({ children, value }) => {
      const text = value?.children?.map((c) => c.text).join('') || '';
      const id = slugify(text);
      return (
        <h4 id={id} className="text-lg font-semibold text-[#1a1a2e] mt-6 mb-2 scroll-mt-28">
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

  list: {
    bullet: ({ children }) => (
      <ul className="list-disc list-inside space-y-2 mb-4 text-gray-600 pl-2">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 text-gray-600 pl-2">{children}</ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li className="leading-relaxed">{children}</li>,
    number: ({ children }) => <li className="leading-relaxed">{children}</li>,
  },

  marks: {
    strong: ({ children }) => <strong className="font-bold text-[#1a1a2e]">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    underline: ({ children }) => <span className="underline">{children}</span>,
    code: ({ children }) => (
      <code className="bg-gray-100 text-[#e11d48] px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ),
    internalLink: ({ value, children }) => {
      const slug = value?.slug;
      if (!slug) return <span>{children}</span>;
      return (
        <Link href={`/features/docs/${slug}`} className="text-[#0569ff] hover:underline font-medium">
          {children}
        </Link>
      );
    },
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

  types: {
    // ─── Image block with lightbox trigger ───
    image: ({ value }) => {
      if (!value?.asset) return null;

      // Full-res URL for lightbox, capped display URL for the thumbnail
      const thumbUrl = urlFor(value).width(900).quality(90).auto('format').url();
      const fullUrl = urlFor(value).width(1920).quality(95).auto('format').url();

      const handleClick = () => {
        openLightbox({
          items: [{ type: 'image', src: fullUrl, alt: value.alt || '', caption: value.caption }],
          index: 0,
        });
      };

      return (
        <figure className="my-6">
          <div
            className="rounded-md overflow-hidden border border-gray-100  cursor-zoom-in"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleClick()}
            aria-label="Open image in lightbox"
          >
            <img
              src={thumbUrl}
              alt={value.alt || ''}
              className="w-full h-auto max-h-[500px] block object-contain bg-gray-50"
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

    // ─── Video block with lightbox trigger ───
    video: ({ value }) => {
      const { videoType, url, file, caption } = value || {};

      const handleYouTubeClick = (videoId) => {
        openLightbox({
          items: [{ type: 'youtube', videoId, caption }],
          index: 0,
        });
      };

      const handleIframeClick = () => {
        openLightbox({
          items: [{ type: 'iframe', src: url, caption }],
          index: 0,
        });
      };

      const handleUploadClick = () => {
        openLightbox({
          items: [{ type: 'upload', src: file.asset.url, caption }],
          index: 0,
        });
      };

      let videoContent = null;

      if (videoType === 'youtube' && url) {
        const youtubeId = getYouTubeId(url);
        if (youtubeId) {
          videoContent = (
            <div
              className="group relative aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer"
              onClick={() => handleYouTubeClick(youtubeId)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleYouTubeClick(youtubeId)}
              aria-label="Open video in lightbox"
            >
              {/* YouTube thumbnail as preview */}
              <img
                src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                alt={caption || 'Video thumbnail'}
                className="w-full h-full object-cover"
              />
              {/* Play button overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-6 h-6 text-[#1a1a2e] ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          );
        }
      } else if (videoType === 'iframe' && url) {
        videoContent = (
          <div
            className="group relative aspect-video rounded-xl overflow-hidden border border-gray-100 shadow-sm cursor-pointer bg-gray-900 flex items-center justify-center"
            onClick={handleIframeClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleIframeClick()}
            aria-label="Open video in lightbox"
          >
            <div className="flex flex-col items-center gap-3 text-white/70">
              <div className="w-16 h-16 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <span className="text-sm">{caption || 'Click to play video'}</span>
            </div>
          </div>
        );
      } else if (videoType === 'upload' && file?.asset) {
        videoContent = (
          <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <video
              controls
              className="w-full"
              onClick={handleUploadClick}
            >
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

    // ─── Callout block ───
    callout: ({ value }) => {
      const { type = 'info', title, text } = value || {};

      const styles = {
        info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💡', titleColor: 'text-blue-800', textColor: 'text-blue-700' },
        warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', titleColor: 'text-amber-800', textColor: 'text-amber-700' },
        tip: { bg: 'bg-green-50', border: 'border-green-200', icon: '✅', titleColor: 'text-green-800', textColor: 'text-green-700' },
        note: { bg: 'bg-gray-50', border: 'border-gray-200', icon: '📝', titleColor: 'text-gray-800', textColor: 'text-gray-700' },
      };

      const s = styles[type] || styles.info;

      return (
        <div className={`${s.bg} ${s.border} border rounded-xl p-4 my-6`}>
          <div className="flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">{s.icon}</span>
            <div className="flex-1 min-w-0">
              {title && <p className={`font-semibold ${s.titleColor} mb-1`}>{title}</p>}
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
      return { id: slugify(text), text, level: block.style };
    });
}