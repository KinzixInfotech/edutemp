"use client";

import { usePathname, useRouter } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import "nprogress/nprogress.css";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import pkg from "../../../package.json";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useLoader } from "@/app/dashboard/context/Loader";
import OnboardingDialog from "../OnboardDialog";
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

const TopProgressBar = dynamic(() => import("@/app/components/TopProgressBar"), {
    ssr: false,
});

export default function ClientLayout({ children }) {
    const { loadingMsg, fullUser } = useAuth();

    const [isDbDown, setIsDbDown] = useState(false);

    // Global Error Interceptor for Fetch and Axios
    useEffect(() => {
        // 1. Intercept Axios
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
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

        // 2. Intercept Global Fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
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
            }
        };

        return () => {
            // Cleanup
            axios.interceptors.response.eject(interceptor);
            window.fetch = originalFetch;
        };
    }, []);

    // Report outage effect
    useEffect(() => {
        if (isDbDown) {
            // Fire and forget
            fetch('/api/report-outage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'DATABASE_DOWN',
                    error: 'Client detected 500/503 error'
                })
            }).then(() => {
                toast.error("System Outage Reported", {
                    description: "Engineering team has been notified.",
                    duration: 5000,
                });
            }).catch(console.error);
        }
    }, [isDbDown]);

    // Create a single QueryClient instance for the whole app
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 1000 * 60 * 5, // 5 minutes
                refetchOnWindowFocus: false,
                retry: 1,
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
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    // useEffect(() => {
    //     const checkUser = async () => {
    //         const { data: { session } } = await supabase.auth.getSession();

    //         if (!session?.user) {
    //             // Not logged in → redirect to login
    //             router.push("/login");
    //         } else {
    //             // Logged in
    //             setLoading(false);
    //         }
    //     };

    //     checkUser();

    //     // Optional: listen to auth state changes (logout elsewhere)
    //     const { data: { subscription } } = supabase.auth.onAuthStateChange(
    //         (_event, session) => {
    //             if (!session?.user) {
    //                 router.push("/login");
    //             }
    //         }
    //     );

    //     return () => subscription.unsubscribe();
    // }, [router]);

    if (loading) {
        return <LoaderPage showmsg={false} />; // or a spinner
    }



    const hideUI = ["/dashboard/login"].includes(pathname);

    return (
        <NetworkStatusProvider>
            <AcademicYearSetupBannerProvider>
                <QueryClientProvider client={queryClient}>
                    <SidebarProvider
                        style={{
                            "--sidebar-width": "calc(var(--spacing) * 72)",
                            "--header-height": "calc(var(--spacing) * 16)",
                        }}
                    >

                        <OnboardingDialog />
                        {!hideUI && <AppSidebar />}
                        <TopProgressBar />

                        <SidebarInset className={'bg-[#f9fafb] dark:bg-black'}>
                            {!hideUI && <SiteHeader fullUser={fullUser} />}

                            {!hideUI && <BreadcrumbHeader />}

                            <main className="w-full h-full relative ">
                                {/* {!hideUI && <DynamicBreadcrumb />} */}
                                {loading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    children
                                )}
                            </main>
                            <footer className="w-full border-t bg-white dark:bg-muted/30 rounded-b-lg  text-xs text-muted-foreground mt-8">
                                <div className="max-w-7xl mx-auto px-4 py-3  flex flex-col md:flex-row justify-between items-center gap-2">
                                    <StatusIndicator />
                                    <div className="flex items-center gap-4">
                                        <span>Dashboard Version: <strong>v{pkg.version}</strong></span>
                                        <span className="text-muted-foreground">A Kinzix Product</span>
                                    </div>
                                </div>
                            </footer>
                        </SidebarInset>
                    </SidebarProvider>
                    {/* <DatabaseErrorDialog open={isDbDown} /> */}
                </QueryClientProvider>
            </AcademicYearSetupBannerProvider>
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