'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function NotFoundPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center space-y-8">

                {/* Logo */}
                <div className="flex items-center justify-center">
                    <Link href="/" className="text-primary hover:text-primary/90">
                        <Image src='/edu.png' width={200} height={200} alt="EduBreezy" priority className="w-[120px] md:w-[300px]" />
                    </Link>
                </div>

                {/* 404 Graphic */}
                <div className="relative mx-auto w-40 h-28 flex items-center justify-center select-none">
                    <span className="text-[7rem] font-extrabold text-slate-100 leading-none tracking-tighter absolute">
                        404
                    </span>
                    <div className="relative z-10 w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shadow-inner">
                        <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Page not found
                    </h1>
                    <p className="text-slate-500 text-base leading-relaxed">
                        The page you&apos;re looking for doesn&apos;t exist or has been
                        moved. Double-check the URL or head back to the dashboard.
                    </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all duration-150 text-sm"
                    >
                        Go to Dashboard
                    </Link>
                    <Link
                        href="javascript:history.back()"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-full border border-slate-200  transition-all duration-150 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Go Back
                    </Link>
                </div>

                {/* Contact */}
                <p className="text-sm text-slate-400">
                    Need help?{' '}
                    <a
                        href="mailto:hello@edubreezy.com"
                        className="text-blue-600 hover:text-blue-700 font-medium underline underline-offset-2"
                    >
                        hello@edubreezy.com
                    </a>
                </p>

            </div>
        </div>
    );
}
