// Mobile App CTA Section Component
import React from 'react';
import Link from 'next/link';
import { DotPattern } from '@/components/ui/dot-pattern';

export default function WebDashboardCTA() {
    return (
        <section className="relative py-24 md:py-32 px-5 overflow-visible">
            {/* Dot Pattern Background */}
            <DotPattern
                className="absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_center,white,transparent_80%)]"
                width={20}
                height={20}
                cx={1}
                cy={1}
                cr={1}
            />

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-0 items-center">

                    {/* Phone Mockup - Left side on desktop, visible on mobile */}
                    <div className="relative flex justify-center items-center py-12 lg:py-20 order-1">
                        <style dangerouslySetInnerHTML={{
                            __html: `
                            .grid-bg {
                                background-image: radial-gradient(circle at 2px 2px, rgba(255,255,255,0.1) 1px, transparent 0);
                                background-size: 40px 40px;
                            }
                        ` }} />

                        {/* Glow Effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-3xl rounded-3xl" />

                        {/* Phone Mockups Container */}
                        <div className="z-20 flex items-center justify-center scale-100 sm:scale-110 lg:scale-[1.3] 2xl:scale-[1.4] relative">

                            {/* Back Phone - Always visible */}
                            <div
                                className="absolute w-[180px] sm:w-[200px] lg:w-[200px] 2xl:w-[220px] h-[400px] sm:h-[445px] lg:h-[445px] 2xl:h-[490px] rounded-[2rem] overflow-hidden -translate-x-12 -rotate-[8deg] -z-10"
                                style={{
                                    boxShadow: '0 0 0 3px #1a1a2e, 0 25px 50px -12px rgba(0, 0, 0, 0.15)'
                                }}
                            >
                                <img
                                    src="/img.png"
                                    alt="EduBreezy App - Screen 2"
                                    className="w-full h-full object-contain bg-white"
                                />
                            </div>

                            {/* Front Phone - Always visible */}
                            <div
                                className="w-[180px] sm:w-[200px] lg:w-[200px] 2xl:w-[220px] h-[400px] sm:h-[445px] lg:h-[445px] 2xl:h-[490px] rounded-[2rem] overflow-hidden relative z-10 translate-x-12 rotate-[8deg]"
                                style={{
                                    boxShadow: '0 0 0 3px #1a1a2e, 0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                                }}
                            >
                                <img
                                    src="img1.png"
                                    alt="EduBreezy App"
                                    className="w-full h-full object-contain bg-white"
                                />
                            </div>
                        </div>

                        {/* Background ambient lighting */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100%] h-[100%] bg-blue-400/5 rounded-full blur-[80px] -z-0"></div>
                    </div>

                    {/* Text Content - Right column, left-aligned text */}
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl md:text-4xl lg:text-5xl 2xl:text-6xl font-bold text-slate-900 leading-[1.1] mb-6 lg:mb-8 tracking-tight">
                            Modern App For
                            <br className="hidden md:block" />
                            <span className="relative inline-block mt-2">
                                <span className="relative z-10 text-blue-600">Modern Schools</span>
                            </span>
                        </h2>

                        <p className="text-base md:text-lg text-gray-600 mb-6 lg:mb-8 leading-relaxed max-w-xl mx-auto lg:mx-0">
                            Experience seamless school management on mobile. Access student data, track attendance, manage fees, and communicate with parents—all from your smartphone.
                        </p>
                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                            <Link href="/contact">
                                <button className="group flex items-center pr-1 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-sm md:text-base font-semibold cursor-pointer shadow-[0_4px_14px_rgba(5,105,255,0.3)] hover:shadow-[0_6px_20px_rgba(5,105,255,0.4)] transition-all duration-300">
                                    <span className='px-1 pl-6 py-3.5'>Download Now</span>
                                    <span className='bg-white p-3 shadow-lg rounded-full group-hover:bg-gray-50 transition-colors'>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0569ff" strokeWidth="3">
                                            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </button>
                            </Link>
                            <Link href="/features">
                                <button className="px-6 py-3.5 bg-white border-2 border-[#0569ff] text-[#0569ff] rounded-full text-sm md:text-base font-semibold hover:bg-[#0569ff] hover:text-white transition-all duration-300 shadow-sm">
                                    View Features
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
