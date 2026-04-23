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
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { SidebarData } from "./app-sidebar"
import { CircleUserRound } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useSettingsDialog } from "@/context/Settingsdialog-context"
import { useLibraryNotifications } from "@/context/LibraryNotificationContext"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "./ui/button"

export default function CommandMenu({ open, setOpen }) {
    const { setTheme } = useTheme()
    const { fullUser } = useAuth()
    const userRole = fullUser?.role?.name
    const { setOpen: setProfileOpen } = useSettingsDialog()
    const router = useRouter()
    const { unseenRequestsCount } = useLibraryNotifications()

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
            <CommandList className={'border-t'}>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Profile" >
                    <CommandItem
                        onSelect={() => {
                            setProfileOpen(true)
                            setOpen(false)
                        }}
                    >
                        <CircleUserRound className="h-5 w-5" />
                        Profile
                    </CommandItem>
                </CommandGroup>
                {/* <CommandGroup heading="System Theme" >
                    <CommandItem
                        onSelect={() => {
                            setProfileOpen(true)
                            setOpen(false)
                        }}
                    >
                        <CircleUserRound className="mr-2 h-4 w-4" />
                        Theme
                        <DropdownMenu  >
                            <DropdownMenuTrigger >
                                <Button variant="outline" size="icon">
                                    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                                    <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                                    <span className="sr-only">Toggle theme</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                
                                <DropdownMenuItem onClick={() => setTheme("light")}>
                                    Light
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("dark")}>
                                    Dark
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme("system")}>
                                    System
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </CommandItem>
                </CommandGroup> */}
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
                                            className="group"
                                            key={`${itemIndex}-${subIndex}`}
                                            onSelect={() => {
                                                router.push(sub.url)
                                                setOpen(false)
                                            }}
                                        >
                                            {item.icon && <item.icon />}
                                            <div className="flex items-center gap-2 flex-1">
                                                <span className="text-zinc-400 dark:text-zinc-500 group-data-[selected=true]:text-white/70">
                                                    {item.label}
                                                    {/* Yellow dot for Manage Library parent */}
                                                    {item.label === "Manage Library" && unseenRequestsCount > 0 && (
                                                        <span className="inline-block ml-1.5 h-2 w-2 bg-yellow-500 rounded-full group-data-[selected=true]:bg-yellow-300" />
                                                    )}
                                                </span>
                                                <span className="text-zinc-300 dark:text-zinc-600 group-data-[selected=true]:text-white/50">/</span>
                                                <span className="group-data-[selected=true]:text-white flex items-center gap-1.5">
                                                    {sub.label}
                                                    {/* Red badge for Book Requests */}
                                                    {sub.label === "Book Requests" && unseenRequestsCount > 0 && (
                                                        <span className="flex items-center justify-center h-4 min-w-[16px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full group-data-[selected=true]:bg-red-400">
                                                            {unseenRequestsCount}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </CommandItem>
                                    ))
                                }

                                return (
                                    <CommandItem
                                        className="group"
                                        key={itemIndex}
                                        onSelect={() => {
                                            router.push(item.url)
                                            setOpen(false)
                                        }}
                                    >
                                        {item.icon && <item.icon />}
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