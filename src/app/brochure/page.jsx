'use client';
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { CheckCircle, Download, ArrowRight, Building2, User, Phone, Mail, FileText } from 'lucide-react';

export default function BrochurePage() {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        // Simulate API call and success animation
        setTimeout(() => {
            setIsSubmitting(false);
            setIsSuccess(true);
        }, 1500);
    };

    return (
        <div className="bg-[#fcfdff] min-h-screen pt-28 md:pt-36 pb-20 relative overflow-hidden flex items-center justify-center font-sans tracking-normal">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <InteractiveGridPattern
                    className="absolute opacity-50 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,white_60%,transparent_80%)]"
                    squares={[60, 60]}
                />
            </div>

            {/* Professional subtle lighting */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#004ffe]/5 rounded-full blur-[120px] -z-10 pointer-events-none" />

            {/* Main Container */}
            <div className="relative max-w-[1300px] w-full mx-auto px-4 sm:px-6 lg:px-8 z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

                    {/* Left Column - Content */}
                    <div className="space-y-8 lg:pr-8">
                        <motion.h1
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-4xl md:text-5xl xl:text-[3.5rem] font-bold text-[#0f172a] leading-[1.15] tracking-tight"
                        >
                            Transform Your <br />
                            <span className="text-[#004ffe]">School Operations</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-lg md:text-xl text-slate-600 leading-relaxed max-w-xl"
                        >
                            Download our comprehensive brochure to discover how EduBreezy empowers modern schools with enterprise-grade management solutions.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="space-y-4 pt-4"
                        >
                            {[
                                "Complete overview of all 20+ modules",
                                "Security & compliance infrastructure",
                                "Real case studies from top schools",
                                "Implementation and migration timeline"
                            ].map((feature, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="mt-1 w-6 h-6 rounded-full bg-[#004ffe]/10 flex items-center justify-center shrink-0">
                                        <CheckCircle className="w-4 h-4 text-[#004ffe]" />
                                    </div>
                                    <span className="text-slate-700 font-medium text-base lg:text-lg">{feature}</span>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right Column - Professional Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="relative"
                    >
                        {/* Sleek shadow instead of glowing/multi-colored gradients */}
                        <div className="absolute -inset-0.5 bg-gradient-to-b from-[#004ffe]/20 to-transparent rounded-[1.5rem] blur-xl opacity-50" />

                        <div className="relative bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-[1.25rem] p-8 md:p-10">

                            {!isSuccess ? (
                                <>
                                    <div className="mb-8">
                                        <h3 className="text-2xl font-bold text-slate-900 mb-2">Request Brochure</h3>
                                        <p className="text-slate-500">Provide your details to receive the PDF instantly.</p>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-6">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-semibold text-slate-700">Full Name</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <User className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <input required type="text" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ffe]/20 focus:border-[#004ffe] transition-all outline-none text-slate-900 placeholder:text-slate-400 sm:text-sm" placeholder="John Doe" />
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-sm font-semibold text-slate-700">Phone</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                        <Phone className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <input required type="tel" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ffe]/20 focus:border-[#004ffe] transition-all outline-none text-slate-900 placeholder:text-slate-400 sm:text-sm" placeholder="+91 90000 00000" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Email Address</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Mail className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <input required type="email" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ffe]/20 focus:border-[#004ffe] transition-all outline-none text-slate-900 placeholder:text-slate-400 sm:text-sm" placeholder="principal@school.com" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">School Name</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <input required type="text" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#004ffe]/20 focus:border-[#004ffe] transition-all outline-none text-slate-900 placeholder:text-slate-400 sm:text-sm" placeholder="Global International School" />
                                            </div>
                                        </div>

                                        <button
                                            disabled={isSubmitting}
                                            type="submit"
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#004ffe] hover:bg-[#0042d6] text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? (
                                                <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                            ) : (
                                                <>
                                                    Download PDF Brochure
                                                    <Download className="w-4 h-4" />
                                                </>
                                            )}
                                        </button>
                                        <p className="text-center text-xs text-slate-500 mt-4">Protected by industry-standard encryption.</p>
                                    </form>
                                </>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="py-12 text-center"
                                >
                                    <div className="w-16 h-16 mx-auto rounded-full bg-green-50 border border-green-100 flex items-center justify-center mb-6">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Check Your Inbox</h3>
                                    <p className="text-slate-500 mb-8">We&apos;ve securely sent the brochure to your email.</p>
                                    <button
                                        onClick={() => setIsSuccess(false)}
                                        className="text-[#004ffe] font-medium hover:underline inline-flex items-center gap-1.5 text-sm"
                                    >
                                        <ArrowRight className="w-4 h-4" /> Download again
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
