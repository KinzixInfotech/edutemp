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
import { BookCopy, BookMarked, BotMessageSquare, CalendarCog, Car, Coins, DollarSign, Ellipsis, Flag, FlaskRound, Grip, House, Library, MonitorCog, Send, Timer, User, UserPen } from "lucide-react"
const sidebarData = [
    {
        // title: "Main",
        items: [
            { label: "Home", url: "/dashboard/", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Self Attendance", url: "/dashboard/markattendance", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Inventory", url: "/dashboard/schools/inventory", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Noticeboard", url: "/dashboard/schools/noticeboard", icon: Flag, roles: ["ADMIN"] },
            { label: "Syllabus Management", url: "/dashboard/schools/syllabus-managment/", icon: House, roles: ["ADMIN"] },
            { label: "Create Super Admin", url: "/dashboard/edubreezy/add-user", icon: IconListDetails, roles: ["SUPER_ADMIN"] },
            { label: "Audit Log", url: "/dashboard/auditlog", icon: IconChartBar, roles: ["SUPER_ADMIN"] },
            { label: "Edu AI", url: "/dashboard/schools/eduai", icon: BotMessageSquare, roles: ["ADMIN"] },
        ],
    },
    {
        title: "Staff Management",
        items: [
            {
                label: "Manage Staff", url: "/dashboard/schools/manage-teaching-staff", icon: UserPen, roles: ["ADMIN"],
                submenu: [
                    { label: "Manage Teaching Staff", url: "/dashboard/schools/manage-teaching-staff", roles: ["ADMIN"] },
                    { label: "Manage Non Teaching Staff", url: "/dashboard/schools/manage-non-teaching-staff", roles: ["ADMIN"] },
                    // { label: "Fee Strcuture", url: "/dashboard/fees/manage-fee-structure", roles: ["ADMIN"] },
                    // { label: "Report", url: "/dashboard/fees/manage-fee-structure", roles: ["ADMIN"] },
                ],
            },

            { label: "All Schools", url: "/dashboard/schools/all-schools", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
        ],
    },
    {
        title: "Manage Classes",
        items: [
            { label: "Manage Classes", url: "/dashboard/schools/create-classes", icon: BookMarked, roles: ["ADMIN"] },
            { label: "Manage Student", url: "/dashboard/schools/manage-student", icon: User, roles: ["ADMIN"] },
            { label: "Manage Academic Year", url: "/dashboard/schools/academic-years", icon: CalendarCog, roles: ["ADMIN"] },
            { label: "Manage Attendance", url: "/dashboard/attendance/", icon: MonitorCog, roles: ["ADMIN"] },
            { label: "Notices & Circulars", url: "/dashboard/schools/manage-notice", icon: Flag, roles: ["ADMIN"] },
        ]
    },

    {
        title: "Fee Management",
        items: [
            {
                label: "Fee Structure",
                icon: DollarSign,
                roles: ["ADMIN"],
                submenu: [
                    { label: "Create Fee Structure", url: "/dashboard/fees/manage-fee-structure", roles: ["ADMIN"] },
                    { label: "View Fee Structures", url: "/dashboard/fees/fee-structures", roles: ["ADMIN"] },
                    { label: "Custom Fee Structure", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                ],
            },
            {
                label: "Fee Manage",
                icon: Coins,
                roles: ["ADMIN"],
                submenu: [
                    { label: "Fee Manage", url: "/dashboard/fees/manage-fees", roles: ["ADMIN"] },
                    { label: "Payments", url: "/dashboard/fees/payments", roles: ["ADMIN"] },
                    { label: "Collect Fee", url: "/dashboard/fees/collect-fee", roles: ["ADMIN"] },
                    { label: "Report", url: "/dashboard/fees/report", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Library Management",
        items: [
            {
                label: "Manage Library",
                icon: Library,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Manage Books", url: "/dashboard/schools/library/catalog", roles: ["ADMIN"]
                    },
                    { label: "Issue & Return", url: "/dashboard/schools/library/issue", roles: ["ADMIN"] },
                    // { label: "Book Categories", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                    { label: "Fines & Reports", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Transport Management",
        items: [
            {
                label: "Manage Transport",
                icon: Car,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Manage Vehicle & Fleet", url: "/dashboard/schools/transport/vehicles", roles: ["ADMIN"]
                    },
                    { label: "Route", url: "/dashboard/schools/transport/route", roles: ["ADMIN"] },
                    { label: "Student Assignment", url: "/dashboard/schools/transport/student-assign", roles: ["ADMIN"] },

                    // { label: "Fee Management", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                    { label: "Reporting", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Examination",
        items: [
            {
                label: "Manage Exams",
                icon: FlaskRound,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Create Exam", url: "/dashboard/fees / manage - fee - structure", roles: ["ADMIN"]
                    },
                    { label: "Schedule Exam", url: "/dashboard/fees/fee-structures", roles: ["ADMIN"] },
                    { label: "Input Marks", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                    { label: "Results & Reports", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                    { label: "Question Banks", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Admission  Management",
        items: [
            {
                label: "Manage Admission",
                icon: BookCopy,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "OverView", url: "/dashboard/schools/admissions/overview", roles: ["ADMIN"]
                    },
                    { label: "Applications", url: "/dashboard/schools/admissions/applications", roles: ["ADMIN"] },
                    // { label: "Screening", url: "/dashboard/schools/admissions/screening", roles: ["ADMIN"] },
                    // { label: "Shortlisting", url: "/dashboard/schools/admissions/shortlisting", roles: ["ADMIN"] },
                    { label: "Tests/Interviews", url: "/dashboard/schools/admissions/test-interviews", roles: ["ADMIN"] },
                    { label: "Offers", url: "/dashboard/schools/admissions/offers", roles: ["ADMIN"] },
                    { label: "Fee & Document Verification", url: "/dashboard/schools/admissions/fees-verification", roles: ["ADMIN"] },
                    { label: "Enrolled Students", url: "/dashboard/schools/admissions/enrolled", roles: ["ADMIN"] },
                    { label: "Waitlist/Rejected", url: "/dashboard/schools/admissions/waitlist-rejected", roles: ["ADMIN"] },
                    { label: "Form Builder/Settings", url: "/dashboard/schools/admissions/form-settings", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Edu Employees",
        items: [

            { label: "All Employees", url: "/dashboard/edubreezy/employees", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
            { label: "Add Employee", url: "#", icon: IconReport, roles: ['SUPER_ADMIN'] },
        ],
    },
    {
        title: "Almuni",
        items: [
            { label: "Alumni Management", url: "/dashboard/schools/alumni/", icon: Timer, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
        ],
    },
    {
        title: "Other Management",
        items: [
            {
                label: "Additional Management",
                icon: Grip,
                roles: ["ADMIN"],
                submenu: [
                    // { label: "Manage Transport ", url: "/dashboard/schools/manage-gallery", roles: ["ADMIN"] },
                    { label: "Manage Time Table ", url: "/dashboard/schools/manage-time-table", roles: ["ADMIN"] },
                    { label: "Manage Gallery", url: "/dashboard/schools/manage-gallery", roles: ["ADMIN"] },
                ]
            },

        ]
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
    const logo = resolvedTheme === "dark" ? logoWhite : logoBlack
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem className='border-b pb-2'>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5 h-fit flex items-center justify-center pointer-events-none"
                        >
                            {/* <a href="/"> */}
                            <div>
                                <Image src={logo} width={210} height={200} alt="EduBreezy" />
                            </div>
                            {/* </a> */}
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
