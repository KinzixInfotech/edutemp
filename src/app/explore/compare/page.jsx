'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import {
    Star, MapPin, X, Plus, ChevronRight, Share2, Download,
    GraduationCap, IndianRupee, Building2, Users, BookOpen,
    CheckCircle2, XCircle, ArrowRight, Search, School as SchoolIcon,
    Check, FileText, Clipboard, TrendingUp
} from 'lucide-react';

// ─── Star Rating Component ────────────────────────────────
function StarRating({ rating, size = 16 }) {
    const full = Math.floor(rating);
    const hasHalf = rating - full >= 0.25;
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <Star
                    key={i}
                    className={`${i < full ? 'text-orange-400 fill-orange-400' : i === full && hasHalf ? 'text-orange-400 fill-orange-400/50' : 'text-slate-200'}`}
                    style={{ width: size, height: size }}
                />
            ))}
        </div>
    );
}

// ─── Format Fee ───────────────────────────────────────────
function formatFee(amount) {
    if (!amount) return '—';
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
}

// ─── Debounce hook ────────────────────────────────────────
function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debouncedValue;
}

// ─── Fetch functions ──────────────────────────────────────
async function fetchCompareSchools(schoolIds) {
    const res = await fetch('/api/public/schools/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolIds }),
    });
    if (!res.ok) throw new Error('Failed to fetch comparison');
    const data = await res.json();
    return data.schools || [];
}

async function fetchSearchResults(query) {
    const res = await fetch(`/api/public/schools?search=${encodeURIComponent(query)}&limit=8`);
    if (!res.ok) throw new Error('Search failed');
    const data = await res.json();
    return data.schools || [];
}

async function fetchRecommended() {
    const res = await fetch('/api/public/schools?limit=3&sort=rating');
    if (!res.ok) throw new Error('Failed to fetch recommended');
    const data = await res.json();
    return data.schools || [];
}

async function fetchTopRated() {
    const res = await fetch('/api/public/schools?limit=2&sort=rating');
    if (!res.ok) throw new Error('Failed');
    const data = await res.json();
    return data.schools || [];
}

// ─── Search Skeleton ──────────────────────────────────────
function SearchSkeleton() {
    return (
        <div className="p-2 space-y-2">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded w-3/4" />
                        <div className="h-3 bg-slate-50 rounded w-1/2" />
                    </div>
                    <div className="h-4 w-8 bg-slate-50 rounded" />
                </div>
            ))}
        </div>
    );
}

// ─── School Search Result Item ────────────────────────────
function SearchResultItem({ school, onSelect }) {
    return (
        <button
            onClick={onSelect}
            className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
        >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                {school.school?.profilePicture ? (
                    <img src={school.school.profilePicture} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <SchoolIcon className="w-5 h-5 text-slate-300" />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-slate-800 truncate">{school.school?.name || 'School'}</h4>
                <p className="text-xs text-slate-500 truncate">{school.school?.location || ''}</p>
            </div>
            {school.overallRating > 0 && (
                <div className="flex items-center gap-1 text-sm">
                    <Star className="w-3.5 h-3.5 text-orange-400 fill-orange-400" />
                    <span className="font-bold text-slate-700">{school.overallRating.toFixed(1)}</span>
                </div>
            )}
        </button>
    );
}

// ─── School Search Modal ──────────────────────────────────
function SchoolSearchModal({ open, onClose, onSelect, excludeIds }) {
    const [query, setQuery] = useState('');
    const debouncedQuery = useDebounce(query, 300);

    // Search results (debounced)
    const { data: results = [], isLoading: isSearching } = useQuery({
        queryKey: ['school-search', debouncedQuery],
        queryFn: () => fetchSearchResults(debouncedQuery),
        enabled: open && debouncedQuery.length >= 2,
        staleTime: 30 * 1000,
        select: (data) => data.filter(s => !excludeIds.includes(s.id)),
    });

    // Top-rated defaults (shown when no query)
    const { data: topRated = [], isLoading: isLoadingTop } = useQuery({
        queryKey: ['top-rated-schools'],
        queryFn: fetchTopRated,
        enabled: open,
        staleTime: 5 * 60 * 1000,
        select: (data) => data.filter(s => !excludeIds.includes(s.id)),
    });

    // Reset query when modal closes
    useEffect(() => { if (!open) setQuery(''); }, [open]);

    if (!open) return null;

    const isTyping = query.length >= 2 && debouncedQuery !== query;
    const showLoading = isSearching || isTyping;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                        <Search className="w-5 h-5 text-slate-400" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search schools to compare..."
                            className="bg-transparent w-full outline-none text-sm"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                        />
                        {query && (
                            <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                    {/* Skeleton loading */}
                    {showLoading && <SearchSkeleton />}

                    {/* No results */}
                    {!showLoading && debouncedQuery.length >= 2 && results.length === 0 && (
                        <div className="p-8 text-center">
                            <SchoolIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                            <p className="text-sm text-slate-400">No schools found for &quot;{debouncedQuery}&quot;</p>
                        </div>
                    )}

                    {/* Search results */}
                    {!showLoading && results.length > 0 && results.map(school => (
                        <SearchResultItem
                            key={school.id}
                            school={school}
                            onSelect={() => { onSelect(school); onClose(); }}
                        />
                    ))}

                    {/* Default: Top-rated when no query */}
                    {query.length < 2 && !showLoading && (
                        <>
                            {isLoadingTop ? (
                                <SearchSkeleton />
                            ) : topRated.length > 0 ? (
                                <>
                                    <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                                        <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Rated</span>
                                    </div>
                                    {topRated.map(school => (
                                        <SearchResultItem
                                            key={school.id}
                                            school={school}
                                            onSelect={() => { onSelect(school); onClose(); }}
                                        />
                                    ))}
                                </>
                            ) : (
                                <div className="p-6 text-center text-sm text-slate-400">Search for schools to compare</div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Compare Page Content ────────────────────────────
function ComparePageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [showSearch, setShowSearch] = useState(false);
    const [shareTooltip, setShareTooltip] = useState(false);
    const printRef = useRef(null);

    const schoolIds = searchParams.get('schools')?.split(',').filter(Boolean) || [];

    // ── TanStack Query: comparison data ──
    const { data: schools = [], isLoading } = useQuery({
        queryKey: ['compare-schools', schoolIds.sort().join(',')],
        queryFn: () => fetchCompareSchools(schoolIds),
        enabled: schoolIds.length > 0,
        staleTime: 5 * 60 * 1000,
    });

    // ── TanStack Query: recommended schools ──
    const { data: recommended = [] } = useQuery({
        queryKey: ['recommended-schools'],
        queryFn: fetchRecommended,
        staleTime: 10 * 60 * 1000,
        select: (data) => data.filter(s => !schoolIds.includes(s.id)),
    });

    const addSchool = (school) => {
        const newIds = [...schoolIds, school.id];
        router.push(`/explore/compare?schools=${newIds.join(',')}`);
    };

    const removeSchool = (id) => {
        const newIds = schoolIds.filter(i => i !== id);
        router.push(newIds.length === 0 ? '/explore/compare' : `/explore/compare?schools=${newIds.join(',')}`);
    };

    const addRecommendedToCompare = (school) => {
        if (schoolIds.length >= 3) return;
        const newIds = [...schoolIds, school.id];
        router.push(`/explore/compare?schools=${newIds.join(',')}`);
    };

    // ── Share handler ──
    const handleShare = useCallback(async () => {
        const url = window.location.href;
        const title = `Compare Schools – ${schools.map(s => s.school?.name || 'School').join(' vs ')}`;
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
            } catch { /* user cancelled */ }
        } else {
            await navigator.clipboard.writeText(url);
            setShareTooltip(true);
            setTimeout(() => setShareTooltip(false), 2000);
        }
    }, [schools]);

    // ── Export PDF handler (uses browser print) ──
    const handleExportPDF = useCallback(() => {
        const el = printRef.current;
        if (!el) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        const schoolNames = schools.map(s => s.school?.name || 'School').join(' vs ');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html><head>
                <title>Compare: ${schoolNames}</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <style>
                    body { font-family: system-ui, sans-serif; padding: 24px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table { border-collapse: collapse; width: 100%; }
                    td, th { border: 1px solid #e2e8f0; padding: 12px; text-align: left; vertical-align: top; }
                    @media print { body { padding: 0; } }
                </style>
            </head><body>
                <h1 style="font-size:24px;font-weight:800;margin-bottom:8px;">School Comparison</h1>
                <p style="color:#64748b;margin-bottom:24px;">${schoolNames}</p>
                ${el.querySelector('table')?.outerHTML || ''}
            </body></html>
        `);
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.print();
        };
    }, [schools]);

    const loading = isLoading && schoolIds.length > 0;

    return (
        <div className="min-h-screen bg-[#f6f7f8]">
            <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 mb-6 text-sm">
                    <Link href="/explore" className="text-slate-500 hover:text-blue-600">Home</Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <Link href="/explore/schools" className="text-slate-500 hover:text-blue-600">Search Schools</Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-900 font-semibold">Comparison Tool</span>
                </nav>

                {/* Page Title & Controls */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div className="max-w-2xl">
                        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight mb-2">School Comparison</h1>
                        <p className="text-slate-600 text-base md:text-lg">Detailed side-by-side analysis of tuition, academic programs, and campus lifestyle to help you make an informed decision.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <button
                                onClick={handleShare}
                                disabled={schools.length === 0}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-all shadow-sm text-sm disabled:opacity-40"
                            >
                                {shareTooltip ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                                {shareTooltip ? 'Copied!' : 'Share'}
                            </button>
                        </div>
                        <button
                            onClick={handleExportPDF}
                            disabled={schools.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-all shadow-sm text-sm disabled:opacity-40"
                        >
                            <Download className="w-4 h-4" />
                            Export PDF
                        </button>
                    </div>
                </div>

                {/* ═══════════ COMPARISON TABLE ═══════════ */}
                <div ref={printRef} className="bg-white rounded-xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            {/* ── Table Header: School Cards ── */}
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="p-6 text-left min-w-[200px] border-b border-slate-200">
                                        <div className="text-slate-400 uppercase tracking-widest text-xs font-bold">Criteria</div>
                                    </th>

                                    {loading ? (
                                        [0, 1].map(i => (
                                            <th key={i} className="p-6 border-l border-b border-slate-200 min-w-[300px]">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-full h-40 rounded-xl bg-slate-200 animate-pulse" />
                                                    <div className="w-32 h-5 bg-slate-200 animate-pulse rounded" />
                                                    <div className="w-20 h-4 bg-slate-100 animate-pulse rounded" />
                                                </div>
                                            </th>
                                        ))
                                    ) : (
                                        <>
                                            {schools.map(school => {
                                                const name = school.school?.name || 'School';
                                                const coverImage = school.coverImage;
                                                const classes = school.school?.classes || [];
                                                const classRange = classes.length > 0
                                                    ? `${classes[0].className} – ${classes[classes.length - 1].className}`
                                                    : '';

                                                return (
                                                    <th key={school.id} className="p-6 border-l border-b border-slate-200 min-w-[300px]">
                                                        <div className="flex flex-col items-center gap-4 text-center">
                                                            <div className="relative group w-full">
                                                                <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-200 shadow-sm transition-transform group-hover:scale-[1.02]">
                                                                    {coverImage ? (
                                                                        <img src={coverImage} alt={name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                                                            <SchoolIcon className="w-10 h-10 text-slate-300" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <button
                                                                    onClick={() => removeSchool(school.id)}
                                                                    className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 shadow-md transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                            <div>
                                                                <h3 className="text-slate-900 text-lg font-bold flex items-center gap-1.5 justify-center">
                                                                    {name}
                                                                    {school.isVerified && (
                                                                        <img src="/bluetick.png" alt="Verified" className="w-5 h-5 shrink-0" />
                                                                    )}
                                                                </h3>
                                                                {classRange && (
                                                                    <p className="text-blue-600 text-sm font-medium mt-0.5">{classRange}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            })}

                                            {/* Add school slot (up to 3) */}
                                            {schools.length < 3 && (
                                                <th className="p-6 border-l border-b border-slate-200 min-w-[300px] bg-slate-50/30">
                                                    <div className="flex flex-col items-center justify-center h-full min-h-[220px] gap-4">
                                                        <button
                                                            onClick={() => setShowSearch(true)}
                                                            className="w-16 h-16 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-500 hover:text-blue-500 transition-all group"
                                                        >
                                                            <Plus className="w-7 h-7 group-hover:scale-110 transition-transform" />
                                                        </button>
                                                        <p className="text-slate-400 font-medium text-sm">Add another school</p>
                                                    </div>
                                                </th>
                                            )}
                                        </>
                                    )}
                                </tr>
                            </thead>

                            {!loading && schools.length > 0 && (
                                <tbody>
                                    {/* ── Tuition Row ── */}
                                    <tr className="group hover:bg-slate-50 transition-colors">
                                        <td className="p-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <IndianRupee className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-slate-700">Tuition (Annual)</span>
                                            </div>
                                        </td>
                                        {schools.map(s => {
                                            const detailedFees = Array.isArray(s.detailedFeeStructure) ? s.detailedFeeStructure : [];
                                            const totals = detailedFees.map(f => f.total).filter(Boolean);
                                            const computedMin = totals.length > 0 ? Math.min(...totals) : null;
                                            const computedMax = totals.length > 0 ? Math.max(...totals) : null;
                                            const min = s.minFee || computedMin;
                                            const max = s.maxFee || computedMax;
                                            return (
                                                <td key={s.id} className="p-6 border-l border-slate-100">
                                                    <div className="text-slate-900 font-bold text-xl">
                                                        {min && max && min !== max
                                                            ? `${formatFee(min)} – ${formatFee(max)}`
                                                            : min
                                                                ? formatFee(min)
                                                                : '—'}
                                                    </div>
                                                    {min && <p className="text-slate-500 text-xs mt-1">Per year</p>}
                                                </td>
                                            );
                                        })}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>

                                    {/* ── Fee Breakdown Row ── */}
                                    <tr className="group hover:bg-slate-50 transition-colors border-t border-slate-100">
                                        <td className="p-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-slate-700">Fee Breakdown</span>
                                            </div>
                                        </td>
                                        {schools.map(s => {
                                            const feeStructures = s.school?.FeeStructure || [];
                                            const detailedFees = Array.isArray(s.detailedFeeStructure) ? s.detailedFeeStructure : [];
                                            return (
                                                <td key={s.id} className="p-6 border-l border-slate-100">
                                                    {/* Show detailed fee structure if available (array format) */}
                                                    {detailedFees.length > 0 ? (
                                                        <div className="space-y-1.5">
                                                            {detailedFees.slice(0, 6).map((fee, idx) => (
                                                                <div key={idx} className="flex justify-between items-center text-sm">
                                                                    <span className="text-slate-600">{fee.className}</span>
                                                                    <span className="font-semibold text-blue-600">
                                                                        {fee.total ? `₹${Number(fee.total).toLocaleString('en-IN')}` : '—'}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {detailedFees.length > 6 && (
                                                                <p className="text-xs text-slate-400 mt-1">+{detailedFees.length - 6} more grades</p>
                                                            )}
                                                        </div>
                                                    ) : feeStructures.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {feeStructures.slice(0, 3).map((fs, fi) => (
                                                                <div key={fi}>
                                                                    <div className="flex items-center gap-2 mb-1.5">
                                                                        <span className="text-xs font-bold text-slate-700">{fs.name}</span>
                                                                        {fs.Class?.className && (
                                                                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                                                                                {fs.Class.className}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                                                                            {fs.mode}
                                                                        </span>
                                                                    </div>
                                                                    {fs.feeParticulars?.length > 0 ? (
                                                                        <div className="space-y-1 ml-1">
                                                                            {fs.feeParticulars.map((fp, fpi) => (
                                                                                <div key={fpi} className="flex justify-between items-center text-sm">
                                                                                    <span className="text-slate-500 text-xs">{fp.name}</span>
                                                                                    <span className="font-semibold text-slate-700 text-xs">₹{fp.defaultAmount?.toLocaleString('en-IN')}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-xs text-slate-400">No particulars</p>
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {feeStructures.length > 3 && (
                                                                <p className="text-xs text-blue-600 font-medium">+{feeStructures.length - 3} more structures</p>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-slate-400">No fee details available</p>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>

                                    {/* ── Curriculum / Classes Row ── */}
                                    <tr className="group hover:bg-slate-50 transition-colors border-t border-slate-100">
                                        <td className="p-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <BookOpen className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-slate-700">Curriculum</span>
                                            </div>
                                        </td>
                                        {schools.map(s => {
                                            const classes = s.school?.classes || [];
                                            const badges = s.badges || [];
                                            return (
                                                <td key={s.id} className="p-6 border-l border-slate-100">
                                                    <div className="flex flex-wrap gap-2">
                                                        {badges.map((b, i) => (
                                                            <span key={i} className="px-3 py-1 bg-blue-50 rounded-full text-xs font-semibold text-blue-600">
                                                                {b.badgeType}
                                                            </span>
                                                        ))}
                                                        {classes.length > 0 && (
                                                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                                                                {classes.length} Classes
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>

                                    {/* ── Facilities Row ── */}
                                    <tr className="group hover:bg-slate-50 transition-colors border-t border-slate-100">
                                        <td className="p-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <Building2 className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-slate-700">Facilities</span>
                                            </div>
                                        </td>
                                        {schools.map(s => {
                                            const facilities = s.facilities || [];
                                            return (
                                                <td key={s.id} className="p-6 border-l border-slate-100">
                                                    <ul className="space-y-2">
                                                        {facilities.slice(0, 5).map((f, i) => (
                                                            <li key={i} className={`flex items-center gap-2 text-sm ${f.isAvailable ? 'text-slate-600' : 'text-slate-400 line-through'}`}>
                                                                {f.isAvailable ? (
                                                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                                                ) : (
                                                                    <XCircle className="w-4 h-4 text-slate-300 shrink-0" />
                                                                )}
                                                                {f.name}
                                                            </li>
                                                        ))}
                                                        {facilities.length > 5 && (
                                                            <li className="text-xs text-blue-600 font-medium">+{facilities.length - 5} more</li>
                                                        )}
                                                        {facilities.length === 0 && (
                                                            <li className="text-sm text-slate-400">No facilities listed</li>
                                                        )}
                                                    </ul>
                                                </td>
                                            );
                                        })}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>

                                    {/* ── Parent Rating Row ── */}
                                    <tr className="group hover:bg-slate-50 transition-colors border-t border-slate-100">
                                        <td className="p-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <Star className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-slate-700">Parent Rating</span>
                                            </div>
                                        </td>
                                        {schools.map(s => (
                                            <td key={s.id} className="p-6 border-l border-slate-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <StarRating rating={s.overallRating || 0} />
                                                    <span className="text-slate-900 font-bold ml-1">{(s.overallRating || 0).toFixed(1)}</span>
                                                </div>
                                                <p className="text-slate-500 text-xs">{s._count?.ratings || 0} reviews</p>

                                                {/* Rating breakdown */}
                                                <div className="mt-3 space-y-1.5">
                                                    {[
                                                        { label: 'Academic', value: s.academicRating },
                                                        { label: 'Infrastructure', value: s.infrastructureRating },
                                                        { label: 'Sports', value: s.sportsRating },
                                                    ].map(r => (
                                                        <div key={r.label} className="flex items-center gap-2">
                                                            <span className="text-[11px] text-slate-500 w-20">{r.label}</span>
                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-blue-500 rounded-full transition-all"
                                                                    style={{ width: `${((r.value || 0) / 5) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] font-semibold text-slate-600 w-7 text-right">{(r.value || 0).toFixed(1)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        ))}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>

                                    {/* ── Stats Row ── */}
                                    <tr className="group hover:bg-slate-50 transition-colors border-t border-slate-100">
                                        <td className="p-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <Users className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-slate-700">School Stats</span>
                                            </div>
                                        </td>
                                        {schools.map(s => (
                                            <td key={s.id} className="p-6 border-l border-slate-100">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                                        <div className="text-lg font-bold text-slate-800">{s.totalStudents || '—'}</div>
                                                        <div className="text-[11px] text-slate-500">Students</div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                                        <div className="text-lg font-bold text-slate-800">{s.totalTeachers || '—'}</div>
                                                        <div className="text-[11px] text-slate-500">Teachers</div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                                        <div className="text-lg font-bold text-slate-800">{s.studentTeacherRatio ? `1:${s.studentTeacherRatio}` : '—'}</div>
                                                        <div className="text-[11px] text-slate-500">Ratio</div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                                                        <div className="text-lg font-bold text-slate-800">{s.establishedYear || '—'}</div>
                                                        <div className="text-[11px] text-slate-500">Est.</div>
                                                    </div>
                                                </div>
                                            </td>
                                        ))}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>

                                    {/* ── Location Row ── */}
                                    <tr className="group hover:bg-slate-50 transition-colors border-t border-slate-100">
                                        <td className="p-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <MapPin className="w-5 h-5 text-slate-400" />
                                                <span className="font-bold text-slate-700">Location</span>
                                            </div>
                                        </td>
                                        {schools.map(s => (
                                            <td key={s.id} className="p-6 border-l border-slate-100">
                                                <div className="flex flex-col gap-3">
                                                    <p className="text-sm text-slate-600">{s.school?.location || '—'}</p>
                                                    {s.latitude && s.longitude && (
                                                        <div className="h-24 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden relative">
                                                            <iframe
                                                                src={`https://www.google.com/maps?q=${s.latitude},${s.longitude}&z=14&output=embed`}
                                                                className="w-full h-full border-0"
                                                                loading="lazy"
                                                                title={`Map of ${s.school?.name}`}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        ))}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>

                                    {/* ── Action Buttons Row ── */}
                                    <tr className="border-t border-slate-100">
                                        <td className="p-6"></td>
                                        {schools.map((s, idx) => (
                                            <td key={s.id} className="p-6 border-l border-slate-100">
                                                <Link
                                                    href={`/explore/schools/${s.slug || s.schoolId || s.id}`}
                                                    className={`w-full py-3 font-bold rounded-lg shadow-md text-center block transition-all hover:scale-[1.02] active:scale-[0.98] ${idx === 0
                                                        ? 'bg-blue-600 text-white shadow-blue-600/20'
                                                        : 'bg-slate-900 text-white shadow-slate-900/20'
                                                        }`}
                                                >
                                                    View Profile
                                                </Link>
                                            </td>
                                        ))}
                                        {schools.length < 3 && <td className="p-6 border-l border-slate-100 bg-slate-50/20" />}
                                    </tr>
                                </tbody>
                            )}
                        </table>
                    </div>

                    {/* Empty state — no schools selected */}
                    {!loading && schools.length === 0 && (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                                <GraduationCap className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No Schools Selected</h3>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">Select schools from the directory to start comparing them side by side.</p>
                            <div className="flex gap-3 justify-center">
                                <button
                                    onClick={() => setShowSearch(true)}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all"
                                >
                                    Search Schools
                                </button>
                                <Link
                                    href="/explore/schools"
                                    className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg shadow-sm hover:bg-slate-50 transition-all"
                                >
                                    Browse Directory
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* ═══════════ RECOMMENDED SCHOOLS ═══════════ */}
                {recommended.length > 0 && (
                    <div className="mt-20">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-bold text-slate-900">Recommended for your search</h2>
                            <Link href="/explore/schools" className="text-blue-600 font-semibold flex items-center gap-1 hover:underline text-sm">
                                See all <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {recommended.map(school => {
                                const name = school.school?.name || 'School';
                                const location = school.school?.location || '';
                                const coverImage = school.coverImage;
                                const alreadyComparing = schoolIds.includes(school.id);

                                return (
                                    <div key={school.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm group cursor-pointer hover:shadow-lg transition-all">
                                        <div className="h-40 rounded-lg mb-4 overflow-hidden bg-slate-100">
                                            {coverImage ? (
                                                <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                                                    <SchoolIcon className="w-10 h-10 text-slate-300" />
                                                </div>
                                            )}
                                        </div>
                                        <Link href={`/explore/schools/${school.slug || school.schoolId || school.id}`}>
                                            <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{name}</h4>
                                        </Link>
                                        <p className="text-slate-500 text-sm mb-2">{location.split(',').slice(0, 2).join(',').trim()}</p>
                                        {school.overallRating > 0 && (
                                            <div className="flex items-center gap-1.5 mb-3">
                                                <Star className="w-4 h-4 text-orange-400 fill-orange-400" />
                                                <span className="text-sm font-bold text-slate-700">{school.overallRating.toFixed(1)}</span>
                                                <span className="text-xs text-slate-400">rating</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                                            <span className="text-slate-900 font-bold">
                                                {(() => {
                                                    if (school.minFee) return formatFee(school.minFee) + '/yr';
                                                    const fees = Array.isArray(school.detailedFeeStructure) ? school.detailedFeeStructure : [];
                                                    const totals = fees.map(f => f.total).filter(Boolean);
                                                    if (totals.length > 0) {
                                                        const min = Math.min(...totals);
                                                        const max = Math.max(...totals);
                                                        return min !== max ? `${formatFee(min)} – ${formatFee(max)}/yr` : `${formatFee(min)}/yr`;
                                                    }
                                                    return '—';
                                                })()}
                                            </span>
                                            {!alreadyComparing && schoolIds.length < 3 ? (
                                                <button
                                                    onClick={() => addRecommendedToCompare(school)}
                                                    className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline"
                                                >
                                                    Add to compare <Plus className="w-4 h-4" />
                                                </button>
                                            ) : alreadyComparing ? (
                                                <span className="text-green-600 text-sm font-semibold flex items-center gap-1">
                                                    <CheckCircle2 className="w-4 h-4" /> Comparing
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* Search Modal */}
            <SchoolSearchModal
                open={showSearch}
                onClose={() => setShowSearch(false)}
                onSelect={addSchool}
                excludeIds={schoolIds}
            />
        </div>
    );
}

// ─── Default Export with Suspense wrapper ─────────────────
export default function ComparePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#f6f7f8] flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <ComparePageContent />
        </Suspense>
    );
}
