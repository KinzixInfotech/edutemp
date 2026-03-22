'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, ArrowRight, Command,
  Home, Users, GraduationCap, CreditCard, Clock, FileText, Bus,
  BookOpen, Wallet, ClipboardList, Globe, Calendar, Bell,
  Handshake, Award, UserCheck, Sparkles,
} from 'lucide-react';
import { useDocsSearch } from '@/hooks/useSanityDocs';

// ─── Same icon map as sidebar ───
const iconMap = {
  Home, Users, GraduationCap, CreditCard, Clock, FileText, Bus,
  BookOpen, Wallet, ClipboardList, Globe, Calendar, Bell,
  Handshake, Award, UserCheck, Sparkles,
};
function getIcon(name) { return iconMap[name] || FileText; }

// ─── Score results ───
function scoreResult(doc, query) {
  const q = query.toLowerCase();
  let score = 0;
  if (doc.title?.toLowerCase().includes(q)) score += doc.title.toLowerCase() === q ? 100 : 50;
  if (doc.subtitle?.toLowerCase().includes(q)) score += 30;
  if (doc.tags?.some((t) => t.toLowerCase().includes(q))) score += 25;
  if (doc.featureTitles?.some((f) => f.toLowerCase().includes(q))) score += 20;
  if (doc.categoryTitle?.toLowerCase().includes(q)) score += 15;
  if (doc.description?.toLowerCase().includes(q)) score += 10;
  return score;
}

function highlightMatch(text, query) {
  if (!text || !query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-[#0569ff]/15 text-[#0569ff] rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function getMatchContext(doc, query) {
  const q = query.toLowerCase();
  if (doc.title?.toLowerCase().includes(q)) return null;
  if (doc.subtitle?.toLowerCase().includes(q)) return { label: 'Subtitle', text: doc.subtitle };
  const tag = doc.tags?.find((t) => t.toLowerCase().includes(q));
  if (tag) return { label: 'Tag', text: tag };
  const feat = doc.featureTitles?.find((f) => f.toLowerCase().includes(q));
  if (feat) return { label: 'Feature', text: feat };
  if (doc.description?.toLowerCase().includes(q)) {
    const idx = doc.description.toLowerCase().indexOf(q);
    const start = Math.max(0, idx - 30);
    const end = Math.min(doc.description.length, idx + query.length + 50);
    return { label: 'Description', text: (start > 0 ? '...' : '') + doc.description.slice(start, end) + (end < doc.description.length ? '...' : '') };
  }
  return null;
}

// ─── Search Modal ───
function SearchModal({ onSelectDoc, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const modalRef = useRef(null);
  const { data: allDocs } = useDocsSearch();

  const results = useMemo(() => {
    if (!query.trim() || !allDocs) return [];
    return allDocs
      .map((doc) => ({ ...doc, score: scoreResult(doc, query) }))
      .filter((doc) => doc.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [query, allDocs]);

  const defaultResults = useMemo(() => {
    if (query.trim() || !allDocs) return null;
    const groups = {};
    allDocs.forEach((doc) => {
      const cat = doc.categoryTitle || 'Other';
      if (!groups[cat]) groups[cat] = { icon: doc.categoryIcon, docs: [] };
      groups[cat].docs.push(doc);
    });
    return groups;
  }, [query, allDocs]);

  // Focus input on mount
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 10); }, []);
  useEffect(() => { setSelectedIndex(0); }, [query]);

  // Scroll selected into view
  useEffect(() => {
    const items = listRef.current?.querySelectorAll('[data-search-item]');
    if (items?.[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Global ESC handler + click outside
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    }
    function handleClickOutside(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleClickOutside, true);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleSelect = (slug) => { onSelectDoc(slug); onClose(); };
  const totalItems = query.trim() ? results.length : (allDocs?.length || 0);

  const handleInputKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim() && results[selectedIndex]) handleSelect(results[selectedIndex].slug);
      else if (!query.trim() && allDocs?.[selectedIndex]) handleSelect(allDocs[selectedIndex].slug);
    }
  }, [results, selectedIndex, totalItems, allDocs, query]);

  let flatIndex = -1;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[10vh] sm:pt-[15vh] px-3 sm:px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden"
        style={{ animation: 'searchSlideIn 0.15s ease-out' }}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100">
          <Search size={20} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search & Navigate..."
            className="flex-1 text-base sm:text-lg outline-none placeholder-gray-400 bg-transparent"
            autoComplete="off"
          />
          <button onClick={onClose} className="sm:hidden p-1 text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
          <kbd className="hidden sm:inline-flex h-6 items-center rounded border border-gray-200 bg-gray-100 px-2 text-xs font-medium text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] sm:max-h-[55vh] overflow-y-auto py-1">
          {/* Search mode */}
          {query.trim() && results.length === 0 && (
            <div className="px-5 py-12 text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Search size={24} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No results found</p>
              <p className="text-gray-400 text-sm mt-1">Try different keywords</p>
            </div>
          )}

          {query.trim() && results.map((doc, index) => {
            const ctx = getMatchContext(doc, query);
            const sel = index === selectedIndex;
            const Icon = getIcon(doc.categoryIcon);
            return (
              <button
                key={doc._id}
                data-search-item
                onClick={() => handleSelect(doc.slug)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left px-4 sm:px-5 py-2.5 sm:py-3 flex items-center gap-3 transition-colors ${sel ? 'bg-[#0569ff] text-white' : 'hover:bg-gray-50'}`}
              >
                <Icon size={18} className={`shrink-0 ${sel ? 'text-white/80' : 'text-[#0569ff]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold text-sm truncate ${sel ? 'text-white' : 'text-[#1a1a2e]'}`}>
                      {highlightMatch(doc.title, query)}
                    </span>
                    <span className={`text-xs shrink-0 hidden sm:inline ${sel ? 'text-white/60' : 'text-gray-400'}`}>
                      {doc.categoryTitle}
                    </span>
                  </div>
                  {doc.subtitle && (
                    <p className={`text-xs mt-0.5 truncate ${sel ? 'text-white/70' : 'text-gray-500'}`}>
                      {highlightMatch(doc.subtitle, query)}
                    </p>
                  )}
                  {ctx && (
                    <p className={`text-xs mt-0.5 truncate hidden sm:block ${sel ? 'text-white/60' : 'text-gray-400'}`}>
                      <span className={sel ? 'text-white/80 font-medium' : 'text-[#0569ff]/70 font-medium'}>{ctx.label}: </span>
                      {highlightMatch(ctx.text, query)}
                    </p>
                  )}
                </div>
                {sel && <ArrowRight size={14} className="text-white/80 shrink-0 hidden sm:block" />}
              </button>
            );
          })}

          {/* Default: all docs by category */}
          {!query.trim() && defaultResults && Object.entries(defaultResults).map(([catName, { icon, docs }]) => {
            const CatIcon = getIcon(icon);
            return (
              <div key={catName}>
                <div className="px-4 sm:px-5 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{catName}</p>
                </div>
                {docs.map((doc) => {
                  flatIndex++;
                  const idx = flatIndex;
                  const sel = idx === selectedIndex;
                  return (
                    <button
                      key={doc._id}
                      data-search-item
                      onClick={() => handleSelect(doc.slug)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full text-left px-4 sm:px-5 py-2.5 flex items-center gap-3 transition-colors ${sel ? 'bg-[#0569ff] text-white' : 'hover:bg-gray-50'}`}
                    >
                      <CatIcon size={16} className={`shrink-0 ${sel ? 'text-white/80' : 'text-[#0569ff]'}`} />
                      <div className="flex-1 min-w-0 flex items-center gap-2">
                        <span className={`text-sm font-medium truncate ${sel ? 'text-white' : 'text-[#1a1a2e]'}`}>{doc.title}</span>
                        {doc.subtitle && (
                          <span className={`text-xs hidden sm:inline truncate ${sel ? 'text-white/60' : 'text-gray-400'}`}>{doc.subtitle}</span>
                        )}
                      </div>
                      {sel && <ArrowRight size={14} className="text-white/80 shrink-0 hidden sm:block" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {query.trim() ? `${results.length} result${results.length !== 1 ? 's' : ''}` : `${allDocs?.length || 0} pages`}
          </span>
          <div className="hidden sm:flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 bg-white rounded border text-[10px]">esc</kbd> close</span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes searchSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─── Trigger Button ───
export default function DocsSearchOverlay({ onSelectDoc }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="w-full relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <div className="w-full pl-10 pr-16 py-2 border border-gray-200 rounded-lg text-sm text-gray-400 text-left bg-gray-50/50 hover:bg-gray-100/80 transition-colors cursor-pointer">
          Search features...
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <kbd className="hidden sm:inline-flex h-5 items-center gap-0.5 rounded border border-gray-200 bg-gray-100 px-1.5 text-[10px] font-medium text-gray-500">
            <Command size={10} />K
          </kbd>
        </div>
      </button>
      {isOpen && <SearchModal onSelectDoc={onSelectDoc} onClose={() => setIsOpen(false)} />}
    </>
  );
}
