'use client';

import PublicHeader from '@/components/explore/PublicHeader';
import pkg from '../../../package.json';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

// Layout for public School Explorer pages - matches ERP design
export default function ExploreLayout({ children }) {
    return (
        <div className="min-h-screen bg-[#f9fafb] dark:bg-black">
            <PublicHeader />

            <main className="w-full h-full relative">
                {children}
            </main>

            {/* Footer matching ERP style */}
            {/* <footer className="w-full border-t sticky bottom-0 bg-muted dark:bg-muted/30 rounded-b-lg text-xs text-muted-foreground mt-8">
                <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-2">
                    <StatusIndicator />
                    <div className="flex items-center gap-4">
                        <span>School Explorer Version: <strong>v{pkg.version}</strong></span>
                        <span className="text-muted-foreground">A Kinzix Product</span>
                    </div>
                </div>
            </footer> */}
        </div>
    );
}

// Status indicator (same as ERP)
export const StatusIndicator = () => {
    const [status, setStatus] = useState(null);

    const getStatusStyles = (indicator) => {
        switch (indicator) {
            case "none":
                return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
            case "minor":
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
            case "major":
                return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
            case "critical":
                return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
            default:
                return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
        }
    };

    useEffect(() => {
        async function fetchStatus() {
            try {
                const res = await fetch("https://ch3yy55ly4fq.statuspage.io/api/v2/summary.json");
                const data = await res.json();
                setStatus(data.status);
            } catch (error) {
                console.error("Error fetching status:", error);
            }
        }
        fetchStatus();
    }, []);

    return (
        <Link href={'https://ch3yy55ly4fq.statuspage.io/'} target="_blank">
            <div className="flex items-center gap-2">
                {status ? (
                    <span className={cn(getStatusStyles(status.indicator), "px-2 py-1.5 rounded-full")}>
                        {status.description}
                    </span>
                ) : (
                    <Skeleton className="h-6 w-48 rounded-full" />
                )}
            </div>
        </Link>
    );
};
