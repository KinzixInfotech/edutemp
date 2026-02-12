'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw } from 'lucide-react';

export function SessionSwitchLoader({
    isActive = false,
    title = "Switching Session",
    message = "Please wait while we load data for the new academic session..."
}) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!isActive || !mounted) return null;

    const overlay = (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/95 backdrop-blur-md"
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, width: '100vw', height: '100vh' }}
        >
            <div className="flex flex-col items-center gap-6 p-6 sm:p-8 max-w-sm w-full mx-4">
                {/* Animated loader */}
                <div className="relative">
                    <RefreshCw className="h-12 w-12 sm:h-16 sm:w-16 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-primary/20 animate-pulse" />
                    </div>
                </div>

                {/* Text */}
                <div className="text-center space-y-2">
                    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        {message}
                    </p>
                </div>

                {/* Progress dots */}
                <div className="flex gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-2 w-2 rounded-full bg-primary animate-bounce" />
                </div>
            </div>
        </div>
    );

    // Portal to document.body so it escapes any stacking context (sidebar, etc.)
    return createPortal(overlay, document.body);
}
