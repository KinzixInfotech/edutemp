import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
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
import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"
export function SiteHeader() {
    const[open, setOpen] = useState(false)
    const [date, setDate] = useState(undefined)

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b bg-transparent  dark:bg-transparent transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 ">
                <SidebarTrigger className="-ml-1" />
                <Separator
                    orientation="vertical"
                    className="mx-2 data-[orientation=vertical]:h-4"
                />
                <h1 className="text-base font-medium">Dashboard</h1>
                <div className="ml-auto flex items-center gap-2">

                    {/* <UserDropdown /> */}
                    <ModeToggle />
                </div>
            </div>
        </header>
    )
}
