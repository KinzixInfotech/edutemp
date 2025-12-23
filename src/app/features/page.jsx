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

export default function FeaturesIntroPage() {
    const stats = [
        { number: '155+', label: 'Database Models', icon: FileText },
        { number: '20+', label: 'Feature Modules', icon: Zap },
        { number: '7', label: 'Categories', icon: Layout },
        { number: '100%', label: 'Cloud-Based', icon: Cloud },
    ];

    const categories = [
        {
            id: 'core',
            name: 'Core Modules',
            icon: Home,
            color: 'from-blue-500 to-blue-600',
            features: ['Student Management', 'Staff Management', 'Fee Management', 'Attendance System'],
            count: 4
        },
        {
            id: 'academic',
            name: 'Academic',
            icon: GraduationCap,
            color: 'from-purple-500 to-purple-600',
            features: ['Examination & Results', 'Timetable', 'Homework', 'Library'],
            count: 4
        },
        {
            id: 'operations',
            name: 'Operations',
            icon: Bus,
            color: 'from-orange-500 to-orange-600',
            features: ['Transport', 'Payroll', 'Inventory', 'Calendar'],
            count: 4
        },
        {
            id: 'communication',
            name: 'Communication',
            icon: Bell,
            color: 'from-green-500 to-green-600',
            features: ['Notice Board', 'Parent Portal'],
            count: 2
        },
        {
            id: 'growth',
            name: 'Growth & Discovery',
            icon: Globe,
            color: 'from-cyan-500 to-cyan-600',
            features: ['Admissions & Forms', 'School Explorer', 'Partner Program'],
            count: 3
        },
        {
            id: 'documents',
            name: 'Documents',
            icon: FileText,
            color: 'from-red-500 to-red-600',
            features: ['Certificates & ID Cards', 'Document Generation'],
            count: 2
        },
        {
            id: 'advanced',
            name: 'Advanced',
            icon: Sparkles,
            color: 'from-pink-500 to-pink-600',
            features: ['Alumni Management', 'EduAI'],
            count: 2
        },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Hero Section with Animated Mesh Glows */}
            <section className="relative pt-32 pb-24 px-5 overflow-hidden bg-white">
                <style jsx>{`
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-20px); }
                    }
                    @keyframes floatSlow {
                        0%, 100% { transform: translateY(0px) translateX(0px); }
                        50% { transform: translateY(-30px) translateX(10px); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 0.3; }
                        50% { opacity: 0.5; }
                    }
                    @keyframes rotate {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    .mesh-1 {
                        animation: float 8s ease-in-out infinite, pulse 4s ease-in-out infinite;
                    }
                    .mesh-2 {
                        animation: floatSlow 10s ease-in-out infinite, pulse 5s ease-in-out infinite;
                    }
                    .mesh-3 {
                        animation: float 12s ease-in-out infinite reverse, pulse 6s ease-in-out infinite;
                    }
                    .mesh-4 {
                        animation: floatSlow 9s ease-in-out infinite, pulse 4.5s ease-in-out infinite;
                    }
                    .floating-icon {
                        animation: float 6s ease-in-out infinite;
                    }
                    .floating-icon:nth-child(2) {
                        animation-delay: 1s;
                    }
                    .floating-icon:nth-child(3) {
                        animation-delay: 2s;
                    }
                    .floating-icon:nth-child(4) {
                        animation-delay: 3s;
                    }
                `}</style>

                {/* Animated Mesh Glows - Top */}
                <div className="mesh-1 absolute -top-[80px] -left-[100px] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(5,105,255,0.35)_0%,transparent_70%)] blur-[60px] rounded-full pointer-events-none" />
                <div className="mesh-2 absolute -top-[60px] -right-[120px] w-[450px] h-[450px] bg-[radial-gradient(circle,rgba(255,122,0,0.3)_0%,transparent_70%)] blur-[70px] rounded-full pointer-events-none" />
                <div className="mesh-3 absolute top-[200px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(5,105,255,0.15)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />

                {/* Animated Mesh Glows - Bottom */}
                <div className="mesh-4 absolute -bottom-[100px] left-[20%] w-[380px] h-[380px] bg-[radial-gradient(circle,rgba(5,105,255,0.25)_0%,transparent_70%)] blur-[65px] rounded-full pointer-events-none" />
                <div className="mesh-1 absolute -bottom-[80px] right-[15%] w-[420px] h-[420px] bg-[radial-gradient(circle,rgba(255,122,0,0.2)_0%,transparent_70%)] blur-[75px] rounded-full pointer-events-none" />

                {/* Floating Icons - Better Spacing */}
                <div className="floating-icon hidden md:flex absolute top-[22%] left-[15%] w-12 h-12 bg-gradient-to-br from-orange-500/10 to-orange-500/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-orange-500/20 pointer-events-none">
                    <Bus size={24} className="text-orange-500/60" />
                </div>
                <div className="floating-icon hidden md:flex  absolute top-[28%] left-[23%] w-10 h-10 bg-gradient-to-br from-pink-500/10 to-pink-500/5 backdrop-blur-sm rounded-xl flex items-center justify-center border border-pink-500/20 pointer-events-none">
                    <Award size={20} className="text-pink-500/60" />
                </div>
                <div className="floating-icon hidden md:flex  absolute top-[25%] right-[20%] w-14 h-14 bg-gradient-to-br from-purple-500/10 to-purple-500/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-purple-500/20 pointer-events-none">
                    <GraduationCap size={28} className="text-purple-500/60" />
                </div>
                <div className="floating-icon hidden md:flex  absolute top-[32%] right-[8%] w-12 h-12 bg-gradient-to-br from-pink-500/10 to-pink-500/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-pink-500/20 pointer-events-none">
                    <Sparkles size={24} className="text-pink-500/60" />
                </div>
                <div className="floating-icon hidden md:flex  absolute bottom-[28%] right-[18%] w-12 h-12 bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-green-500/20 pointer-events-none">
                    <Bell size={24} className="text-green-500/60" />
                </div>
                <div className="floating-icon hidden md:flex  absolute bottom-[18%] right-[25%] w-10 h-10 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 backdrop-blur-sm rounded-xl flex items-center justify-center border border-yellow-500/20 pointer-events-none">
                    <Wallet size={20} className="text-yellow-500/60" />
                </div>
                <div className="floating-icon absolute bottom-[25%] left-[20%] w-12 h-12 bg-gradient-to-br from-[#0569ff]/10 to-[#0569ff]/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-[#0569ff]/20 pointer-events-none">
                    <Users size={24} className="text-[#0569ff]/60" />
                </div>
                <div className="floating-icon hidden md:flex  absolute bottom-[15%] left-[12%] w-12 h-12 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-cyan-500/20 pointer-events-none">
                    <Globe size={24} className="text-cyan-500/60" />
                </div>

                <div className="max-w-6xl mx-auto relative z-10">
                    <div className="text-center">
                        <span className="inline-flex px-4 py-2 bg-gradient-to-r from-[#0569ff]/10 to-[#ff7a00]/10 border border-[#0569ff]/20 rounded-full text-sm font-medium mb-6 text-[#0569ff]">
                            Complete Feature Documentation
                        </span>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] text-[#1a1a2e]">
                            Everything Your School Needs,
                            <br />
                            <span className="bg-gradient-to-r from-[#0569ff] via-[#0450d4] to-[#ff7a00] bg-clip-text text-transparent">
                                In One Platform
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
                            Discover our comprehensive suite of 20+ modules designed to streamline every aspect of school management—from admissions to alumni.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 justify-center mb-16">
                            <Link href="/features/docs">
                                <button className="group flex items-center pr-1 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-[0.95rem] font-semibold cursor-pointer shadow-[0_4px_14px_rgba(5,105,255,0.3)] hover:shadow-[0_6px_20px_rgba(5,105,255,0.4)] transition-all duration-300">
                                    <span className='px-1 pl-6 py-3 md:py-3.5'>Browse All Features</span>
                                    <span className='bg-white p-2.5 md:p-3 shadow-lg rounded-full group-hover:bg-gray-50 transition-colors'>
                                        <ArrowRight size={20} strokeWidth={3} color='#0569ff' className='transition-transform duration-300 group-hover:-rotate-45' />
                                    </span>
                                </button>
                            </Link>
                            <Link href="/contact">
                                <button className="px-6 py-3 md:py-3.5 bg-white border-2 border-[#0569ff] text-[#0569ff] rounded-full text-[0.95rem] font-semibold hover:bg-[#0569ff] hover:text-white transition-all duration-300 shadow-md hover:shadow-lg">
                                    Request Demo
                                </button>
                            </Link>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
                            {stats.map((stat, index) => (
                                <div key={index} className="relative group">
                                    <div className="absolute inset-0 bg-gradient-to-br from-[#0569ff]/5 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
                                    <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-gray-200/50 hover:border-[#0569ff]/30 hover:shadow-[0_8px_30px_rgba(5,105,255,0.15)] transition-all duration-300">
                                        <div className="text-3xl md:text-4xl font-bold bg-gradient-to-br from-[#0569ff] to-[#0450d4] bg-clip-text text-transparent mb-2">
                                            {stat.number}
                                        </div>
                                        <div className="text-gray-600 text-xs md:text-sm font-medium">{stat.label}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Categories Grid */}
            <section className="py-20 px-5 bg-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] mb-4">
                            Feature Categories
                        </h2>
                        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                            Explore our features organized by category. Each module is designed to work seamlessly together.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {categories.map((category) => {
                            const IconComponent = category.icon;
                            return (
                                <Link key={category.id} href={`/features/docs#${category.id}`}>
                                    <div className="group relative bg-white p-8 rounded-2xl border border-gray-100 hover:border-[#0569ff]/20 hover:shadow-[0_10px_40px_rgba(5,105,255,0.15)] transition-all duration-300 cursor-pointer h-full">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[#0569ff]/0 to-[#0569ff]/0 group-hover:from-[#0569ff]/5 group-hover:to-transparent rounded-2xl transition-all duration-300" />
                                        <div className="relative">
                                            <div className={`w-16 h-16 bg-gradient-to-br ${category.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg`}>
                                                <IconComponent size={32} className="text-white" />
                                            </div>
                                            <h3 className="text-xl font-bold text-[#1a1a2e] mb-3 group-hover:text-[#0569ff] transition-colors">
                                                {category.name}
                                            </h3>
                                            <p className="text-sm text-gray-600 mb-4 font-medium">
                                                {category.count} feature{category.count !== 1 ? 's' : ''} available
                                            </p>
                                            <ul className="space-y-2 mb-6">
                                                {category.features.map((feature, idx) => (
                                                    <li key={idx} className="text-sm text-gray-500 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-[#0569ff]/60 rounded-full" />
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="flex items-center gap-2 text-[#0569ff] font-semibold text-sm group-hover:gap-3 transition-all">
                                                Explore
                                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                            </div>
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
            <section className="py-16 px-5 bg-[#1a1a2e] text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Ready to Transform Your School?
                    </h2>
                    <p className="text-white/80 text-lg mb-8">
                        Get started with EduBreezy today and experience the power of integrated school management.
                    </p>
                    <div className="flex flex-wrap gap-4 justify-center">
                        <Link href="/contact">
                            <button className="px-8 py-4 bg-[#0569ff] text-white rounded-full font-bold text-lg hover:bg-[#0450d4] transition-all duration-300 shadow-xl">
                                Book a Demo
                            </button>
                        </Link>
                        <Link href="/features/docs">
                            <button className="px-8 py-4 bg-white/10 backdrop-blur-sm border-2 border-white text-white rounded-full font-bold text-lg hover:bg-white/20 transition-all duration-300">
                                View Documentation
                            </button>
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
