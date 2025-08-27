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
import { useLoader } from "@/app/dashboard/context/Loader";

export function NavSidebarSections({ sections, userRole, activePath }) {
    const { setLoading } = useLoader();

    const handleClick = () => {
        setLoading(true); // show loader immediately
    };

    return (
        <>
            {sections.map((section) => {
                const visibleItems = section.items.filter(
                    (item) => !item.roles || item.roles.includes(userRole)
                )
                if (visibleItems.length === 0) return null
                const normalize = (path) => path.replace(/\/$/, "")
                return (
                    <SidebarGroup key={section.title} >
                        <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                        <SidebarMenu  >
                            {visibleItems.map((item) => {
                                const isActive = normalize(activePath) === normalize(item.url)

                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton asChild
                                            className={`w-full  py-4 hover:bg-white    dark:hover:text-black transition-all hover:cursor-pointer ${isActive ? "bg-white shadow-md dark:text-black font-semibold text-bl border" : ""}`}>
                                            <Link href={item.url} >
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
