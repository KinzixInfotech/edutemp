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

export function NavSidebarSections({ sections, userRole, activePath }) {
    const { setLoading } = useLoader()
    const { state } = useSidebar()
    const isCollapsed = state === "collapsed"
    const activeItemRef = useRef(null)
    const [openMenus, setOpenMenus] = useState({})
    const previousPath = useRef(null)
    const isManualToggle = useRef(false)
    const hasInitialized = useRef(false)

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
                                                            className={`w-full  justify-center py-4 hover:!bg-white rounded-md hover:!text-black transition-all hover:cursor-pointer ${isActive || isParentActive
                                                                ? "shadow-xs font-semibold border dark:bg-white dark:text-black" : ""
                                                                }`}
                                                            style={isActive || isParentActive ? { backgroundColor: 'white' } : {}}
                                                        >
                                                            {item.icon && <item.icon className="w-4 h-4" />}
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
                                                        className={`group  w-full justify-between py-4 hover:!bg-white rounded-md hover:!text-black transition-all hover:cursor-pointer ${isActive || isParentActive
                                                            ? "shadow-xs font-semibold border dark:bg-white dark:text-black " : ""
                                                            }`}
                                                        style={isActive || isParentActive ? { backgroundColor: 'white' } : {}}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {item.icon && <item.icon className="w-4 h-4" />}
                                                            <span>{item.label}</span>
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
                                                                    className={`transition-all ${isSubActive
                                                                        ? "shadow-md font-semibold  dark:bg-white dark:text-black"
                                                                        : ""
                                                                        }`}
                                                                    style={isSubActive ? { backgroundColor: 'white' } : {}}
                                                                >
                                                                    <Link href={sub.url} onClick={handleClick}>
                                                                        {sub.icon && <sub.icon className="w-4 h-4" />}
                                                                        <span className="">{sub.label}</span>
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
                                                        className={`w-full justify-center py-4 hover:!bg-white hover:!text-black transition-all rounded-md hover:cursor-pointer ${isActive
                                                            ? "font-semibold border dark:bg-[#1a3a5a] dark:text-black dark:border-primary/50" : ""
                                                            }`}
                                                        style={isActive ? { backgroundColor: 'white' } : {}}
                                                    >
                                                        <Link href={item.url} onClick={handleClick}>
                                                            {item.icon && <item.icon className="w-4 h-4" />}
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
                                            className={`w-full py-4 hover:!bg-white hover:!text-black transition-all rounded-md hover:cursor-pointer ${isActive
                                                ? "font-semibold border dark:bg-white dark:text-black dark:border-primary/50" : ""
                                                }`}
                                            style={isActive ? { backgroundColor: 'white' } : {}}
                                        >
                                            <Link href={item.url} onClick={handleClick}>
                                                {item.icon && <item.icon className="w-4 h-4" />}
                                                <span>{item.label}</span>
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