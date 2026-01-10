
"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Fragment, useEffect } from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export function DynamicBreadcrumb() {
    const pathname = usePathname()
    const paths = pathname.split("/").filter((path) => path)

    // Map for custom labels if needed, otherwise format the path segment
    const getLabel = (path) => {
        return path
            .replace(/-/g, " ")
            .replace(/^\w/, (c) => c.toUpperCase())
    }

    // Update document title based on current path
    useEffect(() => {
        if (paths.length > 0) {
            // Skip 'dashboard' from the title for cleaner display
            const titlePaths = paths.filter(p => p.toLowerCase() !== 'dashboard')

            // Build breadcrumb trail for title (e.g., "Fees > Settings")
            const breadcrumbTrail = titlePaths.map(getLabel).join(' > ')

            // Update document title
            document.title = breadcrumbTrail ? `${breadcrumbTrail} | EduBreezy` : 'Dashboard | EduBreezy'
        } else {
            document.title = 'EduBreezy – India\'s Leading School Management Platform'
        }
    }, [pathname, paths])

    // Define paths that are just containers and shouldn't be clickable
    const NON_ROUTABLE_PATHS = new Set([
        "/dashboard/payroll",
        "/dashboard/schools",
        "/dashboard/fees",
        "/dashboard/documents",
        "/dashboard/attendance",
        "/dashboard/examination",
        "/dashboard/timetable",
        "/dashboard/settings",
        "/dashboard/teachers",
        "/dashboard/media-library",
        "/dashboard/partnerprogram",
        "/dashboard/school-explorer",
        "/dashboard/markattendance"
    ])

    return (
        <Breadcrumb className="flex">
            <BreadcrumbList className="flex-nowrap whitespace-nowrap">
                {paths.map((path, index) => {
                    const href = `/${paths.slice(0, index + 1).join("/")}`
                    const isLast = index === paths.length - 1
                    const label = getLabel(path)
                    const isRoutable = !NON_ROUTABLE_PATHS.has(href)

                    return (
                        <Fragment key={`${index}-${path}`}>
                            {index > 0 && <BreadcrumbSeparator />}

                            <BreadcrumbItem>
                                {isLast || !isRoutable ? (
                                    <BreadcrumbPage className={!isLast ? "text-muted-foreground font-normal" : ""}>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href}>{label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
