'use client';

import { Loader2, RefreshCw } from 'lucide-react';

export function SessionSwitchLoader({ isActive = false }) {
    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md">
            <div className="flex flex-col items-center gap-6 p-8">
                {/* Animated loader */}
                <div className="relative">
                    <RefreshCw className="h-16 w-16 text-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-8 w-8 rounded-full bg-primary/20 animate-pulse" />
                    </div>
                </div>

                {/* Text */}
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight">Switching Session</h2>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Please wait while we load data for the new academic session...
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
}
