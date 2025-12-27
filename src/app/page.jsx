'use client'
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import Script from 'next/script';

import {
    CheckCircle, Star, Users, BookOpen, BarChart3,
    Clock, GraduationCap, CreditCard, ArrowRight,
    TrendingUp, PieChart, Calendar, FileText, Play, XIcon, Check,
    Pencil, BookMarked, Ruler, Calculator, Highlighter as HighlighterIcon, School,
    Home, Bus, Smartphone, MapPin, Plane, Globe, MessageCircle, Laptop, Wifi,
    UserPlus, Building2, MessageSquare, Sparkles
} from 'lucide-react';
import Header from './components/Header';
import { DotPattern } from '@/components/ui/dot-pattern';
import { BorderBeam } from '@/components/ui/border-beam';
import { HyperText } from '@/components/ui/hyper-text';
import { Highlighter } from '@/components/ui/highlighter';
import Link from 'next/link';
import DownloadAppCTA from '@/components/DownloadAppCTA';
import WebDashboardCTA from '@/components/WebDashboardCTA';
import { OrbitingCircles } from '@/components/ui/orbiting-circles';
import { NumberTicker } from '@/components/ui/number-ticker';
import ScrollMouse from '@/components/ScrollMouse';
// Organization Schema for SEO
const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EduBreezy",
    "alternateName": "Edu Breezy",
    "url": "https://edubreezy.com",
    "logo": "https://edubreezy.com/favicon.ico",
    "description": "India's leading school management ERP and school explorer platform. Find and compare schools, manage admissions, fees, attendance, and more.",
    "foundingDate": "2020",
    "founder": {
        "@type": "Organization",
        "name": "Kinzix Infotech"
    },
    "sameAs": [
        "https://kinzix.com"
    ],
    "potentialAction": {
        "@type": "SearchAction",
        "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://school.edubreezy.com/explore/schools?search={search_term_string}"
        },
        "query-input": "required name=search_term_string"
    }
};

export default function HomePage() {
    return (
        <div className="bg-white overflow-x-hidden">
            {/* Organization Schema for better sitelinks */}
            <Script
                id="organization-schema"
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
            />

            <HeroSection />
            <MarqueeBanner />
            <AboutBriefSection />
            <WhyEduBreezySection />

            {/* <TrustedSection /> */}
            <WebDashboardCTA />
            <FeaturesSection />
            <SchoolExplorerSection />
            <CommunicatingSeamlesslySection />
            <HowWeWorkSection />
            {/* <BentoSection /> */}
            {/* <PricingSection /> */}
            <TestimonialsSection />
            <div className='p-2'>
                <DownloadAppCTA />
            </div>
            {/* <Footer /> */}
        </div>
    );
}


// Hero Section - Matching the design exactly
function HeroSection() {
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const videoSrc = "https://www.youtube.com/embed/dQw4w9WgXcQ"; // Replace with actual video URL

    return (
        <section className="min-h-screen h-fit pt-[100px] pb-0 bg-gradient-to-b from-white via-[#f8fafc] to-[#f0f4f8] relative overflow-visible">
            {/* Subtle gradient accent - top */}
            <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-[#f8fafc] to-transparent pointer-events-none" />

            {/* Noise Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg_viewBox=%270_0_256_256%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter_id=%27noise%27%3E%3CfeTurbulence_type=%27fractalNoise%27_baseFrequency=%270.9%27_numOctaves=%274%27_stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect_width=%27100%25%27_height=%27100%25%27_filter=%27url(%23noise)%27/%3E%3C/svg%3E')] opacity-[0.02] pointer-events-none" />

            {/* Dot Pattern Background */}
            <DotPattern
                width={24}
                height={24}
                cr={1}
                className="absolute inset-0 w-full h-full opacity-20"
            />

            {/* Floating School Icons - Left Side */}
            <div className="absolute top-[12%] md:top-[8%] left-[10%] opacity-[0.10] pointer-events-none animate-[float_6s_ease-in-out_infinite]">
                <GraduationCap className="text-black rotate-[-15deg] w-10 h-10 md:w-20 md:h-20" />
            </div>
            <div className="hidden md:block absolute top-[18%] left-[18%] opacity-[0.08] pointer-events-none animate-[float_8s_ease-in-out_infinite_1s]">
                <Pencil size={50} className="text-black rotate-[25deg]" />
            </div>
            <div className="absolute top-[35%] md:top-[32%] left-[8%] opacity-[0.09] pointer-events-none animate-[float_7s_ease-in-out_infinite_0.5s]">
                <BookMarked className="text-black rotate-[-8deg] w-8 h-8 md:w-14 md:h-14" />
            </div>
            <div className="hidden md:block absolute top-[48%] left-[15%] opacity-[0.07] pointer-events-none animate-[float_9s_ease-in-out_infinite_2s]">
                <Ruler size={55} className="text-black rotate-[45deg]" />
            </div>
            <div className="hidden md:block absolute top-[62%] left-[10%] opacity-[0.08] pointer-events-none animate-[float_7s_ease-in-out_infinite_1.5s]">
                <Calculator size={45} className="text-black rotate-[-10deg]" />
            </div>
            <div className="hidden md:block absolute top-[78%] left-[14%] opacity-[0.09] pointer-events-none animate-[float_6s_ease-in-out_infinite_3s]">
                <BookOpen size={50} className="text-black rotate-[12deg]" />
            </div>
            <div className="hidden md:block absolute top-[55%] left-[22%] opacity-[0.06] pointer-events-none animate-[float_8s_ease-in-out_infinite_2.5s]">
                <School size={40} className="text-black rotate-[-20deg]" />
            </div>

            {/* Floating School Icons - Right Side */}
            <div className="absolute top-[11%] md:top-[6%] right-[10%] opacity-[0.09] pointer-events-none animate-[float_7s_ease-in-out_infinite_2s]">
                <School className="text-black rotate-[10deg] w-10 h-10 md:w-[75px] md:h-[75px]" />
            </div>
            <div className="hidden md:block absolute top-[20%] right-[8%] opacity-[0.08] pointer-events-none animate-[float_8s_ease-in-out_infinite_0.5s]">
                <BookOpen size={55} className="text-black rotate-[-15deg]" />
            </div>
            <div className="hidden md:block absolute top-[35%] right-[16%] opacity-[0.10] pointer-events-none animate-[float_6s_ease-in-out_infinite_1.5s]">
                <Pencil size={60} className="text-black rotate-[30deg]" />
            </div>
            <div className="absolute top-[52%] md:top-[50%] right-[10%] opacity-[0.07] pointer-events-none animate-[float_9s_ease-in-out_infinite_3s]">
                <GraduationCap className="text-black rotate-[15deg] w-9 h-9 md:w-16 md:h-16" />
            </div>
            <div className="hidden md:block absolute top-[65%] right-[18%] opacity-[0.08] pointer-events-none animate-[float_7s_ease-in-out_infinite_2.5s]">
                <Ruler size={50} className="text-black rotate-[-30deg]" />
            </div>
            <div className="hidden md:block absolute top-[80%] right-[12%] opacity-[0.09] pointer-events-none animate-[float_8s_ease-in-out_infinite_1s]">
                <Calculator size={45} className="text-black rotate-[20deg]" />
            </div>
            <div className="hidden md:block absolute top-[42%] right-[22%] opacity-[0.06] pointer-events-none animate-[float_6s_ease-in-out_infinite_4s]">
                <BookMarked size={40} className="text-black rotate-[-5deg]" />
            </div>

            <div className="max-w-[1200px] mx-auto px-5 pt-[60px] pb-10 text-center">
                <div className="hero-text">
                    {/* Main Title */}
                    <h1 className="text-[clamp(2.2rem,6vw,3.8rem)] font-bold text-[#1a1a2e] leading-[1.15] mb-5 max-w-[750px] mx-auto px-4">
                        <Highlighter action="underline" color="#FF9800">Simplify</Highlighter> School Management And       <Highlighter action="highlight" color="#87CEFA">Thrive </Highlighter>{' '}
                        <span style={{
                            fontFamily: '"Edu NSW ACT Cursive", cursive',
                            fontOpticalSizing: 'auto',
                        }} className="font-semibold italic text-[#1a1a2e] text-[1em] block sm:inline mt-2 sm:mt-0"> Every Day</span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-[1.05rem] text-[#666] max-w-[550px] mx-auto mb-7 leading-relaxed">
                        Transform the way schools operate and deliver education with our
                        intelligent, cloud-based management platform.
                    </p>

                    {/* CTA Row */}

                    <div className="flex z-10 items-center justify-center gap-6 flex-wrap mb-[50px]">
                        {/* Avatars + Rating */}
                        {/* <div className="flex flex-col md:flex-col items-center  gap-3">
                            <div className="flex">
                                {[1, 2, 3, 4].map(i => (
                                    <img
                                        key={i}
                                        src={`https://i.pravatar.cc/40?img=${i + 10}`}
                                        alt=""
                                        className={`w-9 h-9 rounded-full border-2 border-white ${i > 1 ? '-ml-2.5' : ''}`}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-col md:flex-col items-center gap-1.5 text-center md:text-left">
                                <div className="flex">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />
                                    ))}
                                </div>
                            </div>
                        </div> */}
                        <div className="flex flex-wrap gap-4">
                            <Link href="/contact">
                                <button className="px-6 py-3 md:py-3.5 bg-white border-2 border-[#0569ff] text-[#0569ff] rounded-full text-[0.95rem] font-semibold hover:bg-[#0569ff] hover:text-white transition-all duration-300 shadow-md hover:shadow-lg">
                                    Book a Demo
                                </button>
                            </Link>
                            <button className="group flex items-center pr-1 gap-2 bg-[#0569ff] justify-center items-center text-white border-0 rounded-full text-[0.95rem] font-semibold cursor-pointer shadow-[0_4px_14px_rgba(5,105,255,0.3)] hover:shadow-[0_6px_20px_rgba(5,105,255,0.4)] transition-all duration-300">
                                <span className='px-1 pl-4 ml-2 py-3 md:py-3.5'>Get Started</span>
                                <span className='bg-white p-2.5 md:p-3 shadow-lg rounded-full group-hover:bg-gray-50 transition-colors'>
                                    <ArrowRight size={20} strokeWidth={3} color='black' className='transition-transform duration-300 group-hover:-rotate-45' />
                                </span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Dashboard Image */}
                <div className="relative">
                    {/* Subtle shadow glow behind frame */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#e0e7ef]/30 to-[#e0e7ef]/50 blur-[40px] rounded-3xl transform scale-105 pointer-events-none" />

                    {/* Dashboard Preview Frame */}
                    <div className="hero-dashboard relative bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] w-full max-w-[1200px] mx-auto border border-[#e0e0e0] overflow-hidden z-10">

                        {/* Browser Top Bar */}
                        {/* Mac-style Dark Top Bar */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-[#2d2d2d] border-b border-black/20">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                            </div>
                            <div className="flex-1 mx-4">
                                <div className="bg-[#3f3f3f] rounded-md px-3 py-1.5 text-xs text-gray-300 text-center">
                                    www.edubreezy.com/dashboard
                                </div>
                            </div>
                        </div>

                        {/* Dashboard Content Area with Play Button */}
                        <button
                            type="button"
                            aria-label="Play video"
                            className="relative w-full cursor-pointer border-0 bg-transparent p-0 group block"
                            onClick={() => setIsVideoOpen(true)}
                        >
                            <div className="bg-[#f5f7fa] overflow-hidden relative flex">
                                <img src="/dash.png" alt="EduBreezy Dashboard" className="w-full h-auto block object-cover transition-all duration-300 group-hover:opacity-80" />
                                {/* Opacity Overlay */}
                                <div className="absolute inset-0 bg-black/5 backdrop-blur-[0.8px] group-hover:bg-black/10 transition-all duration-300" />
                                {/* Play Button */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="bg-white/90 backdrop-blur-sm flex items-center justify-center w-20 h-20 md:w-24 md:h-24 rounded-full shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-white">
                                        <div className="bg-[#0569ff] flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg">
                                            <Play className="w-6 h-6 md:w-8 md:h-8 fill-white text-white ml-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                        <BorderBeam duration={8} size={100} colorFrom='#0569ff' colorTo='#000' />

                    </div>
                </div>
            </div>

            {/* Video Dialog */}
            <AnimatePresence>
                {isVideoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                                setIsVideoOpen(false);
                            }
                        }}
                        onClick={() => setIsVideoOpen(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative mx-4 aspect-video w-full max-w-4xl md:mx-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <motion.button
                                onClick={() => setIsVideoOpen(false)}
                                className="absolute -top-16 right-0 rounded-full bg-neutral-900/50 p-2 text-xl text-white ring-1 ring-white/20 backdrop-blur-md hover:bg-neutral-900/70 transition-colors cursor-pointer"
                            >
                                <XIcon className="w-5 h-5" />
                            </motion.button>
                            <div className="relative isolate z-[1] size-full overflow-hidden rounded-2xl border-2 border-white">
                                <iframe
                                    src={videoSrc}
                                    title="Hero Video player"
                                    className="w-full h-full rounded-2xl"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

// Marquee Banner Section
function MarqueeBanner() {
    // JSON-based content for easy editing
    const marqueeItems = [
        "NO 1 SCHOOL ERP IN INDIA",
        "COMPLETE FEE MANAGEMENT SYSTEM",
        "SMART ATTENDANCE TRACKING",
        "PAYROLL & HR AUTOMATION",
        "STUDENT & STAFF PORTAL",
        "MOBILE APP FOR PARENTS",
        "100% SECURE & CLOUD-BASED",
        "REAL-TIME ANALYTICS DASHBOARD",
        "99.9% UPTIME GUARANTEE",
    ];

    return (
        <div className="w-full bg-[#0a2540] py-3 md:py-4 overflow-hidden">
            <div className="relative flex">
                {/* First marquee group */}
                <div className="animate-marquee flex shrink-0 items-center gap-4 md:gap-6">
                    {marqueeItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 md:gap-6">
                            <span className="text-white font-bold text-sm md:text-base whitespace-nowrap tracking-wide">
                                {item}
                            </span>
                            <span className="text-white/80 text-base md:text-lg">✦</span>
                        </div>
                    ))}
                </div>
                {/* Duplicate for seamless loop */}
                <div className="animate-marquee flex shrink-0 items-center gap-4 md:gap-6" aria-hidden="true">
                    {marqueeItems.map((item, index) => (
                        <div key={`dup-${index}`} className="flex items-center gap-4 md:gap-6">
                            <span className="text-white font-bold text-sm md:text-base whitespace-nowrap tracking-wide">
                                {item}
                            </span>
                            <span className="text-white/80 text-base md:text-lg">✦</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// About Brief Section
function AboutBriefSection() {
    return (
        <section className="bg-[#f5f7fa] py-16 md:py-24 px-5 relative">
            <div className="max-w-[1200px] mx-auto">
                <p className="text-[#1a1a2e]/80 text-lg md:text-xl lg:text-2xl leading-relaxed font-light text-left max-w-[900px]">
                    EduBreezy is a next-generation school management platform blending
                    powerful technology, intuitive design, and education-first thinking.
                    {"We're"} here to help forward-thinking schools streamline operations,
                    engage parents effectively, and unlock the full potential of
                    modern education management.
                </p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                <ScrollMouse />
            </div>
        </section>
    );
}

// Why EduBreezy Section
function WhyEduBreezySection() {

    return (
        <section className="py-20 md:py-28 px-5 bg-white">
            <div className="max-w-[1200px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left Content */}
                    <div>
                        <span className="text-sm text-[#0569ff] font-medium mb-4 block">_Why us</span>
                        <h2 className="text-3xl md:text-4xl lg:text-[3.2rem] font-bold text-[#1a1a2e] leading-[1.1] mb-3">
                            Schools need  <Highlighter action="underline" color="#FF9800">smart</Highlighter> systems
                        </h2>
                        <h3 className="text-2xl md:text-3xl lg:text-[2.5rem] font-light text-[#999] leading-tight mb-10">
                            not  <Highlighter action="underline" color="red"> complex </Highlighter> software.
                        </h3>

                        <div className="space-y-5 text-[#555] text-base leading-relaxed">
                            <p>
                                Education is evolving, but real transformation begins with tools that understand
                                the unique needs of schools and the people who run them.
                            </p>
                            <p>
                                We are EduBreezy, a team of educators and technologists united by purpose —
                                driven to build intelligent, intuitive systems that empower schools to focus
                                on what matters most: student success.
                            </p>
                            <p>
                                {"We don't"} just provide software — we partner with schools. Our approach is grounded
                                in shared goals, measurable outcomes, and lasting impact.
                            </p>
                        </div>

                        {/* Learn More Button */}
                        <a
                            href="/about"
                            className="inline-flex items-center gap-2 mt-8 text-[#0569ff] font-semibold hover:underline transition-all"
                        >
                            Learn More About Us
                            <ArrowRight size={18} />
                        </a>
                    </div>

                    {/* Right - App Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {[
                            {
                                icon: Home,
                                title: "School App",
                                desc: "All-in-one solution for easy management and communication.",
                                color: "#0569ff",
                                gradient: "from-blue-500/10 to-blue-600/5"
                            },
                            {
                                icon: Users,
                                title: "Parent App",
                                desc: "Track your child's progress, fees, and attendance effortlessly.",
                                color: "#10B981",
                                gradient: "from-emerald-500/10 to-emerald-600/5"
                            },
                            {
                                icon: GraduationCap,
                                title: "Teacher App",
                                desc: "Manage classrooms and connect with parents easily.",
                                color: "#F59E0B",
                                gradient: "from-amber-500/10 to-amber-600/5"
                            },
                            {
                                icon: Bus,
                                title: "Driver App",
                                desc: "Find routes & communicate with parents in real time.",
                                color: "#8B5CF6",
                                gradient: "from-violet-500/10 to-violet-600/5"
                            }
                        ].map((app, index) => {
                            const IconComponent = app.icon;
                            return (
                                <div
                                    key={index}
                                    className={`group relative bg-gradient-to-br ${app.gradient} p-6 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-xl transition-all duration-300 overflow-hidden`}
                                >
                                    {/* Hover glow */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"
                                        style={{ boxShadow: `inset 0 0 0 1px ${app.color}30` }}
                                    />

                                    <div className="relative z-10">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                                            style={{ backgroundColor: `${app.color}15` }}
                                        >
                                            <IconComponent size={28} style={{ color: app.color }} />
                                        </div>
                                        <h3 className="text-lg font-bold text-[#1a1a2e] mb-2 group-hover:text-[#0569ff] transition-colors">
                                            {app.title}
                                        </h3>
                                        <p className="text-[#666] text-sm leading-relaxed">
                                            {app.desc}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
}

// Communicating Seamlessly Section with Orbiting Circles
function CommunicatingSeamlesslySection() {
    const [isMobile, setIsMobile] = useState(false);

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <section className="bg-[#f5f7fa] py-16 md:py-20 lg:py-28 px-4 md:px-5 overflow-hidden">
            <div className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-8 md:mb-12 lg:mb-2">
                    {/* <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0569ff] leading-tight mb-2 md:mb-3">
                        Communicating Seamlessly
                    </h2>
                   */}
                    <span className="inline-block bg-[#0569ff]/10 text-[#0569ff] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                        Our Mobile App
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] leading-tight mb-4">
                        <Highlighter action="underline" color="#FF9800">Modern App</Highlighter> for
                        <span className="text-[#0569ff]">                 <Highlighter isView={true} action="underline" color="#FF9800"> Modern Schools</Highlighter></span>
                    </h2>
                    <p className="text-base sm:text-lg md:text-xl text-[#666] max-w-2xl mx-auto leading-relaxed">
                        Beautifully designed, intuitive mobile app that bring schools, parents, director, principal, teachers, and students together on one powerful platform.
                    </p>
                </div>

                {/* Orbiting Circles Container - Responsive scaling */}
                <div className="relative flex h-[450px] sm:h-[550px] md:h-[650px] lg:h-[750px] 2xl:h-[850px] w-full items-center justify-center">

                    {/* Floating Decorative Icons - Left Side */}
                    <div className="absolute top-[8%] left-[5%] opacity-20 pointer-events-none animate-[float_6s_ease-in-out_infinite]">
                        <Globe className="w-8 h-8 md:w-12 md:h-12 text-[#0569ff] rotate-[-15deg]" />
                    </div>
                    <div className="absolute top-[25%] left-[3%] opacity-20 pointer-events-none animate-[float_8s_ease-in-out_infinite_1s]">
                        <Smartphone className="w-6 h-6 md:w-10 md:h-10 text-[#0569ff] rotate-[15deg]" />
                    </div>
                    <div className="absolute top-[50%] left-[2%] opacity-20 pointer-events-none animate-[float_7s_ease-in-out_infinite_2s]">
                        <MapPin className="w-7 h-7 md:w-11 md:h-11 text-[#F97316] rotate-[-10deg]" />
                    </div>
                    <div className="absolute top-[75%] left-[4%] opacity-20 pointer-events-none animate-[float_9s_ease-in-out_infinite_0.5s]">
                        <MessageCircle className="w-6 h-6 md:w-10 md:h-10 text-[#10B981] rotate-[20deg]" />
                    </div>

                    {/* Floating Decorative Icons - Right Side */}
                    <div className="absolute top-[10%] right-[5%] opacity-20 pointer-events-none animate-[float_7s_ease-in-out_infinite_1.5s]">
                        <Wifi className="w-7 h-7 md:w-11 md:h-11 text-[#10B981] rotate-[10deg]" />
                    </div>
                    <div className="absolute top-[30%] right-[3%] opacity-20 pointer-events-none animate-[float_6s_ease-in-out_infinite_2.5s]">
                        <Laptop className="w-8 h-8 md:w-12 md:h-12 text-[#0569ff] rotate-[-12deg]" />
                    </div>
                    <div className="absolute top-[55%] right-[2%] opacity-20 pointer-events-none animate-[float_8s_ease-in-out_infinite_3s]">
                        <Plane className="w-6 h-6 md:w-10 md:h-10 text-[#F97316] rotate-[25deg]" />
                    </div>
                    <div className="absolute top-[80%] right-[4%] opacity-20 pointer-events-none animate-[float_7s_ease-in-out_infinite_1s]">
                        <Bus className="w-7 h-7 md:w-11 md:h-11 text-[#0569ff] rotate-[-8deg]" />
                    </div>

                    {/* Scaling wrapper for smaller screens */}
                    <div className="absolute inset-0 flex items-center justify-center transform scale-[0.55] sm:scale-[0.65] md:scale-[0.8] lg:scale-100 2xl:scale-110">

                        {/* Center Phone Mockup */}
                        <div className="z-20 flex flex-col items-center hover:scale-[1.05] transtion-all duration-300 cursor-pointer justify-center absolute">
                            {(() => {
                                const showNotch = false; // Toggle to show/hide the Dynamic Island notch
                                return (
                                    <div
                                        className="w-[210px] sm:w-[180px] lg:w-[200px] 2xl:w-[220px] h-[460px] sm:h-[400px] lg:h-[445px] 2xl:h-[490px] rounded-[2rem] overflow-hidden relative"
                                        style={{
                                            boxShadow: '0 0 0 3px #1a1a2e, 0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                                        }}
                                    >
                                        {/* Dynamic Island Notch - Conditionally rendered */}
                                        {showNotch && (
                                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[70px] h-[22px] bg-black rounded-full z-20 flex items-center justify-center">
                                                {/* Camera dot */}
                                                <div className="absolute right-3 w-2 h-2 rounded-full bg-[#1a1a2e] ring-1 ring-gray-700" />
                                            </div>
                                        )}

                                        {/* Phone Screen - Image */}
                                        <img
                                            src="ss2.png"
                                            alt="EduBreezy App"
                                            className="w-full h-full object-contain bg-white"
                                        />
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Inner Circle - Roles */}
                        <OrbitingCircles radius={160} duration={35} iconSize={75}>
                            <RoleBadge label="Admin" icon="👤" color="#10B981" bg="#D1FAE5" />
                            <RoleBadge label="Teachers" icon="👩‍🏫" color="#0569ff" bg="#DBEAFE" />
                            <RoleBadge label="Schools" icon="🏫" color="#0569ff" bg="#DBEAFE" />
                            <RoleBadge label="Parents" icon="👨‍👩‍👧" color="#F97316" bg="#FED7AA" />
                            <RoleBadge label="Students" icon="🎓" color="#10B981" bg="#D1FAE5" />
                        </OrbitingCircles>

                        {/* Outer Circle - Features */}
                        <OrbitingCircles radius={isMobile ? 280 : 300} duration={60} reverse iconSize={85}>
                            <FeatureBadge label="Transport" />
                            <FeatureBadge label="Library" />
                            <FeatureBadge label="Attendance" />
                            <FeatureBadge label="Registration" />
                            <FeatureBadge label="LMS" />
                            <FeatureBadge label="Digital" />
                            <FeatureBadge label="Report Card" />
                            <FeatureBadge label="Admission" />
                            <FeatureBadge label="Fee" />
                            <FeatureBadge label="Time Table" />
                            <FeatureBadge label="Exam" />
                            <FeatureBadge label="Result" />
                        </OrbitingCircles>
                    </div>
                </div>

            </div>
            {/* <div className='w-full flex items-center justify-center '>
                <div className="flex flex-wrap gap-4 justify-center pb-16">
                    <a href="#" className="hover:scale-105 transition-transform duration-300 opacity-50 cursor-not-allowed">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg"
                            alt="Download on the App Store"
                            className="h-12 md:h-14"
                        />
                    </a>
                    <a href="#" className="hover:scale-105 transition-transform duration-300">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                            alt="Get it on Google Play"
                            className="h-12 md:h-14"
                        />
                    </a>
                </div>
            </div> */}
        </section>
    );
}

// Helper component for role badges - circular icon with label
function RoleBadge({ label, icon, color, bg }) {
    return (
        <div className="flex flex-col items-center gap-1">
            {/* Circular icon container */}
            <div
                className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg border-2"
                style={{ backgroundColor: bg, borderColor: color }}
            >
                <span className="text-xl md:text-2xl">{icon}</span>
            </div>
            {/* Label below */}
            <span
                className="text-[11px] md:text-xs font-bold whitespace-nowrap"
                style={{ color }}
            >
                {label}
            </span>
        </div>
    );
}

// Helper component for feature badges - modern pill style
function FeatureBadge({ label }) {
    return (
        <div className="flex items-center hover:scale-[1.05] transtion-all duration-300 cursor-pointer  justify-center px-4 py-2 bg-white rounded-full shadow-sm  border  ">
            <span className="text-[12px] md:text-sm font-medium text-gray-700 whitespace-nowrap">
                {label}
            </span>
        </div>
    );
}

// Trusted By Section
function TrustedSection() {
    return (
        <section className="py-[50px] px-5 bg-white">
            <div className="max-w-[1000px] mx-auto text-center">
                <p className="text-[#888] text-sm mb-7">
                    Used by the best schools and institutions around the country:
                </p>
                <div className="flex justify-center items-center gap-x-8 gap-y-6 flex-wrap opacity-70">
                    {['Delhi Public', 'Ryan International', 'DAV School', 'Kendriya Vidyalaya', 'Modern School', 'St. Xavier'].map((name, i) => (
                        <span key={i} className="text-sm md:text-base font-semibold text-[#444]">
                            {name}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );

}

// Features Grid Section
function FeaturesSection() {
    const features = [
        {
            title: 'Admission Management',
            icon: <FileText size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Certificate Creator',
            icon: <GraduationCap size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Attendance Manager',
            icon: <Calendar size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Homework Manager',
            icon: <BookOpen size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Live Classes',
            icon: <Users size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Smart Gatepass',
            icon: <CreditCard size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Institute Setup',
            icon: <School size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Academic Portal',
            icon: <BarChart3 size={22} className="text-[#0569ff]" />
        },
        {
            title: 'Fee Management',
            icon: <CreditCard size={22} className="text-[#0569ff]" />
        },
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-[#f8fafc]">
            <div className="max-w-[1200px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] leading-tight mb-4">
                        <Highlighter action="underline" color="#FF9800">Powerful Features</Highlighter> For
                        <span className="text-[#0569ff]"> <Highlighter isView={true} action="underline" color="#FF9800">Modern Schools</Highlighter></span>
                    </h2>
                    <p className="text-[#666] text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
                        Everything you need to manage admissions, academics, attendance, fees, and more — all in one intelligent platform.
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mb-12 md:mb-14">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-4 bg-white px-5 py-4 rounded-xl border border-[#e8ecf0] hover:border-[#0569ff]/30 hover:shadow-md transition-all duration-300 cursor-pointer group"
                        >
                            <div className="w-11 h-11 bg-[#0569ff]/10 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-[#0569ff]/20 transition-colors duration-300">
                                {feature.icon}
                            </div>
                            <h3 className="text-[15px] md:text-base font-semibold text-[#1a1a2e] group-hover:text-[#0569ff] transition-colors duration-300">
                                {feature.title}
                            </h3>
                        </div>
                    ))}
                </div>

                {/* View All Button */}
                <div className="text-center">
                    <Link
                        href="/features"
                        className="inline-flex items-center gap-2 px-8 py-3 border-2 border-[#1a1a2e] text-[#1a1a2e] rounded-full font-semibold text-sm hover:bg-[#1a1a2e] hover:text-white transition-all duration-300"
                    >
                        View all Features
                    </Link>
                </div>
            </div>
        </section>
    );
}

// How We Make Your School Smarter Section
function HowWeWorkSection() {
    const steps = [
        {
            number: "01",
            icon: Laptop,
            title: "Easy Onboarding",
            desc: "Get started in minutes with our guided setup. Import your school data seamlessly and configure everything without technical expertise.",
            color: "#0569ff"
        },
        {
            number: "02",
            icon: Users,
            title: "Connect Everyone",
            desc: "Link students, parents, teachers, and staff on one unified platform. Real-time communication and instant notifications keep everyone in sync.",
            color: "#10B981"
        },
        {
            number: "03",
            icon: BarChart3,
            title: "Automate Operations",
            desc: "From attendance tracking to fee management, automate repetitive tasks. Save hours every day and reduce human errors.",
            color: "#F59E0B"
        },
        {
            number: "04",
            icon: FileText,
            title: "Generate Reports",
            desc: "Get comprehensive analytics and reports at your fingertips. Make data-driven decisions with real-time insights and trends.",
            color: "#8B5CF6"
        },
        {
            number: "05",
            icon: Smartphone,
            title: "Mobile Access",
            desc: "Access everything on-the-go with our mobile apps. Parents track progress, teachers manage classes, drivers navigate routes.",
            color: "#EC4899"
        },
        {
            number: "06",
            icon: TrendingUp,
            title: "Grow & Scale",
            desc: "As your school grows, we grow with you. Expand to multiple branches, add more features, and scale without limits.",
            color: "#14B8A6"
        }
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-white">
            <div className="max-w-[1200px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Sparkles size={16} />
                        Our Process
                    </span>
                    <h2 className="text-3xl md:text-4xl leading-[1.2] lg:text-5xl font-bold text-[#1a1a2e] mb-4">
                        <Highlighter action="underline" color="#FF9800">Here's How We Make Your <br className="hidden md:block" /></Highlighter><br />
                        <Highlighter action="underline" color="#FF9800"><span className="text-[#0569ff]">School Smarter</span></Highlighter>

                    </h2>
                    <p className="text-[#666] text-lg max-w-2xl mx-auto">
                        A simple, step-by-step approach to transform your school management from chaos to clarity.
                    </p>
                </div>

                {/* Steps Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon;
                        return (
                            <div
                                key={index}
                                className="group relative bg-white p-6 rounded-2xl border border-gray-100 hover:border-transparent hover:shadow-2xl transition-all duration-500 overflow-hidden"
                            >
                                {/* Background gradient on hover */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{
                                        background: `linear-gradient(135deg, ${step.color}08 0%, ${step.color}03 100%)`
                                    }}
                                />

                                {/* Step number */}
                                <div
                                    className="absolute top-4 right-4 text-5xl font-black opacity-10 group-hover:opacity-20 transition-opacity"
                                    style={{ color: step.color }}
                                >
                                    {step.number}
                                </div>

                                {/* Content */}
                                <div className="relative z-10">
                                    {/* Icon */}
                                    <div
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3"
                                        style={{ backgroundColor: `${step.color}15` }}
                                    >
                                        <IconComponent size={26} style={{ color: step.color }} />
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-xl font-bold text-[#1a1a2e] mb-3 group-hover:text-[#0569ff] transition-colors">
                                        {step.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-[#666] text-sm leading-relaxed">
                                        {step.desc}
                                    </p>

                                    {/* Arrow indicator */}
                                    <div className="mt-5 flex items-center gap-2 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-10px] group-hover:translate-x-0" style={{ color: step.color }}>
                                        Learn more
                                        <ArrowRight size={14} />
                                    </div>
                                </div>

                                {/* Bottom accent line */}
                                <div
                                    className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-500"
                                    style={{ backgroundColor: step.color }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="text-center mt-14">
                    <p className="text-[#666] mb-6">Ready to transform your school?</p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 bg-[#0569ff] text-white px-8 py-4 rounded-full font-bold text-sm hover:bg-[#0569ff]/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                            Get Started Today
                            <ArrowRight size={18} />
                        </Link>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-[#1a1a2e] text-[#1a1a2e] rounded-full font-bold text-sm hover:bg-[#1a1a2e] hover:text-white transition-all duration-300"
                        >
                            Schedule Demo
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// School Explorer Section
function SchoolExplorerSection() {
    return (
        <section className="py-20 md:py-28 px-5 bg-white">
            <div className="max-w-[1200px] mx-auto">
                {/* Main Content - Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20">
                    {/* Left Content */}
                    <div>
                        <span className="inline-flex items-center gap-2 bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            <Globe size={16} />
                            school.edubreezy.com
                        </span>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] leading-tight mb-2">
                            <Highlighter action="underline" color="#FF9800">School Explorer</Highlighter> — <br />
                            <span className="text-[#0569ff]">Your School, Discovered</span>
                        </h2>
                        <p className="text-base md:text-lg font-medium text-[#F97316] mb-3">
                            Increase Admissions with Proven Strategies
                        </p>
                        <p className="text-[#555] text-base leading-relaxed mb-5">
                            Get discovered by parents at  <strong className="text-[#1a1a2e]">school.edubreezy.com</strong>.
                            Showcase your strengths, receive inquiries, and convert leads into admissions.
                        </p>

                        {/* Key Benefits */}
                        <div className="space-y-3 mb-6">
                            {[
                                "Reach 50,000+ parents searching for schools",
                                "Convert visitors into admission inquiries",
                                "Build trust with reviews & achievements"
                            ].map((benefit, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
                                        <Check size={12} className="text-[#10B981]" />
                                    </div>
                                    <span className="text-[#444] text-sm">{benefit}</span>
                                </div>
                            ))}
                        </div>
                        <a
                            href="https://school.edubreezy.com/explore"
                            target="_blank"
                            className="inline-flex items-center gap-2 bg-[#0569ff] text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#0569ff]/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                            List Your School
                            <ArrowRight size={16} />
                        </a>
                        <Link
                            href="/features"
                            className="inline-flex items-center gap-2 text-[#0569ff] font-semibold text-sm hover:underline transition-all ml-4"
                        >
                            Learn More
                            <ArrowRight size={14} />
                        </Link>
                    </div>

                    {/* Right - Feature Cards with Expanding Animation */}
                    {(() => {
                        const [activeIndex, setActiveIndex] = React.useState(0);
                        const features = [
                            {
                                icon: Globe,
                                iconColor: "#0569ff",
                                title: "SEO-Optimized School Profile",
                                desc: "Beautiful, search-friendly profiles that rank on Google and help parents discover your school."
                            },
                            {
                                icon: UserPlus,
                                iconColor: "#10B981",
                                title: "Direct Admission Inquiries",
                                desc: "Capture leads instantly. Parents can inquire, schedule visits, and apply directly from your profile."
                            },
                            {
                                icon: Star,
                                iconColor: "#F59E0B",
                                title: "Reviews & Social Proof",
                                desc: "Build credibility with verified parent reviews. Great ratings attract more families to your school."
                            },
                            {
                                icon: BarChart3,
                                iconColor: "#8B5CF6",
                                title: "Admission Analytics",
                                desc: "Track profile views, inquiry sources, and conversion rates. Make data-driven decisions."
                            }
                        ];

                        return (
                            <div className="relative">
                                {/* Vertical connecting line */}
                                <div className="absolute left-6 top-8 bottom-8 w-[2px] bg-gradient-to-b from-[#0569ff] via-[#10B981] via-[#F59E0B] to-[#8B5CF6] opacity-30" />

                                <div className="space-y-4">
                                    {features.map((feature, index) => {
                                        const IconComponent = feature.icon;
                                        const isActive = activeIndex === index;

                                        return (
                                            <div
                                                key={index}
                                                onClick={() => setActiveIndex(index)}
                                                className={`relative cursor-pointer transition-all duration-500 ease-out ${isActive ? 'z-10' : 'z-0'
                                                    }`}
                                            >
                                                {/* Main card */}
                                                <div
                                                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500 ${isActive
                                                        ? 'bg-white shadow-lg border-transparent'
                                                        : 'bg-[#f8fafc] border-[#e5e7eb] hover:border-[#d1d5db]'
                                                        }`}
                                                    style={{
                                                        boxShadow: isActive ? `0 8px 30px ${feature.iconColor}20` : 'none'
                                                    }}
                                                >
                                                    {/* Dot indicator */}
                                                    <div className="relative z-10">
                                                        <div
                                                            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${isActive ? 'scale-110' : 'scale-100'
                                                                }`}
                                                            style={{
                                                                backgroundColor: isActive ? feature.iconColor : `${feature.iconColor}15`,
                                                            }}
                                                        >
                                                            <IconComponent
                                                                size={22}
                                                                style={{ color: isActive ? '#fff' : feature.iconColor }}
                                                                className="transition-all duration-300"
                                                            />
                                                        </div>
                                                        {/* Pulse ring for active */}
                                                        {isActive && (
                                                            <div
                                                                className="absolute inset-0 rounded-full animate-ping opacity-30"
                                                                style={{ backgroundColor: feature.iconColor }}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className={`font-bold text-lg transition-colors duration-300 ${isActive ? 'text-[#1a1a2e]' : 'text-[#444]'
                                                                }`}>
                                                                {feature.title}
                                                            </h3>
                                                            <ArrowRight
                                                                size={16}
                                                                className={`transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                                                                    }`}
                                                                style={{ color: feature.iconColor }}
                                                            />
                                                        </div>

                                                        {/* Expandable description */}
                                                        <div
                                                            className={`overflow-hidden transition-all duration-500 ease-out ${isActive ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'
                                                                }`}
                                                        >
                                                            <p className="text-[#666] text-sm leading-relaxed">
                                                                {feature.desc}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Active indicator bar */}
                                                    <div
                                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all duration-500 ${isActive ? 'h-12 opacity-100' : 'h-0 opacity-0'
                                                            }`}
                                                        style={{ backgroundColor: feature.iconColor }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
                {/* Bottom Stats Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6 py-8 px-4 md:px-8 bg-gradient-to-r from-[#0569ff]/5 to-[#10B981]/5 rounded-2xl border border-[#e5e7eb]">
                    {[
                        { value: 50000, suffix: "+", label: "Monthly Visitors", icon: Users },
                        { value: 10000, suffix: "+", label: "Inquiries Generated", icon: MessageSquare },
                        { value: 95, suffix: "%", label: "Satisfaction Rate", icon: Star }
                    ].map((stat, index) => {
                        const IconComponent = stat.icon;
                        return (
                            <div key={index} className="text-center">
                                <div className="flex justify-center mb-2">
                                    <IconComponent size={20} className="text-[#0569ff]" />
                                </div>
                                <div className="text-2xl md:text-3xl font-bold text-[#0569ff] mb-1 flex items-center justify-center">
                                    <NumberTicker
                                        value={stat.value}
                                        delay={0.2 * index}
                                        className="text-[#0569ff]"
                                    />
                                    <span>{stat.suffix}</span>
                                </div>
                                <div className="text-[#666] text-sm">
                                    {stat.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// Bento Section - Different sized cards
function BentoSection() {
    return (
        <section className="py-20 px-5 bg-white">
            <div className="max-w-[1100px] mx-auto">
                {/* Section header */}
                <div className="text-center mb-4">
                    <span className="inline-flex items-center gap-2 text-[#0569ff] text-sm font-medium">
                        <span className="text-lg">✦</span> Core Features
                    </span>
                </div>
                <h2 className="text-[clamp(2rem,4vw,2.8rem)] font-bold text-[#1a1a2e] text-center mb-4">
                    Simplifying School Management.
                </h2>
                <p className="text-center text-[#666] max-w-[500px] mx-auto mb-[50px] text-base">
                    Our platform offers a range of features to help educators
                    and administrators streamline their tasks.
                </p>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Card 1 - Large left */}
                    <div className="bento-card col-span-1 md:col-span-7 bg-white rounded-2xl p-7 border border-[#e5e7eb]">
                        <h3 className="text-[1.1rem] font-semibold text-[#1a1a2e] mb-2">
                            Live tracking and reporting
                        </h3>
                        <p className="text-[0.9rem] text-[#666] mb-5">
                            Access vital metrics in real-time through our analytics and reporting tools.
                        </p>
                        <a href="#" className="text-[#0569ff] text-[0.9rem] font-medium no-underline">
                            Learn More →
                        </a>
                        <div className="mt-6 bg-[#f8fafc] rounded-xl p-5 flex gap-5">
                            <div className="flex-1">
                                <div className="text-xs text-[#888] mb-1">Total Students</div>
                                <div className="text-2xl font-bold text-[#1a1a2e]">₹1,41,467.00</div>
                            </div>
                            <div className="flex gap-2 items-end">
                                {[40, 65, 45, 80, 55, 70].map((h, i) => (
                                    <div key={i} className={`w-6 rounded-[4px] ${i === 3 ? 'bg-[#0569ff]' : 'bg-[#e5e7eb]'}`} style={{
                                        height: `${h}px`
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card 2 - Right top */}
                    <div className="bento-card col-span-1 md:col-span-5 bg-white rounded-2xl p-7 border border-[#e5e7eb]">
                        <h3 className="text-[1.1rem] font-semibold text-[#1a1a2e] mb-2">
                            Reduce costs
                        </h3>
                        <p className="text-[0.9rem] text-[#666] mb-4">
                            Ensure accurate configurations and costs. Streamline your school process effortlessly.
                        </p>
                        <a href="#" className="text-[#0569ff] text-[0.9rem] font-medium no-underline">
                            Learn More →
                        </a>
                        <div className="mt-5">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs text-[#888]">Weekly</span>
                            </div>
                            <div className="h-20 flex items-end gap-[3px]">
                                {[30, 45, 60, 40, 75, 50, 65].map((h, i) => (
                                    <div key={i} className="flex-1 bg-[#0569ff20] rounded-t-[4px]" style={{
                                        height: `${h}%`
                                    }} />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Card 3 - Bottom left */}
                    <div className="bento-card col-span-1 md:col-span-5 bg-white rounded-2xl p-7 border border-[#e5e7eb]">
                        <h3 className="text-[1.1rem] font-semibold text-[#1a1a2e] mb-2">
                            Drive revenue growth
                        </h3>
                        <p className="text-[0.9rem] text-[#666] mb-4">
                            Optimize your fee management and boost your results with targeted offers.
                        </p>
                        <a href="#" className="text-[#0569ff] text-[0.9rem] font-medium no-underline">
                            Learn More →
                        </a>
                        <div className="mt-5 p-4 bg-[#f8fafc] rounded-[10px]">
                            <div className="text-xs text-[#888] mb-1">Revenue</div>
                            <svg viewBox="0 0 200 60" className="w-full">
                                <path d="M0,50 Q40,45 60,35 T120,25 T180,20 L200,15"
                                    fill="none" stroke="#0569ff" strokeWidth="2" />
                            </svg>
                        </div>
                    </div>

                    {/* Card 4 - Bottom right */}
                    <div className="bento-card col-span-1 md:col-span-7 bg-white rounded-2xl p-7 border border-[#e5e7eb]">
                        <h3 className="text-[1.1rem] font-semibold text-[#1a1a2e] mb-2">
                            Combined Analytics
                        </h3>
                        <p className="text-[0.9rem] text-[#666] mb-4">
                            View all your school data in one unified dashboard with smart insights.
                        </p>
                        <div className="grid grid-cols-3 gap-4 mt-4">
                            {[
                                { label: 'Attendance', value: '94%', color: '#10b981' },
                                { label: 'Fee Collection', value: '87%', color: '#0569ff' },
                                { label: 'Satisfaction', value: '4.8/5', color: '#f59e0b' }
                            ].map((stat, i) => (
                                <div key={i} className="p-4 rounded-[10px] text-center" style={{
                                    backgroundColor: `${stat.color}10`,
                                }}>
                                    <div className="text-[1.5rem] font-bold" style={{ color: stat.color }}>
                                        {stat.value}
                                    </div>
                                    <div className="text-xs text-[#666]">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Pricing Section
function PricingSection() {

    const plans = [
        {
            name: 'Basic Plan',
            price: 'Free',
            period: '',
            features: ['Access to all core functionalities', 'Regular feature updates', 'Limited usage quotas', 'Email support'],
            highlighted: false
        },
        {
            name: 'Business',
            price: '₹2999',
            period: '/per month',
            features: ['Access to all core functionalities', 'Regular feature updates', 'Unlimited usage', 'Priority support', '10 payment links per month'],
            highlighted: true
        },
        {
            name: 'Enterprise',
            price: '₹5999',
            period: '/per month',
            features: ['Everything in Business', 'Custom integrations', 'Dedicated account manager', 'On-premise option', 'Custom SLA'],
            highlighted: false
        }
    ];

    return (
        <section className="py-20 px-5 bg-white">
            <div className="max-w-[1000px] mx-auto">
                <div className="text-center mb-[50px]">
                    <span className="inline-block bg-[#e8f4ff] text-[#0569ff] px-3.5 py-1.5 rounded-[20px] text-[13px] font-medium mb-4">
                        Pricing Plans
                    </span>
                    <h2 className="text-[clamp(2rem,4vw,2.5rem)] font-bold text-[#1a1a2e] mb-3">
                        Transparent Pricing For Your Needs
                    </h2>
                    <p className="text-[#666] text-base">
                        Choose a plan that works best for your school
                    </p>

                    {/* Toggle */}
                    <div className="flex justify-center gap-2 mt-6">
                        <button className="px-5 py-2 bg-[#0569ff] text-white border-0 rounded-md text-sm cursor-pointer">Monthly</button>
                        <button className="px-5 py-2 bg-[#f0f0f0] text-[#666] border-0 rounded-md text-sm cursor-pointer">Yearly</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {plans.map((plan, i) => (
                        <div key={i} className={`pricing-card p-8 rounded-2xl ${plan.highlighted ? 'border-2 border-[#0569ff] bg-[#0569ff08]' : 'border border-[#e5e7eb] bg-white'}`}>
                            <div className={`text-sm font-medium mb-2 ${plan.highlighted ? 'text-[#0569ff]' : 'text-[#888]'}`}>
                                {plan.name}
                            </div>
                            <div className="mb-5">
                                <span className="text-[2.5rem] font-bold text-[#1a1a2e]">
                                    {plan.price}
                                </span>
                                <span className="text-[#888] text-sm">{plan.period}</span>
                            </div>

                            <button className={`w-full p-3 rounded-lg text-sm font-semibold cursor-pointer mb-6 ${plan.highlighted ? 'bg-[#0569ff] text-white border-none' : 'bg-white text-[#1a1a2e] border border-[#e5e7eb]'} hover:bg-opacity-90 transition-all`}>
                                Select Plan
                            </button>

                            <div className="text-[13px] text-[#888] mb-3">Features:</div>
                            <ul className="list-none p-0 m-0">
                                {plan.features.map((f, j) => (
                                    <li key={j} className="flex items-center gap-2.5 py-2 text-sm text-[#444]">
                                        <CheckCircle size={16} color="#0569ff" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// Testimonials Section - Infinite Marquee Scroll
function TestimonialsSection() {
    const testimonials = [
        {
            text: "This school software has revolutionized our school management. The School ERP Software effortlessly lightens the workload on our dedicated staff, replacing manual efforts.",
            author: "Lakhvir Singh",
            role: "Manager",
            school: "Kalgidhar Academy, Ludhiana"
        },
        {
            text: "As the President of the Federation of Private Schools and Associations of Punjab, I understand the technical challenges faced by schools. Until now, I haven't come across a single solution that addresses all needs.",
            author: "Dr. Jagjit Singh Dhuri",
            role: "Director",
            school: "Group Of Modern Secular Public School"
        },
        {
            text: "I used to face a lot of difficulties in fee collection. I started using Class ON's school fee software, and within 2-3 days, my staff's efficiency increased, and fee recovery became faster.",
            author: "Aarti Sobit",
            role: "Principal",
            school: "Shree Hanumat International Public School"
        },
        {
            text: "Since adopting this platform, our admission time dropped by 60%. The unified real-time tracking has significantly improved trust with parents.",
            author: "Danny Russell",
            role: "School Principal",
            school: "Ryan International School"
        },
        {
            text: "The automated workflows saved us hours every day. Highly recommended for any school looking to modernize their management system.",
            author: "Brooklyn Simmons",
            role: "School Owner",
            school: "Modern Public School"
        },
        {
            text: "Parent communication has never been easier. The app notifications keep everyone informed instantly about fees, attendance, and events.",
            author: "Cameron Williamson",
            role: "Administrator",
            school: "Delhi Public School"
        }
    ];

    // Card width (350px) + gap (20px) = 370px per card
    // 6 testimonials = 2220px per set
    const cardWidth = 350;
    const gap = 20;
    const totalWidth = testimonials.length * (cardWidth + gap);

    return (
        <section className="py-20 bg-[#f8fafc] overflow-hidden">
            <div className="max-w-[1200px] mx-auto px-5">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-3">
                        Read What <span className="text-[#0569ff]">
                            <Highlighter action='underline' isView={true} color='#FF9800' >
                                Our Users
                            </Highlighter>
                        </span> Have To Say About Us
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        We firmly believe that our client's success is our success. Here's a glimpse of our client's experience with us.
                    </p>
                </div>
            </div>

            {/* Marquee Container */}
            <div className="relative testimonials-marquee-wrapper">
                {/* Gradient Fade Left */}
                <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-[#f8fafc] to-transparent z-10 pointer-events-none" />

                {/* Gradient Fade Right */}
                <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#f8fafc] to-transparent z-10 pointer-events-none" />

                {/* Infinite Marquee Track */}
                <div className="testimonials-marquee-track flex">
                    {/* First set of testimonials */}
                    <div className="flex gap-5 pr-5">
                        {testimonials.map((t, i) => (
                            <div
                                key={`set1-${i}`}
                                className="flex-shrink-0 w-[350px] h-[280px] p-8 rounded-xl bg-white border border-[#e8e8e8] relative overflow-hidden flex flex-col transition-transform duration-300 hover:scale-[1.02]"
                            >
                                {/* Quote Icon */}
                                <div className="absolute top-4 left-4 pointer-events-none">
                                    <svg width="48" height="38" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 24V14.4C0 11.7333 0.4 9.33333 1.2 7.2C2.06667 5.06667 3.26667 3.26667 4.8 1.8C6.4 0.333333 8.26667 -0.266667 10.4 0.133333V5.4C9.06667 5.66667 7.96667 6.26667 7.1 7.2C6.3 8.13333 5.9 9.26667 5.9 10.6V10.8H12V24H0ZM20 24V14.4C20 11.7333 20.4 9.33333 21.2 7.2C22.0667 5.06667 23.2667 3.26667 24.8 1.8C26.4 0.333333 28.2667 -0.266667 30.4 0.133333V5.4C29.0667 5.66667 27.9667 6.26667 27.1 7.2C26.3 8.13333 25.9 9.26667 25.9 10.6V10.8H32V24H20Z" fill="#E8E8E8" />
                                    </svg>
                                </div>

                                {/* Testimonial Text */}
                                <p
                                    className="text-[0.95rem] text-[#444] leading-relaxed mb-auto text-justify relative z-10 pt-10"
                                    style={{
                                        textAlignLast: 'left',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 4,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {t.text}
                                </p>

                                {/* Author Info */}
                                <div className="relative z-10 mt-4 pt-4 border-t border-[#f0f0f0]">
                                    <div className="font-bold text-[#0569ff] text-sm tracking-wide truncate">
                                        {t.author.toUpperCase()}
                                    </div>
                                    <div className="text-[13px] text-[#1a1a2e] font-medium underline decoration-1 truncate">
                                        {t.role}
                                    </div>
                                    <div className="text-[12px] text-[#666] truncate">
                                        {t.school}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Second set of testimonials (clone for seamless loop) */}
                    <div className="flex gap-5 pr-5">
                        {testimonials.map((t, i) => (
                            <div
                                key={`set2-${i}`}
                                className="flex-shrink-0 w-[350px] h-[280px] p-8 rounded-xl bg-white border border-[#e8e8e8] relative overflow-hidden flex flex-col transition-transform duration-300 hover:scale-[1.02]"
                            >
                                {/* Quote Icon */}
                                <div className="absolute top-4 left-4 pointer-events-none">
                                    <svg width="48" height="38" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M0 24V14.4C0 11.7333 0.4 9.33333 1.2 7.2C2.06667 5.06667 3.26667 3.26667 4.8 1.8C6.4 0.333333 8.26667 -0.266667 10.4 0.133333V5.4C9.06667 5.66667 7.96667 6.26667 7.1 7.2C6.3 8.13333 5.9 9.26667 5.9 10.6V10.8H12V24H0ZM20 24V14.4C20 11.7333 20.4 9.33333 21.2 7.2C22.0667 5.06667 23.2667 3.26667 24.8 1.8C26.4 0.333333 28.2667 -0.266667 30.4 0.133333V5.4C29.0667 5.66667 27.9667 6.26667 27.1 7.2C26.3 8.13333 25.9 9.26667 25.9 10.6V10.8H32V24H20Z" fill="#E8E8E8" />
                                    </svg>
                                </div>

                                {/* Testimonial Text */}
                                <p
                                    className="text-[0.95rem] text-[#444] leading-relaxed mb-auto text-justify relative z-10 pt-10"
                                    style={{
                                        textAlignLast: 'left',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 4,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {t.text}
                                </p>

                                {/* Author Info */}
                                <div className="relative z-10 mt-4 pt-4 border-t border-[#f0f0f0]">
                                    <div className="font-bold text-[#0569ff] text-sm tracking-wide truncate">
                                        {t.author.toUpperCase()}
                                    </div>
                                    <div className="text-[13px] text-[#1a1a2e] font-medium underline decoration-1 truncate">
                                        {t.role}
                                    </div>
                                    <div className="text-[12px] text-[#666] truncate">
                                        {t.school}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* CSS for infinite marquee animation */}
            <style>{`
                .testimonials-marquee-track {
                    animation: testimonials-scroll 30s linear infinite;
                }
                .testimonials-marquee-wrapper:hover .testimonials-marquee-track {
                    animation-play-state: paused;
                }
                @keyframes testimonials-scroll {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-${totalWidth}px);
                    }
                }
            `}</style>
        </section>
    );

}

// Footer
function Footer() {
    return (
        <footer className="bg-[#0a2540] text-white pt-[60px] px-5 pb-[30px]">
            <div className="max-w-[1100px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-10 mb-10">
                    <div className="md:col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-2 mb-4 text-xl font-bold">
                            <GraduationCap size={28} />
                            EduBreezy
                        </div>
                        <p className="text-white/70 text-sm leading-[1.6]">
                            Making school management simple and efficient for educators worldwide.
                        </p>
                    </div>

                    {[
                        { title: 'Quick Links', links: ['About Us', 'Careers', 'Contact'] },
                        { title: 'Resources', links: ['Help Center', 'Documentation', 'Blog'] },
                        { title: 'Legal', links: ['Privacy Policy', 'Terms of Service'] },
                        { title: 'Contact Us', links: ['support@edubreezy.com', '+91 98765 43210'] }
                    ].map((col, i) => (
                        <div key={i}>
                            <div className="font-semibold mb-4 text-sm">
                                {col.title}
                            </div>
                            {col.links.map((link, j) => (
                                <a key={j} href="#" className="block text-white/70 no-underline text-sm mb-2.5 hover:text-white transition-colors">
                                    {link}
                                </a>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="border-t border-white/10 pt-6 text-center text-white/50 text-sm">
                    © 2024 EduBreezy. All rights reserved.
                </div>
            </div>
        </footer>
    );
}
