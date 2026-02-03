
"use client"

import { usePathname } from "next/navigation"
import { DynamicBreadcrumb } from "./dynamic-breadcrumb"
import { cn } from "@/lib/utils"

export function BreadcrumbHeader({ className, schoolName }) {
    const pathname = usePathname()

    if (pathname === "/dashboard" && typeof document !== 'undefined') {
        document.title = "Dashboard - " + (schoolName || 'EduBreezy');
    }


    return (
        <div
            className="flex sticky z-20 shrink-0 items-center gap-2 border-b bg-[#ffffffeb] dark:bg-[#09090b94] backdrop-blur-sm transition-[width,height,top] ease-linear"
            style={{ top: "calc(var(--network-banner-height, 0px) + var(--onboarding-banner-height, 0px) + var(--setup-banner-height, 0px) + var(--header-height))" }}
        >
            {/* Horizontal scrollable breadcrumb container */}
            <div className={cn(
                "flex h-10 items-center px-4 lg:px-6 w-full",
                "overflow-x-auto overflow-y-hidden",
                // Hide scrollbar completely
                "scrollbar-none",
                "[&::-webkit-scrollbar]:hidden",
                "[-ms-overflow-style:none]",
                "[scrollbar-width:none]",
                // Ensure content doesn't wrap
                "whitespace-nowrap"
            )}>
                <DynamicBreadcrumb />
            </div>
        </div>
    )
}
