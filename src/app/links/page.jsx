'use client';
import React from 'react';
import { motion } from 'motion/react';
import { InteractiveGridPattern } from '@/components/ui/interactive-grid-pattern';
import { Instagram, Linkedin, Youtube, Facebook, Mail, Phone, FileText, ArrowRight, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

const links = [
    {
        title: "Download Official Brochure",
        subtitle: "Complete overview of all ERP modules and pricing",
        icon: <FileText className="w-5 h-5" />,
        href: "/brochure",
        primary: true,
    },
    {
        title: "Call Sales",
        subtitle: "+91 90000 00000",
        icon: <Phone className="w-5 h-5" />,
        href: "tel:+919000000000",
    },
    {
        title: "Email Us",
        subtitle: "hello@edubreezy.com",
        icon: <Mail className="w-5 h-5" />,
        href: "mailto:hello@edubreezy.com",
    },
    {
        title: "Follow on Instagram",
        icon: <Instagram className="w-5 h-5" />,
        href: "#",
    },
    {
        title: "Connect on LinkedIn",
        icon: <Linkedin className="w-5 h-5" />,
        href: "#",
    },
    {
        title: "Subscribe on YouTube",
        icon: <Youtube className="w-5 h-5" />,
        href: "#",
    },
    {
        title: "Like on Facebook",
        icon: <Facebook className="w-5 h-5" />,
        href: "#",
    }
];

export default function LinksPage() {
    return (
        <div className="bg-[#fcfdff] min-h-screen relative overflow-hidden flex flex-col items-center pt-20 pb-20 font-sans tracking-normal">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0 select-none pointer-events-none fixed">
                <InteractiveGridPattern
                    className="absolute opacity-50 inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_10%,white_60%,transparent_80%)]"
                    squares={[60, 60]}
                />
            </div>

            <div className="absolute top-0 w-[600px] h-[600px] bg-[#004ffe]/5 rounded-full blur-[120px] -z-10 pointer-events-none fixed" />

            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-6">

                {/* Header Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-10 mt-8"
                >
                    <div className="w-24 h-24 mx-auto bg-white border border-slate-200 shadow-lg shadow-slate-200/50 rounded-2xl flex items-center justify-center mb-5 overflow-hidden">
                        <div className="text-3xl font-black text-[#004ffe] tracking-tighter">EB</div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight mb-2">EduBreezy</h1>
                    <p className="text-lg text-slate-600 font-medium">Next-Generation School ERP</p>
                </motion.div>

                {/* Links Section */}
                <div className="space-y-4">
                    {links.map((link, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.1 + (idx * 0.05) }}
                        >
                            <Link
                                href={link.href}
                                className={`group flex items-center p-4 rounded-xl border transition-all duration-200 ${link.primary
                                        ? 'bg-[#004ffe] border-[#004ffe] text-white hover:bg-[#0042d6] shadow-lg shadow-[#004ffe]/20 hover:-translate-y-1'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-[#004ffe]/30 hover:shadow-md hover:bg-slate-50'
                                    }`}
                            >
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors ${link.primary
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-[#004ffe] group-hover:bg-[#004ffe]/10'
                                    }`}>
                                    {link.icon}
                                </div>

                                <div className="ml-4 flex-1 text-left">
                                    <div className={`font-semibold ${link.primary ? 'text-white' : 'text-slate-900 group-hover:text-[#004ffe] transition-colors'}`}>
                                        {link.title}
                                    </div>
                                    {link.subtitle && (
                                        <div className={`text-sm mt-0.5 ${link.primary ? 'text-white/80' : 'text-slate-500'}`}>
                                            {link.subtitle}
                                        </div>
                                    )}
                                </div>

                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${link.primary
                                        ? 'bg-white/10 group-hover:translate-x-1'
                                        : 'bg-slate-50 group-hover:bg-[#004ffe]/5 group-hover:translate-x-1'
                                    }`}>
                                    <ArrowRight className={`w-4 h-4 ${link.primary ? 'text-white' : 'text-slate-400 group-hover:text-[#004ffe]'}`} />
                                </div>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Footer Section */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="mt-16 pb-8 text-center"
                >
                    <div className="inline-flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                        <LinkIcon className="w-4 h-4 text-slate-300" />
                        <span>edubreezy.com</span>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
