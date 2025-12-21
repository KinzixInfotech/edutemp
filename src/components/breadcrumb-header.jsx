
"use client"

import { usePathname } from "next/navigation"
import { DynamicBreadcrumb } from "./dynamic-breadcrumb"
import { cn } from "@/lib/utils"

export function BreadcrumbHeader({ className }) {
    const pathname = usePathname()

    if (pathname === "/dashboard") {
        return null
    }


    return (
        <div
            className="flex sticky top-[var(--header-height)] z-20 shrink-0 items-center gap-2 border-b bg-[#ffffffa3] dark:bg-[#09090b94] backdrop-blur-sm transition-[width,height] ease-linear"
        >
            {/* Horizontal scrollable breadcrumb container */}
            <div className={cn(
                "flex h-10 items-center px-4 lg:px-6 w-full",
                "overflow-x-auto overflow-y-hidden",
                // Visible thin scrollbar styling
                "scrollbar-thin scrollbar-track-transparent",
                "scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-600",
                "hover:scrollbar-thumb-zinc-400 dark:hover:scrollbar-thumb-zinc-500",
                // Ensure content doesn't wrap
                "whitespace-nowrap"
            )}>
                <DynamicBreadcrumb />
            </div>
        </div>
    )
}
