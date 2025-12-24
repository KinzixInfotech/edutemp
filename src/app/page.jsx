'use client'
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import {
    CheckCircle, Star, Users, BookOpen, BarChart3,
    Clock, GraduationCap, CreditCard, ArrowRight,
    TrendingUp, PieChart, Calendar, FileText, Play, XIcon, Check,
    Pencil, BookMarked, Ruler, Calculator, Highlighter as HighlighterIcon, School,
    Home, Bus, Smartphone, MapPin, Plane, Globe, MessageCircle, Laptop, Wifi
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



export default function HomePage() {
    return (
        <div className="bg-white overflow-x-hidden">
            <HeroSection />
            <MarqueeBanner />
            <AboutBriefSection />
            <WhyEduBreezySection />

            {/* <TrustedSection /> */}
            <WebDashboardCTA />
            <FeaturesSection />
            <SchoolExplorerSection />
            <CommunicatingSeamlesslySection />
            <BentoSection />
            <PricingSection />
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
        <section className="min-h-screen   h-fit pt-[100px] pb-0 bg-[linear-gradient(120deg,#f8fafc_0%,#fff9f0_50%,#f0f7ff_100%)] relative overflow-visible">
            {/* Mesh Gradient Glow - Left */}
            <div className="absolute top-[10%] -left-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(5,105,255,0.25)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />

            {/* Mesh Gradient Glow - Right */}
            <div className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(255,150,50,0.2)_0%,transparent_70%)] blur-[100px] rounded-full pointer-events-none" />

            {/* Mesh Gradient Glow - Bottom */}
            <div className="absolute bottom-[10%] left-[30%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(100,200,255,0.15)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />

            {/* Noise Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg_viewBox=%270_0_256_256%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter_id=%27noise%27%3E%3CfeTurbulence_type=%27fractalNoise%27_baseFrequency=%270.9%27_numOctaves=%274%27_stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect_width=%27100%25%27_height=%27100%25%27_filter=%27url(%23noise)%27/%3E%3C/svg%3E')] opacity-[0.03] pointer-events-none" />

            {/* Dot Pattern Background */}
            <DotPattern
                width={24}
                height={24}
                cr={1}
                className="absolute inset-0 w-full h-full opacity-20"
            />

            {/* Floating School Icons - Left Side */}
            <div className="absolute top-[8%] left-[10%] opacity-[0.10] pointer-events-none animate-[float_6s_ease-in-out_infinite]">
                <GraduationCap className="text-black rotate-[-15deg] w-10 h-10 md:w-20 md:h-20" />
            </div>
            <div className="hidden md:block absolute top-[18%] left-[18%] opacity-[0.08] pointer-events-none animate-[float_8s_ease-in-out_infinite_1s]">
                <Pencil size={50} className="text-black rotate-[25deg]" />
            </div>
            <div className="absolute top-[32%] left-[8%] opacity-[0.09] pointer-events-none animate-[float_7s_ease-in-out_infinite_0.5s]">
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
            <div className="absolute top-[6%] right-[10%] opacity-[0.09] pointer-events-none animate-[float_7s_ease-in-out_infinite_2s]">
                <School className="text-black rotate-[10deg] w-10 h-10 md:w-[75px] md:h-[75px]" />
            </div>
            <div className="hidden md:block absolute top-[20%] right-[8%] opacity-[0.08] pointer-events-none animate-[float_8s_ease-in-out_infinite_0.5s]">
                <BookOpen size={55} className="text-black rotate-[-15deg]" />
            </div>
            <div className="hidden md:block absolute top-[35%] right-[16%] opacity-[0.10] pointer-events-none animate-[float_6s_ease-in-out_infinite_1.5s]">
                <Pencil size={60} className="text-black rotate-[30deg]" />
            </div>
            <div className="absolute top-[50%] right-[10%] opacity-[0.07] pointer-events-none animate-[float_9s_ease-in-out_infinite_3s]">
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
                {/* Mesh Glow Behind Frame */}
                <div className="relative">
                    {/* Blue Glow - Left */}
                    <div className="absolute -top-[80px] -left-[100px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(5,105,255,0.35)_0%,transparent_70%)] blur-[60px] rounded-full pointer-events-none" />
                    {/* Orange Glow - Right */}
                    <div className="absolute -top-[60px] -right-[80px] w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(255,150,50,0.3)_0%,transparent_70%)] blur-[60px] rounded-full pointer-events-none" />
                    {/* Blue Glow - Bottom Left */}
                    <div className="absolute -bottom-[100px] -left-[60px] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(5,105,255,0.25)_0%,transparent_70%)] blur-[50px] rounded-full pointer-events-none" />
                    {/* Orange Glow - Bottom Right */}
                    <div className="absolute -bottom-[80px] -right-[100px] w-[350px] h-[350px] bg-[radial-gradient(circle,rgba(255,150,50,0.25)_0%,transparent_70%)] blur-[50px] rounded-full pointer-events-none" />
                    {/* Cyan Glow - Center Bottom */}
                    <div className="absolute -bottom-[120px] left-[30%] w-[300px] h-[300px] bg-[radial-gradient(circle,rgba(100,200,255,0.2)_0%,transparent_70%)] blur-[60px] rounded-full pointer-events-none" />

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
        <section className="bg-[#f5f7fa] py-16 md:py-24 px-5">
            <div className="max-w-[1200px] mx-auto">
                <p className="text-[#1a1a2e]/80 text-lg md:text-xl lg:text-2xl leading-relaxed font-light text-left max-w-[900px]">
                    EduBreezy is a next-generation school management platform blending
                    powerful technology, intuitive design, and education-first thinking.
                    {"We're"} here to help forward-thinking schools streamline operations,
                    engage parents effectively, and unlock the full potential of
                    modern education management.
                </p>
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
                            Schools need smart systems
                        </h2>
                        <h3 className="text-2xl md:text-3xl lg:text-[2.5rem] font-light text-[#999] leading-tight mb-10">
                            not complex software.
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
                        {/* School App Card */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-[#0569ff]/20 hover:shadow-lg transition-all duration-300">
                            <div className="w-14 h-14 bg-[#0569ff]/10 rounded-xl flex items-center justify-center mb-4">
                                <Home size={28} className="text-[#0569ff]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">School App</h3>
                            <p className="text-[#666] text-sm leading-relaxed">
                                Your All-in-One Solution for Easy Management and Communication.
                            </p>
                        </div>

                        {/* Parent App Card */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-[#0569ff]/20 hover:shadow-lg transition-all duration-300">
                            <div className="w-14 h-14 bg-[#0569ff]/10 rounded-xl flex items-center justify-center mb-4">
                                <Users size={28} className="text-[#0569ff]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">Parent App</h3>
                            <p className="text-[#666] text-sm leading-relaxed">
                                Easily track your child's progress, fees, attendance, and other activities effortlessly.
                            </p>
                        </div>

                        {/* Teacher App Card */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-[#0569ff]/20 hover:shadow-lg transition-all duration-300">
                            <div className="w-14 h-14 bg-[#0569ff]/10 rounded-xl flex items-center justify-center mb-4">
                                <GraduationCap size={28} className="text-[#0569ff]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">Teacher App</h3>
                            <p className="text-[#666] text-sm leading-relaxed">
                                The Teacher App helps teachers manage classrooms and connect with parents easily.
                            </p>
                        </div>

                        {/* Driver App Card */}
                        <div className="bg-white p-6 rounded-2xl border border-gray-100 hover:border-[#0569ff]/20 hover:shadow-lg transition-all duration-300">
                            <div className="w-14 h-14 bg-[#0569ff]/10 rounded-xl flex items-center justify-center mb-4">
                                <Bus size={28} className="text-[#0569ff]" />
                            </div>
                            <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">Driver App</h3>
                            <p className="text-[#666] text-sm leading-relaxed">
                                Easily find your child routes & communicate with drivers in real time.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Communicating Seamlessly Section with Orbiting Circles
function CommunicatingSeamlesslySection() {
    return (
        <section className="bg-[#f5f7fa] py-16 md:py-20 lg:py-28 px-4 md:px-5 overflow-hidden">
            <div className="max-w-[1400px] 2xl:max-w-[1600px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-8 md:mb-12 lg:mb-16">
                    {/* <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#0569ff] leading-tight mb-2 md:mb-3">
                        Communicating Seamlessly
                    </h2>
                   */}
                    <span className="inline-block bg-[#0569ff]/10 text-[#0569ff] px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
                        📱 Our Mobile Apps
                    </span>
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] leading-tight mb-4">
                        Modern Apps for
                        <span className="text-[#0569ff]"> Modern Schools</span>
                    </h2>
                    <p className="text-base sm:text-lg md:text-xl text-[#666] max-w-2xl mx-auto leading-relaxed">
                        Beautifully designed, intuitive mobile apps that bring schools, parents, teachers, and students together on one powerful platform.
                    </p>
                </div>

                {/* Orbiting Circles Container - Responsive scaling */}
                <div className="relative flex h-[450px] sm:h-[550px] md:h-[650px] lg:h-[750px] 2xl:h-[850px] w-full items-center justify-center">

                    {/* Floating Decorative Icons - Left Side */}
                    <div className="absolute top-[8%] left-[5%] opacity-10 pointer-events-none animate-[float_6s_ease-in-out_infinite]">
                        <Globe className="w-8 h-8 md:w-12 md:h-12 text-[#0569ff] rotate-[-15deg]" />
                    </div>
                    <div className="absolute top-[25%] left-[3%] opacity-10 pointer-events-none animate-[float_8s_ease-in-out_infinite_1s]">
                        <Smartphone className="w-6 h-6 md:w-10 md:h-10 text-[#0569ff] rotate-[15deg]" />
                    </div>
                    <div className="absolute top-[50%] left-[2%] opacity-10 pointer-events-none animate-[float_7s_ease-in-out_infinite_2s]">
                        <MapPin className="w-7 h-7 md:w-11 md:h-11 text-[#F97316] rotate-[-10deg]" />
                    </div>
                    <div className="absolute top-[75%] left-[4%] opacity-10 pointer-events-none animate-[float_9s_ease-in-out_infinite_0.5s]">
                        <MessageCircle className="w-6 h-6 md:w-10 md:h-10 text-[#10B981] rotate-[20deg]" />
                    </div>

                    {/* Floating Decorative Icons - Right Side */}
                    <div className="absolute top-[10%] right-[5%] opacity-10 pointer-events-none animate-[float_7s_ease-in-out_infinite_1.5s]">
                        <Wifi className="w-7 h-7 md:w-11 md:h-11 text-[#10B981] rotate-[10deg]" />
                    </div>
                    <div className="absolute top-[30%] right-[3%] opacity-10 pointer-events-none animate-[float_6s_ease-in-out_infinite_2.5s]">
                        <Laptop className="w-8 h-8 md:w-12 md:h-12 text-[#0569ff] rotate-[-12deg]" />
                    </div>
                    <div className="absolute top-[55%] right-[2%] opacity-10 pointer-events-none animate-[float_8s_ease-in-out_infinite_3s]">
                        <Plane className="w-6 h-6 md:w-10 md:h-10 text-[#F97316] rotate-[25deg]" />
                    </div>
                    <div className="absolute top-[80%] right-[4%] opacity-10 pointer-events-none animate-[float_7s_ease-in-out_infinite_1s]">
                        <Bus className="w-7 h-7 md:w-11 md:h-11 text-[#0569ff] rotate-[-8deg]" />
                    </div>

                    {/* Scaling wrapper for smaller screens */}
                    <div className="absolute inset-0 flex items-center justify-center transform scale-[0.55] sm:scale-[0.65] md:scale-[0.8] lg:scale-100 2xl:scale-110">

                        {/* Center Phone Mockup */}
                        <div className="z-20 flex flex-col items-center justify-center absolute">
                            {(() => {
                                const showNotch = false; // Toggle to show/hide the Dynamic Island notch
                                return (
                                    <div
                                        className="w-[180px] lg:w-[200px] 2xl:w-[220px] h-[400px] lg:h-[445px] 2xl:h-[490px] rounded-[2rem] overflow-hidden relative"
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
                        <OrbitingCircles radius={300} duration={60} reverse iconSize={85}>
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
        <div className="flex items-center justify-center px-4 py-2 bg-white rounded-full shadow-md border border-gray-100">
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
            title: 'Student Information System',
            desc: 'Centrally manage all student data including admissions, profiles, academic records, and document management in one secure place.'
        },
        {
            title: 'Fee Management & Billing',
            desc: 'Streamline fee collection with automated invoicing, online payments, receipt generation, and comprehensive financial reporting.'
        },
        {
            title: 'Attendance & Tracking',
            desc: 'Monitor student and staff attendance in real-time with biometric integration, GPS tracking, and instant parent notifications.'
        },
        {
            title: 'Academic Management',
            desc: 'Handle timetables, examinations, grade books, report cards, and curriculum planning with intelligent scheduling tools.'
        },
    ];

    return (
        <section className="py-20 md:py-28 px-5 bg-[#f8fafc]">
            <div className="max-w-[1200px] mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] leading-tight">
                        Powerful features for modern schools
                    </h2>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                    {features.map((feature, index) => (
                        <div key={index} className="space-y-3">
                            <h3 className="text-lg font-semibold text-[#1a1a2e]">
                                {feature.title}
                            </h3>
                            <p className="text-[#666] text-sm leading-relaxed">
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>

                {/* View All Button */}
                <div className="text-center">
                    <Link
                        href="/features"
                        className="inline-flex items-center gap-2 text-[#0569ff] font-semibold hover:underline transition-all"
                    >
                        View All Features
                        <ArrowRight size={18} />
                    </Link>
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
                        <span className="inline-block bg-[#0569ff]/10 text-[#0569ff] px-4 py-2 rounded-full text-sm font-semibold mb-6">
                            🌐 school.edubreezy.com
                        </span>
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1a1a2e] leading-tight mb-6">
                            School Explorer — <br />
                            <span className="text-[#0569ff]">Your School, Discovered</span>
                        </h2>
                        <p className="text-[#555] text-lg leading-relaxed mb-8">
                            Create a stunning public profile for your school at{" "}
                            <strong className="text-[#1a1a2e]">school.edubreezy.com</strong>.
                            Parents across India can find you, explore your facilities,
                            read reviews, and send admission inquiries — all in one place.
                        </p>

                        {/* Key Benefits */}
                        <div className="space-y-4 mb-8">
                            {[
                                "Free public school profile with custom URL",
                                "Receive admission inquiries directly in dashboard",
                                "Showcase achievements, galleries & fee structure",
                                "Get verified parent reviews & ratings"
                            ].map((benefit, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="w-5 h-5 rounded-full bg-[#0569ff]/10 flex items-center justify-center shrink-0">
                                        <Check size={12} className="text-[#0569ff]" />
                                    </div>
                                    <span className="text-[#444] text-base">{benefit}</span>
                                </div>
                            ))}
                        </div>

                        <a
                            href="https://school.edubreezy.com/explore"
                            target="_blank"
                            className="inline-flex items-center gap-2 md:gap-3 bg-[#0569ff] text-white px-5 py-3 md:px-8 md:py-4 rounded-full font-bold text-sm md:text-base hover:bg-[#0569ff]/90 transition-all duration-300 shadow-lg hover:shadow-xl"
                        >
                            Visit School Explorer
                            <ArrowRight size={16} className="md:w-[18px] md:h-[18px]" />
                        </a>
                        <a
                            href="#"
                            className="inline-flex items-center gap-2 text-[#0569ff] font-semibold text-sm md:text-base hover:underline transition-all ml-4 md:ml-6"
                        >
                            Learn More
                            <ArrowRight size={14} className="md:w-4 md:h-4" />
                        </a>
                    </div>

                    {/* Right - Feature Cards Stack */}
                    <div className="space-y-5">
                        {[
                            {
                                icon: "🏫",
                                title: "Public School Profiles",
                                desc: "Beautiful, SEO-optimized profiles that help parents find and choose your school."
                            },
                            {
                                icon: "📩",
                                title: "Admission Inquiries",
                                desc: "Receive inquiries directly. Track leads, schedule visits, convert to admissions."
                            },
                            {
                                icon: "⭐",
                                title: "Parent Reviews & Ratings",
                                desc: "Build trust with verified reviews. Let your reputation attract more families."
                            },
                            {
                                icon: "📊",
                                title: "Analytics Dashboard",
                                desc: "Track profile views, inquiry trends, and engagement metrics in real-time."
                            }
                        ].map((feature, index) => (
                            <div
                                key={index}
                                className="flex gap-5 p-5 rounded-xl bg-[#f8fafc] border border-[#e5e7eb] hover:border-[#0569ff]/30 hover:shadow-md transition-all duration-300"
                            >
                                <div className="text-3xl shrink-0">{feature.icon}</div>
                                <div>
                                    <h3 className="font-bold text-[#1a1a2e] text-lg mb-1">{feature.title}</h3>
                                    <p className="text-[#666] text-sm leading-relaxed">{feature.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Bottom Stats Bar */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8 px-8 bg-[#f8fafc] rounded-2xl">
                    {[
                        { number: "600+", label: "Schools Listed" },
                        { number: "50,000+", label: "Profile Views" },
                        { number: "10,000+", label: "Inquiries Received" },
                        { number: "Free", label: "To Get Started" }
                    ].map((stat, index) => (
                        <div key={index} className="text-center">
                            <div className="text-2xl md:text-3xl font-bold text-[#0569ff] mb-1">
                                {stat.number}
                            </div>
                            <div className="text-[#666] text-sm">
                                {stat.label}
                            </div>
                        </div>
                    ))}
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

// Testimonials Section - Smooth Marquee Scroll with Working Dots
function TestimonialsSection() {
    const [activeIndex, setActiveIndex] = React.useState(0);
    const containerRef = React.useRef(null);

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

    // Duplicate for seamless infinite loop
    const allTestimonials = [...testimonials, ...testimonials];

    // Smooth scroll to specific testimonial when dot is clicked
    const scrollToIndex = (index) => {
        if (containerRef.current) {
            const cardWidth = 370; // 350px card + 20px gap
            containerRef.current.scrollTo({
                left: index * cardWidth,
                behavior: 'smooth'
            });
        }
        setActiveIndex(index);
        setIsPaused(true);
        setTimeout(() => setIsPaused(false), 8000);
    };

    // Update active index based on scroll position
    const handleScroll = () => {
        if (containerRef.current) {
            const scrollLeft = containerRef.current.scrollLeft;
            const cardWidth = 370;
            const newIndex = Math.round(scrollLeft / cardWidth) % testimonials.length;
            if (newIndex !== activeIndex) {
                setActiveIndex(newIndex);
            }
        }
    };

    return (
        <section className="py-20 bg-[#f8fafc] overflow-hidden">
            <div className="max-w-[1200px] mx-auto px-5">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-3">
                        Read what <span className="text-[#0569ff]">our users</span> have to say about us
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

                {/* Scrolling Testimonials - Continuous Marquee */}
                <div
                    ref={containerRef}
                    className="testimonials-scroll-container flex gap-5 px-8"
                    onScroll={handleScroll}
                    style={{
                        overflowX: 'auto',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        WebkitOverflowScrolling: 'touch',
                        scrollBehavior: 'smooth'
                    }}
                >
                    <div className="testimonials-marquee-track flex gap-5">
                        {allTestimonials.map((t, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[350px] h-[280px] p-8 rounded-xl bg-white border border-[#e8e8e8] relative overflow-hidden flex flex-col transition-transform duration-300 hover:scale-[1.02]"
                            >
                                {/* Quote Icon */}
                                <div className="absolute top-4 left-4 opacity-100 pointer-events-none">
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

            {/* Pagination Dots */}
            <div className="flex justify-center gap-3 mt-10">
                {testimonials.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => scrollToIndex(i)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 cursor-pointer border-none outline-none ${activeIndex === i
                            ? 'bg-[#0569ff] scale-125'
                            : 'bg-[#d1d5db] hover:bg-[#9ca3af]'
                            }`}
                        aria-label={`Go to testimonial ${i + 1}`}
                        type="button"
                    />
                ))}
            </div>

            {/* CSS for marquee animation and hiding scrollbar */}
            <style>{`
                .testimonials-scroll-container::-webkit-scrollbar {
                    display: none;
                }
                .testimonials-marquee-track {
                    animation: marquee 35s linear infinite;
                }
                .testimonials-marquee-wrapper:hover .testimonials-marquee-track {
                    animation-play-state: paused;
                }
                @keyframes marquee {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-50%);
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
