"use client"

import Link from "next/link"
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { useLoader } from "@/app/dashboard/context/Loader"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp } from "lucide-react"

export function NavSidebarSections({ sections, userRole, activePath }) {
    const { setLoading } = useLoader()
    const handleClick = () => setLoading(true)

    const normalize = (path) => path?.replace(/\/$/, "")


    return (
        <>
            {sections.map((section) => {
                const visibleItems = section.items.filter(
                    (item) => !item.roles || item.roles.includes(userRole)
                )
                if (visibleItems.length === 0) return null

                return (
                    <SidebarGroup key={section.title}>
                        {section.title && (
                            <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                        )}
                        <SidebarMenu>
                            {visibleItems.map((item) => {
                                const isActive = normalize(activePath) === normalize(item.url)

                                // has submenu → make collapsible
                                if (item.submenu && item.submenu.length > 0) {
                                    return (
                                        <Collapsible key={item.label} className="w-full transition-all">
                                            <SidebarMenuItem>
                                                <CollapsibleTrigger asChild>
                                                    <SidebarMenuButton
                                                        className={`group w-full justify-between py-4 hover:!bg-white hover:!text-black transition-all hover:cursor-pointer ${isActive
                                                            ? "bg-white dark:text-white dark:bg-[#171717] shadow-xs font-semibold text-bl border"
                                                            : ""
                                                            }`}
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

                                            <CollapsibleContent >
                                                <SidebarMenuSub className='mt-1.5'>
                                                    {item.submenu.map((sub) => {
                                                        if (sub.roles && !sub.roles.includes(userRole)) return null
                                                        const isSubActive =
                                                            normalize(activePath) === normalize(sub.url)

                                                        return (
                                                            <SidebarMenuSubItem key={sub.label} >
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    className={`transition-all  ${isSubActive ? "bg-white shadow-md dark:text-black  font-semibold text-bl border dark:hover:!text-white" : ""
                                                                        }`}
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
                                return (
                                    <SidebarMenuItem key={item.label}>
                                        <SidebarMenuButton
                                            asChild
                                            className={`w-full  py-4 hover:!bg-white hover:!text-black transition-all hover:cursor-pointer ${isActive
                                                ? "bg-white dark:text-white dark:bg-[#171717]  shadow-xs font-semibold text-bl border"
                                                : ""
                                                }`}
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
        </>
    )
}
