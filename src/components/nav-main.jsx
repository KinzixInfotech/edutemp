"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    useSidebar,
} from "@/components/ui/sidebar"
import { useLoader } from "@/app/dashboard/context/Loader"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useLibraryNotifications } from "@/context/LibraryNotificationContext"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/context/AuthContext" // Added
import { useQuery } from "@tanstack/react-query" // Added

export function NavSidebarSections({ sections, userRole, activePath }) {
    const { setLoading } = useLoader()
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"
    const activeItemRef = useRef(null)
    const [openMenus, setOpenMenus] = useState({})
    const previousPath = useRef(null)
    const isManualToggle = useRef(false)
    const hasInitialized = useRef(false)
    const { unseenRequestsCount } = useLibraryNotifications()
    const { fullUser } = useAuth() // Added

    // Fetch unread notices count // Added
    const { data: noticesData } = useQuery({
        queryKey: ['unread-notices-count', fullUser?.id],
        queryFn: async () => {
            if (!fullUser?.id) return { unreadCount: 0 }
            const res = await fetch(`/api/notifications?userId=${fullUser.id}&type=NOTICE&unreadOnly=true&limit=1`) // Limit 1 just to get count header or metadata
            if (!res.ok) return { unreadCount: 0 }
            return res.json()
        },
        enabled: !!fullUser?.id,
        refetchInterval: 60000
    })

    const unreadNoticesCount = noticesData?.unreadCount || 0

    // Fetch attendance window status for indicator
    const { data: attendanceStatus } = useQuery({
        queryKey: ['attendance-status', fullUser?.id, fullUser?.schoolId],
        queryFn: async () => {
            if (!fullUser?.id || !fullUser?.schoolId) return null
            const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/mark?userId=${fullUser.id}`)
            if (!res.ok) return null
            return res.json()
        },
        enabled: !!fullUser?.id && !!fullUser?.schoolId,
        staleTime: 1000 * 60, // 1 minute
        refetchInterval: 1000 * 60 * 2 // Refetch every 2 minutes
    })

    // Determine if attendance action is needed
    const isCheckInOpen = attendanceStatus?.isWorkingDay && attendanceStatus?.windows?.checkIn?.isOpen && !attendanceStatus?.attendance?.checkInTime
    const isCheckOutOpen = attendanceStatus?.isWorkingDay && attendanceStatus?.windows?.checkOut?.isOpen && attendanceStatus?.attendance?.checkInTime && !attendanceStatus?.attendance?.checkOutTime
    const attendanceActionNeeded = isCheckInOpen || isCheckOutOpen


    const handleClick = () => setLoading(true)

    const normalize = (path) => path?.replace(/\/$/, "")

    // Check if any submenu item is active
    const hasActiveSubmenu = (submenu) => {
        if (!submenu) return false
        return submenu.some((sub) => normalize(activePath) === normalize(sub.url))
    }

    // Initialize and handle path changes
    useEffect(() => {
        const pathChanged = previousPath.current !== activePath
        const isInitialMount = !hasInitialized.current

        // Run on initial mount OR when path changes
        if (isInitialMount || (pathChanged && !isManualToggle.current)) {
            previousPath.current = activePath
            hasInitialized.current = true

            // Find and expand parent menus for active items
            const newOpenMenus = {}
            sections.forEach((section) => {
                section.items.forEach((item) => {
                    if (item.submenu && hasActiveSubmenu(item.submenu)) {
                        newOpenMenus[item.label] = true
                    }
                })
            })
            setOpenMenus(newOpenMenus)

            // Scroll to active item after menus are expanded
            setTimeout(() => {
                if (activeItemRef.current) {
                    activeItemRef.current.scrollIntoView({
                        behavior: isInitialMount ? "auto" : "smooth",
                        block: "center",
                    })
                }
            }, isInitialMount ? 200 : 150)
        }

        // Reset manual toggle flag
        if (pathChanged) {
            isManualToggle.current = false
        }
    }, [activePath, sections])

    // Handle manual menu toggle (user clicking to expand/collapse)
    const handleMenuToggle = (menuLabel, open) => {
        isManualToggle.current = true
        setOpenMenus((prev) => ({ ...prev, [menuLabel]: open }))
    }

    return (
        <TooltipProvider delayDuration={0}>
            {sections.map((section) => {
                const visibleItems = section.items.filter(
                    (item) => !item.roles || item.roles.includes(userRole)
                )
                if (visibleItems.length === 0) return null

                return (
                    <SidebarGroup key={section.title}>
                        {section.title && !isCollapsed && (
                            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {visibleItems.map((item) => {
                                const isActive = normalize(activePath) === normalize(item.url)
                                const isParentActive = hasActiveSubmenu(item.submenu)

                                // has submenu → make collapsible
                                if (item.submenu && item.submenu.length > 0) {
                                    if (isCollapsed) {
                                        // In collapsed mode, show icon with tooltip
                                        return (
                                            <Tooltip key={item.label}>
                                                <TooltipTrigger asChild>
                                                    <SidebarMenuItem
                                                        ref={isParentActive ? activeItemRef : null}
                                                    >
                                                        <SidebarMenuButton
                                                            className={`w-full hover:bg-zinc-100 dark:hover:bg-zinc-800/60 relative justify-center py-4 rounded-lg transition-all duration-150 ${isActive || isParentActive
                                                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                                                                }`}
                                                        >
                                                            {item.icon && <item.icon className="w-4 h-4" />}
                                                            {/* Yellow dot indicator for library requests */}
                                                            {item.label === "Manage Library" && unseenRequestsCount > 0 && (
                                                                <span className="absolute top-1 right-1 h-2 w-2 bg-yellow-500 rounded-full" />
                                                            )}
                                                            {item.showNew && (
                                                                <span className="absolute top-0 right-0 h-2 w-2 bg-purple-500 rounded-full" />
                                                            )}
                                                        </SidebarMenuButton>
                                                    </SidebarMenuItem>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="flex flex-col gap-1">
                                                    <span className="font-semibold dark:text-white">{item.label}</span>
                                                    {item.submenu.map((sub) => {
                                                        if (sub.roles && !sub.roles.includes(userRole)) return null
                                                        return (
                                                            <Link
                                                                key={sub.label}
                                                                href={sub.url}
                                                                onClick={handleClick}
                                                                className="text-xs dark:text-white hover:underline"
                                                            >
                                                                {sub.label}
                                                            </Link>
                                                        )
                                                    })}
                                                </TooltipContent>
                                            </Tooltip>
                                        )
                                    }

                                    return (
                                        <Collapsible
                                            key={item.label}
                                            className="w-full transition-all"
                                            open={openMenus[item.label]}
                                            onOpenChange={(open) => handleMenuToggle(item.label, open)}
                                        >
                                            <SidebarMenuItem
                                                ref={isParentActive && !isCollapsed ? activeItemRef : null}
                                            >
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        className={`group font-medium relative w-full justify-between py-4 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all duration-150 rounded-lg ${isActive || isParentActive
                                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {item.icon && <item.icon className="w-4 h-4" />}
                                                            <span>{item.label}</span>
                                                            {item.showNew && (
                                                                <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-md font-bold ml-1">NEW</span>
                                                            )}
                                                            {/* Yellow dot indicator for library requests */}
                                                            {item.label === "Manage Library" && unseenRequestsCount > 0 && (
                                                                <span className="h-2 w-2 bg-yellow-500 rounded-full ml-1" />
                                                            )}
                                                        </div>
                                                        <ChevronDown className="w-4 h-4 group-data-[state=open]:hidden" />
                                                        <ChevronUp className="w-4 h-4 hidden group-data-[state=open]:block" />
                                                    </SidebarMenuButton>
                                                </CollapsibleTrigger>
                                            </SidebarMenuItem>
                                            <CollapsibleContent>
                                                <SidebarMenuSub className='mt-1.5'>
                                                    {item.submenu.map((sub) => {
                                                        if (sub.roles && !sub.roles.includes(userRole)) return null
                                                        const isSubActive =
                                                            normalize(activePath) === normalize(sub.url)
                                                        return (
                                                            <SidebarMenuSubItem
                                                                key={sub.label}
                                                                ref={isSubActive ? activeItemRef : null}
                                                            >
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    className={`w-full font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800/60 py-4 transition-all duration-150 rounded-lg ${isSubActive
                                                                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold" : ""
                                                                        }`}
                                                                >
                                                                    <Link href={sub.url} onClick={handleClick} className="flex items-center justify-between w-full">
                                                                        <div className="flex items-center gap-2">
                                                                            {sub.icon && <sub.icon className="w-4 h-4" />}
                                                                            <span className="">{sub.label}</span>
                                                                            {sub.showNew && (
                                                                                <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-md font-bold">NEW</span>
                                                                            )}
                                                                        </div>
                                                                        {/* Modern circular badge for Book Requests */}
                                                                        {sub.label === "Book Requests" && unseenRequestsCount > 0 && (
                                                                            <span className="ml-auto flex items-center justify-center h-5 min-w-[20px] px-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-[10px] font-bold rounded-full shadow-sm">
                                                                                {unseenRequestsCount}
                                                                            </span>
                                                                        )}
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        )
                                                    })}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    )
                                }

                                // fallback → normal item
                                if (isCollapsed) {
                                    return (
                                        <Tooltip key={item.label}>
                                            <TooltipTrigger asChild>
                                                <SidebarMenuItem
                                                    ref={isActive ? activeItemRef : null}
                                                >
                                                    <SidebarMenuButton
                                                        asChild
                                                        className={`w-full font-medium relative hover:bg-zinc-100 dark:hover:bg-zinc-800/60 py-4 transition-all duration-150 rounded-lg ${isActive
                                                            ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                                                            }`}
                                                    >
                                                        <Link href={item.url} onClick={handleClick}>
                                                            {item.icon && <item.icon className="w-4 h-4" />}
                                                            {/* Pulsing indicator for Self Attendance in collapsed mode */}
                                                            {item.label === "Self Attendance" && attendanceActionNeeded && (
                                                                <span className="absolute top-1 right-1 flex h-2 w-2">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                </span>
                                                            )}
                                                            {item.showNew && (
                                                                <span className="absolute top-0 right-0 h-2 w-2 bg-purple-500 rounded-full" />
                                                            )}
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            </TooltipTrigger>
                                            <TooltipContent side="right">
                                                <span className="dark:text-white">{item.label}</span>
                                            </TooltipContent>
                                        </Tooltip>
                                    )
                                }
                                return (
                                    <SidebarMenuItem
                                        key={item.label}
                                        ref={isActive ? activeItemRef : null}
                                    >
                                        <SidebarMenuButton
                                            asChild
                                            className={`w-full font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800/60 py-4 transition-all duration-150 rounded-lg ${isActive
                                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""
                                                }`}
                                        >
                                            <Link href={item.url} onClick={handleClick} className="flex items-center justify-between w-full">
                                                <div className="flex items-center gap-2">
                                                    {item.icon && <item.icon className="w-4 h-4" />}
                                                    <span>{item.label}</span>
                                                    {/* Pulsing indicator for Self Attendance when action needed */}
                                                    {item.label === "Self Attendance" && attendanceActionNeeded && (
                                                        <span className="relative flex h-2 w-2">
                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                        </span>
                                                    )}
                                                    {item.showNew && (
                                                        <span className="px-1.5 py-0.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-md font-bold">NEW</span>
                                                    )}
                                                </div>
                                                {/* Badge for Noticeboard */}
                                                {item.label === "Noticeboard" && unreadNoticesCount > 0 && (
                                                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full text-[10px]">
                                                        {unreadNoticesCount}
                                                    </Badge>
                                                )}
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroup>
                )
            })}
        </TooltipProvider>
    )
}