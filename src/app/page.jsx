'use client'
import React, { useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useSpring } from 'motion/react';
import Script from 'next/script';

import {
    CheckCircle, Star, Users, BookOpen, BarChart3,
    Clock, GraduationCap, CreditCard, ArrowRight,
    ChevronDown,
    TrendingUp, PieChart, Calendar, FileText, Play, XIcon, Check,
    Pencil, BookMarked, Ruler, Calculator, Highlighter as HighlighterIcon, School,
    Home, Bus, Smartphone, MapPin, Plane, Globe, MessageCircle, Laptop, Wifi,
    UserPlus, Building2, MessageSquare, Sparkles, Library, Award, Trophy,
    Microscope, Clipboard, Bell, Zap, ClipboardCheck, FileCheck, Handshake, Heart
} from 'lucide-react';
import Header from './components/Header';
import { DotPattern } from '@/components/ui/dot-pattern';
import { BorderBeam } from '@/components/ui/border-beam';
import { HyperText } from '@/components/ui/hyper-text';
import { Highlighter } from '@/components/ui/highlighter';
import Link from 'next/link';
import DownloadAppCTA from '@/components/DownloadAppCTA';
import WebDashboardCTA from '@/components/WebDashboardCTA';
import FinalCTA from '@/components/FinalCTA';
import { OrbitingCircles } from '@/components/ui/orbiting-circles';
import { NumberTicker } from '@/components/ui/number-ticker';
import ScrollMouse from '@/components/ScrollMouse';
import dynamic from 'next/dynamic';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import ProductGuideAI from '@/components/ProductGuideAI';
import SectionHeading from '@/components/SectionHeading';

// Organization Schema for SEO
const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "EduBreezy",
    "alternateName": "Edu Breezy",
    "url": "https://www.edubreezy.com",
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
    // 
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
            <WebDashboardCTA />
            <BusTrackingSection />
            <AttendanceSection />
            <HPCSection />
            <FeaturesSection />
            <HowWeWorkSection />

            <WhyEduBreezySection />

            {/* AI Product Guide - Ask questions about EduBreezy */}

            {/* <TrustedSection /> */}
            <SchoolExplorerSection />
            <PricingSection />

            {/* Partner Teaser - Grow With Us */}
            {/* <CommunicatingSeamlesslySection /> */}
            {/* <BentoSection /> */}
            {/* <TestimonialsSection /> */}
            {/* <div className='p-2'> */}
            {/* <div id="app">
                <DownloadAppCTA />
            </div> */}
            <ProductGuideAI />
            {/* </div> */}
            <FinalCTA />
            <PartnerTeaser />
            {/* <Footer /> */}
        </div>
    );
}


// Hero Section - Matching the design exactly
function HeroSection() {
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const videoSrc = "https://www.youtube.com/embed/dQw4w9WgXcQ";

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
            {/* Interactive Grid Pattern Background */}
            <InteractiveGridPattern
                className="absolute opacity-80 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_40%,transparent_70%)]"
                squares={[60, 60]}
            />

            {/* Large Background Text "ERP" */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                <span className="text-[clamp(12rem,35vw,28rem)] font-black text-gray-100/30 leading-none tracking-tighter">
                    ERP
                </span>
            </div>

            {/* Floating School Icons - Left Side (Reduced Quantity) */}
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

            {/* Floating School Icons - Right Side (Reduced Quantity) */}
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

            {/* Gradient Orb - Top Right */}
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#0469ff]/5 rounded-full blur-3xl" />

            <div className="relative max-w-[1400px] mx-auto px-6 py-20 z-10 w-full">
                {/* Hero Content */}
                <div className="text-center space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5">
                        <div className="w-2 h-2 rounded-full bg-[#0469ff] animate-pulse" />
                        <span className="text-sm font-semibold text-[#0469ff]">AI Powered School ERP</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-[clamp(2.8rem,8vw,6.5rem)] font-bold leading-[1.05] tracking-tight">
                        <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                            Modern School Management
                        </span>
                        <br />
                        <span className="relative inline-block mt-2">
                            <span className="text-[#0469ff]">
                                Built for Real Schools
                            </span>
                            {/* Underline Effect */}
                            <svg className="absolute -bottom-4 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                                <path d="M2 8C70 3 150 1 298 8" stroke="#0469ff" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xl md:text-2xl text-gray-600 max-w-[800px] mx-auto leading-relaxed font-medium">
                        An all-in-one school ERP with smart insights and modern UI/UX that simplifies administration and improves outcomes.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex items-center justify-center gap-5 flex-wrap pt-6">
                        <Link href="/contact">
                            <button className="group relative px-10 py-4 rounded-full font-bold text-lg text-white bg-[#0469ff]  hover:shadow-2xl transition-all duration-300 overflow-hidden">
                                <span className="absolute inset-0 bg-[#0358dd] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative flex items-center gap-3">
                                    Get Started
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                        <ArrowRight className="w-5 h-5 text-[#0469ff] transition-transform duration-300 group-hover:translate-x-0.5" />
                                    </div>
                                </span>
                            </button>
                        </Link>
                        <button
                            // onClick={() => setIsVideoOpen(true)}
                            className="group px-10 hover:shadow-lg py-4 rounded-full font-bold text-lg text-[#0469ff] bg-[#f8f9fb] border transition-all duration-300 flex items-center gap-3"
                        >
                            Watch Demo
                            <Play className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats Row */}
                    {/* <div className="flex items-center justify-center gap-12 flex-wrap pt-16">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-[#0469ff]">10K+</div>
                            <div className="text-sm text-gray-600 font-medium mt-1">Active Schools</div>
                        </div>
                        <div className="w-px h-12 bg-gray-200" />
                        <div className="text-center">
                            <div className="text-3xl font-bold text-[#0469ff]">5M+</div>
                            <div className="text-sm text-gray-600 font-medium mt-1">Students Managed</div>
                        </div>
                        <div className="w-px h-12 bg-gray-200" />
                        <div className="text-center">
                            <div className="flex items-center gap-1 justify-center mb-1">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                ))}
                            </div>
                            <div className="text-sm text-gray-600 font-medium">4.9/5 Rating</div>
                        </div>
                    </div> */}
                </div>
            </div>

            {/* Video Dialog */}
            <AnimatePresence>
                {isVideoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsVideoOpen(false)}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative mx-4 aspect-video w-full max-w-5xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsVideoOpen(false)}
                                className="absolute -top-14 right-0 p-3 rounded-full bg-white text-gray-700 hover:bg-gray-100 transition-colors shadow-lg"
                            >
                                <XIcon className="w-6 h-6" />
                            </button>
                            <div className="relative overflow-hidden rounded-2xl border-4 border-white shadow-2xl">
                                <iframe
                                    src={videoSrc}
                                    className="w-full h-full"
                                    allowFullScreen
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                .perspective-1000 {
                    perspective: 1000px;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </section>
    );
}


function AttendanceSection() {
    return (
        <section className="py-20 md:py-28 bg-white relative overflow-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#0469ff]/5 rounded-full blur-3xl" />

            <div className="max-w-[1400px] mx-auto px-6 relative z-10">
                <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

                    {/* Content - Left Side */}
                    <div className="flex-1 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5 mb-6">
                            <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0469ff]" />
                            <span className="text-xs md:text-sm font-semibold text-[#0469ff]">Smart Attendance</span>
                        </div>

                        {/* Heading */}
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a1a2e] mb-6 leading-tight tracking-tight">
                            Smart Attendance <br /> <span className="text-[#0469ff]">Made Simple</span>
                        </h2>

                        {/* Description */}
                        <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0 font-medium">
                            Ditch the manual registers. Our AI-powered attendance system ensures 100% accuracy with instant notifications for parents. Track daily presence, leaves, and streaks effortlessly.
                        </p>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-lg mx-auto lg:mx-0">
                            {[
                                "Fast Response Push to Parent",
                                "Daily Attendance Automation",
                                "Instant Leave Management",
                                "Detailed Monthly Analytics"
                            ].map((feature, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                        <Check className="w-3 h-3 text-green-600" strokeWidth={3} />
                                    </div>
                                    <span className="text-gray-700 font-semibold">{feature}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 justify-center lg:justify-start">
                            <Link href="/features/attendance">
                                <button className="inline-flex items-center gap-3 px-8 py-4 bg-[#0469ff] text-white font-bold rounded-full hover:bg-[#0358dd] transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                                    Explore Features
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </Link>
                        </div>
                    </div>
                    {/* Phone Image - right Side */}
                    <div className="flex-1 flex justify-center lg:justify-center relative">
                        {/* Decorative Ring */}
                        <div className="absolute inset-0 lg:block hidden border-2 border-[#0469ff]/10 rounded-full scale-110 animate-pulse" />

                        <img
                            src="/mock_att.png"
                            alt="EduBreezy Attendance Screen"
                            className="relative w-[280px] md:w-[340px] lg:w-[380px] h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                        />

                        {/* Floating Notification Cards */}

                        {/* Card 1: Attendance Marked */}
                        <motion.div
                            animate={{ y: [-10, 10, -10] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                            className="absolute top-[15%] lg:flex hidden -left-4 md:-left-16 bg-white p-3 md:p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center -z-2 gap-3"
                        >
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">Status</div>
                                <div className="text-sm md:text-base font-bold text-[#1a1a2e] whitespace-nowrap">Marked Present</div>
                            </div>
                        </motion.div>

                        {/* Card 2: Parent Alert */}
                        <motion.div
                            animate={{ y: [10, -10, 10] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-[20%] lg:flex hidden -right-4 md:-right-20 bg-white p-3 md:p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 z-20"
                        >
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                                <Bell className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">Parent Alert</div>
                                <div className="text-sm md:text-base font-bold text-[#1a1a2e] whitespace-nowrap">Push Sent 🚀</div>
                            </div>
                        </motion.div>

                        {/* Card 3: Sync Status */}
                        <motion.div
                            animate={{ y: [-8, 8, -8] }}
                            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute -bottom-6 lg:flex hidden left-12 md:bottom-10 md:left-0 bg-white p-3 md:p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center gap-3 -z-2"
                        >
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                                <Zap className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="text-[10px] md:text-xs text-gray-500 font-bold uppercase">System</div>
                                <div className="text-sm md:text-base font-bold text-[#1a1a2e] whitespace-nowrap">Sync Complete ⚡</div>
                            </div>
                        </motion.div>
                    </div>

                </div>
            </div>
        </section>
    )
}
// Marquee Banner Section
function MarqueeBanner() {
    // JSON-based content for easy editing
    const marqueeItems = [
        "LEADING SCHOOL ERP IN INDIA",
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
        <div className="w-full bg-gray-50 py-4 md:py-8 overflow-hidden border-y border-gray-200">
            <div className="relative flex">
                {/* First marquee group */}
                <div className="animate-marquee flex shrink-0 items-center gap-6 md:gap-8">
                    {marqueeItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-6 md:gap-8">
                            <span className="text-gray-600 font-bold text-sm md:text-lg whitespace-nowrap">
                                {item}
                            </span>
                            <span className="text-gray-600 font-bold text-sm md:text-lg whitespace-nowrap">
                                ✦
                            </span>
                        </div>
                    ))}
                </div>
                {/* Duplicate for seamless loop */}
                <div className="animate-marquee flex shrink-0 items-center gap-6 md:gap-8" aria-hidden="true">
                    {marqueeItems.map((item, index) => (
                        <div key={`dup-${index}`} className="flex items-center gap-6 md:gap-8">
                            <span className="text-gray-600 font-bold text-sm md:text-lg whitespace-nowrap">
                                {item}
                            </span>
                            <span className="text-gray-600 font-bold text-sm md:text-lg whitespace-nowrap">
                                ✦
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// App Showcase Section - Scroll-based 3D Rotation Animation
function AppShowcaseSection() {
    const sectionRef = useRef(null);

    // Track scroll progress within this section
    const { scrollYProgress } = useScroll({
        target: sectionRef,
        offset: ["start end", "end start"]
    });

    // Transform scroll progress to rotation values
    // Starts tilted (-35deg on X, 25deg on Y) and rotates to center (0, 0)
    const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [35, 0, -10]);
    const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-25, 0, 10]);
    const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.8, 1, 0.95]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.3, 1, 1, 0.5]);

    // Apply spring physics for smooth animation
    const springConfig = { stiffness: 100, damping: 30, restDelta: 0.001 };
    const smoothRotateX = useSpring(rotateX, springConfig);
    const smoothRotateY = useSpring(rotateY, springConfig);
    const smoothScale = useSpring(scale, springConfig);

    return (
        <section
            ref={sectionRef}
            className="relative min-h-[100vh] md:min-h-[120vh] py-20 md:py-32 bg-[#f0f2f5] overflow-hidden"
        >
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white/50 pointer-events-none" />

            {/* Decorative blurred circles */}
            <div className="absolute top-20 left-10 w-[300px] h-[300px] bg-[#0469ff]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-[#0469ff]/3 rounded-full blur-3xl" />

            <div className="max-w-[1400px] mx-auto px-6 relative z-10">
                {/* Section Header */}
                <div className="text-center mb-12 md:mb-20">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 border-gray-300 bg-white mb-4 md:mb-6">
                        <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-600" />
                        <span className="text-xs md:text-sm font-bold uppercase tracking-wider text-gray-600">Mobile Experience</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a1a2e] mb-4 md:mb-6 leading-tight tracking-tight">
                        Designed for <span className="text-[#0469ff]">Modern Parents</span>
                    </h2>
                    <p className="text-base md:text-lg lg:text-xl text-gray-600 font-medium max-w-[700px] mx-auto leading-relaxed">
                        Get important updates, track your child's progress, and handle fee payments—quickly and securely—all from EduBreezy's app.
                    </p>
                </div>

                {/* Phone Mockup with 3D Rotation */}
                <div className="flex justify-center items-center" style={{ perspective: "1500px" }}>
                    <motion.div
                        style={{
                            rotateX: smoothRotateX,
                            rotateY: smoothRotateY,
                            scale: smoothScale,
                            opacity: opacity,
                            transformStyle: "preserve-3d"
                        }}
                        className="relative"
                    >
                        {/* Phone Frame */}
                        <div className="relative">
                            {/* Phone Shadow */}
                            <div
                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-[80%] h-[40px] bg-black/20 blur-2xl rounded-full"
                                style={{ transform: "translateZ(-50px)" }}
                            />

                            {/* Phone Device */}
                            <div
                                className="relative bg-[#1a1a2e] rounded-[3rem] p-3 md:p-4 shadow-2xl"
                                style={{
                                    boxShadow: "0 50px 100px -20px rgba(0,0,0,0.3), 0 30px 60px -30px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
                                }}
                            >
                                {/* Dynamic Island */}
                                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[100px] h-[28px] bg-black rounded-full z-20" />

                                {/* Screen Content */}
                                <div className="relative w-[280px] md:w-[320px] lg:w-[380px] rounded-[2.2rem] overflow-hidden bg-white">
                                    <img
                                        src="/app-screenshot.png"
                                        alt="EduBreezy Mobile App"
                                        className="w-full h-auto object-cover"
                                    />
                                </div>

                                {/* Side Buttons */}
                                <div className="absolute right-[-3px] top-32 w-[3px] h-12 bg-[#2a2a3e] rounded-l" />
                                <div className="absolute left-[-3px] top-24 w-[3px] h-8 bg-[#2a2a3e] rounded-r" />
                                <div className="absolute left-[-3px] top-36 w-[3px] h-16 bg-[#2a2a3e] rounded-r" />
                            </div>
                        </div>

                        {/* Floating Feature Badges */}
                        <motion.div
                            className="absolute -left-16 md:-left-32 top-1/4 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100"
                            style={{ transform: "translateZ(50px)" }}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-[#0469ff]" />
                                Real-time Alerts
                            </span>
                        </motion.div>

                        <motion.div
                            className="absolute -right-16 md:-right-36 top-1/3 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100"
                            style={{ transform: "translateZ(40px)" }}
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-[#10B981]" />
                                Easy Payments
                            </span>
                        </motion.div>

                        <motion.div
                            className="absolute -left-12 md:-left-28 bottom-1/4 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100"
                            style={{ transform: "translateZ(30px)" }}
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.7 }}
                        >
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#F59E0B]" />
                                Progress Tracking
                            </span>
                        </motion.div>
                    </motion.div>
                </div>

                {/* App Store Buttons */}
                <div className="flex flex-wrap gap-4 justify-center mt-16">
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
            </div>
        </section>
    );
}

// Bus Tracking Section - Static showcase
function BusTrackingSection() {
    return (
        <section className="py-20 md:py-28 bg-[#f5f7fa]">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">

                    {/* Phone Image - Left Side */}
                    <div className="flex-1 flex justify-center lg:justify-center">
                        <img
                            src="/app_image.png"
                            alt="EduBreezy Bus Tracking"
                            className="w-[300px] md:w-[350px] lg:w-[400px] h-auto"
                        />
                    </div>

                    {/* Content - Right Side */}
                    <div className="flex-1 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5 mb-4 md:mb-6">
                            <Bus className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0469ff]" />
                            <span className="text-xs md:text-sm font-semibold text-[#0469ff]">Live Bus Tracking</span>
                        </div>

                        {/* Heading */}
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a1a2e] mb-4 md:mb-6 leading-tight tracking-tight">
                            Track Your Child's <span className="text-[#0469ff]">School Bus</span> in Real-Time
                        </h2>

                        {/* Description */}
                        <p className="text-base md:text-lg lg:text-xl text-gray-600 font-medium mb-6 md:mb-8 leading-relaxed">
                            Know exactly when the bus arrives. Get live location updates, estimated arrival times, and instant notifications for pickup and drop-off.
                        </p>

                        {/* Features List */}
                        {/* Features List - Aligned container */}
                        <div className="w-fit mx-auto lg:mx-0 space-y-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
                                    <MapPin className="w-5 h-5 text-[#10B981]" />
                                </div>
                                <span className="text-gray-700 font-medium text-lg text-left">Real-time GPS location tracking</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                                    <Bell className="w-5 h-5 text-[#F59E0B]" />
                                </div>
                                <span className="text-gray-700 font-medium text-lg text-left">Instant arrival notifications</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#8B5CF6]/10 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-[#8B5CF6]" />
                                </div>
                                <span className="text-gray-700 font-medium text-lg text-left">ETA updates & route history</span>
                            </div>
                        </div>

                        {/* CTA */}
                        <Link href="/features">
                            <button className="inline-flex items-center gap-3 px-8 py-4 bg-[#0469ff] text-white font-bold rounded-full hover:bg-[#0358dd] transition-all duration-300 hover:shadow-lg">
                                Learn More
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </Link>
                    </div>

                </div>
            </div>
        </section>
    );
}

// About Brief Section
function AboutBriefSection() {

    return (
        <section className=" py-16 md:py-24 px-5 relative">
            <div className="max-w-[1200px] mx-auto">

                <p className="text-[#1a1a2e]/80  text-lg md:text-xl lg:text-2xl lg:leading-[2.5rem] leading-[2rem] font-light  text-center ">
                    EduBreezy is a next-generation, AI-powered school management platform that blends
                    powerful technology, intelligent insights, and education-first thinking.
                    Built with modern UI interfaces for today's digital era, EduBreezy helps
                    forward-thinking schools streamline operations, make data-driven decisions,
                    engage parents more effectively, and unlock the full potential of smart,
                    future-ready education management.
                </p>
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
                <ScrollMouse />
            </div>
        </section>
    );
}

// HPC Section - NEP 2020 Compliance
function HPCSection() {
    return (
        <section className="py-20 md:py-28 bg-[#f5f7fa]">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">

                    {/* Phone Image - Left Side */}
                    <div className="flex-1 flex justify-center lg:justify-center">
                        <img
                            src="/HPC.png"
                            alt="NEP 2020 Holistic Progress Card"
                            className="w-[300px] md:w-[350px] lg:w-[400px] h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                        />
                    </div>

                    {/* Content - Right Side */}
                    <div className="flex-1 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border-2 border-[#0e66fe]/20 bg-[#0e66fe]/5 mb-4 md:mb-6">
                            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#0e66fe]" />
                            <span className="text-xs md:text-sm font-semibold text-[#0e66fe]">NEP 2020 Compliant</span>
                        </div>

                        {/* Heading */}
                        <h2 className="text-4xl md:text-5xl lg:text-5xl font-black text-[#1a1a2e] mb-4 md:mb-6 leading-tight tracking-tight">
                            New Education Policy 2020 Based <span className="text-[#0e66fe]"> HOLISTIC PROGRESS CARD</span>
                        </h2>

                        {/* Description */}
                        <p className="text-base md:text-lg lg:text-xl text-gray-600 font-medium mb-6 md:mb-8 leading-relaxed">
                            Go beyond just marks. Our 360-degree assessment covers academics, social-emotional learning (SEL), and co-curricular activities, giving you a complete picture of your child's growth.
                        </p>

                        {/* Features List */}
                        <div className="w-fit mx-auto lg:mx-0 space-y-4 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#EC4899]/10 flex items-center justify-center shrink-0">
                                    <Heart className="w-5 h-5 text-[#EC4899]" />
                                </div>
                                <span className="text-gray-700 font-medium text-lg text-left">Behavior & SEL Tracking</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
                                    <Users className="w-5 h-5 text-[#10B981]" />
                                </div>
                                <span className="text-gray-700 font-medium text-lg text-left">Teacher, Parent & Peer Feedback</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[#F59E0B]/10 flex items-center justify-center shrink-0">
                                    <Award className="w-5 h-5 text-[#F59E0B]" />
                                </div>
                                <span className="text-gray-700 font-medium text-lg text-left">360° Skills Assessment</span>
                            </div>
                        </div>

                        {/* CTA */}
                        <Link href="/features">
                            <button className="inline-flex items-center gap-3 px-8 py-4 bg-[#0e66fe] text-white font-bold rounded-full hover:bg-[#0b53cb] transition-all duration-300 hover:shadow-lg">
                                Explore HPC
                                <ArrowRight className="w-5 h-5" />
                            </button>
                        </Link>
                    </div>

                </div>
            </div>
        </section>
    );
}
// Why EduBreezy Section
function WhyEduBreezySection() {
    const [showAll, setShowAll] = useState(false);

    const apps = [
        {
            icon: Award,
            title: "Director Login",
            desc: "High-level oversight & analytics",
            color: "#14B8A6"
        },
        {
            icon: Trophy,
            title: "Principal Login",
            desc: "School operations & staff management",
            color: "#F97316"
        },
        {
            icon: Home,
            title: "Admin Login",
            desc: "Complete dashboard with AI-powered insights",
            color: "#0569ff"
        },
        {
            icon: CreditCard,
            title: "Accountant Login",
            desc: "Handle fees, payroll & finances",
            color: "#0EA5E9"
        },
        {
            icon: BookOpen,
            title: "Student Login",
            desc: "Access assignments, results & schedules",
            color: "#EC4899"
        },
        {
            icon: Users,
            title: "Parent Login",
            desc: "Track your child's progress easily",
            color: "#8B5CF6"
        },
        {
            icon: GraduationCap,
            title: "Teacher Login",
            desc: "Manage classes, attendance & grades",
            color: "#10B981"
        },
    ];

    const visibleApps = showAll ? apps : apps.slice(0, 6);

    return (
        <section className="py-20 md:py-28 px-5 bg-[#f5f7fa]">
            <div className="max-w-[1200px] mx-auto">
                {/* Section Header */}
                <SectionHeading
                    badge="ROLE-BASED ACCESS"
                    title="One Platform,"
                    highlightedText="Multiple Logins"
                    description="Tailored dashboards for every stakeholder. From directors to students, everyone gets exactly what they need."
                />

                {/* Apps Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {visibleApps.map((app, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 group cursor-pointer hover:-translate-y-1"
                        >
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                                style={{ backgroundColor: `${app.color}15` }}
                            >
                                <app.icon className="w-6 h-6" style={{ color: app.color }} />
                            </div>
                            <h3 className="text-lg font-bold text-[#1a1a2e] mb-1 group-hover:text-[#0569ff] transition-colors">
                                {app.title}
                            </h3>
                            <p className="text-slate-500 text-sm">{app.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Show More Button */}
                {apps.length > 6 && (
                    <div className="text-center mt-8">
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className="inline-flex items-center gap-2 px-6 py-3 text-[#0569ff] font-semibold hover:bg-[#0569ff]/5 rounded-full transition-colors"
                        >
                            {showAll ? 'Show Less' : 'Show More'}
                            <ChevronDown className={`w-5 h-5 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                )}
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
                    <span className="inline-block bg-[#0569ff]/10 text-[#0569ff] px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold uppercase tracking-wider mb-4 md:mb-6">
                        Our Mobile App
                    </span>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a1a2e] leading-tight mb-4 md:mb-6 tracking-tight">
                        <Highlighter action="underline" color="black">Modern App</Highlighter> for
                        <span className="text-[#0569ff]"> <Highlighter isView={true} action="underline" color="black">Modern Schools</Highlighter></span>
                    </h2>
                    <p className="text-base md:text-lg lg:text-xl text-gray-600 font-medium max-w-2xl mx-auto leading-relaxed">
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
            icon: UserPlus,
            title: "Student Admission",
            desc: "Complete digital onboarding pipeline for new enrollments.",
            color: "#0569ff"
        },
        {
            icon: CreditCard,
            title: "Fees Collection",
            desc: "Automated invoicing with multiple secure payment gateways.",
            color: "#10B981"
        },
        {
            icon: ClipboardCheck,
            title: "Student Attendance",
            desc: "Real-time tracking with instant notifications to parents.",
            color: "#8B5CF6"
        },
        {
            icon: FileCheck,
            title: "Examinations",
            desc: "Efficient grading systems and automated report generation.",
            color: "#EC4899"
        },
        {
            icon: BookOpen,
            title: "Academics",
            desc: "Smart timetable planning and lesson management tools.",
            color: "#F59E0B"
        },
        {
            icon: MessageSquare,
            title: "Communication",
            desc: "Seamless connectivity between teachers, students & parents.",
            color: "#14B8A6"
        }
    ];

    return (
        <section className="py-24 md:py-32 px-5 bg-white" id="features">
            <div className="max-w-[1200px] mx-auto">
                {/* Section Header */}
                <SectionHeading
                    badge="PLATFORM MODULES"
                    title="Powerful Features For"
                    highlightedText="Modern Schools"
                    description="Everything you need to manage admissions, academics, attendance, fees, and more — all in one platform."
                />

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {features.map((feature, index) => {
                        const IconComponent = feature.icon;
                        return (
                            <div
                                key={index}
                                className="group bg-[#f8fafc] p-8 rounded-2xl border border-slate-200 transition-all duration-300 hover:bg-white hover:shadow-lg hover:border-slate-300 hover:-translate-y-1"
                            >
                                {/* Icon */}
                                <div
                                    className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                                    style={{ backgroundColor: `${feature.color}15` }}
                                >
                                    <IconComponent
                                        size={26}
                                        style={{ color: feature.color }}
                                        strokeWidth={1.5}
                                    />
                                </div>

                                <h3 className="text-[#1a1a2e] text-lg font-bold mb-2">
                                    {feature.title}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* CTA */}
                <div className="text-center">
                    <Link href="/features">
                        <button className="inline-flex items-center gap-3 px-8 py-4 bg-[#0569ff] text-white font-bold rounded-full hover:bg-[#0358dd] transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                            Explore All Features
                            <ArrowRight size={20} />
                        </button>
                    </Link>
                    <p className="mt-6 text-xs text-slate-400 uppercase tracking-widest">
                        Trusted by 2000+ Schools
                    </p>
                </div>
            </div>
        </section>
    );
}

// How We Make Your School Smarter Section
function HowWeWorkSection() {
    const steps = [
        {
            icon: Laptop,
            title: "Easy Onboarding",
            desc: "Get started in minutes with our guided setup. Import your data seamlessly.",
            color: "#0569ff"
        },
        {
            icon: Users,
            title: "Connect Everyone",
            desc: "Link students, parents, teachers, and staff on one unified platform.",
            color: "#10B981"
        },
        {
            icon: BarChart3,
            title: "Automate Operations",
            desc: "From attendance to fees, automate repetitive tasks and save hours.",
            color: "#F59E0B"
        },
        {
            icon: FileText,
            title: "Generate Reports",
            desc: "Get comprehensive analytics and make data-driven decisions.",
            color: "#8B5CF6"
        },
        {
            icon: Smartphone,
            title: "Mobile Access",
            desc: "Access everything on-the-go with our mobile apps for all users.",
            color: "#EC4899"
        },
        {
            icon: TrendingUp,
            title: "Grow & Scale",
            desc: "Expand to multiple branches and scale without limits.",
            color: "#14B8A6"
        }
    ];

    return (
        <section className="py-24 md:py-32 px-5 bg-[#f8fafc]">
            <div className="max-w-[1200px] mx-auto">
                {/* Section Header */}
                <SectionHeading
                    badge="HOW IT WORKS"
                    title="Make Your School"
                    highlightedText="Smarter"
                    description="A simple, step-by-step approach to transform your school management."
                />

                {/* Steps Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                    {steps.map((step, index) => {
                        const IconComponent = step.icon;
                        return (
                            <div
                                key={index}
                                className="group bg-white p-8 rounded-2xl border border-slate-200 transition-all duration-300 hover:shadow-lg hover:border-slate-300 hover:-translate-y-1"
                            >
                                {/* Step Number + Icon */}
                                <div className="flex items-center gap-4 mb-5">
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                        style={{ backgroundColor: `${step.color}15` }}
                                    >
                                        <IconComponent
                                            size={26}
                                            style={{ color: step.color }}
                                            strokeWidth={1.5}
                                        />
                                    </div>
                                    <span
                                        className="text-3xl font-bold"
                                        style={{ color: `${step.color}30` }}
                                    >
                                        0{index + 1}
                                    </span>
                                </div>

                                <h3 className="text-[#1a1a2e] text-lg font-bold mb-2">
                                    {step.title}
                                </h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    {step.desc}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div className="text-center">
                    <p className="text-slate-500 mb-6">
                        Ready to transform your school?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/schoollogin">
                            <button className="px-8 py-4 bg-[#0569ff] text-white rounded-full font-semibold transition-all duration-300 hover:bg-[#0358dd] hover:shadow-lg flex items-center gap-2">
                                Get Started Now
                                <ArrowRight size={18} />
                            </button>
                        </Link>
                        <Link href="/contact">
                            <button className="px-8 py-4 bg-white text-slate-700 rounded-full font-semibold border border-slate-200 transition-all duration-300 hover:border-slate-300 hover:bg-slate-50 flex items-center gap-2">
                                Request a Demo
                                <ArrowRight size={18} />
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// School Explorer Section
function SchoolExplorerSection() {
    const features = [
        {
            icon: Globe,
            title: "SEO-Optimized Profile",
            desc: "Rank on Google and get discovered by parents",
            color: "#0569ff"
        },
        {
            icon: UserPlus,
            title: "Direct Inquiries",
            desc: "Parents inquire and apply directly",
            color: "#10B981"
        },
        {
            icon: Star,
            title: "Reviews & Ratings",
            desc: "Build credibility with verified reviews",
            color: "#F59E0B"
        },
        {
            icon: BarChart3,
            title: "Analytics Dashboard",
            desc: "Track views and conversion rates",
            color: "#8B5CF6"
        }
    ];

    return (
        <section className="py-24 md:py-32 px-5 bg-gradient-to-b from-white to-[#f5f7fa]">
            <div className="max-w-[1200px] mx-auto">
                {/* Section Header */}
                <SectionHeading
                    badge="SCHOOL EXPLORER"
                    title="Get Discovered by"
                    highlightedText="Parents"
                    description="List your school on school.edubreezy.com and reach parents searching for schools."
                />

                {/* Main Card */}
                <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border-2 border-muted overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Left - Content */}
                        <div className="p-6 md:p-10 lg:p-16 flex flex-col justify-center">
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#0569ff]/10 to-[#10B981]/10 text-[#0569ff] px-3 py-2 rounded-full text-xs md:text-sm font-semibold mb-6 self-start">
                                <Globe size={14} className="md:w-4 md:h-4" />
                                school.edubreezy.com
                            </div>

                            <h3 className="text-3xl md:text-4xl lg:text-5xl font-black text-[#1a1a2e] mb-4 md:mb-6 leading-tight tracking-tight">
                                Increase Admissions with Proven Strategies
                            </h3>

                            <p className="text-base md:text-lg text-slate-600 font-medium mb-6 md:mb-8 leading-relaxed">
                                Showcase your strengths, receive inquiries, and convert leads into admissions with our school discovery platform.
                            </p>

                            {/* Stats */}
                            {/* <div className="grid grid-cols-3 gap-3 md:gap-4 mb-6 md:mb-8 p-3 md:p-4 bg-[#f5f7fa] rounded-xl md:rounded-2xl">
                                <div className="text-center">
                                    <div className="text-lg md:text-2xl font-bold text-[#0569ff]">50K+</div>
                                    <div className="text-[10px] md:text-xs text-slate-500">Parents</div>
                                </div>
                                <div className="text-center border-x border-slate-200">
                                    <div className="text-lg md:text-2xl font-bold text-[#10B981]">10K+</div>
                                    <div className="text-[10px] md:text-xs text-slate-500">Inquiries</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg md:text-2xl font-bold text-[#F59E0B]">95%</div>
                                    <div className="text-[10px] md:text-xs text-slate-500">Satisfaction</div>
                                </div>
                            </div> */}

                            {/* CTA */}
                            <div className="flex flex-col sm:flex-row mt-8 gap-3 md:gap-4">
                                <a
                                    href="https://school.edubreezy.com/explore"
                                    target="_blank"
                                    className="inline-flex items-center justify-center gap-2 bg-[#0569ff] text-white px-5 md:px-6 py-3 md:py-3.5 rounded-full text-sm md:text-base font-bold hover:bg-[#0358dd] transition-all duration-300 hover:shadow-lg"
                                >
                                    List Your School Free
                                    <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
                                </a>
                                <a
                                    href="https://school.edubreezy.com"
                                    target="_blank"
                                    className="inline-flex items-center justify-center gap-2 text-slate-600 font-semibold px-5 md:px-6 py-3 md:py-3.5 border border-slate-200 rounded-full text-sm md:text-base hover:bg-slate-50 transition-all"
                                >
                                    Explore Schools
                                </a>
                            </div>
                        </div>

                        {/* Right - Features Grid */}
                        <div className="bg-white p-6 md:p-10 lg:p-16 flex items-center justify-center">
                            <img src="./sx.png" alt="School Explorer" className="w-full h-full max-h-[400px] object-contain rounded-2xl scale-130" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Partner Teaser - Compact CTA for Partner Program
function PartnerTeaser() {
    return (
        <section className="py-12 md:py-16 px-5 bg-gradient-to-r from-[#0a2540] to-[#0d3356]">
            <div className="max-w-[1200px] mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-4 md:mb-6">
                            <span className="inline-flex items-center gap-1.5 bg-[#10B981]/20 text-[#10B981] px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold">
                                <Handshake size={14} />
                                Grow With Us
                            </span>
                        </div>
                        <h3 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-3 md:mb-4 leading-tight tracking-tight">
                            Earn up to <span className="text-[#10B981]">30%</span> recurring commission
                        </h3>
                        <p className="text-white/90 text-base md:text-lg lg:text-xl font-medium max-w-lg leading-relaxed">
                            Help schools adopt EduBreezy and build a sustainable income. Perfect for teachers, consultants & education agents.
                        </p>
                    </div>
                    <Link href="/partners">
                        <button className="group flex items-center pr-1 gap-2 bg-white text-[#0569ff] border-0 rounded-full text-sm md:text-base font-semibold cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 whitespace-nowrap">
                            <span className='px-1 pl-5 md:pl-6 py-3 md:py-3.5'>Become a Partner</span>
                            <span className='bg-[#0569ff] p-2.5 md:p-3 shadow-lg rounded-full group-hover:bg-[#0358dd] transition-colors'>
                                <ArrowRight size={16} className="md:w-[18px] md:h-[18px] text-white" />
                            </span>
                        </button>
                    </Link>
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
                <SectionHeading
                    badge="Core Features"
                    title="Simplifying School"
                    highlightedText="Management"
                    description="Our platform offers a range of features to help educators and administrators streamline their tasks."
                />

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

// Pricing Section - New Pricing Model
function PricingSection() {
    const features = [
        "All Modules Included",
        "Unlimited Users",
        "Mobile Apps (iOS & Android)",
        "24/7 Support",
        "Free Data Migration",
        "Regular Updates"
    ];

    return (
        <section className="py-24 md:py-32 px-5 bg-white relative overflow-hidden" id="pricing">
            <div className="max-w-[1200px] mx-auto relative z-10">
                {/* Section Header */}
                <SectionHeading
                    badge="SIMPLE PRICING"
                    title="Transparent Pricing for"
                    highlightedText="Every School"
                    description="One simple plan. No hidden fees. Pay yearly and save 30%."
                />

                {/* Pricing Card - Full Width with Two Columns */}
                <div className="bg-gradient-to-br from-[#0569ff] to-[#0145c4] rounded-[2.5rem] overflow-hidden border-2 border-black">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Left - Pricing Info (Blue gradient background) */}
                        <div className="p-8 md:p-12 lg:p-16">
                            {/* 30% OFF Badge */}
                            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-bold mb-6 backdrop-blur-sm border border-white/30">
                                <Zap className="w-4 h-4" />
                                30% OFF - Limited Time
                            </span>

                            {/* Main Price */}
                            <div className="mb-8">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-6xl md:text-7xl font-black text-white">₹120</span>
                                    <div className="flex flex-col">
                                        <span className="text-white/90 text-lg font-semibold">per student</span>
                                        <span className="text-white/60 text-sm">per year</span>
                                    </div>
                                </div>
                                <p className="text-white text-base font-semibold mt-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    Only ₹10 per month, billed yearly
                                </p>
                            </div>

                            {/* CTA Buttons */}
                            <div className="space-y-3">
                                <Link href="/pricing" className="block">
                                    <button className="w-full py-4 bg-white text-[#0569ff] font-bold rounded-full hover:bg-white/90 transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg">
                                        Calculate Your Price
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link href="/contact" className="block">
                                    <button className="w-full py-4 bg-white/10 text-white font-bold rounded-full border border-white/30 hover:bg-white/20 transition-all duration-300 backdrop-blur-sm">
                                        Talk to Sales
                                    </button>
                                </Link>
                            </div>

                            {/* Note */}
                            <p className="text-white/60 text-sm mt-6">
                                💡 Billed annually. Minimum 100 students.
                            </p>
                        </div>

                        {/* Right - Features List */}
                        <div className="bg-white p-8 md:p-12 lg:p-16 border-t lg:border-t-0 lg:border-l border-slate-100">
                            <h3 className="text-xl font-bold text-[#1a1a2e] mb-6">
                                Everything you need, included:
                            </h3>
                            <div className="space-y-4">
                                {features.map((feature, index) => (
                                    <div key={index} className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-[#10B981]/10 flex items-center justify-center shrink-0">
                                            <Check size={16} className="text-[#10B981]" />
                                        </div>
                                        <span className="text-slate-600 font-medium">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            {/* T&C Links */}
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <p className="text-slate-400 text-xs">
                                    By subscribing, you agree to our{' '}
                                    <Link href="/terms" className="text-[#0569ff] hover:underline">Terms of Service</Link>
                                    {' '}and{' '}
                                    <Link href="/privacy" className="text-[#0569ff] hover:underline">Privacy Policy</Link>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Testimonials Section - Infinite Marquee Scroll
function TestimonialsSection() {
    const testimonials = [
        {
            name: "Dr. Sarah Jenkins",
            role: "Principal",
            institution: "St. Mary's Academy",
            content: "EduBreezy has completely transformed how we manage our daily operations. The automated fee collection alone saved our staff over 20 hours a week.",
            avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&auto=format&fit=crop",
            rating: 5
        },
        {
            name: "Marcus Thorne",
            role: "IT Coordinator",
            institution: "Global International School",
            content: "The implementation was seamless. Our teachers love the mobile app, and the data security features give us peace of mind that we never had with our old system.",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=150&auto=format&fit=crop",
            rating: 5
        },
        {
            name: "Elena Rodriguez",
            role: "Head of Admissions",
            institution: "Oakwood Preparatory",
            content: "Parents have praised the transparency and ease of communication. The result management module is particularly impressive and easy to use.",
            avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=150&auto=format&fit=crop",
            rating: 5
        },
        {
            name: "David Chen",
            role: "Administrative Director",
            institution: "Horizon International",
            content: "Switching to EduBreezy was the best decision for our digital transformation. The analytics dashboard provides insights that help us optimize school resources effectively.",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=150&auto=format&fit=crop",
            rating: 5
        },
        {
            name: "Amina Khalid",
            role: "Academic Dean",
            institution: "Crescent School of Arts",
            content: "The multi-campus support is robust. Managing three different locations from a single dashboard has never been this simple and intuitive.",
            avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=150&auto=format&fit=crop",
            rating: 5
        }
    ];

    const scrollRef = useRef(null);

    const scroll = (direction) => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };


    return (
        <section className="py-24 bg-white relative overflow-hidden">
            {/* Background Decorative Element */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full opacity-[0.03] pointer-events-none">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.1" />
                    <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.1" />
                </svg>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="relative mb-16">
                    {/* Centered Heading */}
                    <SectionHeading
                        badge="SUCCESS STORIES"
                        title="What our"
                        highlightedText={<span className="text-[#0569ff] font-bold italic">Partners Says</span>}
                        description="Join over 2,500+ educational institutions that have revolutionized their administration."
                    />

                    {/* Scroll Controls - Positioned on right for desktop */}
                    <div className="flex gap-4 justify-center md:justify-end md:absolute md:right-0 md:bottom-0">
                        <button
                            onClick={() => scroll('left')}
                            className="w-14 h-14 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-90"
                            aria-label="Scroll left"
                        >
                            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center hover:bg-slate-800 transition-all active:scale-90 shadow-lg shadow-slate-200"
                            aria-label="Scroll right"
                        >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Scrollable Container */}
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-8 pb-12 snap-x snap-mandatory no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {testimonials.map((t, i) => (
                        <div
                            key={i}
                            className="flex-shrink-0 w-[90%] sm:w-[450px] snap-center group bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 transition-all duration-500 hover:bg-white hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)]"
                        >
                            {/* Stars */}
                            <div className="flex gap-1 mb-6">
                                {[...Array(t.rating)].map((_, idx) => (
                                    <svg key={idx} className="w-4 h-4 text-orange-400 fill-current" viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>

                            {/* Quote Icon */}
                            <div className="mb-6">
                                <svg className="w-10 h-10 text-blue-100 group-hover:text-blue-200 transition-colors" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V4H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM2.017 21L2.017 18C2.017 16.8954 2.91243 16 4.017 16H7.017C7.56928 16 8.017 15.5523 8.017 15V9C8.017 8.44772 7.56928 8 7.017 8H3.017C2.46472 8 2.017 8.44772 2.017 9V11C2.017 11.5523 1.56928 12 1.017 12H0.017V4H10.017V15C10.017 18.3137 7.33071 21 4.017 21H2.017Z" />
                                </svg>
                            </div>

                            <p className="text-slate-700 text-xl font-medium leading-relaxed mb-8 italic">
                                "{t.content}"
                            </p>

                            <div className="flex items-center gap-4 mt-auto">
                                <img
                                    src={t.avatar}
                                    alt={t.name}
                                    className="w-16 h-16 rounded-2xl border-2 border-white shadow-md object-cover"
                                />
                                <div>
                                    <h4 className="text-slate-900 font-bold text-lg leading-tight">{t.name}</h4>
                                    <p className="text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">{t.role}</p>
                                    <p className="text-slate-400 text-xs font-medium">{t.institution}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Brand Logos Strip */}
                <div className="mt-12 flex flex-wrap justify-center items-center gap-12 opacity-20 grayscale hover:grayscale-0 transition-all duration-700">
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">SCHOOLS.co</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">ACADEMY_PRO</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">LEARN_HUB</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">EDU_MATIC</div>
                    <div className="text-2xl font-black text-slate-800 tracking-tighter">CAMPUS_LIFE</div>
                </div>
            </div>

            <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-10">
                    {/* Full width large branding */}
                    <div className="text-center mb-20 w-full col-span-full">
                        <h1 className="text-[clamp(5rem,20vw,18rem)] font-black leading-none tracking-tighter text-white w-full">
                            EduBreezy
                        </h1>
                    </div>

                    {[
                        { title: 'Quick Links', links: ['About Us', 'Careers', 'Contact'] },
                        { title: 'Resources', links: ['Help Center', 'Documentation', 'Blog'] },
                        { title: 'Legal', links: ['Privacy Policy', 'Terms of Service'] },
                        { title: 'Contact Us', links: ['support@edubreezy.com', '+91 9471 532 682'] }
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
