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
import { BookCopy, BookMarked, BotMessageSquare, CalendarCog, Car, Coins, DollarSign, Ellipsis, FileBadge, Flag, FlaskRound, Grip, House, IdCard, Inbox, Library, MonitorCog, Newspaper, SearchIcon, Send, Settings, Timer, User, UserPen } from "lucide-react"
import { useCommandMenu } from "./CommandMenuContext"
export const SidebarData = [
    {
        // title: "Main",
        items: [
            { label: "Home", url: "/dashboard/", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Self Attendance", url: "/dashboard/markattendance", icon: Newspaper, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Inbox", url: "/dashboard/schools/mail/inbox", icon: Inbox, roles: ["ADMIN"] },
            { label: "Noticeboard", url: "/dashboard/schools/noticeboard", icon: Flag, roles: ["ADMIN"] },

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
                    { label: "Form Builder/Settings", url: "/dashboard/schools/admissions/form-settings", roles: ["ADMIN"] },
                    { label: "Registration Fee", url: "/dashboard/schools/admissions/fees-verification", roles: ["ADMIN"] },
                    { label: "All Applications", url: "/dashboard/schools/admissions/applications", roles: ["ADMIN"] },
                    { label: "Enrolled Students", url: "/dashboard/schools/admissions/enrolled", roles: ["ADMIN"] },
                    { label: "Waitlist/Rejected", url: "/dashboard/schools/admissions/waitlist-rejected", roles: ["ADMIN"] },
                    // { label: "Screening", url: "/dashboard/schools/admissions/screening", roles: ["ADMIN"] },
                    // { label: "Shortlisting", url: "/dashboard/schools/admissions/shortlisting", roles: ["ADMIN"] },
                    // { label: "Tests/Interviews", url: "/dashboard/schools/admissions/test-interviews", roles: ["ADMIN"] },
                    // { label: "Offers", url: "/dashboard/schools/admissions/offers", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Documents & Certificates",
        items: [
            {
                label: "Templates",
                icon: BookCopy,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Certificate Templates",
                        url: "/dashboard/schools/documents/templates/certificates",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "ID Card Templates",
                        url: "/dashboard/schools/documents/templates/id-cards",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Admit Card Templates",
                        url: "/dashboard/schools/documents/templates/admit-cards",
                        roles: ["ADMIN"],
                    },
                ],
            },
            {
                label: "Generate Certificates",
                icon: FileBadge,
                roles: ["ADMIN", "TEACHER"],
                submenu: [
                    {
                        label: "Character Certificate",
                        url: "/dashboard/schools/documents/generate/character",
                        roles: ["ADMIN", "TEACHER"],
                    },
                    {
                        label: "Bonafide Certificate",
                        url: "/dashboard/schools/documents/generate/bonafide",
                        roles: ["ADMIN", "TEACHER"],
                    },
                    {
                        label: "Transfer Certificate",
                        url: "/dashboard/schools/documents/generate/transfer",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "School Leaving Certificate",
                        url: "/dashboard/schools/documents/generate/school-leaving",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Competition Certificate",
                        url: "/dashboard/schools/documents/generate/competition",
                        roles: ["ADMIN", "TEACHER"],
                    },
                    {
                        label: "Custom Certificate",
                        url: "/dashboard/schools/documents/generate/custom",
                        roles: ["ADMIN"],
                    },
                ],
            },
            {
                label: "Admit Cards",
                icon: IdCard,

                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Generate Admit Cards",
                        url: "/dashboard/schools/documents/admitcards/generate",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Bulk Generation (per Class / Exam)",
                        url: "/dashboard/schools/documents/admitcards/bulk",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Download / Print History",
                        url: "/dashboard/schools/documents/admitcards/history",
                        roles: ["ADMIN"],
                    },
                ],
            },
            {
                label: "Digital ID Cards",
                icon: IdCard,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Generate Student ID",
                        url: "/dashboard/schools/documents/idcards/generate",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Design / Customize Layout",
                        url: "/dashboard/schools/documents/idcards/design",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Reissue / Expire Old IDs",
                        url: "/dashboard/schools/documents/idcards/manage",
                        roles: ["ADMIN"],
                    },
                ],
            },
            {
                label: "Settings",
                icon: Settings,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Signature & Stamp Management",
                        url: "/dashboard/documents/settings/",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "QR / Verification Settings",
                        url: "/dashboard/documents/settings/qr-settings",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "PDF Output Settings",
                        url: "/dashboard/documents/settings/pdf-export-settings",
                        roles: ["ADMIN"],
                    },
                ],
            },
        ],
    },
    {
        items: [
            { label: "Inventory", url: "/dashboard/schools/inventory", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Syllabus Management", url: "/dashboard/schools/syllabus-managment/", icon: House, roles: ["ADMIN"] },
            { label: "Create Super Admin", url: "/dashboard/edubreezy/add-user", icon: IconListDetails, roles: ["SUPER_ADMIN"] },
            { label: "Audit Log", url: "/dashboard/auditlog", icon: IconChartBar, roles: ["SUPER_ADMIN"] },
            { label: "Edu AI", url: "/dashboard/schools/eduai", icon: BotMessageSquare, roles: ["ADMIN"] },
        ]
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
    const { setOpen } = useCommandMenu();
    const pathname = usePathname()
    const logo = resolvedTheme === "dark" ? logoWhite : logoBlack
    return (
        <Sidebar collapsible="offcanvas" {...props}>
            <SidebarHeader className={'border mb-2.5  rounded-md  bg-background shadow-xs'}>
                <SidebarMenu>
                    <SidebarMenuItem className=''>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5 h-fit flex items-center justify-center dark:bg-[#171717] border bg-white pointer-events-none"
                        >
                            {/* <a href="/"> */}
                            <div>
                                <Image src={logo} width={195} height={200} alt="EduBreezy" />
                            </div>
                            {/* </a> */}
                        </SidebarMenuButton>
                        <SidebarMenuButton asChild className={'mt-1.5'}>
                            <button
                                className="inline-flex h-9 w-fit dark:bg-[#171717] rounded-md  bg-white  px-3 py-2 text-sm  text-muted-foreground/80 mb-0 border shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                onClick={() => setOpen(true)}
                            >
                                <span className="flex grow items-center">
                                    <SearchIcon
                                        className="-ms-1 me-3 text-muted-foreground/80 dark:text-white"
                                        size={16}
                                        aria-hidden="true"
                                    />
                                    <span className="font-normal text-muted-foreground/70">Search</span>
                                </span>
                                <kbd className="ms-12 -me-1 inline-flex h-5 max-h-full items-center rounded border bg-muted px-1 font-[inherit] text-[0.625rem] font-medium dark:text-white text-muted-foreground/70">
                                    ⌘K
                                </kbd>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className={'bg-background rounded-md border shadow-xs'} >

                <NavSidebarSections
                    sections={SidebarData}
                    userRole={fullUser?.role?.name}
                    activePath={pathname}
                />
            </SidebarContent>
            <SidebarFooter className='border-t rounded-md mt-2.5 border shadow-xs bg-background'>
                <NavUser user={navUser.user} />
            </SidebarFooter>
        </Sidebar>
    )
}
