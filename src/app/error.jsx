'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Error({ error, reset }) {
    useEffect(() => {
        console.error('[Error Boundary]', error);
    }, [error]);
    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="max-w-lg w-full text-center space-y-8">

                {/* Logo */}
                <div className="flex items-center justify-center">
                    <Link href="/" className="text-primary hover:text-primary/90">
                        <Image src='/edu.png' width={200} height={200} alt="EduBreezy" priority className="w-[120px] md:w-[300px]" />
                    </Link>
                </div>
                {/* Illustration */}
                <div className="relative mx-auto w-28 h-28">
                    <div className="absolute inset-0 rounded-full bg-red-100 animate-pulse" />
                    <div className="relative flex items-center justify-center w-full h-full">
                        <svg viewBox="0 0 80 80" fill="none" className="w-16 h-16">
                            <circle cx="40" cy="40" r="36" fill="#FEE2E2" />
                            <path d="M40 22v20" stroke="#EF4444" strokeWidth="4.5" strokeLinecap="round" />
                            <circle cx="40" cy="54" r="3" fill="#EF4444" />
                        </svg>
                    </div>
                </div>

                {/* Heading */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                        Oops! Something broke.
                    </h1>
                    <p className="text-slate-500 text-base leading-relaxed">
                        Don&apos;t panic — this happens sometimes. You can try refreshing the page or come back in
                        a moment.
                    </p>
                </div>
                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                        onClick={() => reset()}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-full transition-all duration-150 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Try Again
                    </button>
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-full border border-slate-200 transition-all duration-150 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Go to Dashboard
                    </Link>
                </div>

                {/* Contact */}
                <p className="text-sm text-slate-400">
                    Still stuck? Reach us at{' '}
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
