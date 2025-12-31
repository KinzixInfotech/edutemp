
"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { Fragment } from "react"
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

    // if (pathname === "/dashboard") {
    //   return null
    // }

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
                {/* Always show Dashboard as home if we are in dashboard routes? 
            Assuming /dashboard is the root for this app's context */}
                {/* <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem> */}

                {/* Actually, let's just generate from paths. 
            If path starts with dashboard, the first item will be dashboard. */}

                {paths.map((path, index) => {
                    const href = `/${paths.slice(0, index + 1).join("/")}`
                    const isLast = index === paths.length - 1
                    const label = getLabel(path)
                    const isRoutable = !NON_ROUTABLE_PATHS.has(href)

                    return (
                        <Fragment key={path}>
                            {/* Separator before item (except first one if we wanted that, but usually separator is between items)
                   Wait, Shadcn breadcrumb usually goes Item -> Separator -> Item.
               */}
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
