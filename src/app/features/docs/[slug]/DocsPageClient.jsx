'use client';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PortableText } from '@portabletext/react';
import {
  Users, GraduationCap, CreditCard, Clock, FileText, Bus,
  BookOpen, Wallet, ClipboardList, Globe, Calendar, Home,
  Bell, Handshake, Award, UserCheck, Sparkles, ChevronDown,
  Menu, X, ArrowRight,
} from 'lucide-react';
import { useDocsCategories, useDocBySlug } from '@/hooks/useSanityDocs';
import { portableTextComponents, extractHeadings, Lightbox } from '../PortableTextComponents';
import { urlFor } from '@/sanity/imageUrl';
import DocsSearchOverlay from '../DocsSearchOverlay';

// ─── Constants ───
const LS_CATS_KEY = 'docs_expanded_categories';
const LS_GROUPS_KEY = 'docs_expanded_groups';

// ─── Icon Map ───
const iconMap = {
  Home, Users, GraduationCap, CreditCard, Clock, FileText, Bus,
  BookOpen, Wallet, ClipboardList, Globe, Calendar, Bell,
  Handshake, Award, UserCheck, Sparkles,
};
function getIcon(name) { return iconMap[name] || FileText; }

// ─── localStorage helpers ───
function readLS(key) {
  try {
    const val = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}
function writeLS(key, value) {
  try {
    if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

// ─── Skeletons ───
function SidebarSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="ml-4 space-y-1.5">
            <div className="h-4 bg-gray-100 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="max-w-3xl animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-2/3 mb-3" />
      <div className="h-5 bg-blue-100 rounded w-1/3 mb-4" />
      <div className="h-4 bg-gray-100 rounded w-full mb-2" />
      <div className="h-4 bg-gray-100 rounded w-5/6 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-4/5 mb-8" />
      <div className="flex gap-2 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-7 bg-blue-50 rounded-full w-24" />
        ))}
      </div>
      <div className="h-6 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="grid grid-cols-2 gap-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-28 bg-gray-50 rounded-xl border border-gray-100" />
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar (memoized, state lifted to parent) ───
const DocsSidebar = React.memo(function DocsSidebar({
  categories, activeSlug, onSelectDoc,
  isMobileMenuOpen, setMobileMenuOpen,
  expandedCategories, expandedGroups,
  onToggleCategory, onToggleGroup,
}) {
  const filtered = useMemo(
    () => (categories || []).filter((c) => c.docs?.length > 0),
    [categories]
  );

  return (
    <aside
      className={`fixed lg:sticky top-0 left-0 z-50 h-screen lg:h-[calc(100vh-116px)] lg:top-[116px] w-72 bg-white lg:bg-transparent border-r border-gray-200 lg:border-0 transform transition-transform duration-300 ease-in-out shadow-xl lg:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} overflow-y-auto`}
    >
      <div className="flex items-center justify-between p-4 lg:hidden border-b">
        <span className="font-bold text-lg">Features</span>
        <button onClick={() => setMobileMenuOpen(false)}><X size={24} /></button>
      </div>

      <div className="p-4 border-b border-gray-200">
        <DocsSearchOverlay onSelectDoc={onSelectDoc} />
      </div>

      <nav className="p-4 space-y-2">
        {filtered.map((category) => {
          const IconI = getIcon(category.icon);
          return (
            <div key={category._id}>
              <button
                onClick={() => onToggleCategory(category._id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#1a1a2e] hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconI size={16} style={{ color: category.color || '#0569ff' }} />
                  <span className='truncate'>{category.title}</span>
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedCategories.includes(category._id) ? 'rotate-180' : ''}`} />
              </button>
              {expandedCategories.includes(category._id) && (
                <div className="ml-4 mt-2 mb-2 border-l-2 border-gray-100 pl-3 space-y-4">
                  {(() => {
                    const groupedDocsMap = category.docs.reduce((acc, doc) => {
                      const groupName = doc.groupTitle || 'uncategorized';
                      if (!acc[groupName]) {
                        acc[groupName] = {
                          docs: [],
                          order: groupName === 'uncategorized' ? 1 : (doc.groupOrder != null ? doc.groupOrder : 999)
                        };
                      }
                      acc[groupName].docs.push(doc);
                      return acc;
                    }, {});

                    const sortedGroups = Object.entries(groupedDocsMap).sort((a, b) => a[1].order - b[1].order);

                    return (
                      <div className="space-y-4">
                        {sortedGroups.map(([groupName, groupData]) => {
                          if (groupName === 'uncategorized') {
                            return (
                              <div key="uncategorized" className="space-y-1">
                                {groupData.docs.map((doc) => (
                                  <button
                                    key={doc._id}
                                    onClick={() => { onSelectDoc(doc.slug); setMobileMenuOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${activeSlug === doc.slug ? 'bg-[#0569ff]/10 text-[#0569ff] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-[#1a1a2e]'}`}
                                  >
                                    {doc.title}
                                  </button>
                                ))}
                              </div>
                            );
                          }

                          const groupId = `${category._id}-${groupName}`;
                          const isExpanded = expandedGroups.includes(groupId);
                          return (
                            <div key={groupName} className="space-y-1">
                              <button
                                onClick={() => onToggleGroup(groupId)}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-gray-50 rounded-lg transition-colors"
                              >
                                <span>{groupName}</span>
                                <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                              {isExpanded && (
                                <div className="ml-2 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                                  {groupData.docs.map((doc) => (
                                    <button
                                      key={doc._id}
                                      onClick={() => { onSelectDoc(doc.slug); setMobileMenuOpen(false); }}
                                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${activeSlug === doc.slug ? 'bg-[#0569ff]/10 text-[#0569ff] font-medium' : 'text-gray-600 hover:bg-gray-50 hover:text-[#1a1a2e]'}`}
                                    >
                                      {doc.title}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
});

// ─── Table of Contents ───
function DocsTableOfContents({ doc }) {
  const [activeId, setActiveId] = useState('');
  const observerRef = useRef(null);

  const staticEntries = [
    { id: 'overview', text: 'Overview', level: 'h2' },
    ...(doc?.keyFeatures?.features?.length
      ? [{ id: 'key-features', text: doc.keyFeatures.sectionTitle || 'Key Features', level: 'h2' }]
      : []),
  ];

  const bodyHeadings = extractHeadings(doc?.body);
  const staticIds = new Set(staticEntries.map((e) => e.id));
  const allEntries = [...staticEntries, ...bodyHeadings.filter((h) => !staticIds.has(h.id))];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 }
    );
    allEntries.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observerRef.current.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, [doc]);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!allEntries.length) return null;

  return (
    <aside className="hidden xl:block w-56 shrink-0">
      <div className="sticky top-[136px]">
        <h4 className="text-sm font-semibold text-[#1a1a2e] mb-4">On this page</h4>
        <nav className="space-y-1.5 text-sm">
          {allEntries.map((e) => (
            <button
              key={e.id}
              onClick={() => scrollTo(e.id)}
              className={`block w-full text-left transition-colors py-0.5 ${e.level === 'h3' ? 'pl-4' : ''} ${activeId === e.id ? 'text-[#0569ff] font-medium' : 'text-gray-500 hover:text-[#0569ff]'}`}
            >
              {e.text}
            </button>
          ))}
        </nav>
      </div>
    </aside>
  );
}

// ─── Main Content ───
function DocsContent({ doc, isLoading }) {
  if (isLoading) return <ContentSkeleton />;
  if (!doc) {
    return (
      <div className="text-center py-20 max-w-3xl">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileText size={40} className="text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-400 mb-2">No document found</h2>
        <p className="text-gray-400">Select a feature from the sidebar to get started.</p>
      </div>
    );
  }

  return (
    <article className="max-w-3xl">
      <div id="overview" className="mb-10 scroll-mt-[136px]">
        <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-3">{doc.title}</h1>
        {doc.subtitle && <p className="text-lg text-[#0569ff] font-medium mb-4">{doc.subtitle}</p>}
        {doc.description && <p className="text-gray-600 text-lg leading-relaxed">{doc.description}</p>}
      </div>

      {doc.tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {doc.tags.map((tag, i) => (
            <span key={i} className="px-3 py-1 bg-[#0569ff]/10 text-[#0569ff] text-sm rounded-full font-medium">{tag}</span>
          ))}
        </div>
      )}

      {doc.keyFeatures?.features?.length > 0 && (
        <div id="key-features" className="space-y-6 mb-10 scroll-mt-[136px]">
          <h2 className="text-xl font-bold text-[#1a1a2e] border-b pb-3">{doc.keyFeatures.sectionTitle || 'Key Features'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {doc.keyFeatures.features.map((f, i) => (
              <div key={i} className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-[#0569ff]/20 hover:shadow-sm transition-all">
                {f.icon && (
                  <div className="w-10 h-10 rounded-lg bg-[#0569ff]/10 flex items-center justify-center mb-3">
                    <img src={urlFor(f.icon).width(40).height(40).url()} alt="" className="w-5 h-5" />
                  </div>
                )}
                <h3 className="font-semibold text-[#1a1a2e] mb-2">{f.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {doc.body && (
        <div className="docs-body">
          <PortableText value={doc.body} components={portableTextComponents} />
        </div>
      )}

      <div className="mt-12 p-6 bg-gradient-to-r from-[#0569ff] to-[#0450d4] rounded-2xl text-white">
        <h3 className="text-xl font-bold mb-2">Ready to get started?</h3>
        <p className="text-white/80 mb-4">Experience {doc.title} and more with a free demo.</p>
        <Link href="/contact" className="inline-flex items-center gap-2 bg-white text-[#0569ff] px-6 py-3 rounded-full font-bold hover:bg-white/90 transition-colors">
          Request Demo <ArrowRight size={18} />
        </Link>
      </div>
    </article>
  );
}

// ─── Main Client Component ───
export default function DocsPageClient({ initialSlug }) {
  const router = useRouter();
  const [activeSlug, setActiveSlug] = useState(initialSlug || '');
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: categories, isLoading: categoriesLoading } = useDocsCategories();
  const { data: doc, isLoading: docLoading } = useDocBySlug(activeSlug);

  // ─── Sidebar state lifted here with localStorage persistence ───
  const [expandedCategories, setExpandedCategories] = useState(() => readLS(LS_CATS_KEY) || []);
  const [expandedGroups, setExpandedGroups] = useState(() => readLS(LS_GROUPS_KEY) || []);
  const initializedRef = useRef(false);

  // On first load with categories, ensure the active doc's category + group are expanded
  useEffect(() => {
    if (!categories || initializedRef.current) return;
    initializedRef.current = true;

    const stored = readLS(LS_CATS_KEY);
    if (stored && stored.length > 0) {
      // localStorage has state — just ensure active doc's category is also open
      if (activeSlug) {
        const cat = categories.find((c) => c.docs?.some((d) => d.slug === activeSlug));
        if (cat && !stored.includes(cat._id)) {
          const updated = [...stored, cat._id];
          setExpandedCategories(updated);
          writeLS(LS_CATS_KEY, updated);
        }
        if (cat) {
          const activeDoc = cat.docs.find((d) => d.slug === activeSlug);
          if (activeDoc?.groupTitle) {
            const groupId = `${cat._id}-${activeDoc.groupTitle}`;
            setExpandedGroups((prev) => {
              if (prev.includes(groupId)) return prev;
              const updated = [...prev, groupId];
              writeLS(LS_GROUPS_KEY, updated);
              return updated;
            });
          }
        }
      }
      return;
    }

    // No stored state — initialize from active slug or first category
    if (activeSlug) {
      const cat = categories.find((c) => c.docs?.some((d) => d.slug === activeSlug));
      if (cat) {
        const cats = [cat._id];
        setExpandedCategories(cats);
        writeLS(LS_CATS_KEY, cats);
        const activeDoc = cat.docs.find((d) => d.slug === activeSlug);
        if (activeDoc?.groupTitle) {
          const groups = [`${cat._id}-${activeDoc.groupTitle}`];
          setExpandedGroups(groups);
          writeLS(LS_GROUPS_KEY, groups);
        }
      }
    } else if (categories[0]) {
      const cats = [categories[0]._id];
      setExpandedCategories(cats);
      writeLS(LS_CATS_KEY, cats);
    }
  }, [categories, activeSlug]);

  // When navigating to a new slug, only ADD the needed expansion (never close anything)
  const prevSlugRef = useRef(activeSlug);
  useEffect(() => {
    if (!categories || !activeSlug || activeSlug === prevSlugRef.current) return;
    prevSlugRef.current = activeSlug;

    const cat = categories.find((c) => c.docs?.some((d) => d.slug === activeSlug));
    if (!cat) return;

    setExpandedCategories((prev) => {
      if (prev.includes(cat._id)) return prev;
      const updated = [...prev, cat._id];
      writeLS(LS_CATS_KEY, updated);
      return updated;
    });

    const activeDoc = cat.docs.find((d) => d.slug === activeSlug);
    if (activeDoc?.groupTitle) {
      const groupId = `${cat._id}-${activeDoc.groupTitle}`;
      setExpandedGroups((prev) => {
        if (prev.includes(groupId)) return prev;
        const updated = [...prev, groupId];
        writeLS(LS_GROUPS_KEY, updated);
        return updated;
      });
    }
  }, [categories, activeSlug]);

  // Stable toggle callbacks that persist to localStorage
  const handleToggleCategory = useCallback((id) => {
    setExpandedCategories((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeLS(LS_CATS_KEY, next);
      return next;
    });
  }, []);

  const handleToggleGroup = useCallback((id) => {
    setExpandedGroups((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      writeLS(LS_GROUPS_KEY, next);
      return next;
    });
  }, []);

  // If no initial slug, redirect to first doc
  useEffect(() => {
    if (!activeSlug && categories?.length > 0) {
      const first = categories[0]?.docs?.[0];
      if (first) {
        router.replace(`/features/docs/${first.slug}`);
        setActiveSlug(first.slug);
      }
    }
  }, [categories, activeSlug]);

  const handleSelectDoc = useCallback(
    (slug) => {
      setActiveSlug(slug);
      router.push(`/features/docs/${slug}`, { scroll: false });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [router]
  );

  return (
    <div className="min-h-screen bg-white  ">
      <Lightbox />
      <div className="lg:hidden  pt-14 fixed top-16 left-0 right-0 z-50 bg-[#ffffffbf] backdrop-blur-md border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
          <Menu size={20} />
        </button>
        <span className="font-semibold text-[#1a1a2e] text-sm truncate">{doc?.title || 'Features'}</span>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      <div className="flex pt-40 lg:pt-25 ">

        {categoriesLoading ? (
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-[116px] h-[calc(100vh-116px)] overflow-y-auto"><SidebarSkeleton /></div>
          </aside>
        ) : (
          <DocsSidebar
            categories={categories || []}
            activeSlug={activeSlug}
            onSelectDoc={handleSelectDoc}
            isMobileMenuOpen={isMobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            expandedCategories={expandedCategories}
            expandedGroups={expandedGroups}
            onToggleCategory={handleToggleCategory}
            onToggleGroup={handleToggleGroup}
          />
        )}

        <main className="flex-1 min-w-0 px-5 py-8 lg:px-12 lg:py-10">
          <div className="flex gap-12">
            <DocsContent doc={doc} isLoading={docLoading && !!activeSlug} />
            <DocsTableOfContents doc={doc} />
          </div>
        </main>
      </div>
      <div className='w-full hidden lg:block'>
        <img src={'/banner.svg'} className='object-cover w-[100%] pointer-events-none' />
      </div>
    </div>
  );
}
