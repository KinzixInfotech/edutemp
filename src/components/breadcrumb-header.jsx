
"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { DynamicBreadcrumb } from "./dynamic-breadcrumb"
import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function BreadcrumbHeader({ className, schoolName }) {
    const pathname = usePathname()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { fullUser } = useAuth()
    const [isRefreshing, setIsRefreshing] = useState(false)

    if (pathname === "/dashboard" && typeof document !== 'undefined') {
        document.title = "Dashboard - " + (schoolName || 'EduBreezy');
    }

    const handleRefresh = async () => {
        setIsRefreshing(true)
        try {
            // 1. Bust server-side Redis cache for this page
            fetch('/api/revalidate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pathname, schoolId: fullUser?.schoolId }),
            }).catch(() => { }) // fire-and-forget

            // 2. Invalidate all React Query caches (re-fetches visible queries)
            await queryClient.invalidateQueries()

            // 3. Re-fetch server components
            router.refresh()
        } finally {
            setTimeout(() => setIsRefreshing(false), 800)
        }
    }

    return (
        <div
            className="flex sticky z-20 shrink-0 items-center gap-2 border-b bg-[#ffffffeb] dark:bg-[#09090b94] backdrop-blur-sm transition-[width,height,top] ease-linear"
            style={{ top: "calc(var(--network-banner-height, 0px) + var(--onboarding-banner-height, 0px) + var(--setup-banner-height, 0px) + var(--header-height))" }}
        >
            {/* Scrollable breadcrumb + sticky refresh container */}
            <div className="relative flex h-10 items-center w-full">
                {/* Breadcrumb scroll area */}
                <div className={cn(
                    "flex h-full items-center px-4 lg:px-6 w-full pr-12",
                    "overflow-x-auto overflow-y-hidden",
                    "scrollbar-none",
                    "[&::-webkit-scrollbar]:hidden",
                    "[-ms-overflow-style:none]",
                    "[scrollbar-width:none]",
                    "whitespace-nowrap"
                )}>
                    <DynamicBreadcrumb />
                </div>

                {/* Sticky right fade + refresh button */}
                <div className="absolute right-0 top-0 h-full flex items-center pointer-events-none">
                    {/* Gradient fade */}
                    <div className="w-12 h-full bg-gradient-to-r from-transparent to-[#ffffffeb] dark:to-[#09090bf0]" />
                    {/* Refresh button */}
                    <div className="pr-3 lg:pr-5 bg-[#ffffffeb] dark:bg-[#09090bf0] h-full flex items-center pointer-events-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5 transition-transform", isRefreshing && "animate-spin")} />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
