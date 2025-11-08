"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/AuthContext"

import logocllight from '../../public/cl_light_edu.png';
import logocldark from '../../public/cl_dark_edu.png';

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
    useSidebar,
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
import {
    BookCopy, BookMarked, BotMessageSquare, CalendarCog, Car, ChartNoAxesCombined, Coins, DollarSign, Ellipsis, FileBadge, Flag, FlaskRound, Grip, House, IdCard, Inbox, Library, MonitorCog, Newspaper, SearchIcon, Send, Settings, Timer, User, UserPen, LayoutDashboard,
    FileSpreadsheet,
    ArrowLeftRight,
    CreditCard,
    BarChart3,
    Baby,
} from "lucide-react"
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
                        url: "/dashboard/documents/templates/certificate",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "ID Card Templates",
                        url: "/dashboard/documents/templates/id-card",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Admit Card Templates",
                        url: "/dashboard/documents/templates/admit-cards",
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
                        url: "/dashboard/documents/generate/character",
                        roles: ["ADMIN", "TEACHER"],
                    },
                    {
                        label: "Bonafide Certificate",
                        url: "/dashboard/documents/generate/bonafide",
                        roles: ["ADMIN", "TEACHER"],
                    },
                    {
                        label: "Transfer Certificate",
                        url: "/dashboard/documents/generate/transfer",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "School Leaving Certificate",
                        url: "/dashboard/documents/generate/school-leaving",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Competition Certificate",
                        url: "/dashboard/documents/generate/competition",
                        roles: ["ADMIN", "TEACHER"],
                    },
                    {
                        label: "Custom Certificate",
                        url: "/dashboard/documents/generate/custom",
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
                        url: "/dashboard/documents/admitcards/generate",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Bulk Generation (per Class / Exam)",
                        url: "/dashboard/documents/admitcards/bulk",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Download / Print History",
                        url: "/dashboard/documents/admitcards/history",
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
                        url: "/dashboard/documents/idcards/generate",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Design / Customize Layout",
                        url: "/dashboard/documents/idcards/design",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Reissue / Expire Old IDs",
                        url: "/dashboard/documents/idcards/manage",
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
                        url: "/dashboard/documents/settings/stamp-settings",
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
                ],
            },

            { label: "All Schools", url: "/dashboard/schools/all-schools", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
        ],
    },

    {
        title: "Manage Classes",
        items: [
            { label: "Manage Classes", url: "/dashboard/schools/create-classes", icon: BookMarked, roles: ["ADMIN"] },
            { label: "Manage Student", url: "/dashboard/schools/manage-student", icon: Baby, roles: ["ADMIN"] },
            { label: "Manage Parent", url: "/dashboard/schools/manage-parent", icon: User, roles: ["ADMIN"] },
            { label: "Manage Academic Year", url: "/dashboard/schools/academic-years", icon: CalendarCog, roles: ["ADMIN"] },
            { label: "Manage Attendance", url: "/dashboard/attendance/", icon: MonitorCog, roles: ["ADMIN"] },
            { label: "Notices & Circulars", url: "/dashboard/schools/manage-notice", icon: Flag, roles: ["ADMIN"] },
        ]
    },

    {
        title: "Fee Management",
        items: [
            { label: "Overview", url: "/dashboard/fees/overview", icon: LayoutDashboard, roles: ["ADMIN"] },
            {
                label: "Manage Fee Structure",
                icon: FileSpreadsheet,
                url: "/dashboard/fees/manage-fee-structure",
                roles: ["ADMIN"],
            },
            {
                label: "Assign Structure",
                icon: ArrowLeftRight,
                url: "/dashboard/fees/assign",
                roles: ["ADMIN"],
            },
            {
                label: "Track Payments",
                icon: CreditCard,
                url: "/dashboard/fees/payments",
                roles: ["ADMIN"],
            },
            {
                label: "Reports",
                icon: BarChart3,
                url: "/dashboard/fees/reports",
                roles: ["ADMIN"],
            },
            {
                label: "Fee Settings",
                icon: Settings,
                url: "/dashboard/fees/settings",
                roles: ["ADMIN"],
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
                        label: "Create Exam", url: "/dashboard/fees/#", roles: ["ADMIN"]
                    },
                    { label: "Schedule Exam", url: "/dashboard/fees/#", roles: ["ADMIN"] },
                    { label: "Input Marks", url: "/dashboard/fees/#", roles: ["ADMIN"] },
                    { label: "Results & Reports", url: "/dashboard/fees/#", roles: ["ADMIN"] },
                    { label: "Question Banks", url: "/dashboard/fees/#", roles: ["ADMIN"] },
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
    const { setOpen } = useCommandMenu()
    const pathname = usePathname()
    const { state } = useSidebar()

    const logo = resolvedTheme === "dark" ? logoWhite : logoBlack
    const logoCl = resolvedTheme === "dark" ? logocldark : logocllight
    const isCollapsed = state === "collapsed"

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className={'border mb-2.5 rounded-md bg-background shadow-xs'}>
                <SidebarMenu>
                    <SidebarMenuItem className=''>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5 h-fit flex items-center justify-center dark:bg-[#171717] border bg-white pointer-events-none"
                        >
                            <div>
                                {!isCollapsed ? (
                                    <Image src={logo} width={195} height={200} alt="EduBreezy" />
                                ) : (
                                    <Image src={logoCl} width={60} height={40} alt="EduBreezy" className="object-cover" />
                                )}
                            </div>
                        </SidebarMenuButton>
                        {!isCollapsed && (
                            <SidebarMenuButton asChild className={'mt-1.5'}>
                                <button
                                    className="inline-flex h-9 w-fit dark:bg-[#171717] rounded-md bg-white px-3 py-2 text-sm text-muted-foreground/80 mb-0 border shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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
                        )}
                        {isCollapsed && (
                            <SidebarMenuButton asChild className={'mt-1.5'}>
                                <button
                                    className="inline-flex h-9 w-9 dark:bg-[#171717] rounded-md bg-white justify-center items-center text-sm text-muted-foreground/80 mb-0 border shadow-xs transition-[color,box-shadow] outline-none"
                                    onClick={() => setOpen(true)}
                                >
                                    <SearchIcon
                                        className="text-muted-foreground/80 dark:text-white"
                                        size={16}
                                        aria-hidden="true"
                                    />
                                </button>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent className={'bg-background rounded-md border shadow-xs'}>
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