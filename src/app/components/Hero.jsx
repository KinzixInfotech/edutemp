'use client';

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
    GraduationCap, Sparkles, ChevronRight, Cloud, Shield, Zap,
    Pencil, BookMarked, Ruler, Calculator, BookOpen, School
} from "lucide-react";
import { DotPattern } from "@/components/ui/dot-pattern";
import Image from "next/image";

const Hero = () => {
    const [code, setCode] = useState("");

    return (
        <section className="relative min-h-screen h-fit pt-[100px] pb-10 bg-[linear-gradient(120deg,#f8fafc_0%,#fff9f0_50%,#f0f7ff_100%)] overflow-x-hidden">
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

            {/* Main Content */}
            <div className="relative z-10 max-w-[1200px] mx-auto px-5 pt-[60px] text-center flex flex-col items-center justify-center gap-6 sm:gap-8">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-[#0569ff]/20 animate-fade-in">
                    <Sparkles className="w-4 h-4 text-[#0569ff]" />
                    <span className="text-sm font-semibold text-[#0569ff]">Welcome to Edubreezy</span>
                </div>

                {/* Icon */}
                <div className="relative">
                    <div className="absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse bg-[#0569ff]" />
                    <div className="relative p-4 bg-white rounded-2xl border border-gray-100 shadow-lg">
                        <Image src='/edu.png' width={200} height={200} alt="EduBreezy" priority />
                    </div>
                </div>

                {/* Heading */}
                <div className="space-y-3 sm:space-y-4">
                    <h1 className="text-[clamp(2.2rem,6vw,3.8rem)] font-bold text-[#1a1a2e] leading-[1.15]">
                        All-in-One <span className="italic border-b-4 border-[#FF9800]">Cloud Platform</span>
                        <br className="hidden sm:block" />
                        for Modern Schools
                    </h1>

                    <p className="text-[1.05rem] text-[#666] max-w-[550px] mx-auto leading-relaxed px-4">
                        Manage admissions, attendance, exams, communication, and more — all in one
                        smart, seamless platform designed for modern education.
                    </p>
                </div>

                {/* Input Section */}
                <div className="w-full max-w-md sm:max-w-lg mx-auto mt-4 sm:mt-8 animate-fade-in-up">
                    <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-3 text-left">
                            Enter Your School Code
                        </label>

                        <div className="flex flex-col gap-2 sm:gap-3">
                            {/* Input Group */}
                            <div className="flex flex-1 items-center gap-2 bg-gray-50 border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-[#0569ff]/20 focus-within:border-[#0569ff] transition-all">
                                <div className="text-white px-2 sm:px-3 py-1 rounded-lg font-bold text-xs sm:text-sm flex-shrink-0 bg-[#0569ff]">
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
                                    className="flex-1 bg-transparent text-base sm:text-lg font-bold outline-none text-gray-800 placeholder:text-gray-400 min-w-0"
                                />
                            </div>

                            {/* Submit Button */}
                            <Link
                                href={code ? `/login?schoolCode=EB-${code}` : "#"}
                                passHref
                                className="w-full"
                            >
                                <Button
                                    className={`w-full h-11 sm:h-12 px-6 sm:px-8 text-white font-bold text-sm sm:text-base rounded-xl border disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] active:scale-95 group ${code ? 'bg-[#0569ff] hover:bg-[#0450d4] shadow-[0_4px_14px_rgba(5,105,255,0.3)]' : 'bg-gray-300'}`}
                                    disabled={!code}
                                >
                                    <span>Continue</span>
                                    <ChevronRight size={20} className="ml-1 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                        </div>

                        {/* Helper Text */}
                        <p className="text-xs text-gray-500 mt-3 text-left">
                            Don't have a school code?{" "}
                            <Link href="/contact" className="font-semibold underline hover:opacity-80 text-[#0569ff]">
                                Contact us
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Enhanced Features */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mt-6 sm:mt-12 w-full max-w-4xl px-4 animate-fade-in-up">
                    {[
                        {
                            title: "Cloud-Based",
                            desc: "Access anywhere, anytime",
                            icon: Cloud,
                            color: "#0569ff"
                        },
                        {
                            title: "Secure",
                            desc: "Bank-level security",
                            icon: Shield,
                            color: "#10B981"
                        },
                        {
                            title: "Easy to Use",
                            desc: "Intuitive interface",
                            icon: Zap,
                            color: "#F59E0B"
                        },
                    ].map((feature, idx) => (
                        <div
                            key={idx}
                            className="group relative bg-white/80 backdrop-blur-sm rounded-2xl p-5 sm:p-7 shadow-lg border-2 border-transparent hover:border-[#0569ff]/30 hover:shadow-xl transition-all duration-300 overflow-hidden hover:-translate-y-2"
                        >
                            {/* Animated background gradient */}
                            <div
                                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                                style={{ backgroundColor: feature.color }}
                            />

                            {/* Icon container */}
                            <div className="relative mb-4 inline-flex">
                                <div
                                    className="p-3 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300"
                                    style={{ backgroundColor: `${feature.color}15` }}
                                >
                                    <feature.icon className="w-6 h-6" style={{ color: feature.color }} />
                                </div>
                                {/* Glow effect */}
                                <div
                                    className="absolute inset-0 rounded-xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity duration-300"
                                    style={{ backgroundColor: feature.color }}
                                />
                            </div>

                            <div className="relative">
                                <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-2 group-hover:text-[#0569ff] transition-colors duration-300">
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
                    animation-fill-mode: forwards;
                }
            `}</style>
        </section>
    );
};

export default Hero;