// Web Dashboard CTA Section Component
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function WebDashboardCTA() {
    return (
        <section className="relative py-16 md:py-24 px-5 bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-visible">
            <div className="max-w-7xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Left Content */}
                    <div className="lg:pr-8">
                        <h2 className="text-4xl md:text-5xl font-bold text-[#1a1a2e] mb-6 leading-tight">
                            Powerful Web Dashboard
                            <br />
                            For Complete Control
                        </h2>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                            Access comprehensive analytics, manage students & staff, track attendance, and oversee every aspect of your school from one beautiful dashboard.
                        </p>
                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4">
                            <Link href="/contact">
                                <button className="group flex items-center pr-1 gap-2 bg-[#0569ff] text-white border-0 rounded-full text-base font-semibold cursor-pointer shadow-[0_4px_14px_rgba(5,105,255,0.3)] hover:shadow-[0_6px_20px_rgba(5,105,255,0.4)] transition-all duration-300">
                                    <span className='px-1 pl-6 py-3.5'>Get it now</span>
                                    <span className='bg-white p-3 shadow-lg rounded-full group-hover:bg-gray-50 transition-colors'>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0569ff" strokeWidth="3">
                                            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                </button>
                            </Link>

                            <Link href="/features/docs">
                                <button className="px-6 py-3.5 bg-white border-2 border-[#0569ff] text-[#0569ff] rounded-full text-base font-semibold hover:bg-[#0569ff] hover:text-white transition-all duration-300 shadow-sm">
                                    Learn more
                                </button>
                            </Link>
                        </div>
                    </div>
                    {/* Right - Dashboard Preview with Mac Browser Frame */}
                    <div className="relative hidden lg:block">
                        {/* Glow Effect */}
                        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-2xl rounded-3xl" />

                        {/* Mac Browser Window */}
                        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200/50 transform hover:scale-105 transition-transform duration-500">
                            {/* Mac-style Dark Top Bar */}
                            <div className="flex items-center gap-3 px-4 py-3 bg-[#2d2d2d] border-b border-black/20">
                                <div className="flex gap-2">
                                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                                </div>
                                <div className="flex-1 mx-4">
                                    <div className="bg-[#3f3f3f] rounded-md px-3 py-1.5 text-xs text-gray-300 text-center">
                                        dashboard.edubreezy.com
                                    </div>
                                </div>
                            </div>

                            {/* Dashboard Screenshot Placeholder */}
                            <div className="bg-gray-100 aspect-[16/10] flex items-center justify-center">
                                {/* Add your dashboard screenshot image here */}
                                <img
                                    src="https://placehold.co/600x400"
                                    alt="EduBreezy Dashboard"
                                    width={800}
                                    height={500}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
