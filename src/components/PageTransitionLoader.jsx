'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

export default function PageTransitionLoader() {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // When route changes, we need to handle the transition
        // This will be controlled by the Header component
    }, [pathname, searchParams]);

    // This component will be controlled via a global event
    useEffect(() => {
        const handleStart = () => setIsLoading(true);
        const handleComplete = () => {
            setTimeout(() => setIsLoading(false), 800);
        };

        window.addEventListener('pageTransitionStart', handleStart);
        window.addEventListener('pageTransitionComplete', handleComplete);

        return () => {
            window.removeEventListener('pageTransitionStart', handleStart);
            window.removeEventListener('pageTransitionComplete', handleComplete);
        };
    }, []);

    // Auto-complete when pathname changes
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => setIsLoading(false), 1200);
            return () => clearTimeout(timer);
        }
    }, [pathname, isLoading]);

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: '#014dc2' }}
                >
                    {/* Background Graphics */}
                    <div className="absolute inset-0 overflow-hidden">
                        {/* Gradient Orbs */}
                        <motion.div
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [0.3, 0.5, 0.3],
                            }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute -top-[20%] -left-[10%] w-[500px] h-[500px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)' }}
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.3, 1],
                                opacity: [0.2, 0.4, 0.2],
                            }}
                            transition={{ duration: 4, repeat: Infinity, delay: 0.5 }}
                            className="absolute -bottom-[20%] -right-[10%] w-[600px] h-[600px] rounded-full"
                            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }}
                        />
                        <motion.div
                            animate={{
                                scale: [1, 1.15, 1],
                                opacity: [0.15, 0.25, 0.15],
                            }}
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
                                backgroundSize: '50px 50px'
                            }}
                        />

                        {/* Diagonal Lines */}
                        <motion.div
                            animate={{ x: [-100, 100] }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 opacity-[0.02]"
                            style={{
                                backgroundImage: `repeating-linear-gradient(45deg, white, white 1px, transparent 1px, transparent 100px)`
                            }}
                        />
                    </div>

                    {/* Center Content */}
                    <div className="relative z-10 flex flex-col items-center gap-8">
                        {/* Logo */}
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="relative"
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

                        {/* Loading Animation */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                            className="flex flex-col items-center gap-4"
                        >
                            {/* Loading Text */}
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-white/80 text-sm font-medium tracking-wider uppercase"
                            >
                                Loading...
                            </motion.div>

                            {/* Progress Bar */}
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

// Export a function to trigger the loader
export function triggerPageTransition() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('pageTransitionStart'));
    }
}
