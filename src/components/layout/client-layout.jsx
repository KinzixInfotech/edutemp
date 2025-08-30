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

const TopProgressBar = dynamic(() => import("@/app/components/TopProgressBar"), {
    ssr: false,
});

export default function ClientLayout({ children }) {
    const { loadingMsg } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);


    const hideUI = ["/dashboard/login"].includes(pathname);


    return (
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
                {/* p-4 */}
                {/* <main className="w-full h-full">{children}</main> */}
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
                            <span className="font-medium">System Status:</span>
                            <span className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-0.5 rounded-full">
                                Operational
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <span>Dashboard Version: <strong>v{pkg.version}</strong></span>
                            <span className="text-muted-foreground">A Kinzix Product</span>
                        </div>
                    </div>
                </footer>

            </SidebarInset>
        </SidebarProvider>
    );
}
