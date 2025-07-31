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
const sidebarData = [
    {
        title: "Main",
        items: [
            { label: "Dashboard", url: "/dashboard/", icon: IconDashboard, roles: ["SUPER_ADMIN", "STUDENT"] },
            { label: "Create Superadmin", url: "/dashboard/edubreezy/add-user", icon: IconListDetails, roles: ["SUPER_ADMIN"] },
            { label: "Analytics", url: "#", icon: IconChartBar, roles: ["SUPER_ADMIN"] },
        ],
    },
    {
        title: "School Settings",
        items: [
            { label: "Add Classes", url: "/dashboard/schools/create-classes", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Add Students", url: "/dashboard/schools/create-students", icon: IconDatabase, roles: ["ADMIN"] },
        ],
        items: [
            { label: "All Schools", url: "/dashboard/schools/all-schools", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
            { label: "Add Students", url: "/dashboard/schools/create-students", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Add Teacher", url: "/dashboard/schools/add-teacher", icon: IconDatabase, roles: ["ADMIN"] },
            { label: "Add ", url: "/dashboard/schools/create-students", icon: IconDatabase, roles: ["ADMIN"] },
        ],
    },
    {
        title: "Edu Employees",
        items: [
            { label: "All Employees", url: "/dashboard/edubreezy/add-user", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
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
// const data = {

//     navMain: [
//         { title: "Dashboard", url: "/dashboard", icon: IconDashboard, roles: ["SUPERADMIN"] },
//         { title: "Create admin user", url: "#", icon: IconListDetails, roles: ["SUPERADMIN"] },
//         { title: "Analytics", url: "#", icon: IconChartBar, roles: ["SUPERADMIN"] },
//     ],
//     schoolSetting: [
//         { title: "Add Classes", url: "/dashboard/schools/create-classes", icon: IconDatabase, roles: ["ADMIN"] },
//         { title: "Add Students", url: "/dashboard/schools/create-students", icon: IconDatabase, roles: ["ADMIN"] },
//         { title: "Add Teaching Staff", url: "/dashboard/schools/create-classes", icon: IconDatabase, roles: ["ADMIN"] },
//         { title: "Add Non-Teaching Staff", url: "/dashboard/schools/create-classes", icon: IconDatabase, roles: ["ADMIN"] },
//     ],
//     documents: [
//         { title: "All Schools", url: "/dashboard/schools/all-schools", icon: IconSchool },
//     ],
//     eduemployes: [
//         { title: "All Employees", url: "/dashboard/create-school", icon: IconDatabase },
//         { title: "Add Employee", url: "#", icon: IconReport },
//         { title: "Teams", url: "#", icon: IconReport },
//     ],
//     navSecondary: [
//         { title: "Settings", url: "#", icon: IconSettings },
//         { title: "Get Help", url: "#", icon: IconHelp },
//         { title: "Search", url: "#", icon: IconSearch },
//     ],
// }

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
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="#">
                                <Image src={logo} width={160} height={160} alt="EduBreezy" />
                            </a>
                        </SidebarMenuButton>
                        <span className="text-sm font-medium ml-2">A Kinzix product</span>
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

            <SidebarFooter>
                {/* <NavSecondary items={navUser.support} className="mt-auto" /> */}
                <NavUser user={navUser.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
