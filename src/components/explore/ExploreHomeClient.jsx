'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search, MapPin, School as SchoolIcon, GraduationCap, ArrowRight,
    Heart, ChevronLeft, ChevronRight, Star, CheckCircle2, BookOpen,
    DollarSign, Trophy, Layers, Globe, ChevronDown, Monitor, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Dropdown data ───
const curriculumOptions = ['CBSE', 'ICSE', 'IB', 'IGCSE', 'State Board', 'Cambridge', 'Montessori', 'Waldorf'];
const gradeLevelOptions = ['Pre-K', 'Elementary (K-5)', 'Middle School (6-8)', 'High School (9-12)', 'K-12', 'Pre-K to 8'];
const tuitionOptions = ['Under ₹50K', '₹50K – ₹1L', '₹1L – ₹2L', '₹2L – ₹5L', '₹5L+'];
const activitiesOptions = ['Sports', 'Arts & Craft', 'Music', 'Robotics', 'Debate', 'Drama', 'Swimming', 'Dance'];

// Major Indian cities
const indianCities = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune',
    'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Bhopal', 'Indore',
    'Kochi', 'Coimbatore', 'Nagpur', 'Visakhapatnam', 'Patna', 'Vadodara',
    'Gurgaon', 'Noida', 'Thiruvananthapuram', 'Dehradun', 'Surat', 'Mysore',
    'Ranchi', 'Guwahati', 'Bhubaneswar', 'Amritsar', 'Varanasi'
];

// ─── Animation variants ───
const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};
const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// ─── CategoryDropdown Component ───
function CategoryDropdown({ icon: Icon, label, options, onSelect }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-gray-200 bg-white text-sm font-medium text-[#0f172a] hover:border-[#2563eb] hover:text-[#2563eb] transition-all focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
                <Icon className="h-4 w-4 text-gray-400" />
                {label}
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-56 max-h-64 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-xl shadow-black/5 z-50 py-1"
                    >
                        {options.map((opt) => (
                            <button
                                key={opt}
                                onClick={() => {
                                    onSelect(opt);
                                    setOpen(false);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-[#2563eb] transition-colors"
                            >
                                {opt}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Main Component ───
export default function ExploreHomeClient() {
    const [searchQuery, setSearchQuery] = useState('');
    const featuredScrollRef = useRef(null);

    // Fetch featured schools — fallback to all schools if none are featured
    const { data: featuredSchoolsData, isLoading: featuredLoading } = useQuery({
        queryKey: ['featured-schools-home'],
        queryFn: async () => {
            // Try featured first
            const res = await fetch('/api/public/schools?featured=true&limit=6');
            if (res.ok) {
                const data = await res.json();
                if (data.schools && data.schools.length > 0) return data;
            }
            // Fallback to regular schools sorted by rating
            const fallback = await fetch('/api/public/schools?sort=rating&limit=6');
            if (!fallback.ok) throw new Error('Failed to fetch schools');
            return fallback.json();
        },
    });

    const scrollFeatured = (dir) => {
        if (featuredScrollRef.current) {
            featuredScrollRef.current.scrollBy({
                left: dir === 'left' ? -340 : 340,
                behavior: 'smooth'
            });
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        window.location.href = searchQuery.trim()
            ? `/explore/schools?search=${encodeURIComponent(searchQuery.trim())}`
            : '/explore/schools';
    };

    const handleCategorySelect = (type, value) => {
        const param = type === 'location' ? 'location' : 'search';
        window.location.href = `/explore/schools?${param}=${encodeURIComponent(value)}`;
    };

    const popularTags = ['Montessori', 'IB World Schools', 'STEM'];

    const formatFee = (fee) => {
        if (!fee) return null;
        if (fee >= 100000) return `₹${(fee / 100000).toFixed(1)}L`;
        if (fee >= 1000) return `₹${(fee / 1000).toFixed(0)}K`;
        return `₹${fee}`;
    };

    return (
        <div className="relative min-h-screen bg-white">
            {/* ═══════════ HERO SECTION ═══════════ */}
            <section className="relative bg-gradient-to-br from-[#f8fafc] via-white to-[#f0f4ff] pt-10 pb-14 md:pt-16 md:pb-20 overflow-hidden">
                {/* Subtle blobs */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(5,105,255,0.06)_0%,transparent_70%)] blur-[60px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_70%)] blur-[60px] rounded-full pointer-events-none" />

                <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
                        {/* ── Left Column ── */}
                        <motion.div className="space-y-6" initial="hidden" animate="visible" variants={staggerContainer}>
                            <motion.div variants={fadeInUp}>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#2563eb] bg-blue-50 px-3 py-1.5 rounded-full">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2563eb]" />
                                    The Premier Education Marketplace
                                </span>
                            </motion.div>

                            <motion.h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-extrabold text-[#0f172a] leading-[1.08] tracking-tight" variants={fadeInUp}>
                                Find the Perfect
                                <br />Future{' '}
                                <span className="text-[#2563eb]">for Your Child</span>
                            </motion.h1>

                            <motion.p className="text-[15px] md:text-base text-gray-500 max-w-md leading-relaxed" variants={fadeInUp}>
                                Discover and compare top-rated educational institutions tailored to your child's unique needs, talents, and aspirations.
                            </motion.p>

                            {/* Search */}
                            <motion.form onSubmit={handleSearch} variants={fadeInUp} className="max-w-md">
                                <div className="flex items-center bg-white rounded-full border border-gray-200 shadow-lg shadow-gray-200/50 p-1.5 pl-4 hover:shadow-xl transition-shadow">
                                    <Search className="h-5 w-5 text-gray-400 mr-2 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search for schools..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400 text-gray-700 min-w-0"
                                    />
                                    <button type="submit" className="h-9 px-6 rounded-full bg-[#2563eb] text-white text-sm font-semibold hover:bg-[#1d4ed8] transition-colors shrink-0">
                                        Search
                                    </button>
                                </div>
                            </motion.form>

                            {/* Popular Tags */}
                            <motion.div variants={fadeInUp} className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-400 font-medium">Popular:</span>
                                {popularTags.map((tag) => (
                                    <Link key={tag} href={`/explore/schools?search=${encodeURIComponent(tag)}`}
                                        className="text-xs text-gray-500 hover:text-[#2563eb] transition-colors border-b border-dashed border-gray-300 hover:border-[#2563eb] pb-px">
                                        {tag}
                                    </Link>
                                ))}
                            </motion.div>

                            {/* Stats */}
                            <motion.div variants={fadeInUp} className="flex items-center gap-10 pt-2">
                                {[
                                    { value: '500+', label: 'SCHOOLS' },
                                    { value: '12K+', label: 'REVIEWS' },
                                    { value: '98%', label: 'SATISFIED' },
                                ].map((s) => (
                                    <div key={s.label}>
                                        <div className="text-2xl md:text-3xl font-extrabold text-[#0f172a]">{s.value}</div>
                                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{s.label}</div>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* ── Right Column — Image ── */}
                        <motion.div className="relative hidden lg:block" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10 aspect-[4/3]">
                                <img
                                    src="https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800&h=600&fit=crop"
                                    alt="Modern school campus"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            </div>



                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ═══════════ EXPLORE BY CATEGORY ═══════════ */}
            <section className="bg-white py-10 md:py-14 border-t border-gray-50">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl md:text-2xl font-bold text-[#0f172a]">Explore by Category</h2>
                        <Link href="/explore/schools" className="text-sm font-medium text-[#2563eb] hover:text-[#1d4ed8] flex items-center gap-1 transition-colors">
                            View all filters <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <CategoryDropdown icon={MapPin} label="Location" options={indianCities} onSelect={(v) => handleCategorySelect('location', v)} />
                        <CategoryDropdown icon={Monitor} label="Curriculum" options={curriculumOptions} onSelect={(v) => handleCategorySelect('curriculum', v)} />
                        <CategoryDropdown icon={GraduationCap} label="Grade Level" options={gradeLevelOptions} onSelect={(v) => handleCategorySelect('grade', v)} />
                        <CategoryDropdown icon={DollarSign} label="Tuition" options={tuitionOptions} onSelect={(v) => handleCategorySelect('tuition', v)} />
                        <CategoryDropdown icon={Award} label="Activities" options={activitiesOptions} onSelect={(v) => handleCategorySelect('activities', v)} />
                    </div>
                </div>
            </section>

            {/* ═══════════ FEATURED INSTITUTIONS ═══════════ */}
            <section className="bg-[#f8fafc] py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl md:text-2xl font-bold text-[#0f172a]">Featured Institutions</h2>
                        <div className="flex items-center gap-2">
                            <button onClick={() => scrollFeatured('left')} className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button onClick={() => scrollFeatured('right')} className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div
                        ref={featuredScrollRef}
                        className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {featuredLoading ? (
                            [...Array(3)].map((_, i) => (
                                <div key={i} className="w-[310px] shrink-0 snap-start">
                                    <Card className="overflow-hidden pt-0 rounded-xl">
                                        <Skeleton className="h-48 w-full" />
                                        <div className="p-4 space-y-3">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    </Card>
                                </div>
                            ))
                        ) : featuredSchoolsData?.schools?.length > 0 ? (
                            featuredSchoolsData.schools.map((profile) => {
                                const name = profile.school?.name || profile.name || 'School';
                                const location = profile.school?.location || profile.location || '';
                                const slug = profile.slug || profile.schoolId || profile.id;
                                const rating = profile.overallRating || 0;
                                const coverImage = profile.coverImage;
                                const badges = profile.badges || [];
                                const classes = profile.school?.classes || [];
                                const classNames = classes.map(c => c.className).sort((a, b) => {
                                    const numA = parseInt(a.replace(/\D/g, '')) || 0;
                                    const numB = parseInt(b.replace(/\D/g, '')) || 0;
                                    return numA - numB;
                                });
                                const gradeLabel = classNames.length > 1
                                    ? `Grades ${classNames[0]}–${classNames[classNames.length - 1]}`
                                    : classNames.length === 1 ? `Grade ${classNames[0]}` : null;
                                const minFee = profile.minFee;
                                const maxFee = profile.maxFee;
                                const detailedFees = Array.isArray(profile.detailedFeeStructure) ? profile.detailedFeeStructure : [];
                                const feeTotals = detailedFees.map(f => f.total).filter(Boolean);
                                const computedFee = feeTotals.length > 0 ? Math.min(...feeTotals) : null;

                                return (
                                    <Link key={profile.schoolId || profile.id} href={`/explore/schools/${slug}`} className="w-[280px] shrink-0 snap-start group block">
                                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.15)] transition-all duration-300 group-hover:-translate-y-1">
                                            {/* Image section */}
                                            <div className="relative h-[180px] overflow-hidden">
                                                {coverImage ? (
                                                    <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                                        <SchoolIcon className="w-10 h-10 text-gray-300" />
                                                    </div>
                                                )}

                                                {/* Top Rated / Featured badge */}
                                                {(profile.isFeatured || rating >= 4) && (
                                                    <div className="absolute top-3 left-3 px-3 py-1.5 rounded-md bg-[#0f172a] text-white text-[11px] font-bold shadow-md">
                                                        {profile.isFeatured ? 'Featured' : 'Top Rated'}
                                                    </div>
                                                )}

                                                {/* Heart icon */}
                                                <button onClick={(e) => e.preventDefault()} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white hover:scale-110 transition-all duration-200">
                                                    <Heart className="w-[18px] h-[18px] text-gray-400" />
                                                </button>
                                            </div>

                                            {/* Content section */}
                                            <div className="p-4 space-y-3">
                                                {/* Name + Rating */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <h3 className="font-bold text-[15px] text-[#0f172a] leading-snug line-clamp-2 flex items-center gap-1.5">
                                                        <span className="line-clamp-2">{name}</span>
                                                        {profile.isVerified && (
                                                            <img src="/bluetick.png" alt="Verified" className="w-[16px] h-[16px] shrink-0" />
                                                        )}
                                                    </h3>
                                                    {rating > 0 && (
                                                        <div className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                                                            <span className="text-sm font-bold text-emerald-700">{rating.toFixed(1)}</span>
                                                            <Star className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Location */}
                                                {location && (
                                                    <p className="text-[13px] text-gray-500 flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                                                        <span className="truncate">{location.split(',').slice(0, 2).join(',').trim()}</span>
                                                    </p>
                                                )}

                                                {/* Tags */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {badges.length > 0 ? (
                                                        badges.slice(0, 3).map((b, idx) => (
                                                            <span className="text-[11px] bg-[#f7f9fc] font-bold px-2.5 py-1 rounded-full border border-gray-200 text-[#2d3c52] ">
                                                                {b.badgeType || b}
                                                            </span>
                                                        ))
                                                    ) : gradeLabel ? (
                                                        <span className="text-[11px] bg-[#f7f9fc] font-bold px-2.5 py-1 rounded-full border border-gray-200 text-[#2d3c52] ">{gradeLabel}</span>
                                                    ) : null}
                                                </div>

                                                {/* Price + Status */}
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                                    <div>
                                                        {(minFee || maxFee || computedFee) ? (
                                                            <span className="text-[15px] font-bold text-[#0f172a]">
                                                                {formatFee(minFee || maxFee || computedFee)}
                                                                <span className="text-xs font-normal text-gray-400 ml-1">/ year</span>
                                                            </span>
                                                        ) : (
                                                            <span className="text-[13px] text-gray-400">Contact for fees</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-emerald-600">
                                                        Accepting Applications
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="w-full text-center py-16 text-gray-400">
                                <SchoolIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">No featured schools available at the moment.</p>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══════════ CTA BANNER ═══════════ */}
            <section className="py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <div className="rounded-2xl bg-gradient-to-r from-[#1e40af] to-[#2563eb] p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                Are you a School Administrator?
                            </h2>
                            <p className="text-blue-200 text-sm md:text-base max-w-md leading-relaxed">
                                Join EduMarket to showcase your institution to thousands of parents and students looking for their perfect match.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <Link href="/explore/about">
                                <button className="h-11 px-6 rounded-full bg-white text-[#2563eb] text-sm font-semibold hover:bg-blue-50 transition-colors border border-white">
                                    List Your School
                                </button>
                            </Link>
                            <Link href="/explore/about">
                                <button className="h-11 px-6 rounded-full bg-[#3b82f6] text-white text-sm font-semibold hover:bg-[#2563eb] transition-colors border border-white/20">
                                    Learn More
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══════════ FOOTER ═══════════ */}
            <footer className="bg-white border-t border-gray-100 py-8">
                <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <SchoolIcon className="w-5 h-5 text-[#2563eb]" />
                        <span className="font-bold text-[#0f172a]">EduBreezy</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/explore/about" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Privacy Policy</Link>
                        <Link href="/explore/about" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Terms of Service</Link>
                        <Link href="/explore/about" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Contact Support</Link>
                    </div>
                    <p className="text-xs text-gray-400">© 2024 EduBreezy Inc.</p>
                </div>
            </footer>
        </div>
    );
}
