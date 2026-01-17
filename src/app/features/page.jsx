'use client'
import React from 'react';
import Link from 'next/link';
import {
    Users, GraduationCap, CreditCard, Clock, FileText, Bus,
    BookOpen, Wallet, ClipboardList, Globe, Calendar, Home,
    Bell, Handshake, Award, UserCheck, Sparkles, ArrowRight,
    Search, Zap, Shield, Cloud, Layout
} from 'lucide-react';
import Header from '../components/Header';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import SectionHeading from '@/components/SectionHeading';

export default function FeaturesIntroPage() {
    const categories = [
        {
            id: 'core',
            name: 'Core Modules',
            icon: Home,
            color: '#0569ff',
            features: ['Student Management', 'Staff Management', 'Fee Management', 'Attendance System'],
            count: 4
        },
        {
            id: 'academic',
            name: 'Academic',
            icon: GraduationCap,
            color: '#8B5CF6',
            features: ['Examination & Results', 'Timetable', 'Homework', 'Library'],
            count: 4
        },
        {
            id: 'operations',
            name: 'Operations',
            icon: Bus,
            color: '#F97316',
            features: ['Transport', 'Payroll', 'Inventory', 'Calendar'],
            count: 4
        },
        {
            id: 'communication',
            name: 'Communication',
            icon: Bell,
            color: '#10B981',
            features: ['Notice Board', 'Parent Portal'],
            count: 2
        },
        {
            id: 'growth',
            name: 'Growth & Discovery',
            icon: Globe,
            color: '#06B6D4',
            features: ['Admissions & Forms', 'School Explorer', 'Partner Program'],
            count: 3
        },
        {
            id: 'documents',
            name: 'Documents',
            icon: FileText,
            color: '#EF4444',
            features: ['Certificates & ID Cards', 'Document Generation'],
            count: 2
        },
        {
            id: 'advanced',
            name: 'Advanced',
            icon: Sparkles,
            color: '#EC4899',
            features: ['Alumni Management', 'EduAI'],
            count: 2
        },
    ];

    return (
        <div className="min-h-screen bg-white">
            <Header />

            {/* Hero Section - Matching Homepage Style */}
            <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-white pt-24">
                {/* Interactive Grid Pattern Background */}
                <InteractiveGridPattern
                    className="absolute opacity-80 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_40%,transparent_70%)]"
                    squares={[60, 60]}
                />

                {/* Large Background Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                    <span className="text-[clamp(8rem,25vw,20rem)] font-black text-gray-100/30 leading-none tracking-tighter">
                        FEATURES
                    </span>
                </div>

                {/* Gradient Orb */}
                <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[#0469ff]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-[#F97316]/5 rounded-full blur-3xl" />

                <div className="relative max-w-[1400px] mx-auto px-6 py-20 z-10 w-full">
                    <div className="text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#0469ff]/20 bg-[#0469ff]/5">
                            <div className="w-2 h-2 rounded-full bg-[#0469ff] animate-pulse" />
                            <span className="text-sm font-semibold text-[#0469ff]">Complete Feature Suite</span>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight">
                            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                                Everything Your School
                            </span>
                            <br />
                            <span className="relative inline-block mt-2">
                                <span className="text-[#0469ff]">
                                    Needs, In One Platform
                                </span>
                                <svg className="absolute -bottom-4 left-0 w-full" height="12" viewBox="0 0 300 12" fill="none">
                                    <path d="M2 8C70 3 150 1 298 8" stroke="#0469ff" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl md:text-2xl text-gray-600 max-w-[800px] mx-auto leading-relaxed font-medium">
                            Discover our comprehensive suite of modules designed to streamline every aspect of school management—from admissions to alumni.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex items-center justify-center gap-5 flex-wrap pt-6">
                            <Link href="/features/docs">
                                <button className="group relative px-10 py-4 rounded-full font-bold text-lg text-white bg-[#0469ff] hover:shadow-2xl transition-all duration-300 overflow-hidden">
                                    <span className="absolute inset-0 bg-[#0358dd] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span className="relative flex items-center gap-3">
                                        Browse All Features
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                                            <ArrowRight className="w-5 h-5 text-[#0469ff] transition-transform duration-300 group-hover:translate-x-0.5" />
                                        </div>
                                    </span>
                                </button>
                            </Link>
                            <Link href="/contact">
                                <button className="group px-10 hover:shadow-lg py-4 rounded-full font-bold text-lg text-[#0469ff] bg-[#f8f9fb] border transition-all duration-300 flex items-center gap-3">
                                    Request Demo
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Grid */}
            <section className="py-20 md:py-28 px-5 bg-[#f5f7fa]">
                <div className="max-w-[1200px] mx-auto">
                    <SectionHeading
                        badge="FEATURE CATEGORIES"
                        title="Explore Our"
                        highlightedText="Modules"
                        description="Each module is designed to work seamlessly together for complete school management."
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((category, index) => {
                            const IconComponent = category.icon;
                            return (
                                <Link key={category.id} href={`/features/docs#${category.id}`}>
                                    <div className="group bg-white p-8 rounded-[2rem] border border-slate-100 transition-all duration-300 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-1 cursor-pointer h-full">
                                        {/* Icon + Count */}
                                        <div className="flex items-center gap-4 mb-5">
                                            <div
                                                className="w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                                                style={{ backgroundColor: `${category.color}15` }}
                                            >
                                                <IconComponent size={28} style={{ color: category.color }} strokeWidth={1.5} />
                                            </div>
                                            <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                                {category.count} feature{category.count !== 1 ? 's' : ''}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-bold text-[#1a1a2e] mb-3 group-hover:text-[#0569ff] transition-colors">
                                            {category.name}
                                        </h3>

                                        <ul className="space-y-2 mb-6">
                                            {category.features.map((feature, idx) => (
                                                <li key={idx} className="text-sm text-slate-500 flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-[#0569ff] rounded-full shrink-0" />
                                                    {feature}
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="flex items-center gap-2 text-[#0569ff] font-semibold text-sm group-hover:gap-3 transition-all">
                                            Explore Module
                                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Search CTA Section */}
            <section className="py-20 px-5 bg-gradient-to-br from-gray-50 to-white">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="w-20 h-20 bg-[#0569ff]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Search size={40} className="text-[#0569ff]" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
                        Looking for Something Specific?
                    </h2>
                    <p className="text-gray-600 text-lg mb-8">
                        Use our powerful search to find exactly what you need from our feature documentation.
                    </p>
                    <Link href="/features/docs">
                        <button className="px-8 py-4 bg-[#0569ff] text-white rounded-full font-bold text-lg hover:bg-[#0450d4] transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto">
                            <Search size={20} />
                            Search Features
                        </button>
                    </Link>
                </div>
            </section>

            {/* Final CTA */}
            <section className="relative py-16 px-5 bg-[#1a1a2e] text-white overflow-hidden">
                <InteractiveGridPattern
                    width={80}
                    height={80}
                    className="absolute inset-0 w-full h-full z-0 opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,white_0%,transparent_70%)]"
                />

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Ready to Transform Your School?
                    </h2>
                    <p className="text-white/80 text-lg mb-8">
                        Get started with EduBreezy today and experience the power of integrated school management.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link href="/contact">
                            <button className="min-w-[200px] px-8 py-4 bg-[#0569ff] text-white rounded-full font-bold text-lg hover:bg-[#0450d4] transition-all duration-300 shadow-xl">
                                Book a Demo
                            </button>
                        </Link>
                        <Link href="/features/docs">
                            <button className="min-w-[200px] px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all duration-300">
                                View Documentation
                            </button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
