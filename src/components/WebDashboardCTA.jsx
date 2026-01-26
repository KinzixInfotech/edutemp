// Mobile App CTA Section Component
import React from 'react';
import Link from 'next/link';
import { DotPattern } from '@/components/ui/dot-pattern';

export default function WebDashboardCTA() {
    return (
        <section className="py-20 md:py-28">
            <div className="max-w-[1400px] mx-auto px-6">
                <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-16">


                    {/* Content - Left Side */}
                    <div className="flex-1 text-center lg:text-left">
                        {/* Heading */}
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-[#1a1a2e] mb-4 md:mb-6 leading-tight tracking-tight">
                            Modern App For <br /> <span className="text-[#0469ff]">Modern Schools</span>
                        </h2>

                        {/* Description */}
                        <p className="text-base md:text-lg lg:text-xl text-gray-600 mb-6 md:mb-8 leading-relaxed max-w-xl font-medium">
                            Experience seamless school management on mobile. Access student data, track attendance, manage fees, and communicate with parents—all from your smartphone.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
                            <Link href="#">
                                <button className="inline-flex items-center gap-3 px-8 py-4 bg-[#0469ff] text-white font-bold rounded-full hover:bg-[#0358dd] transition-all duration-300 hover:shadow-lg">
                                    Download Now
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </Link>
                            <Link href="/features">
                                <button className="inline-flex items-center gap-3 px-8 py-4 bg-transparent text-[#0469ff] font-bold rounded-full border-2 border-[#0469ff] hover:bg-[#0469ff]/5 transition-all duration-300">
                                    View Features
                                </button>
                            </Link>
                        </div>
                    </div>
                    {/* Phone Image - right Side */}
                    <div className="flex-1 flex justify-center lg:justify-center">
                        <img
                            src="/sm-portrait.png"
                            alt="EduBreezy Bus Tracking"
                            className="w-[300px] md:w-[350px] lg:w-[400px] h-auto"
                        />
                    </div>

                </div>
            </div>
        </section>
    );
}
