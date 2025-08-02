"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import "nprogress/nprogress.css";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";

const TopProgressBar = dynamic(() => import("@/app/components/TopProgressBar"), {
    ssr: false,
});
export default function ClientLayout({ children }) {
    const pathname = usePathname();
    const hideUI = ["/dashboard/login",].includes(pathname);
    return (
        <SidebarProvider
            style={{
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
            }}
        >
            {!hideUI && <AppSidebar variant="inset" />}
            <TopProgressBar />
            <SidebarInset>
                {!hideUI && <SiteHeader />}
                {/* p-4 */}
                <main className="w-full h-full">{children}</main>
            </SidebarInset>
        </SidebarProvider>
    );
}
