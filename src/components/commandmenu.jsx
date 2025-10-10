"use client"

import React, { useEffect } from "react"
import { useRouter } from "next/navigation"
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command"
import { SidebarData } from "./app-sidebar"
import { CircleUserRound } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useSettingsDialog } from "@/context/Settingsdialog-context"

export default function CommandMenu({ open, setOpen }) {
    const { fullUser } = useAuth()
    const userRole = fullUser?.role?.name
    const { setOpen: setProfileOpen } = useSettingsDialog()
    const router = useRouter()

    useEffect(() => {
        const down = (e) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((prev) => !prev)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [setOpen])

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Search & Navigate..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Profile">
                    <CommandItem
                        onSelect={() => {
                            setProfileOpen(true)
                            setOpen(false)
                        }}
                    >
                        <CircleUserRound className="mr-2 h-4 w-4" />
                        Profile
                    </CommandItem>
                </CommandGroup>

                {SidebarData.map((section, sectionIndex) => {
                    const visibleItems =
                        section.items?.filter(
                            (item) => !item.roles || item.roles.includes(userRole)
                        ) || []
                    if (visibleItems.length === 0) return null

                    return (
                        <CommandGroup key={sectionIndex} heading={section.title}>
                            {visibleItems.map((item, itemIndex) => {
                                if (item.submenu && item.submenu.length > 0) {
                                    const visibleSubItems = item.submenu.filter(
                                        (sub) => !sub.roles || sub.roles.includes(userRole)
                                    )
                                    return visibleSubItems.map((sub, subIndex) => (
                                        <CommandItem
                                            className="border-t rounded-none"
                                            key={`${itemIndex}-${subIndex}`}
                                            onSelect={() => {
                                                router.push(sub.url)
                                                setOpen(false)
                                            }}
                                        >
                                            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                            {item.label} &gt; {sub.label}
                                        </CommandItem>
                                    ))
                                }

                                return (
                                    <CommandItem
                                        className="border-t rounded-none"
                                        key={itemIndex}
                                        onSelect={() => {
                                            router.push(item.url)
                                            setOpen(false)
                                        }}
                                    >
                                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                        {item.label}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    )
                })}
            </CommandList>
        </CommandDialog>
    )
}
