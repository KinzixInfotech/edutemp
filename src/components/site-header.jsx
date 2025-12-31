import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage, } from "@/components/ui/avatar"
import { ModeToggle } from "./toggle"
import { NavUser } from "./nav-user"
import { UserDropdown } from "./header-menu"
import { Calendar } from "@/components/ui/calendar"
import { Label } from "@/components/ui/label"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ChevronDownIcon, School, SearchIcon } from "lucide-react"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { useCommandMenu } from "./CommandMenuContext"
import { SchoolDetailPopup } from "./school-detail-popup"
import { RequestsDropdown } from "./requests-dropdown"
export function SiteHeader({ fullUser }) {
    console.log(fullUser)
    const { setOpen } = useCommandMenu()
    const [open, setOpenPopover] = useState(false)
    const [date, setDate] = useState(undefined)
    const pathname = usePathname()

    // Define your route → name mapping here
    const pageTitles = [
        { url: "/dashboard", name: "Dashboard" },
        { url: "/dashboard/fees", name: "Fees" },
        { url: "/dashboard/schools/noticeboard", name: "Noticeboard" },
        { url: "/dashboard/fees/fee-structures", name: "All Fee Structures" },
        { url: "/dashboard/manage-students", name: "Manage All Students" },
        { url: "/dashboard/schools/create-classes", name: "All Classes & Sections " },
        { url: "/dashboard/calendar", name: "Manage Calendar" },
    ]
    // Find the longest matching URL (deepest route)
    const currentPage = pageTitles
        .filter((p) => pathname.startsWith(p.url))
        .sort((a, b) => b.url.length - a.url.length)[0]
    return (
        <header
            className="flex sticky z-50 h-[var(--header-height)] shrink-0 items-center gap-2 border-b bg-[#ffffffa3] dark:bg-[#09090b94] backdrop-blur-sm transition-[width,height,top] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]"
            style={{ top: "calc(var(--network-banner-height, 0px) + var(--setup-banner-height, 0px))" }}
        >
            <div className="flex w-full items-center gap-2 px-4 lg:gap-3 lg:px-6 relative">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                <SchoolDetailPopup school={fullUser?.school}>
                    <div className="text-sm border gap-1 inline-flex font-medium capitalize bg-muted px-2 py-1 rounded-lg text-center max-w-[120px] sm:max-w-[200px] cursor-pointer hover:bg-muted/80 transition-colors">
                        <div className="flex items-center gap-1 truncate">
                            <School size={16} className="flex-shrink-0" />
                            <span className="truncate">{fullUser?.school?.name || 'Dashboard'}</span>
                        </div>
                    </div>
                </SchoolDetailPopup>

                {/* Centered Search Bar - Desktop */}
                <div className="absolute hidden md:block left-1/2 -translate-x-1/2 w-full max-w-md px-4">
                    <button
                        className="inline-flex  border h-9 w-full rounded-md bg-muted hover:bg-muted px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-border items-center gap-2"

                        onClick={() => setOpen(true)}
                    >
                        <SearchIcon
                            className="text-muted-foreground"
                            size={16}
                            aria-hidden="true"
                        />
                        <span className="flex-1 text-left font-normal">Search...</span>
                        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    </button>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {/* Mobile Search Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-muted-foreground"
                        onClick={() => setOpen(true)}
                    >
                        <SearchIcon size={20} />
                    </Button>

                    <ModeToggle />

                    {/* Requests Dropdown */}
                    <RequestsDropdown schoolId={fullUser?.school?.id} />

                    {/* User Avatar */}
                    <div className="flex items-center gap-2 pl-2 border-l ml-1">
                        <div className="group relative">
                            <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#4285F4,#EA4335,#FBBC05,#34A853,#4285F4)] animate-[spin_3s_linear_infinite] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <Avatar className="h-8 w-8 rounded-full border-2 border-blue-500 dark:border-blue-400 group-hover:border-transparent transition-all duration-300 relative z-10">
                                <AvatarImage src={fullUser?.profilePicture} alt={fullUser?.name || "User"} className="rounded-full" />
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                                    {fullUser?.name
                                        ? fullUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
                                        : "U"}

                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
