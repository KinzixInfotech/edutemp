
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
            className="flex sticky  top-[var(--header-height)]  z-20   shrink-0 items-center gap-2 border-b bg-[#ffffffa3] dark:bg-[#09090b94] backdrop-blur-sm transition-[width,height] ease-linear"

        >
            {/* Adjusted top offset if needed based on header height. 
            Standard header is usually h-14 or h-16. 
            The site-header has h-(--header-height).
        */}
            <div className="flex h-10 items-center px-4 lg:px-6">
                <DynamicBreadcrumb />
            </div>
        </div>
    )
}
