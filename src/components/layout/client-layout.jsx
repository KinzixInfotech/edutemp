"use client";

import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import "nprogress/nprogress.css";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import pkg from "../../../package.json";
import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useLoader } from "@/app/dashboard/context/Loader";
import SchoolOnboardingWizard from "../dashboard/SchoolOnboardingWizard";
import { OnboardingSetupBannerProvider } from "../OnboardingSetupBanner";
import { SetupHelperButton } from "../SetupHelperButton";
import { OnboardingProvider } from "@/context/OnboardingStateContext";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import LoaderPage from "../loader-page";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { NetworkStatusProvider } from "../NetworkIndicatordialog";
import { DatabaseErrorDialog } from "../database-error-dialog";
import Link from "next/link";
import { DynamicBreadcrumb } from "../dynamic-breadcrumb";
import { BreadcrumbHeader } from "../breadcrumb-header";
import { AcademicYearSetupBannerProvider } from "../AcademicYearSetupBanner";
import axios from "axios";
import { toast } from "sonner";
import { WebPushListener } from "@/components/web-push-listener";
import { PiGraduationCapDuotone } from "react-icons/pi";
import { ApiProgressBar } from "@/components/ui/api-progress-bar";
import { apiLoader } from "@/lib/api-loader";

const TopProgressBar = dynamic(() => import("@/app/components/TopProgressBar"), {
    ssr: false,
});

// Modern CSS animations - GPU-accelerated for smooth 60fps
const spinnerStyles = `
/* Smooth rotation using transform (GPU accelerated) */
@keyframes smoothSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Subtle pulse using transform scale (GPU accelerated) */
@keyframes smoothPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

/* Shimmer sweep effect */
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Floating particles */
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
  50% { transform: translateY(-12px) rotate(180deg); opacity: 0.8; }
}

/* Fade in animation */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Staggered dot animation */
@keyframes dotPulse {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* Progress bar gradient animation */
@keyframes gradientMove {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
`;

export default function ClientLayout({ children }) {
    const { loadingMsg, fullUser } = useAuth();
    const [isDbDown, setIsDbDown] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    const pathname = usePathname();
    const previousPathname = useRef(pathname);

    // Detect navigation within /dashboard/ routes
    useEffect(() => {
        // Check if we're in dashboard route
        const isDashboardRoute = pathname?.startsWith('/dashboard');

        // If pathname changed and we're in dashboard, show loading briefly
        if (previousPathname.current !== pathname && isDashboardRoute) {
            setIsNavigating(true);
            // Hide after a short delay (page should be loaded by then)
            const timer = setTimeout(() => {
                setIsNavigating(false);
            }, 500);
            return () => clearTimeout(timer);
        }

        previousPathname.current = pathname;
    }, [pathname]);

    // Listen for route changes via click events on links
    useEffect(() => {
        const handleClick = (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.includes('/dashboard')) {
                const url = new URL(link.href);
                if (url.pathname !== pathname && url.pathname.startsWith('/dashboard')) {
                    setIsNavigating(true);
                }
            }
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [pathname]);

    // Reset navigation state when pathname changes
    useEffect(() => {
        setIsNavigating(false);
    }, [pathname]);

    // Global Error Interceptor and Loading State for Fetch and Axios
    useEffect(() => {
        // 1. Intercept Axios Request
        const reqInterceptor = axios.interceptors.request.use(
            (config) => {
                apiLoader.start();
                return config;
            },
            (error) => {
                apiLoader.stop();
                return Promise.reject(error);
            }
        );

        // 2. Intercept Axios Response
        const resInterceptor = axios.interceptors.response.use(
            (response) => {
                apiLoader.stop();
                return response;
            },
            (error) => {
                apiLoader.stop();
                // Only trigger DB Error Dialog for specific database connection issues
                const errorMessage = error.response?.data?.error || error.response?.data?.message || '';
                const isDatabaseError =
                    errorMessage.toLowerCase().includes('database') ||
                    errorMessage.toLowerCase().includes('prisma') ||
                    errorMessage.toLowerCase().includes('connection') ||
                    error.response?.status === 503; // Service Unavailable often means DB down

                if (isDatabaseError) {
                    setIsDbDown(true);
                }
                return Promise.reject(error);
            }
        );

        // 3. Intercept Global Fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            apiLoader.start();
            try {
                const response = await originalFetch(...args);
                // clone response to read text without consuming body for caller
                const clone = response.clone();

                if (response.status === 500 || response.status === 503) {
                    try {
                        const text = await clone.text();
                        const isDatabaseError =
                            text.toLowerCase().includes('database') ||
                            text.toLowerCase().includes('prisma') ||
                            text.toLowerCase().includes('connection') ||
                            response.status === 503;

                        if (isDatabaseError) {
                            setIsDbDown(true);
                        }
                    } catch (e) {
                        // ignore json parse error
                    }
                }
                return response;
            } catch (error) {
                throw error;
            } finally {
                apiLoader.stop();
            }
        };

        return () => {
            // Cleanup
            axios.interceptors.request.eject(reqInterceptor);
            axios.interceptors.response.eject(resInterceptor);
            window.fetch = originalFetch;
        };
    }, []);


    // Create a single QueryClient instance for the whole app
    // Optimized for perceived performance - show cached data immediately
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5,      // 5 minutes - data considered "fresh"
                gcTime: 1000 * 60 * 30,        // 30 minutes - keep unused data in cache
                refetchOnWindowFocus: false,   // Don't refetch when tab gets focus
                refetchOnMount: 'always',      // Always check for updates but show stale first
                refetchOnReconnect: true,      // Refetch when network reconnects
                retry: 1,                      // Only retry once on failure
                retryDelay: 1000,              // Wait 1 second before retry
                networkMode: 'offlineFirst',   // Use cache when offline
            },
        },
        queryCache: new QueryCache({
            // Keep this as backup for well-behaved queries that throw
            onError: (error) => {
                const msg = error?.message?.toLowerCase() || '';
                const isDatabaseError = msg.includes('database') || msg.includes('prisma') || msg.includes('connection');
                if (isDatabaseError || error?.status === 503 || error?.statusCode === 503) {
                    setIsDbDown(true);
                }
            }
        }),
        mutationCache: new MutationCache({
            onError: (error) => {
                const msg = error?.message?.toLowerCase() || '';
                const isDatabaseError = msg.includes('database') || msg.includes('prisma') || msg.includes('connection');
                if (isDatabaseError || error?.status === 503 || error?.statusCode === 503) {
                    setIsDbDown(true);
                }
            }
        })
    }));

    const router = useRouter();
    const [loading, setLoading] = useState(false);

    if (loading) {
        return <LoaderPage showmsg={false} />; // or a spinner
    }

    const hideUI = ["/dashboard/login"].includes(pathname);

    return (
        <NetworkStatusProvider>
            <OnboardingProvider>
                <OnboardingSetupBannerProvider>
                    <AcademicYearSetupBannerProvider>
                        <QueryClientProvider client={queryClient}>
                            {/* Inject animation styles */}
                            <style dangerouslySetInnerHTML={{ __html: spinnerStyles }} />

                            <SidebarProvider
                                style={{
                                    "--sidebar-width": "calc(var(--spacing) * 72)",
                                    "--header-height": "calc(var(--spacing) * 16)",
                                }}
                            >

                                {!hideUI && <SchoolOnboardingWizard />}
                                {!hideUI && <SetupHelperButton />}
                                {!hideUI && <AppSidebar />}
                                <TopProgressBar />
                                <ApiProgressBar />

                                <SidebarInset className={'bg-[#f9fafb] dark:bg-black'}>
                                    {!hideUI && <SiteHeader fullUser={fullUser} />}

                                    {!hideUI && <BreadcrumbHeader schoolName={fullUser?.school?.name} />}

                                    <main className="w-full h-full relative">
                                        {/* Modern Navigation Loading Overlay */}
                                        {isNavigating && pathname?.startsWith('/dashboard') && (
                                            <div
                                                className="fixed inset-0 flex items-center justify-center z-50 overflow-hidden"
                                                style={{
                                                    left: 'var(--sidebar-width, 0px)',
                                                    animation: 'fadeIn 0.15s ease-out',
                                                }}
                                            >
                                                {/* Gradient mesh background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background/95" />

                                                {/* Animated gradient orbs */}
                                                <div
                                                    className="absolute w-96 h-96 rounded-full blur-3xl opacity-20"
                                                    style={{
                                                        background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.3) 100%)',
                                                        top: '-10%',
                                                        right: '-10%',
                                                        animation: 'smoothPulse 3s ease-in-out infinite',
                                                    }}
                                                />
                                                <div
                                                    className="absolute w-64 h-64 rounded-full blur-3xl opacity-15"
                                                    style={{
                                                        background: 'linear-gradient(135deg, hsl(var(--primary)/0.5) 0%, transparent 100%)',
                                                        bottom: '10%',
                                                        left: '10%',
                                                        animation: 'smoothPulse 4s ease-in-out infinite 0.5s',
                                                    }}
                                                />

                                                {/* Floating particles */}
                                                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="absolute w-2 h-2 rounded-full bg-primary/30"
                                                            style={{
                                                                left: `${15 + i * 15}%`,
                                                                top: `${30 + (i % 3) * 20}%`,
                                                                animation: `float ${2 + i * 0.3}s ease-in-out infinite ${i * 0.2}s`,
                                                            }}
                                                        />
                                                    ))}
                                                </div>

                                                {/* Center loading content */}
                                                <div className="relative flex flex-col items-center gap-6 z-10">
                                                    {/* Animated logo container */}
                                                    <div className="relative">
                                                        {/* Outer glow ring */}
                                                        <div
                                                            className="absolute -inset-4 rounded-full opacity-30"
                                                            style={{
                                                                background: 'radial-gradient(circle, hsl(var(--primary)/0.4) 0%, transparent 70%)',
                                                                animation: 'smoothPulse 2s ease-in-out infinite',
                                                            }}
                                                        />

                                                        {/* Progress ring */}
                                                        <svg
                                                            className="w-20 h-20 sm:w-24 sm:h-24"
                                                            style={{ animation: 'smoothSpin 1.5s linear infinite' }}
                                                        >
                                                            <circle
                                                                cx="50%"
                                                                cy="50%"
                                                                r="45%"
                                                                fill="none"
                                                                stroke="hsl(var(--primary)/0.15)"
                                                                strokeWidth="3"
                                                            />
                                                            <circle
                                                                cx="50%"
                                                                cy="50%"
                                                                r="45%"
                                                                fill="none"
                                                                stroke="hsl(var(--primary))"
                                                                strokeWidth="3"
                                                                strokeLinecap="round"
                                                                strokeDasharray="70 200"
                                                            />
                                                        </svg>

                                                        {/* Graduation cap icon */}
                                                        <div
                                                            className="absolute inset-0 flex items-center justify-center"
                                                            style={{ animation: 'smoothPulse 1.5s ease-in-out infinite' }}
                                                        >
                                                            <PiGraduationCapDuotone
                                                                className="text-primary w-8 h-8 sm:w-10 sm:h-10"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Loading text with shimmer */}
                                                    <div className="relative overflow-hidden">
                                                        <span className="text-sm font-medium text-muted-foreground tracking-wide">
                                                            Loading
                                                        </span>
                                                        {/* Shimmer overlay */}
                                                        <div
                                                            className="absolute inset-0 w-full"
                                                            style={{
                                                                background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.2) 50%, transparent 100%)',
                                                                animation: 'shimmer 1.5s ease-in-out infinite',
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Animated dots */}
                                                    <div className="flex gap-1.5">
                                                        {[0, 1, 2].map((i) => (
                                                            <div
                                                                key={i}
                                                                className="w-2 h-2 rounded-full bg-primary"
                                                                style={{
                                                                    animation: `dotPulse 1.2s ease-in-out infinite ${i * 0.15}s`,
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Bottom gradient progress bar */}
                                                <div
                                                    className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden"
                                                >
                                                    <div
                                                        className="h-full w-full"
                                                        style={{
                                                            background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--primary)/0.5), hsl(var(--primary)), transparent)',
                                                            backgroundSize: '200% 100%',
                                                            animation: 'gradientMove 1.5s ease-in-out infinite',
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {loading ? (
                                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
                                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                            </div>
                                        ) : (
                                            <>
                                                <WebPushListener />
                                                {children}
                                            </>
                                        )}
                                    </main>
                                    <footer className="w-full mt-auto py-6 px-8 border-t bg-background/50 backdrop-blur-sm">
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground/80">
                                            <div className="flex items-center gap-6">
                                                <StatusIndicator className="text-[10px] px-2 py-0.5 h-auto font-medium" />
                                                <div className="hidden md:flex items-center gap-4">
                                                    <Link target="_blank" href="/support" className="hover:text-foreground transition-colors">Raise A Bug</Link>
                                                    <Link target="_blank" href="/features/docs" className="hover:text-foreground transition-colors">Documentation</Link>
                                                    <Link target="_blank" href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-muted">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <span className="font-mono">v{pkg.version}</span>
                                                </div>
                                                <span className="opacity-50">•</span>
                                                <span className="font-medium hover:text-foreground transition-colors cursor-default">
                                                    Made with <span className="text-red-400">♥</span> by Kinzix
                                                </span>
                                            </div>
                                        </div>
                                    </footer>
                                </SidebarInset>
                            </SidebarProvider>
                            {/* <DatabaseErrorDialog open={isDbDown} /> */}
                        </QueryClientProvider>
                    </AcademicYearSetupBannerProvider>
                </OnboardingSetupBannerProvider>
            </OnboardingProvider>
        </NetworkStatusProvider>
    );
}

export const StatusIndicator = (className) => {
    const [status, setStatus] = useState(null);
    const getStatusStyles = (indicator) => {
        switch (indicator) {
            case "none": // operational
                return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
            case "minor": // minor issues
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";
            case "major": // major outage
                return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
            case "critical": // critical outage
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
                {/* <span className="font-medium">System Status:</span> */}
                {status ? (
                    <span
                        className={cn(
                            getStatusStyles(status.indicator),
                            "px-2 py-1.5 rounded-full",
                            className
                        )}
                    >

                        {status.description}
                    </span>
                ) : (
                    <Skeleton className="h-6 w-48 rounded-full" />
                )}
            </div>
        </Link>
    )
}