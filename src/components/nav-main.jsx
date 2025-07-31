"use client"

import Link from "next/link"
import { useSidebar } from "@/components/ui/sidebar"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar"

export function NavSidebarSections({ sections, userRole, activePath }) {
    return (
        <>
            {sections.map((section) => {
                const visibleItems = section.items.filter(
                    (item) => !item.roles || item.roles.includes(userRole)
                )

                if (visibleItems.length === 0) return null

                return (
                    <SidebarGroup key={section.title}>
                        <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                        <SidebarMenu>
                            {visibleItems.map((item) => {
                                const isActive = activePath === item.url
                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton asChild
                                            className={`w-full font-semibold hover:cursor-pointer ${isActive ? "bg-white hover:bg-white font-semibold text-black shadow-md " : ""}`}>
                                            <Link href={item.url}>
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
        </>
    )
}
