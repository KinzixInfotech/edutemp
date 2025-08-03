"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/AuthContext"

import logoBlack from "../../public/edu.png"
import logoWhite from "../../public/logo-white.png"

import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

import {
    IconDashboard,
    IconListDetails,
    IconChartBar,
    IconDatabase,
    IconSchool,
    IconReport,
    IconSettings,
    IconHelp,
    IconSearch,
} from "@tabler/icons-react"
import { NavSidebarSections } from "./nav-main"
import { Separator } from "./ui/separator"
const sidebarData = [
    {
        title: "Main",
        items: [
            { label: "Dashboard", url: "/dashboard/", icon: IconDashboard, roles: ["SUPER_ADMIN", "STUDENT"] },
            { label: "Create Super Admin", url: "/dashboard/edubreezy/add-user", icon: IconListDetails, roles: ["SUPER_ADMIN"] },
            { label: "Audit Log", url: "/dashboard/auditlog", icon: IconChartBar, roles: ["SUPER_ADMIN"] },
        ],
    },
    {
        title: "Staff Management",

        items: [
            { label: "Manage Teaching Staff", url: "/dashboard/schools/manage-teaching-staff", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Manage Non Teaching Staff", url: "/dashboard/schools/manage-non-teaching-staff", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "All Schools", url: "/dashboard/schools/all-schools", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
        ],
    },
    {
        title: "Manage Students",
        items: [
            { label: "Manage Students", url: "/dashboard/schools/manage-student", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Manage Alumni ", url: "/dashboard/schools/manage-gallery", icon: IconDatabase, roles: ["ADMIN"] },
        ]
    },
    {
        title: "Manage Classes",
        items: [
            { label: "Manage Classes", url: "/dashboard/schools/create-classes", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Send Notification", url: "/dashboard/schools/send-notifcation", icon: IconDatabase, roles: ["ADMIN"] },
        ]
    },
    {
        title: "Additional Management",
        items: [
            { label: "Manage Transport ", url: "/dashboard/schools/manage-gallery", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Manage Library ", url: "/dashboard/schools/manage-gallery", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "View Fees ", url: "/dashboard/schools/manage-gallery", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Manage Time Table ", url: "/dashboard/schools/manage-time-table", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Manage Examination ", url: "/dashboard/schools/manage-gallery", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Manage Gallery", url: "/dashboard/schools/manage-gallery", icon: IconDatabase, roles: ["ADMIN"] },
        ]
    },
    {

        title: "Manage Fee Collection",
        items: [
            { label: "Manage Fees ", url: "/dashboard/schools/manage-gallery", icon: IconDatabase, roles: ["ADMIN"] },
        ]
    },
    {
        title: "Edu Employees",
        items: [

            { label: "All Employees", url: "/dashboard/edubreezy/employees", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
            { label: "Add Employee", url: "#", icon: IconReport, roles: ['SUPER_ADMIN'] },
        ],
    },


]
const navUser = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    support: {
        title: "General",
        items: [
            { label: "Settings", url: "#", icon: IconSettings },
            { label: "Help", url: "#", icon: IconHelp },
        ],
    },
}
export function AppSidebar({ ...props }) {
    const { resolvedTheme } = useTheme()
    const { fullUser } = useAuth()
    const pathname = usePathname()

    const [mounted, setMounted] = React.useState(false)
    React.useEffect(() => setMounted(true), [])
    if (!mounted) return null

    const logo = resolvedTheme === "dark" ? logoWhite : logoBlack
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className='border-b pb-2'>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="#">
                                <Image src={logo} width={160} height={160} alt="EduBreezy" />
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavSidebarSections
                    sections={sidebarData}
                    userRole={fullUser?.role?.name}
                    activePath={pathname}
                />
            </SidebarContent>
            <SidebarFooter className='border-t'>
                <NavUser user={navUser.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
