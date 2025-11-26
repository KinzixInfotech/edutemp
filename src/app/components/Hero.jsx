'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { GraduationCap, Sparkles, ChevronRight, Cloud, Shield, Zap } from "lucide-react";
import { Highlighter } from "@/components/ui/highlighter";
import Image from "next/image";

const Hero = () => {
    const [code, setCode] = useState("");

    return (
        <section className="relative mt-11 w-full min-h-screen flex items-center justify-center px-4 sm:px-6 py-8 sm:py-16 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 overflow-hidden">
            {/* Animated Wave Background */}
            <div className="absolute inset-0 overflow-hidden">
                <svg
                    className="absolute bottom-0 w-full h-auto"
                    viewBox="0 0 1440 320"
                    preserveAspectRatio="none"
                    style={{ minHeight: '200px' }}
                >
                    <path
                        fill="url(#gradient1)"
                        fillOpacity="0.3"
                        d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                    >
                        <animate
                            attributeName="d"
                            dur="10s"
                            repeatCount="indefinite"
                            values="
                                M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                                M0,160L48,154.7C96,149,192,139,288,154.7C384,171,480,213,576,213.3C672,213,768,171,864,138.7C960,107,1056,85,1152,90.7C1248,96,1344,128,1392,144L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                                M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,170.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                        />
                    </path>
                    <defs>
                        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#0c65f1', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#0a52c6', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>
                </svg>

                <svg
                    className="absolute bottom-0 w-full h-auto"
                    viewBox="0 0 1440 320"
                    preserveAspectRatio="none"
                    style={{ minHeight: '200px' }}
                >
                    <path
                        fill="url(#gradient2)"
                        fillOpacity="0.2"
                        d="M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,101.3C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                    >
                        <animate
                            attributeName="d"
                            dur="8s"
                            repeatCount="indefinite"
                            values="
                                M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,101.3C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                                M0,128L48,144C96,160,192,192,288,197.3C384,203,480,181,576,154.7C672,128,768,96,864,101.3C960,107,1056,149,1152,154.7C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z;
                                M0,192L48,197.3C96,203,192,213,288,192C384,171,480,117,576,101.3C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                        />
                    </path>
                    <defs>
                        <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{ stopColor: '#1e7ff1', stopOpacity: 1 }} />
                            <stop offset="100%" style={{ stopColor: '#0c65f1', stopOpacity: 1 }} />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Enhanced Clouds */}
            <div
                className="absolute inset-0 opacity-40"
                style={{
                    backgroundImage: "url('/cloud.png')",
                    backgroundSize: "clamp(300px, 50vw, 800px)",
                    backgroundPosition: "center top",
                    backgroundRepeat: "repeat-x",
                    animation: "float 20s ease-in-out infinite",
                }}
            />

            {/* Floating Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-16 h-16 rounded-full blur-xl animate-pulse" style={{ backgroundColor: 'rgba(12, 101, 241, 0.2)' }} />
                <div className="absolute top-40 right-20 w-24 h-24 rounded-full blur-xl animate-pulse delay-1000" style={{ backgroundColor: 'rgba(12, 101, 241, 0.15)' }} />
                <div className="absolute bottom-40 left-1/4 w-20 h-20 rounded-full blur-xl animate-pulse delay-2000" style={{ backgroundColor: 'rgba(12, 101, 241, 0.25)' }} />
            </div>

            {/* Main Content */}
            <div className="relative z-10 container mx-auto flex flex-col items-center justify-center text-center gap-6 sm:gap-8 max-w-5xl">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg animate-fade-in" style={{ borderColor: 'rgba(12, 101, 241, 0.2)', borderWidth: '1px' }}>
                    <Sparkles className="w-4 h-4" style={{ color: '#0c65f1' }} />
                    <span className="text-sm font-semibold" style={{ color: '#0c65f1' }}>Welcome to Edubreezy</span>
                </div>

                {/* Icon */}
                <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse" style={{ backgroundColor: '#0c65f1' }} />
                    <div className="relative p-4 bg-muted border bg-white! rounded-2xl" >
                        <Image src='/edu.png' width={200} height={200} alt="EduBreezy" priority />
                        {/* <GraduationCap className="w-12 h-12 sm:w-16 sm:h-16 text-white" /> */}
                    </div>
                </div>

                {/* Heading */}
                <div className="space-y-3 sm:space-y-4">
                    <h1 className="text-3xl sm:text-4xl  md:text-5xl lg:text-6xl font-bold leading-tight animate-fade-in-up" style={{
                        background: 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        All-in-One <span className=" !italic border-b-2 ">Cloud Platform</span>

                        <br className="hidden sm:block" />
                        for Modern Schools
                    </h1>

                    <p className="text-gray-700 text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto px-4 animate-fade-in-up animation-delay-200">
                        Manage admissions, attendance, exams, communication, and more — all in one
                        smart, seamless platform designed for modern education.
                    </p>
                </div>

                {/* Input Section */}
                <div className="w-full max-w-md sm:max-w-lg mx-auto mt-4 sm:mt-8 animate-fade-in-up animation-delay-400">
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 text-left">
                            Enter Your School Code
                        </label>

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            {/* Input Group */}
                            <div className="flex flex-1 items-center gap-2 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 transition-all"
                                style={{
                                    '--tw-ring-color': 'rgba(12, 101, 241, 0.2)'
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#0c65f1'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                            >
                                <div className="text-white px-2 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)' }}>
                                    EB -
                                </div>
                                <input
                                    type="text"
                                    placeholder="0000"
                                    value={code}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        setCode(value);
                                    }}
                                    // maxLength={4}
                                    className="flex-1 bg-transparent text-base sm:text-lg font-bold outline-none text-gray-800 placeholder:text-gray-400 min-w-0"
                                />
                            </div>

                            {/* Submit Button */}
                            <Link
                                href={code ? `/login?schoolCode=EB-${code}` : "#"}
                                passHref
                                className="w-full sm:w-auto"
                            >
                                <Button
                                    className="w-full sm:w-auto h-11 sm:h-12 px-6 sm:px-8 text-white font-bold text-sm sm:text-base rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 group"
                                    disabled={!code}
                                    style={{
                                        background: code ? 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)' : '#cbd5e1'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (code) e.currentTarget.style.background = 'linear-gradient(135deg, #0a52c6 0%, #083d9a 100%)';
                                    }}
                                    onMouseLeave={(e) => {
                                        if (code) e.currentTarget.style.background = 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)';
                                    }}
                                >
                                    <span>Get Started</span>
                                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>

                        {/* Helper Text */}
                        <p className="text-xs text-gray-500 mt-3 text-left">
                            Don't have a school code?{" "}
                            <Link href="/" className="font-semibold underline hover:opacity-80" style={{ color: '#0c65f1' }}>
                                Contact us
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Enhanced Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-12 w-full max-w-4xl px-4 animate-fade-in-up animation-delay-600">
                    {[
                        {
                            title: "Cloud-Based",
                            desc: "Access anywhere, anytime",
                            icon: Cloud,
                            gradient: "from-blue-500 to-cyan-500"
                        },
                        {
                            title: "Secure",
                            desc: "Bank-level security",
                            icon: Shield,
                            gradient: "from-indigo-500 to-purple-500"
                        },
                        {
                            title: "Easy to Use",
                            desc: "Intuitive interface",
                            icon: Zap,
                            gradient: "from-violet-500 to-fuchsia-500"
                        },
                    ].map((feature, idx) => (
                        <div
                            key={idx}
                            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-7 shadow-lg border-2 border-transparent hover:shadow-2xl transition-all duration-500 overflow-hidden"
                            style={{
                                transform: 'translateY(0)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = '#0c65f1';
                                e.currentTarget.style.transform = 'translateY(-8px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'transparent';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {/* Animated background gradient */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                                style={{
                                    background: `linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)`
                                }}
                            />

                            {/* Icon container with gradient */}
                            <div className="relative mb-4 inline-flex">
                                <div
                                    className="p-3 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300"
                                    style={{
                                        background: 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)'
                                    }}
                                >
                                    <feature.icon className="w-6 h-6 text-white" />
                                </div>
                                {/* Glow effect */}
                                <div
                                    className="absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300"
                                    style={{ backgroundColor: '#0c65f1' }}
                                />
                            </div>

                            <div className="relative">
                                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2 group-hover:text-[#0c65f1] transition-colors duration-300">
                                    {feature.title}
                                </h3>
                                <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
                                    {feature.desc}
                                </p>
                            </div>

                            {/* Shine effect on hover */}
                            <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 group-hover:left-full transition-all duration-700" />
                        </div>
                    ))}
                </div>
            </div>

            <style jsx>{`
                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-20px);
                    }
                }

                @keyframes fade-in {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }

                @keyframes fade-in-up {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .animate-fade-in {
                    animation: fade-in 0.6s ease-out;
                }

                .animate-fade-in-up {
                    animation: fade-in-up 0.8s ease-out;
                }

                .animation-delay-200 {
                    animation-delay: 0.2s;
                    opacity: 0;
                    animation-fill-mode: forwards;
                }

                .animation-delay-400 {
                    animation-delay: 0.4s;
                    opacity: 0;
                    animation-fill-mode: forwards;
                }

                .animation-delay-600 {
                    animation-delay: 0.6s;
                    opacity: 0;
                    animation-fill-mode: forwards;
                }

                .delay-1000 {
                    animation-delay: 1s;
                }

                .delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </section>
    );
};

export default Hero;