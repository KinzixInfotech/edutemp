'use client'
import React, { useRef, useState } from 'react';
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
import dynamic from 'next/dynamic';


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
            <FeaturesSection />
            <WebDashboardCTA />

            <SchoolExplorerSection />
            {/* <CommunicatingSeamlesslySection /> */}
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
    const videoSrc = "https://www.youtube.com/embed/dQw4w9WgXcQ";

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white">
            {/* Three.js 3D Background */}

            {/* Background Grid Pattern */}
            {/* <div className="absolute inset-0 bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" /> */}

            {/* Gradient Orb - Top Left */}
            {/* <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#0469ff]/10 rounded-full blur-3xl" /> */}

            {/* Gradient Orb - Top Right */}
            <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#0469ff]/5 rounded-full blur-3xl" />

            {/* Floating 3D Grid Cards */}

            <div className="relative max-w-[1400px] mx-auto px-6 py-20 z-10 w-full">
                {/* Hero Content */}
                <div className="text-center space-y-8">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5">
                        <div className="w-2 h-2 rounded-full bg-[#0469ff] animate-pulse" />
                        <span className="text-sm font-semibold text-[#0469ff]">Next-Generation School ERP</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-[clamp(2.8rem,8vw,6.5rem)] font-bold leading-[1.05] tracking-tight">
                        <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                            Transform Education
                        </span>
                        <br />
                        <span className="relative inline-block mt-2">
                            <span className="text-[#0469ff]">
                                With Intelligent Systems
                            </span>
                            {/* Underline Effect */}
                            <svg className="absolute -bottom-4 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                                <path d="M2 8C70 3 150 1 298 8" stroke="#0469ff" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </span>
                    </h1>

                    {/* Subtitle */}
                    <p className="text-xl md:text-2xl text-gray-600 max-w-[800px] mx-auto leading-relaxed font-medium">
                        An all-in-one school ERP with intelligent systems and a modern UI/UX that simplifies administration and enhances learning outcomes.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex items-center justify-center gap-5 flex-wrap pt-6">
                        <Link href="/contact">
                            <button className="group relative px-10 py-4 rounded-full font-bold text-lg text-white bg-[#0469ff]  hover:shadow-2xl transition-all duration-300 overflow-hidden">
                                <span className="absolute inset-0 bg-[#0358dd] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                <span className="relative flex items-center gap-3">
                                    Start Free Trial
                                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                        <ArrowRight className="w-5 h-5 text-[#0469ff] transition-transform duration-300 group-hover:translate-x-0.5" />
                                    </div>
                                </span>
                            </button>
                        </Link>
                        <button
                            onClick={() => setIsVideoOpen(true)}
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

// About Brief Section
function AboutBriefSection() {
    return (
        <section className=" py-16 md:py-24 px-5 relative">
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
        <section className="py-20 bg-[#f5f7fa] md:py-28 px-5 ">
            <div className="max-w-[1200px] mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left Content */}
                    <div>
                        <span className="text-sm text-[#0569ff] font-medium mb-4 block">_Why us</span>
                        <h2 className="text-3xl md:text-4xl lg:text-[3.2rem] font-bold text-[#1a1a2e] leading-[1.1] mb-3">
                            Schools need smart systems
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

    const featuredItems = [
        {
            title: "Student Admission",
            desc: "Complete digital onboarding pipeline for new enrollments.",
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
            ),
            color: "blue"
        },
        {
            title: "Fees Collection",
            desc: "Automated invoicing with multiple secure payment gateways.",
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: "indigo"
        },
        {
            title: "Student Attendance",
            desc: "Real-time tracking with instant notifications to parents.",
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            ),
            color: "purple"
        },
        {
            title: "Examinations",
            desc: "Efficient grading systems and automated report generation.",
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: "pink"
        },
        {
            title: "Academics",
            desc: "Smart timetable planning and lesson management tools.",
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            ),
            color: "orange"
        },
        {
            title: "Communication",
            desc: "Seamless connectivity between teachers, students & parents.",
            icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
            ),
            color: "teal"
        }
    ];


    return (
        <section className="py-24 md:py-32 px-5 bg-white relative overflow-hidden" id="features">
            {/* Decorative blurred accents */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[100px] opacity-70"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px] opacity-70"></div>
            </div>

            <div className="max-w-[1240px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-20 md:mb-28">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 mb-6">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                        </span>
                        <span className="text-blue-700 text-xs font-black uppercase tracking-widest">Platform Modules</span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black text-slate-900 leading-[1em] mb-8 tracking-tight">
                        Powerful Features For{' '}
                        <br className="hidden md:block" />
                        <span className="relative inline-block mt-2">
                            <span className="relative z-10 text-blue-600">Modern Schools</span>
                            <span className="absolute bottom-2 left-0 w-full h-3 md:h-5 bg-orange-200/60 -rotate-1 -z-10 rounded-lg"></span>
                        </span>
                    </h2>

                    <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                        Everything you need to manage admissions, academics, attendance, fees, and more — all in one intelligent platform.
                    </p>
                </div>

                {/* Features Grid - Limited to 6 Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 mb-16 md:mb-24">
                    {featuredItems.map((feature, index) => (
                        <div
                            key={index}
                            className="group relative bg-slate-50/50 p-10 rounded-[3rem] border border-slate-100 transition-all duration-500 hover:bg-white hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] hover:-translate-y-2 overflow-hidden flex flex-col"
                        >
                            {/* Feature Icon with Dynamic Colors */}
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-sm border border-slate-100 bg-white group-hover:border-blue-100`}>
                                <span className="text-blue-600 group-hover:text-blue-700 transition-colors duration-500">
                                    {feature.icon}
                                </span>
                            </div>

                            <h3 className="text-2xl font-black text-slate-900 mb-4 group-hover:text-blue-600 transition-colors duration-300">
                                {feature.title}
                            </h3>

                            <p className="text-slate-500 text-base leading-relaxed font-medium mb-8">
                                {feature.desc}
                            </p>

                            {/* Action Link */}
                            <div className="mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 group-hover:gap-4 transition-all duration-300">
                                <span>View Details</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </div>

                            {/* Bottom Decorative Bar */}
                            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-blue-600/0 to-transparent group-hover:via-blue-600/20 transition-all duration-500"></div>
                        </div>
                    ))}
                </div>

                {/* View All Features CTA */}
                <div className="text-center">
                    <Link
                        href="/features"
                        className="group relative inline-flex items-center gap-2 md:gap-3 px-6 md:px-10 py-3 md:py-5 bg-slate-900 text-white rounded-full font-black text-xs md:text-sm uppercase tracking-widest hover:bg-black transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
                    >
                        <span className="relative z-10">Explore All Features</span>
                        <div className="relative z-10 w-5 h-5 md:w-6 md:h-6 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                            <svg className="w-3 h-3 md:w-3.5 md:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </div>

                        {/* Hover Glow Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    </Link>

                    <div className="mt-8 flex items-center justify-center gap-8 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                        <div className="h-6 w-px bg-slate-300 mx-4 hidden md:block"></div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Trust by 2000+ Schools</p>
                        <div className="h-6 w-px bg-slate-300 mx-4 hidden md:block"></div>
                    </div>
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
                        Here's How We Make Your <br className="hidden md:block" />
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
        <section className="py-20  bg-white  md:py-28 px-5">
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
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="max-w-2xl">
                        <h2 className="text-blue-600 font-bold text-sm uppercase tracking-[0.2em] mb-4">Success Stories</h2>
                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 mb-4 tracking-tight">
                            What our <span className="text-[#0166f6] italic">Partners</span> say.
                        </h3>
                        <p className="text-slate-500 text-lg font-medium">
                            Join over 2,500+ educational institutions that have revolutionized their administration.
                        </p>
                    </div>

                    {/* Scroll Controls */}
                    <div className="flex gap-4">
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
