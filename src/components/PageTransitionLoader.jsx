'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

const REFRESH_LOADER_PATHS = [
    '/',
    '/dashboard',
    '/courses',
];

function shouldShowOnRefresh(pathname) {
    return REFRESH_LOADER_PATHS.some(
        (p) => pathname === p || pathname.startsWith(p + '/')
    );
}

export default function PageTransitionLoader() {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const isNavigating = useRef(false);
    const shownAt = useRef(null);

    const show = () => {
        isNavigating.current = true;
        shownAt.current = Date.now();
        setIsLoading(true);
    };

    const hide = () => {
        if (!isNavigating.current) return;
        const elapsed = Date.now() - (shownAt.current ?? 0);
        const remaining = Math.max(0, 400 - elapsed);
        setTimeout(() => {
            isNavigating.current = false;
            setIsLoading(false);
        }, remaining);
    };

    // Hide only when Next.js confirms the new page is fully loaded
    useEffect(() => {
        hide();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, searchParams]);

    // Intercept router.push / replace / back
    useEffect(() => {
        const originalPush = router.push;
        const originalReplace = router.replace;
        const originalBack = router.back;

        router.push = (...args) => { show(); return originalPush(...args); };
        router.replace = (...args) => { show(); return originalReplace(...args); };
        router.back = (...args) => { show(); return originalBack(...args); };

        return () => {
            router.push = originalPush;
            router.replace = originalReplace;
            router.back = originalBack;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);

    // Intercept <a> / <Link> clicks
    useEffect(() => {
        const handleClick = (e) => {
            const anchor = e.target.closest('a');
            if (!anchor?.href) return;

            const url = new URL(anchor.href);
            const current = new URL(window.location.href);

            const isInternal =
                url.origin === current.origin &&
                url.pathname !== current.pathname &&
                !anchor.target &&
                !e.ctrlKey &&
                !e.metaKey &&
                !e.shiftKey &&
                e.button === 0;

            if (isInternal) show();
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Safety net: never hang forever
    useEffect(() => {
        if (!isLoading) return;
        const id = setTimeout(() => {
            isNavigating.current = false;
            setIsLoading(false);
        }, 10_000);
        return () => clearTimeout(id);
    }, [isLoading]);

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    key="page-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: '#014dc2' }}
                >
                    {/* Background Graphics */}
                    <div className="absolute inset-0 overflow-hidden">
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
                        />
                        <motion.div
                            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                            className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }}
                        />
                        <motion.div
                            animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
                            transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                            className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
                        />

                        {/* Floating School Icons */}
                        <motion.div
                            animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="absolute top-[15%] left-[10%] opacity-20"
                        >
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
                                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
                            </svg>
                        </motion.div>
                        <motion.div
                            animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
                            transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
                            className="absolute top-[25%] right-[15%] opacity-20"
                        >
                            <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
                                <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                            </svg>
                        </motion.div>
                        <motion.div
                            animate={{ y: [-15, 15, -15], rotate: [0, 8, 0] }}
                            transition={{ duration: 6, repeat: Infinity, delay: 1 }}
                            className="absolute bottom-[20%] left-[20%] opacity-20"
                        >
                            <svg width="55" height="55" viewBox="0 0 24 24" fill="white">
                                <path d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3L1 9l11 6 9-4.91V17h2V9L12 3z" />
                            </svg>
                        </motion.div>
                        <motion.div
                            animate={{ y: [12, -12, 12], rotate: [0, -8, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, delay: 1.5 }}
                            className="absolute bottom-[30%] right-[10%] opacity-20"
                        >
                            <svg width="45" height="45" viewBox="0 0 24 24" fill="white">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </motion.div>

                        {/* Grid Pattern */}
                        <div
                            className="absolute inset-0 opacity-[0.03]"
                            style={{
                                backgroundImage: `linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)`,
                                backgroundSize: '50px 50px',
                            }}
                        />

                        {/* Diagonal Lines */}
                        <motion.div
                            animate={{ x: [-100, 100] }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 opacity-[0.02]"
                            style={{
                                backgroundImage: `repeating-linear-gradient(45deg, white, white 1px, transparent 1px, transparent 100px)`,
                            }}
                        />
                    </div>

                    {/* Centre Content */}
                    <div className="relative z-10 flex flex-col items-center gap-8">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <Image
                                src="/edu.png"
                                alt="EduBreezy"
                                width={220}
                                height={70}
                                className="drop-shadow-2xl brightness-0 invert"
                                priority
                            />
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-white/80 text-sm font-medium tracking-wider uppercase"
                            >
                                Loading…
                            </motion.div>

                            <div className="w-52 h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ x: '-100%' }}
                                    animate={{ x: '100%' }}
                                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                                    className="h-full w-1/2 bg-gradient-to-r from-transparent via-white to-transparent"
                                />
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export function triggerPageTransition() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pageTransitionStart'));
    }
}