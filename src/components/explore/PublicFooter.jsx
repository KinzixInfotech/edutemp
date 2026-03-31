import { SchoolIcon, Instagram, Mail, Phone } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const PublicFooter = () => {
    return (
        <footer className="bg-white pt-16 pb-10 border-t border-slate-200">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Brand — centered */}
                <div className="flex flex-col items-center text-center mb-12">
                    <div className="flex items-center gap-2 mb-6">
                        {/* Logo */}
                        <div className="flex items-center gap-2 shrink-0">
                            <Link href="/explore" className="text-primary hover:text-primary/90">
                                <Image src="/atlas.png" width={250} height={250} alt="EduBreezy Atlas" priority />
                            </Link>
                        </div>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed max-w-md mb-6">
                        EduBreezy Atlas is India's most trusted school discovery platform, helping millions of parents find the perfect educational environment for their children.
                    </p>

                    {/* Contact & Social */}
                    <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
                        <a href="https://instagram.com/edubreezyatlas" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-[#0051f9] transition-colors">
                            <Instagram className="w-4 h-4" />
                            <span>@edubreezyatlas</span>
                        </a>
                        <a href="mailto:atlas@edubreezy.com" className="flex items-center gap-1.5 hover:text-[#0051f9] transition-colors">
                            <Mail className="w-4 h-4" />
                            <span>atlas@edubreezy.com</span>
                        </a>
                        <a href="tel:+919471532682" className="flex items-center gap-1.5 hover:text-[#0051f9] transition-colors">
                            <Phone className="w-4 h-4" />
                            <span>+91 94705 56016</span>
                        </a>
                    </div>
                </div>

                {/* Copyright bar */}
                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-400">© {new Date().getFullYear()} EduBreezy Atlas. All rights reserved.</p>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        {/* Company info */}
                        <div className="flex items-center flex-col gap-1">
                            <a href="https://www.kinzix.com" target="_blank" rel="noopener noreferrer">
                                <Image
                                    src="/kinzix-black.webp"
                                    alt="Kinzix"
                                    width={80}
                                    height={32}
                                    className="opacity-60 hover:opacity-100 transition-opacity"
                                />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default PublicFooter
