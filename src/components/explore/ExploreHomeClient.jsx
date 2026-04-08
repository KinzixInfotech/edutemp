'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Search, MapPin, School as SchoolIcon, ArrowRight,
    Heart, Star, ChevronRight,
    Globe, Users, Award, Compass, PenTool, Lightbulb,
    CalendarCheck, CreditCard, Clock, ClipboardList, MessageSquare, BarChart3, Sparkles, Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

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

    // Fetch schools for hero keywords and list section
    const { data: schoolsData, isLoading: schoolsLoading } = useQuery({
        queryKey: ['schools-home'],
        queryFn: async () => {
            const res = await fetch('/api/public/schools?limit=10&prioritizeCovers=true', {
                cache: 'no-store',
            });
            if (!res.ok) throw new Error('Failed to fetch schools');
            return res.json();
        },
    });

    const handleSearch = (e) => {
        e.preventDefault();
        window.location.href = searchQuery.trim()
            ? `/explore/schools?search=${encodeURIComponent(searchQuery.trim())}`
            : '/explore/schools';
    };

    const popularCities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Pune'];
    const schoolKeywords = (schoolsData?.schools || [])
        .map((profile) => profile.school?.name || profile.name)
        .filter(Boolean)
        .slice(0, 5);
    const formatFee = (fee) => {
        if (!fee) return null;
        if (fee >= 100000) return `₹${(fee / 100000).toFixed(1)}L`;
        if (fee >= 1000) return `₹${(fee / 1000).toFixed(0)}K`;
        return `₹${fee}`;
    };

    return (
        <div className="relative min-h-screen bg-white" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ═══════════ HERO SECTION — page.jsx style ═══════════ */}
            <HeroSection
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleSearch={handleSearch}
                popularCities={popularCities}
                schoolKeywords={schoolKeywords}
            />

            {/* ═══════════ MARQUEE BANNER ═══════════ */}
            {/* <MarqueeBanner /> */}


            {/* ═══════════ ALL SCHOOLS ═══════════ */}
            <section className="py-24 bg-[#f5f7f8]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 mb-4">All Schools</h2>
                            <p className="text-slate-600">Browse schools across cities with fees, ratings, and admission details.</p>
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
                        {schoolsLoading ? (
                            [...Array(8)].map((_, i) => (
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
                        ) : schoolsData?.schools?.length > 0 ? (
                            schoolsData.schools.map((profile) => {
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

// ═══════════ HERO SECTION ═══════════
function HeroSection({ searchQuery, setSearchQuery, handleSearch, popularCities, schoolKeywords }) {
    const quickLinks = [
        ...popularCities.slice(0, 3).map((city) => ({
            label: city,
            href: `/explore/schools?location=${encodeURIComponent(city)}`,
        })),
        ...schoolKeywords.map((school) => ({
            label: school,
            href: `/explore/schools?search=${encodeURIComponent(school)}`,
        })),
    ].slice(0, 6);

    return (
        <section className="relative pt-28 pb-16 lg:pt-20 lg:pb-20 flex items-center overflow-hidden bg-slate-950 min-h-[760px]">
            <video
                className="absolute inset-0 h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
            >
                <source src="https://cdn.edubreezy.com/13130854_1920_1080_30fps.mp4" type="video/mp4" />
            </video>

            <div className="absolute inset-0 bg-slate-950/55" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/45 via-slate-950/20 to-slate-950/70" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/15" />

            <div className="relative max-w-[1400px] mx-auto px-6 py-20 z-10 w-full">
                <div className="max-w-4xl space-y-8 text-center lg:text-left">


                    <h1 className="max-w-7xl w-[100%] text-[5em] font-medium leading-[1.05] tracking-tight text-white">
                        Find the Best Schools
                        <br />
                        <span className="underline italic">Near You</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-white/85 max-w-[760px] lg:mx-0 mx-auto leading-relaxed font-medium">
                        Discover, compare, and connect with top-rated schools in your city. Your child's future education starts with a single search.
                    </p>

                    <div>
                        <form onSubmit={handleSearch} className="relative max-w-4xl lg:mx-0 mx-auto">
                            <div className="flex flex-col sm:flex-row p-2 bg-white/95 backdrop-blur-sm rounded-4xl border border-white/20 shadow-2xl transition-all focus-within:ring-2 focus-within:ring-[#0052ff]/30">
                                <div className="flex-1 flex items-center  px-4 py-3 sm:py-0 min-h-[64px]">
                                    <MapPin className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Enter city or school name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-transparent outline-none focus-none border-none text-slate-800 placeholder:text-slate-400 text-base"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="group relative bg-[#0052ff] text-white px-8 py-4 sm:py-3 rounded-4xl font-bold flex items-center justify-center gap-2 hover:bg-[#0052ff]/90 transition-all active:scale-95 text-sm overflow-hidden min-w-[160px]"
                                >
                                    <span className="absolute inset-0 bg-[#003dd4] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative flex items-center gap-2">
                                        Explore Schools
                                        <Search className="w-4 h-4" />
                                    </span>
                                </button>
                            </div>
                        </form>

                        <div className="mt-5 flex flex-wrap justify-center lg:justify-start gap-3">
                            {quickLinks.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-sm transition-all hover:bg-white/12 hover:text-white"
                                >
                                    {item.label}
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-3 text-white/60">
                            <span className="text-sm font-semibold">Popular cities:</span>
                            {popularCities.map((city) => (
                                <Link
                                    key={city}
                                    href={`/explore/schools?location=${encodeURIComponent(city)}`}
                                    className="text-sm font-medium text-white/75 transition-colors hover:text-white"
                                >
                                    {city}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
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
        <div className="w-full bg-[#fff] py-4 md:py-8 overflow-hidden border-y border-gray-200">
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
