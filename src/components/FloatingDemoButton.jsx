'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Calendar } from 'lucide-react';

// Pages where the floating button should NOT appear
const EXCLUDED_PATHS = [
    '/dashboard',
    '/contact',
    '/support',
    '/login',
    '/signup',
    '/schoollogin',
    '/auth',
    '/reset-password',
    '/verify',
    '/admin',
];

export default function FloatingDemoButton() {
    const pathname = usePathname();
    const [isVisible, setIsVisible] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const shouldShow = !EXCLUDED_PATHS.some(path =>
            pathname?.startsWith(path)
        );
        setIsVisible(shouldShow);
    }, [pathname]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    if (!isVisible) return null;

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 150);
    };

    const handleClick = () => {
        window.location.href = '/contact?demo=true';
    };

    return (
        <div
            className="fixed bottom-6 right-6 z-50"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                onClick={handleClick}
                style={{
                    width: isHovered ? '170px' : '52px',
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                className="relative flex items-center justify-start h-[52px] px-[14px] gap-3 rounded-full 
                           bg-black text-white font-medium text-sm
                           shadow-lg hover:shadow-2xl hover:shadow-black/50
                           border border-gray-600/50 hover:border-gray-500/50
                           overflow-hidden cursor-pointer
                           hover:scale-[1.02] active:scale-[0.98]"
            >
                {/* Continuous shimmer effect while hovered */}
                {isHovered && (
                    <div
                        className="absolute inset-0 animate-shimmer"
                        style={{
                            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0.1) 80%, transparent 100%)',
                            animation: 'shimmer 1.5s ease-in-out infinite',
                        }}
                    />
                )}

                <Calendar className="w-5 h-5 flex-shrink-0 relative z-10" />
                <span
                    style={{
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.25s ease',
                        transitionDelay: isHovered ? '0.1s' : '0s',
                    }}
                    className="whitespace-nowrap relative z-10"
                >
                    Book a Demo
                </span>
            </button>

            {/* Keyframes for shimmer */}
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    );
}
