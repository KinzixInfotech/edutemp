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
import { Loader2 } from "lucide-react";
import { useLoader } from "@/app/dashboard/context/Loader";
import OnboardingDialog from "../OnboardDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import LoaderPage from "../loader-page";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NetworkStatusDialog from "../NetworkIndicatordialog";

const TopProgressBar = dynamic(() => import("@/app/components/TopProgressBar"), {
    ssr: false,
});

export default function ClientLayout({ children }) {
    const { loadingMsg } = useAuth();

    // Create a single QueryClient instance for the whole app
    const [queryClient] = useState(() => new QueryClient());

    const router = useRouter();
    const [status, setStatus] = useState(null);
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

    const hideUI = ["/dashboard/login"].includes(pathname);
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

    return (

        <QueryClientProvider client={queryClient}>
            <SidebarProvider
                style={{
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                }}
            >
                <OnboardingDialog />
                {!hideUI && <AppSidebar variant="inset" />}
                <TopProgressBar />

                <SidebarInset>

                    {!hideUI && <SiteHeader />}
                    <main className="w-full h-full relative">
                        {loading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-50">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                        ) : (
                            children
                        )}
                    </main>
                    <footer className="w-full border-t bg-muted dark:bg-muted/30 rounded-b-lg  text-xs text-muted-foreground mt-8">
                        <div className="max-w-7xl mx-auto px-4 py-3  flex flex-col md:flex-row justify-between items-center gap-2">
                            <div className="flex items-center gap-2">
                                {/* <span className="font-medium">System Status:</span> */}
                                {status ? (
                                    <span
                                        className={`${getStatusStyles(status.indicator)} px-2 py-1.5 rounded-full`}
                                    >
                                        {status.description}
                                    </span>
                                ) : (
                                    <Skeleton className="h-6 w-48 rounded-full" />
                                )}
                            </div>

                            <div className="flex items-center gap-4">
                                <span>Dashboard Version: <strong>v{pkg.version}</strong></span>
                                <span className="text-muted-foreground">A Kinzix Product</span>
                            </div>
                        </div>
                    </footer>
                </SidebarInset>
            </SidebarProvider>
            <NetworkStatusDialog />
        </QueryClientProvider>

    );
}
