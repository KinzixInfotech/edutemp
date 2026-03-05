'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Search, MapPin, School as SchoolIcon, ArrowRight,
    Heart, Star, ChevronRight, BookOpen, GraduationCap,
    Globe, Users, Award, Compass, PenTool, Lightbulb,
    CalendarCheck, CreditCard, Clock, ClipboardList, MessageSquare, BarChart3, Sparkles, Zap,
    Pencil, BookMarked, Ruler, Calculator, Library, Trophy, Microscope, Bell
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';

// ─── Animation variants ───
const fadeInUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};
const staggerContainer = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// ─── Main Component ───
export default function ExploreHomeClient() {
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch featured schools — fallback to all schools if none are featured
    const { data: featuredSchoolsData, isLoading: featuredLoading } = useQuery({
        queryKey: ['featured-schools-home'],
        queryFn: async () => {
            // Try featured first
            const res = await fetch('/api/public/schools?featured=true&limit=8');
            if (res.ok) {
                const data = await res.json();
                if (data.schools && data.schools.length > 0) return data;
            }
            // Fallback to regular schools sorted by rating
            const fallback = await fetch('/api/public/schools?sort=rating&limit=8');
            if (!fallback.ok) throw new Error('Failed to fetch schools');
            return fallback.json();
        },
    });

    const handleSearch = (e) => {
        e.preventDefault();
        window.location.href = searchQuery.trim()
            ? `/explore/schools?search=${encodeURIComponent(searchQuery.trim())}`
            : '/explore/schools';
    };

    const popularCities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'];

    const formatFee = (fee) => {
        if (!fee) return null;
        if (fee >= 100000) return `₹${(fee / 100000).toFixed(1)}L`;
        if (fee >= 1000) return `₹${(fee / 1000).toFixed(0)}K`;
        return `₹${fee}`;
    };

    return (
        <div className="relative min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ═══════════ HERO SECTION — page.jsx style ═══════════ */}
            <HeroSection searchQuery={searchQuery} setSearchQuery={setSearchQuery} handleSearch={handleSearch} popularCities={popularCities} />

            {/* ═══════════ MARQUEE BANNER ═══════════ */}
            <MarqueeBanner />

            {/* ═══════════ FEATURES GRID ═══════════ */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                    >
                        {[
                            {
                                icon: (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                ),
                                title: 'Compare Schools',
                                desc: 'Side-by-side comparison of curriculum, facilities, and culture.',
                                href: '/explore/schools',
                            },
                            {
                                icon: (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                ),
                                title: 'View Fees',
                                desc: 'Transparent access to up-to-date tuition and hidden fee structures.',
                                href: '/explore/schools',
                            },
                            {
                                icon: (
                                    <Star className="w-6 h-6" />
                                ),
                                title: 'Read Reviews',
                                desc: 'Authentic feedback from verified parents, students, and alumni.',
                                href: '/explore/schools',
                            },
                            {
                                icon: (
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                ),
                                title: 'Admission Enquiry',
                                desc: 'Directly contact school admissions offices with one simple form.',
                                href: '/explore/schools',
                            },
                        ].map((item, idx) => (
                            <motion.div key={idx} variants={fadeInUp}>
                                <Link href={item.href} className="block group">
                                    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-xl hover:shadow-[#0052ff]/5 transition-all duration-300">
                                        <div className="w-12 h-12 bg-[#0052ff]/10 rounded-xl flex items-center justify-center text-[#0052ff] mb-6 group-hover:bg-[#0052ff] group-hover:text-white transition-all">
                                            {item.icon}
                                        </div>
                                        <h3 className="text-lg font-bold mb-3 text-slate-900">{item.title}</h3>
                                        <p className="text-slate-600 text-sm leading-relaxed">{item.desc}</p>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ═══════════ TOP RATED SCHOOLS ═══════════ */}
            <section className="py-24 bg-[#f5f7f8]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4">Top Rated Schools</h2>
                            <p className="text-slate-600">Discover the highest rated institutions across all levels.</p>
                        </div>
                        <Link
                            href="/explore/schools"
                            className="hidden sm:flex items-center gap-2 text-[#0052ff] font-bold hover:underline transition-colors"
                        >
                            View All
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                        {featuredLoading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i}>
                                    <Card className="overflow-hidden pt-0 rounded-2xl">
                                        <Skeleton className="aspect-[4/3] w-full" />
                                        <div className="p-6 space-y-3">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    </Card>
                                </div>
                            ))
                        ) : featuredSchoolsData?.schools?.length > 0 ? (
                            featuredSchoolsData.schools.slice(0, 4).map((profile) => {
                                const name = profile.school?.name || profile.name || 'School';
                                const location = profile.school?.location || profile.location || '';
                                const slug = profile.slug || profile.schoolId || profile.id;
                                const rating = profile.overallRating || 0;
                                const coverImage = profile.coverImage;
                                const minFee = profile.minFee;
                                const maxFee = profile.maxFee;
                                const detailedFees = Array.isArray(profile.detailedFeeStructure) ? profile.detailedFeeStructure : [];
                                const feeTotals = detailedFees.map(f => f.total).filter(Boolean);
                                const computedFee = feeTotals.length > 0 ? Math.min(...feeTotals) : null;

                                return (
                                    <Link key={profile.schoolId || profile.id} href={`/explore/schools/${slug}`} className="group block">
                                        <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-2xl transition-all duration-300">
                                            {/* Image */}
                                            <div className="relative aspect-[4/3] bg-cover bg-center overflow-hidden">
                                                {coverImage ? (
                                                    <img src={coverImage} alt={name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                                                        <SchoolIcon className="w-10 h-10 text-gray-300" />
                                                    </div>
                                                )}
                                                {/* Badge */}
                                                <div className="absolute top-4 left-4">
                                                    <span className="bg-green-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg">
                                                        Accepting Admissions
                                                    </span>
                                                </div>
                                                {/* Heart */}
                                                <button
                                                    onClick={(e) => e.preventDefault()}
                                                    className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white hover:text-[#0052ff] transition-all"
                                                >
                                                    <Heart className="w-5 h-5" />
                                                </button>
                                            </div>

                                            {/* Content */}
                                            <div className="p-6">
                                                <h3 className="font-bold text-lg mb-1 truncate text-slate-900 flex items-center gap-1.5">
                                                    <span className="truncate">{name}</span>
                                                    {profile.isVerified && (
                                                        <img src="/bluetick.png" alt="Verified" className="w-4 h-4 shrink-0" />
                                                    )}
                                                </h3>

                                                {/* Rating */}
                                                <div className="flex items-center gap-1 text-amber-500 mb-4">
                                                    {rating > 0 ? (
                                                        <>
                                                            <Star className="w-3.5 h-3.5 fill-amber-500" />
                                                            <span className="text-sm font-bold text-slate-800">{rating.toFixed(1)}</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">No ratings yet</span>
                                                    )}
                                                    {location && (
                                                        <span className="text-sm text-slate-400 ml-2 flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {location.split(',').slice(0, 1).join('').trim()}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Fee + Arrow */}
                                                <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Starting at</p>
                                                        {(minFee || maxFee || computedFee) ? (
                                                            <p className="text-lg font-black text-[#00bf37]">
                                                                {formatFee(minFee || computedFee || maxFee)}
                                                                <span className="text-xs text-slate-400 font-normal">/yr</span>
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm text-slate-400">Contact for fees</p>
                                                        )}
                                                    </div>
                                                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all text-slate-600">
                                                        <ChevronRight className="w-5 h-5" strokeWidth={4} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })
                        ) : (
                            <div className="col-span-full text-center py-16 text-gray-400">
                                <SchoolIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-sm">No featured schools available at the moment.</p>
                            </div>
                        )}
                    </div>

                    {/* Mobile View All */}
                    <div className="sm:hidden mt-8 text-center">
                        <Link
                            href="/explore/schools"
                            className="inline-flex items-center gap-2 text-[#0052ff] font-bold hover:underline"
                        >
                            View All Schools <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══════════ HOW IT WORKS ═══════════ */}
            <section className="py-24 bg-[#0566c7] text-white overflow-hidden relative">
                {/* Grid pattern bg */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <motion.div
                        className="text-center mb-20"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                    >
                        <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-black mb-6">
                            How EduBreezy Atlas Works
                        </motion.h2>
                        <motion.p variants={fadeInUp} className="text-white/70 max-w-2xl mx-auto text-lg">
                            Finding the perfect school shouldn't be a marathon. We've simplified the process into three easy steps.
                        </motion.p>
                    </motion.div>

                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-12 relative"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={staggerContainer}
                    >
                        {/* Connection line (desktop) */}
                        <div className="hidden md:block absolute top-10 left-[25%] right-[25%] h-px bg-white/20" />

                        {[
                            {
                                step: 1,
                                title: 'Search',
                                desc: 'Enter your location and preferences to see a curated list of schools that match your specific criteria.',
                                icon: <Search className="w-8 h-8" />,
                            },
                            {
                                step: 2,
                                title: 'Compare',
                                desc: 'Filter by fees, ratings, and facilities. Compare your top choices side-by-side to see which fits best.',
                                icon: (
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                    </svg>
                                ),
                            },
                            {
                                step: 3,
                                title: 'Apply',
                                desc: 'Send an enquiry or start an application directly through our platform to save time and track your progress.',
                                icon: (
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                ),
                            },
                        ].map((item) => (
                            <motion.div key={item.step} variants={fadeInUp} className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-8 relative">
                                    {item.icon}
                                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-white text-[#0052ff] rounded-full flex items-center justify-center font-black text-sm">
                                        {item.step}
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                                <p className="text-white/60 leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>

                    <div className="mt-20 text-center">
                        <Link href="/explore/schools">
                            <button className="bg-white text-[#0052ff] px-10 py-4 rounded-full font-black shadow-xl hover:scale-105 transition-all active:scale-95 text-sm">
                                Start Searching Now
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ═══════════ CTA — SCHOOL DIGITAL PRESENCE ═══════════ */}
            <section className="bg-[#f5f7f8]">
                <div className="">
                    <div className="bg-slate-900 p-8 lg:p-16 flex flex-col lg:flex-row items-center gap-12 overflow-hidden relative">
                        {/* Text */}
                        <div className="flex-1 text-center lg:text-left relative z-10">
                            <h2 className="text-3xl lg:text-5xl font-black text-white mb-6 leading-tight">
                                Empower Your School's Digital Presence
                            </h2>
                            <p className="text-slate-400 text-lg mb-10 max-w-xl">
                                Join thousands of schools reaching millions of parents every month. Manage your profile, respond to reviews, and track enquiries.
                            </p>
                            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                                <Link href="/explore/about">
                                    <button className="bg-white text-slate-900 px-8 py-4 rounded-full font-bold hover:bg-slate-100 transition-all active:scale-95 text-sm">
                                        List Your School
                                    </button>
                                </Link>
                                <Link href="/explore/about">
                                    <button className="border border-slate-700 text-white px-8 py-4 rounded-full font-bold hover:bg-slate-800 transition-all active:scale-95 text-sm">
                                        Contact Sales
                                    </button>
                                </Link>
                            </div>
                        </div>

                        {/* Mockup graphic */}
                        <div className="flex-1 relative hidden lg:block">
                            <div className="bg-gradient-to-tr from-[#0566c7] to-blue-400 w-full aspect-square rounded-full blur-[120px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30" />
                            <div className="relative bg-slate-800 border border-slate-700 p-6 rounded-3xl shadow-2xl rotate-3">
                                <div className="space-y-4">
                                    <div className="h-4 w-3/4 bg-slate-700 rounded-full" />
                                    <div className="h-4 w-1/2 bg-slate-700 rounded-full" />
                                    <div className="grid grid-cols-3 gap-4 py-4">
                                        <div className="h-28 bg-slate-700 rounded-xl" />
                                        <div className="h-28 bg-slate-700 rounded-xl" />
                                        <div className="h-28 bg-slate-700 rounded-xl" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-20 bg-slate-700/60 rounded-xl" />
                                        <div className="h-20 bg-slate-700/60 rounded-xl" />
                                    </div>
                                    <div className="h-12 w-full bg-[#2e7cf9] rounded-xl" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

// ═══════════ HERO SECTION — Typewriter style from page.jsx ═══════════
function HeroSection({ searchQuery, setSearchQuery, handleSearch, popularCities }) {
    const line1Ref = useRef(null);
    const line2Ref = useRef(null);
    const line2WrapperRef = useRef(null);
    const cursor1Ref = useRef(null);
    const cursor2Ref = useRef(null);
    const cursorFadeRef = useRef(null);
    const [showContent, setShowContent] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const line1 = "Find the Best Schools";
        const line2 = "Near You";

        const typeText = async () => {
            if (cursor1Ref.current) cursor1Ref.current.style.display = 'inline-block';
            if (cursor1Ref.current) cursor1Ref.current.classList.add('typewriter-cursor-idle');
            await new Promise(r => setTimeout(r, 1200));
            if (cancelled) return;
            if (cursor1Ref.current) cursor1Ref.current.classList.remove('typewriter-cursor-idle');

            for (let i = 0; i <= line1.length; i++) {
                if (cancelled) return;
                if (line1Ref.current) line1Ref.current.textContent = line1.slice(0, i);
                await new Promise(r => setTimeout(r, 55 + Math.random() * 45));
            }

            await new Promise(r => setTimeout(r, 350));
            if (cancelled) return;

            if (cursor1Ref.current) cursor1Ref.current.style.display = 'none';
            if (line2WrapperRef.current) line2WrapperRef.current.style.display = 'inline-block';
            if (cursor2Ref.current) cursor2Ref.current.style.display = 'inline-block';

            for (let i = 0; i <= line2.length; i++) {
                if (cancelled) return;
                if (line2Ref.current) line2Ref.current.textContent = line2.slice(0, i);
                await new Promise(r => setTimeout(r, 55 + Math.random() * 45));
            }

            await new Promise(r => setTimeout(r, 400));
            if (cancelled) return;

            if (cursor2Ref.current) cursor2Ref.current.style.display = 'none';
            if (cursorFadeRef.current) cursorFadeRef.current.style.display = 'inline-block';

            await new Promise(r => setTimeout(r, 600));
            if (cancelled) return;
            if (cursorFadeRef.current) cursorFadeRef.current.style.display = 'none';

            setShowContent(true);
        };

        typeText();
        return () => { cancelled = true; };
    }, []);

    return (
        <section className="relative pt-28 pb-16 lg:pt-20 lg:pb-20 flex items-center justify-center overflow-hidden bg-white">
            {/* Interactive Grid Pattern Background */}
            <InteractiveGridPattern
                className="absolute opacity-40 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_40%,transparent_70%)]"
                squares={[60, 60]}
            />

            {/* Large Background Text "ATLAS" */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                <span className="text-[clamp(10rem,30vw,24rem)] font-black text-gray-100/30 leading-none tracking-tighter">
                    ATLAS
                </span>
            </div>

            {/* Floating School Icons - Left Side */}
            <div className="absolute top-[12%] left-[5%] md:left-[8%] opacity-[0.05] pointer-events-none animate-float-slow">
                <GraduationCap className="w-10 h-10 md:w-16 md:h-16 text-black rotate-[-15deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[68%] left-[6%] md:left-[10%] opacity-[0.06] pointer-events-none animate-float-slow" style={{ animationDelay: '2s' }}>
                <Calculator className="w-9 h-9 md:w-14 md:h-14 text-black rotate-[-8deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[85%] left-[5%] md:left-[7%] opacity-[0.04] pointer-events-none animate-float-slower" style={{ animationDelay: '0.5s' }}>
                <Pencil className="w-7 h-7 md:w-11 md:h-11 text-black rotate-[20deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[45%] left-[4%] md:left-[6%] opacity-[0.05] pointer-events-none animate-float-slower" style={{ animationDelay: '2.5s' }}>
                <Library className="w-8 h-8 md:w-13 md:h-13 text-black rotate-[15deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[28%] left-[5%] md:left-[7%] opacity-[0.06] pointer-events-none animate-float-slower" style={{ animationDelay: '1s' }}>
                <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-black rotate-[12deg]" strokeWidth={1} />
            </div>

            {/* Floating School Icons - Right Side */}
            <div className="absolute top-[10%] right-[5%] md:right-[8%] opacity-[0.05] pointer-events-none animate-float-slower" style={{ animationDelay: '0.8s' }}>
                <BookMarked className="w-9 h-9 md:w-14 md:h-14 text-black rotate-[18deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[70%] right-[6%] md:right-[10%] opacity-[0.06] pointer-events-none animate-float-slower" style={{ animationDelay: '2.2s' }}>
                <Trophy className="w-10 h-10 md:w-15 md:h-15 text-black rotate-[10deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[88%] right-[5%] md:right-[7%] opacity-[0.05] pointer-events-none animate-float-slow" style={{ animationDelay: '0.3s' }}>
                <Microscope className="w-9 h-9 md:w-14 md:h-14 text-black rotate-[-15deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[50%] right-[4%] md:right-[6%] opacity-[0.04] pointer-events-none animate-float-slow" style={{ animationDelay: '2.8s' }}>
                <Bell className="w-7 h-7 md:w-11 md:h-11 text-black rotate-[-8deg]" strokeWidth={1} />
            </div>
            <div className="absolute top-[25%] right-[5%] md:right-[7%] opacity-[0.06] pointer-events-none animate-float-slow" style={{ animationDelay: '1.8s' }}>
                <Ruler className="w-8 h-8 md:w-12 md:h-12 text-black rotate-[-12deg]" strokeWidth={1} />
            </div>

            {/* Gradient Orb */}
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#0052ff]/5 rounded-full blur-3xl" />

            <div className="relative max-w-[1400px] mx-auto px-6 py-20 z-10 w-full">
                <div className="text-center space-y-8">
                    {/* Badge */}
                    <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0052ff]/20 bg-[#0052ff]/5 transition-all duration-700"
                        style={{
                            opacity: showContent ? 1 : 0,
                            transform: showContent ? 'translateY(0)' : 'translateY(12px)',
                        }}
                    >
                        <div className="w-2 h-2 rounded-full bg-[#0052ff] animate-pulse" />
                        <span className="text-sm font-semibold text-[#0052ff]">India's Trusted School Discovery Platform</span>
                    </div>

                    {/* Main Heading with Typewriter */}
                    <h1 className="text-[clamp(2.8rem,8vw,6.5rem)] font-bold leading-[1.05] tracking-tight">
                        <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                            <span ref={line1Ref}></span>
                            <span ref={cursor1Ref} className="typewriter-cursor" style={{ display: 'none' }} />
                        </span>
                        <br />
                        <span ref={line2WrapperRef} className="relative inline-block mt-2" style={{ display: 'none' }}>
                            <span className="text-[#0052ff]">
                                <span ref={line2Ref}></span>
                                <span ref={cursor2Ref} className="typewriter-cursor" style={{ display: 'none' }} />
                            </span>
                        </span>
                        <span ref={cursorFadeRef} className="typewriter-cursor typewriter-cursor-fade" style={{ display: 'none' }} />
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="text-xl md:text-2xl text-gray-600 max-w-[800px] mx-auto leading-relaxed font-medium transition-all duration-700 delay-100"
                        style={{
                            opacity: showContent ? 1 : 0,
                            transform: showContent ? 'translateY(0)' : 'translateY(18px)',
                        }}
                    >
                        Discover, compare, and connect with top-rated schools in your city. Your child's future education starts with a single search.
                    </p>

                    {/* Search Bar */}
                    <div
                        className="transition-all duration-700 delay-200"
                        style={{
                            opacity: showContent ? 1 : 0,
                            transform: showContent ? 'translateY(0)' : 'translateY(22px)',
                        }}
                    >
                        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
                            <div className="flex flex-col  sm:flex-row p-2 bg-white rounded-2xl sm:rounded-full border-2 border-muted transition-all focus-within:ring-2 focus-within:ring-[#0052ff]/20">
                                <div className="flex-1 flex items-center px-4 py-3 sm:py-0">
                                    <MapPin className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Enter city or school name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent outline-none focus-none border-none text-slate-800 placeholder:text-slate-400 text-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="group relative bg-[#0052ff] text-white px-8 py-4 sm:py-3 rounded-xl sm:rounded-full font-bold flex items-center justify-center gap-2 hover:bg-[#0052ff]/90 transition-all active:scale-95 text-sm overflow-hidden"
                                >
                                    <span className="absolute inset-0 bg-[#003dd4] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative flex items-center gap-2">
                                        Explore Schools
                                        <ArrowRight className="w-4 h-4" />
                                    </span>
                                </button>
                            </div>
                        </form>

                        {/* Popular Cities */}
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Popular Cities:</span>
                            {popularCities.map((city) => (
                                <Link
                                    key={city}
                                    href={`/explore/schools?location=${encodeURIComponent(city)}`}
                                    className="text-xs font-medium text-slate-600 hover:text-[#0052ff] underline underline-offset-4 decoration-[#0052ff]/30 transition-colors"
                                >
                                    {city}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-25px); }
                }
                @keyframes float-slower {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                .animate-float-slow {
                    animation: float-slow 7s ease-in-out infinite;
                }
                .animate-float-slower {
                    animation: float-slower 9s ease-in-out infinite;
                }

                /* Glowing Typewriter Cursor */
                .typewriter-cursor {
                    display: inline-block;
                    position: relative;
                    width: 4px;
                    height: 1.1em;
                    margin-left: 3px;
                    vertical-align: middle;
                    border-radius: 4px 4px 6px 6px;
                    background: linear-gradient(180deg, #0052ff 0%, #037a7b 45%, rgba(3, 122, 123, 0.4) 75%, rgba(0, 0, 0, 0.08) 100%);
                    animation: cursorGlow 2s ease-in-out infinite;
                }
                .typewriter-cursor::after {
                    content: '';
                    position: absolute;
                    bottom: -8px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 10px;
                    height: 14px;
                    border-radius: 50%;
                    background: radial-gradient(ellipse, rgba(3, 122, 123, 0.35) 0%, rgba(0, 81, 249, 0.15) 40%, transparent 70%);
                    filter: blur(3px);
                    pointer-events: none;
                }
                .typewriter-cursor-idle {
                    animation: cursorBlink 0.6s steps(1) infinite, cursorGlow 2s ease-in-out infinite;
                }
                .typewriter-cursor-fade {
                    animation: cursorFadeOut 0.6s ease forwards;
                }
                @keyframes cursorBlink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
                @keyframes cursorGlow {
                    0%, 100% {
                        box-shadow:
                            0 0 6px rgba(0, 81, 249, 0.5),
                            0 0 14px rgba(3, 122, 123, 0.3),
                            0 0 20px rgba(0, 81, 249, 0.15);
                    }
                    50% {
                        box-shadow:
                            0 0 10px rgba(0, 81, 249, 0.7),
                            0 0 22px rgba(3, 122, 123, 0.5),
                            0 0 32px rgba(0, 81, 249, 0.3);
                    }
                }
                @keyframes cursorFadeOut {
                    0% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `}</style>
        </section>
    );
}

// ═══════════ MARQUEE BANNER ═══════════
function MarqueeBanner() {
    const marqueeItems = [
        "LIST YOUR SCHOOL",
        "INCREASE ADMISSIONS",
        "MANAGE ENQUIRIES",
        "COMPARE TOP SCHOOLS",
        "READ VERIFIED REVIEWS",
        "TRANSPARENT FEE STRUCTURE",
        "DISCOVER NEARBY SCHOOLS",
        "BOOST YOUR SCHOOL'S VISIBILITY",
        "CONNECT WITH PARENTS",
    ];

    return (
        <div className="w-full bg-gray-50 py-4 md:py-8 overflow-hidden border-y border-gray-200">
            <div className="relative flex">
                {/* First marquee group */}
                <div className="animate-marquee flex shrink-0 items-center">
                    {marqueeItems.map((item, index) => (
                        <span key={index} className="flex items-center whitespace-nowrap">
                            <span className="text-gray-600 font-bold text-sm md:text-lg mx-4 md:mx-6">
                                {item}
                            </span>
                            <span className="text-gray-400 text-xs md:text-sm">✦</span>
                        </span>
                    ))}
                </div>
                {/* Duplicate for seamless loop */}
                <div className="animate-marquee flex shrink-0 items-center" aria-hidden="true">
                    {marqueeItems.map((item, index) => (
                        <span key={`dup-${index}`} className="flex items-center whitespace-nowrap">
                            <span className="text-gray-600 font-bold text-sm md:text-lg mx-4 md:mx-6">
                                {item}
                            </span>
                            <span className="text-gray-400 text-xs md:text-sm">✦</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

