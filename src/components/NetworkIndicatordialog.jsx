"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { WifiOff } from "lucide-react";

// Create context to share offline state
const NetworkContext = createContext({ isOffline: false });

export const useNetworkStatus = () => useContext(NetworkContext);

export function NetworkStatusProvider({ children }) {
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        setIsOffline(!navigator.onLine);

        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, []);

    const bannerHeight = isOffline ? "44px" : "0px";

    return (
        <NetworkContext.Provider value={{ isOffline }}>
            {/* Set CSS variable for the entire app */}
            <div style={{ "--network-banner-height": bannerHeight }}>
                {/* Fixed banner at top */}
                <div
                    className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ease-in-out ${isOffline ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
                        }`}
                    style={{ height: "44px" }}
                >
                    <div className="w-full h-full bg-red-500/10 dark:bg-red-900/30 border-b border-red-500/30 backdrop-blur-sm">
                        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-center gap-3">
                            <WifiOff className="h-5 w-5 text-red-500 dark:text-red-400 animate-pulse" />
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                No internet connection. Please check your network.
                            </span>
                            <div className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 animate-pulse" />
                        </div>
                    </div>
                </div>

                {children}
            </div>
        </NetworkContext.Provider>
    );
}

// For backwards compatibility
export default function NetworkStatusBanner() {
    return null;
}
