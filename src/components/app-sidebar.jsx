"use client"

import * as React from "react"
import {
    IconCamera,
    IconChartBar,
    IconDashboard,
    IconDatabase,
    IconFileAi,
    IconFileDescription,
    IconFileWord,
    IconFolder,
    IconHelp,
    IconInnerShadowTop,
    IconListDetails,
    IconReport,
    IconSearch,
    IconSettings,
    IconUsers,
} from "@tabler/icons-react"
import Image from 'next/image';
import { useTheme } from 'next-themes';
import logoBlack from '../../public/logo-black.png';
import logoWhite from '../../public/logo-white.png';

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
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

const data = {
    user: {
        name: "shadcn",
        email: "m@example.com",
        avatar: "/avatars/shadcn.jpg",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/dashboard/",
            icon: IconDashboard,
        },
        {
            title: "Create admin user",
            url: "#",
            icon: IconListDetails,
        },
        {
            title: "Analytics",
            url: "#",
            icon: IconChartBar,
        },

    ],
    clouds: [
        {
            title: "Capture",
            icon: IconCamera,
            isActive: true,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Proposal",
            icon: IconFileDescription,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
        {
            title: "Prompts",
            icon: IconFileAi,
            url: "#",
            items: [
                {
                    title: "Active Proposals",
                    url: "#",
                },
                {
                    title: "Archived",
                    url: "#",
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "Settings",
            url: "#",
            icon: IconSettings,
        },
        {
            title: "Get Help",
            url: "#",
            icon: IconHelp,
        },
        {
            title: "Search",
            url: "#",
            icon: IconSearch,
        },
    ],
    documents: [
        {
            name: "Create School",
            url: "/dashboard/schools/create-school",
            icon: IconDatabase,
        },
        {
            name: "All Schools",
            url: "/dashboard/schools/all-schools",
            icon: IconReport,
        },
        {
            name: "School Subscription",
            url: "#",
            icon: IconFileWord,
        },
    ],
    schoolSetting: [
        {
            name: "Add Classes",
            url: "/dashboard/schools/create-classes",
            icon: IconDatabase,
        },
        {
            name: "Add Students",
            url: "/dashboard/schools/create-students",
            icon: IconDatabase,
        },
        {
            name: "Add Teaching Staff",
            url: "/dashboard/schools/create-classes",
            icon: IconDatabase,
        },
        {
            name: "Add Non-Teaching Staff",
            url: "/dashboard/schools/create-classes",
            icon: IconDatabase,
        },

    ],
    eduemployes: [
        {
            name: "All Employees",
            url: "/dashboard/create-school",
            icon: IconDatabase,
        },
        {
            name: "Add Employee",
            url: "#",
            icon: IconReport,
        },
        {
            name: "Teams",
            url: "#",
            icon: IconReport,
        },
    ],
}

export function AppSidebar({ ...props }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null; // prevent hydration mismatch

    const logo = resolvedTheme === 'dark' ? logoWhite : logoBlack;

    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem >
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5"
                        >
                            <a href="#">
                                <img src={logo.src} width={160} height={160} alt="EduBreezy" />
                            </a>
                        </SidebarMenuButton>
                        <span className="text-sm font-medium ml-2">A Kinzix product</span>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain} />
                <NavDocuments items={data.schoolSetting} name="School Setting" />
                <NavDocuments items={data.documents} name="Edu School Settings" />
                <NavDocuments items={data.eduemployes} name="Edu employes" />
                <NavSecondary items={data.navSecondary} className="mt-auto" />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user} />
            </SidebarFooter>
        </Sidebar>
    );
}

