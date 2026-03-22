"use client"

import * as React from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useAuth } from "@/context/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiGraduationCapDuotone } from "react-icons/pi";
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
    Calendar,
    ScrollText,
    Blocks,
    BookA,
    RouteOff,
    BookOpen,
    School,
    TrendingUp,
    Globe,
    Wallet,
    Receipt,
    HandCoins,
    FileText,
    GraduationCap,
    Images,
    Smartphone,
    Shield,
    Play,
    GalleryHorizontal,
} from "lucide-react"
import { useCommandMenu } from "./CommandMenuContext"
import { cn } from "@/lib/utils"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"

// ─── Sidebar Skeleton ─────────────────────────────────────────────────────────
function SidebarSkeleton({ isCollapsed, sections }) {
    if (isCollapsed) {
        // Count total visible items across all sections (capped at a reasonable max)
        const totalItems = Math.min(
            sections.reduce((sum, s) => sum + s.items.length, 0),
            12
        )
        return (
            <div className="flex flex-col gap-2 p-2">
                {Array.from({ length: totalItems }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-8 rounded-lg" />
                ))}
            </div>
        )
    }
    return (
        <div className="flex flex-col gap-1 px-2 py-2">
            {sections.map((section, sectionIdx) => (
                <div key={sectionIdx} className="py-2">
                    {/* Section title skeleton */}
                    {section.title && (
                        <div className="px-2 mb-2">
                            <Skeleton className="h-3 w-20 rounded-lg" />
                        </div>
                    )}
                    {/* Item skeletons — one per item in this section */}
                    <div className="space-y-1">
                        {section.items.map((_, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                                <Skeleton className="h-4 w-4 rounded-lg shrink-0" />
                                <Skeleton className="h-4 rounded-lg" style={{ width: `${55 + (i * 13) % 35}%` }} />
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

function SidebarFooterSkeleton({ isCollapsed }) {
    if (isCollapsed) {
        return <Skeleton className="h-8 w-8 rounded-full mx-auto my-2" />
    }
    return (
        <div className="flex items-center gap-3 p-3">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24 rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-lg" />
            </div>
        </div>
    )
}

export const SidebarData = [
    {
        // title: "Main",
        items: [
            { label: "Home", url: "/dashboard/", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Self Attendance", url: "/dashboard/markattendance", icon: Newspaper, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            // { label: "Inbox", url: "/dashboard/schools/mail/inbox", icon: Inbox, roles: ["ADMIN"] },
            {
                label: "Notice & Circulars",
                icon: BookCopy,
                roles: ["ADMIN"],
                submenu: [
                    { label: "All Notices", url: "/dashboard/schools/noticeboard", roles: ["ADMIN"] },
                    { label: "Send Notice", url: "/dashboard/schools/manage-notice", roles: ["ADMIN"] },
                ],
            },
            { label: "School Calendar", url: "/dashboard/calendar", icon: Calendar, roles: ["ADMIN"] },

        ],
    },
    {
        title: "Partner Dashboard",
        items: [
            { label: "Home", url: "/dashboard", icon: House, roles: ["PARTNER"] },
            { label: "Leads", url: "/dashboard/partnerprogram/leads", icon: User, roles: ["PARTNER"] },
            { label: "Schools", url: "/dashboard/partnerprogram/schools", icon: School, roles: ["PARTNER"] },
            { label: "Resources", url: "/dashboard/partnerprogram/resources", icon: BookCopy, roles: ["PARTNER"] },
            { label: "Earnings", url: "/dashboard/partnerprogram/earnings", icon: DollarSign, roles: ["PARTNER"] },
            { label: "Profile", url: "/dashboard/partnerprogram/profile", icon: UserPen, roles: ["PARTNER"] },
        ],
    },
    {
        title: "School APP & Web",
        items: [
            { label: "Manage Website", url: "/dashboard/schools/website", icon: MonitorCog, roles: ['ADMIN'] },
            { label: "App Carousel", url: "/dashboard/schools/carousel", icon: GalleryHorizontal, roles: ['ADMIN'] },
            { label: "School Gallery", url: "/dashboard/schools/gallery", icon: Images, roles: ['ADMIN'] },
            { label: "Status Updates", url: "/dashboard/schools/status", icon: Play, roles: ['ADMIN'] },
        ]
    },
    {
        title: "Data Collection",
        items: [
            { label: "Form Builder", url: "/dashboard/forms", icon: FileSpreadsheet, roles: ["ADMIN"] },
            { label: "Media Library", url: "/dashboard/media-library", icon: Library, roles: ["ADMIN"] },
        ]
    },
    {
        title: "Admission  Management",
        items: [
            {
                label: "Admission",
                icon: BookCopy,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "OverView", url: "/dashboard/schools/admissions/overview", roles: ["ADMIN"]
                    },
                    { label: "Forms", url: "/dashboard/schools/admissions/form-settings", roles: ["ADMIN"] },
                    // { label: "Registration Fee", url: "/dashboard/schools/admissions/fees-verification", roles: ["ADMIN"] },
                    { label: "All Applications", url: "/dashboard/schools/admissions/applications", roles: ["ADMIN"] },
                    { label: "Enrolled Students", url: "/dashboard/schools/admissions/enrolled", roles: ["ADMIN"] },
                    { label: "Waitlist/Rejected", url: "/dashboard/schools/admissions/waitlist-rejected", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Marketing",
        items: [
            {
                label: "Partner Program",
                icon: BotMessageSquare,
                roles: ["SUPER_ADMIN"],
                submenu: [
                    {
                        label: "Partner Management", url: "/dashboard/partnerprogram/admin/partners", roles: ["SUPER_ADMIN"]
                    },
                ],
            },
        ],
    },
    {
        title: "School Explorer",
        items: [
            {
                label: "School Explorer",
                icon: Globe,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Public Profile",
                        url: "/dashboard/school-explorer/profile",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Admission Inquiries",
                        url: "/dashboard/school-explorer/inquiries",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Analytics",
                        url: "/dashboard/school-explorer/analytics",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Achievements",
                        url: "/dashboard/school-explorer/achievements",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Facilities",
                        url: "/dashboard/school-explorer/facilities",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Gallery",
                        url: "/dashboard/school-explorer/gallery",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "Reviews",
                        url: "/dashboard/school-explorer/reviews",
                        roles: ["ADMIN"],
                    },

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
                        label: "Admit Card Templates",
                        url: "/dashboard/documents/templates/admit-cards",
                        roles: ["ADMIN"],
                    },
                ],
            },
            {
                label: "Certificates",
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
                    {
                        label: "Bulk Generation",
                        url: "/dashboard/documents/certificates/bulk",
                        roles: ["ADMIN"],
                    },
                    {
                        label: "History / Downloads",
                        url: "/dashboard/documents/certificates/history",
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
                        label: "Bulk Generation",
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
                label: "Settings",
                icon: Settings,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Signature & Stamp Management",
                        url: "/dashboard/documents/settings/stamp-settings",
                        roles: ["ADMIN"],
                    },

                ],
            },
        ],
    },
    {
        title: "Academics & Operations",
        items: [
            { label: "Inventory", url: "/dashboard/schools/inventory", icon: Blocks, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
            { label: "Syllabus Management", url: "/dashboard/schools/syllabus-managment/", icon: ScrollText, roles: ["ADMIN"] },
            { label: "Homework", url: "/dashboard/schools/homework/", icon: BookA, roles: ["ADMIN"] },
        ]
    },
    {
        title: "Staff Management",
        items: [
            {
                label: "Manage Staff", url: "/dashboard/schools/teaching-staff", icon: UserPen, roles: ["ADMIN"],
                submenu: [
                    { label: "Teaching Staff", url: "/dashboard/schools/manage-teaching-staff", roles: ["ADMIN"] },
                    { label: "Non Teaching Staff", url: "/dashboard/schools/manage-non-teaching-staff", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Administration",
        items: [
            { label: "Classes & Sections", url: "/dashboard/schools/create-classes", icon: BookMarked, roles: ["ADMIN"] },
            { label: "Manage Students", url: "/dashboard/schools/manage-student", icon: Baby, roles: ["ADMIN"] },
            { label: "Manage Parents", url: "/dashboard/schools/manage-parent", icon: User, roles: ["ADMIN"] },
            { label: "Academic Years", url: "/dashboard/schools/academic-years", icon: CalendarCog, roles: ["ADMIN"] },
        ]
    },
    {
        title: "Subjects",
        items: [
            {
                label: "Manage Subjects",
                icon: BookOpen,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Subject List", url: "/dashboard/subjects/manage", roles: ["ADMIN"]
                    },
                    {
                        label: "Create Subject", url: "/dashboard/subjects/create", roles: ["ADMIN"]
                    },
                    { label: "Statistics", url: "/dashboard/subjects/stats", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Timetable",
        items: [
            {
                label: "Manage Timetable",
                icon: Calendar,
                roles: ["ADMIN"],
                submenu: [
                    { label: "Overview", url: "/dashboard/timetable/manage", roles: ["ADMIN"] },
                    { label: "Create Timetable", url: "/dashboard/timetable/create", roles: ["ADMIN"] },
                    { label: "Time Slots", url: "/dashboard/timetable/slots", roles: ["ADMIN"] },
                    { label: "Teacher Shifts", url: "/dashboard/teachers/shifts", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Attendance Management",
        items: [
            {
                label: "Manage Attendance",
                icon: Library,
                roles: ["ADMIN"],
                submenu: [
                    {
                        label: "Overview", url: "/dashboard/attendance/dashboard/", roles: ["ADMIN"]
                    },
                    {
                        label: "Attendance Mark", url: "/dashboard/attendance/class-marking/", roles: ["ADMIN"]
                    },
                    {
                        label: "Student Data", url: "/dashboard/attendance/student-history/", roles: ["ADMIN"]
                    },
                    {
                        label: "Teacher Tracking", url: "/dashboard/attendance/teacher-tracking/", roles: ["ADMIN"]
                    },
                    {
                        label: "Attendance Delegations", url: "/dashboard/attendance/delegation/", roles: ["ADMIN"]
                    },
                    {
                        label: "Leave Management", url: "/dashboard/attendance/leave-management/", roles: ["ADMIN"]
                    },
                    {
                        label: "Leave Buckets", url: "/dashboard/attendance/leave-buckets/", roles: ["ADMIN"]
                    },
                    {
                        label: "Attendance Regularization", url: "/dashboard/attendance/regularization/", roles: ["ADMIN"]
                    },
                    {
                        label: "Attendance Reports", url: "/dashboard/attendance/reports/", roles: ["ADMIN"]
                    },

                    {
                        label: "Biometric Devices", url: "/dashboard/attendance/biometric/", roles: ["ADMIN"]
                    },
                    {
                        label: "User Mapping", url: "/dashboard/attendance/user-mapping/", roles: ["ADMIN"]
                    },
                    {
                        label: "Settings", url: "/dashboard/attendance/settings/", roles: ["ADMIN"]
                    },

                ],
            },
        ],
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
                label: "Student Fees",
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
        title: "Payroll Management",
        items: [
            {
                label: "Payroll",
                icon: Wallet,
                roles: ["ADMIN"],
                submenu: [
                    { label: "Overview", url: "/dashboard/payroll/overview", roles: ["ADMIN"] },
                    { label: "Employees", url: "/dashboard/payroll/employees", roles: ["ADMIN"] },
                    { label: "Salary Structures", url: "/dashboard/payroll/salary-structures", roles: ["ADMIN"] },
                    { label: "Run Payroll", url: "/dashboard/payroll/process", roles: ["ADMIN"] },
                    { label: "History", url: "/dashboard/payroll/history", roles: ["ADMIN"] },
                    { label: "Payslips", url: "/dashboard/payroll/payslips", roles: ["ADMIN"] },
                    { label: "Loans & Advances", url: "/dashboard/payroll/loans", roles: ["ADMIN"] },
                    { label: "Reports", url: "/dashboard/payroll/reports", roles: ["ADMIN"] },
                    { label: "Settings", url: "/dashboard/payroll/settings", roles: ["ADMIN"] },
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
                    { label: "Book Requests", url: "/dashboard/schools/library/requests", roles: ["ADMIN"] },
                    { label: "Fines & Reports", url: "/dashboard/schools/library/fines", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "SMS Module",
        items: [
            {
                label: "SMS Management",
                icon: Send,
                roles: ["ADMIN"],
                submenu: [
                    { label: "Templates", url: "/dashboard/schools/sms/templates", roles: ["ADMIN"] },
                    { label: "Send SMS", url: "/dashboard/schools/sms/send", roles: ["ADMIN"] },
                    { label: "Wallet & Credits", url: "/dashboard/schools/sms/wallet", roles: ["ADMIN"] },
                    { label: "SMS Logs", url: "/dashboard/schools/sms/logs", roles: ["ADMIN"] },
                    { label: "Triggers", url: "/dashboard/schools/sms/triggers", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Librarian Dashboard",
        items: [
            { label: "Home", url: "/dashboard", icon: House, roles: ["LIBRARIAN"] },
            { label: "Manage Books", url: "/dashboard/schools/library/catalog", icon: BookOpen, roles: ["LIBRARIAN"] },
            { label: "Issue & Return", url: "/dashboard/schools/library/issue", icon: BookMarked, roles: ["LIBRARIAN"] },
            { label: "Book Requests", url: "/dashboard/schools/library/requests", icon: Inbox, roles: ["LIBRARIAN"] },
            { label: "Fines & Reports", url: "/dashboard/schools/library/fines", icon: Receipt, roles: ["LIBRARIAN"] },
        ],
    },
    {
        title: "Accountant Dashboard",
        items: [
            { label: "Home", url: "/dashboard", icon: House, roles: ["ACCOUNTANT"] },
            { label: "Fee Overview", url: "/dashboard/fees/overview", icon: LayoutDashboard, roles: ["ACCOUNTANT"] },
            { label: "Manage Fee Structure", url: "/dashboard/fees/manage-fee-structure", icon: FileSpreadsheet, roles: ["ACCOUNTANT"] },
            { label: "Assign Structure", url: "/dashboard/fees/assign", icon: ArrowLeftRight, roles: ["ACCOUNTANT"] },
            { label: "Student Fees", url: "/dashboard/fees/payments", icon: CreditCard, roles: ["ACCOUNTANT"] },
            { label: "Reports", url: "/dashboard/fees/reports", icon: BarChart3, roles: ["ACCOUNTANT"] },
            { label: "Fee Settings", url: "/dashboard/fees/settings", icon: Settings, roles: ["ACCOUNTANT"] },
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
                    { label: "Vehicles & Fleet", url: "/dashboard/schools/transport/vehicles", roles: ["ADMIN"] },
                    { label: "Routes", url: "/dashboard/schools/transport/route", roles: ["ADMIN"] },
                    { label: "Bus Stops", url: "/dashboard/schools/transport/stops", roles: ["ADMIN"] },
                    { label: "Drivers", url: "/dashboard/schools/transport/drivers", roles: ["ADMIN"] },
                    { label: "Conductors", url: "/dashboard/schools/transport/conductors", roles: ["ADMIN"] },
                    { label: "Trips", url: "/dashboard/schools/transport/trips", roles: ["ADMIN"] },
                    { label: "Student Assignment", url: "/dashboard/schools/transport/student-assign", roles: ["ADMIN"] },
                    { label: "Bus Requests", url: "/dashboard/schools/transport/requests", roles: ["ADMIN"] },
                    { label: "Live Tracking", url: "/dashboard/transport/live-tracking", roles: ["ADMIN", "PRINCIPAL", "DIRECTOR"] },
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
                        label: "Overview", url: "/dashboard/examination/overview", roles: ["ADMIN"]
                    },
                    {
                        label: "Exam List", url: "/dashboard/examination/manage", roles: ["ADMIN"]
                    },
                    {
                        label: "Create Exam", url: "/dashboard/examination/create", roles: ["ADMIN"]
                    },
                    { label: "Marks Entry", url: "/dashboard/examination/marks", roles: ["ADMIN"] },
                    { label: "Online Results", url: "/dashboard/examination/online-results", roles: ["ADMIN"] },
                    { label: "Hall Tickets", url: "/dashboard/examination/hall-tickets", roles: ["ADMIN"] },
                    { label: "Hall Management", url: "/dashboard/examination/halls", roles: ["ADMIN"] },
                    { label: "Statistics", url: "/dashboard/examination/stats", roles: ["ADMIN"] },
                ],
            },
        ],
    },
    {
        title: "Holistic Progress Card",
        items: [
            {
                label: "HPC Management",
                icon: GraduationCap,
                roles: ["ADMIN"],
                submenu: [
                    { label: "Overview", url: "/dashboard/hpc", roles: ["ADMIN"] },
                    { label: "Competencies", url: "/dashboard/hpc/competencies", roles: ["ADMIN"] },
                    { label: "SEL Parameters", url: "/dashboard/hpc/sel", roles: ["ADMIN"] },
                    { label: "Activities", url: "/dashboard/hpc/activities", roles: ["ADMIN"] },
                    { label: "Stage Templates", url: "/dashboard/hpc/templates", roles: ["ADMIN"] },
                    { label: "Term Control", url: "/dashboard/hpc/terms", roles: ["ADMIN"] },
                    { label: "Reports", url: "/dashboard/hpc/reports", roles: ["ADMIN"] },
                ],
            },
        ],
    },

    {
        title: "Master Admin & Super Admin",
        items: [
            { label: "All Schools", url: "/dashboard/schools/all-schools", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
            { label: "Create Super Admin", url: "/dashboard/edubreezy/add-user", icon: IconListDetails, roles: ["SUPER_ADMIN"] },
            { label: "Audit Log", url: "/dashboard/auditlog", icon: IconChartBar, roles: ["SUPER_ADMIN"] },
            { label: "All Employees", url: "/dashboard/edubreezy/employees", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
            { label: "Add Employee", url: "#", icon: IconReport, roles: ['SUPER_ADMIN'] },
            { label: "Profile Reviews", url: "/dashboard/master-admin/profile-reviews", icon: Shield, roles: ["SUPER_ADMIN"] },
        ],
    },
    {
        title: "SMS Administration",
        items: [
            { label: "SMS Dashboard", url: "/dashboard/edubreezy/sms/dashboard", icon: TrendingUp, roles: ["SUPER_ADMIN"] },
            { label: "DLT Settings", url: "/dashboard/edubreezy/sms/dlt-settings", icon: Settings, roles: ["SUPER_ADMIN"] },
            { label: "Manage Templates", url: "/dashboard/edubreezy/sms/templates", icon: Send, roles: ["SUPER_ADMIN"] },
            { label: "Pricing & Packs", url: "/dashboard/edubreezy/sms/pricing", icon: CreditCard, roles: ["SUPER_ADMIN"] },
            { label: "School Wallets", url: "/dashboard/edubreezy/sms/wallets", icon: Wallet, roles: ["SUPER_ADMIN"] },
            { label: "SMS Logs", url: "/dashboard/edubreezy/sms/logs", icon: FileText, roles: ["SUPER_ADMIN"] },
        ],
    },
    {
        title: "App Management",
        items: [
            { label: "App Config", url: "/dashboard/edubreezy/app-config", icon: Smartphone, roles: ["SUPER_ADMIN"] },
        ],
    },
    {
        title: "Alumni",
        items: [
            { label: "Alumni Management", url: "/dashboard/schools/alumni/", icon: TrendingUp, roles: ["ADMIN"] },
        ],
    },
    {
        title: "Settings",
        items: [
            {
                label: "System Settings",
                icon: Settings,
                roles: ["ADMIN", "SUPER_ADMIN"],
                submenu: [
                    { label: "General Settings", url: "/dashboard/settings", roles: ["ADMIN"] },
                    { label: "Role Management", url: "/dashboard/settings/roles", roles: ["ADMIN"] },
                    { label: "Security & 2FA", url: "/dashboard/schools/settings/security", roles: ["ADMIN", "SUPER_ADMIN"] },
                    { label: "Import / Export Data", url: "/dashboard/schools/settings/import-data", roles: ["ADMIN"] },
                ],
            },
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


import { useAcademicYear } from "@/context/AcademicYearContext";

export function AppSidebar({ ...props }) {
    const { resolvedTheme } = useTheme()
    const { fullUser, loading: authLoading } = useAuth()
    const { setOpen } = useCommandMenu()
    const pathname = usePathname()
    const { state } = useSidebar()

    const {
        switchableYears,
        activeYear,
        selectedYear,
        isViewingPastYear,
        isLoading: yearLoading,
        switchYear,
        resetToActiveYear,
    } = useAcademicYear() || {};

    const isCollapsed = state === "collapsed"
    const isAdmin = fullUser?.role?.name === 'ADMIN';

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader className={'bg-background border-b'}>
                <SidebarMenu>
                    <SidebarMenuItem className=''>
                        <SidebarMenuButton
                            asChild
                            className="data-[slot=sidebar-menu-button]:!p-1.5 h-fit flex items-center justify-center dark:bg-[#171717] bg-background pointer-events-none"
                        >
                            <div>
                                {!isCollapsed ? (
                                    <div className="flex bg-muted p-2 rounded-lg  w-full items-center justify-center">
                                        <Image src={logoBlack} width={195} height={200} alt="EduBreezy" className="dark:hidden block" />
                                        <Image src={logoWhite} width={195} height={200} alt="EduBreezy" className="hidden dark:block" />
                                    </div>
                                ) : (
                                    <div className="bg-muted p-2 rounded-lg ">
                                        <PiGraduationCapDuotone className="text-black dark:text-white group-hover:scale-110  group-hover:text-primary group-hover:cursor-pointer transition-all" size={20} />
                                    </div>
                                )}
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                        {/* Academic Year Skeleton */}
                        {authLoading && !isCollapsed && (
                            <div className="mt-6">
                                <Skeleton className="h-9 w-full rounded-md" />
                            </div>
                        )}
                        {authLoading && isCollapsed && (
                            <div className="mt-1.5 flex justify-center">
                                <Skeleton className="h-9 w-9 rounded-md" />
                            </div>
                        )}
                        {/* Academic Year Switcher — client-side view mode only */}
                        {!authLoading && isAdmin && !yearLoading && switchableYears?.length > 0 && (
                            <>
                                {!isCollapsed ? (
                                    <SidebarMenuButton asChild className={'mt-6'}>
                                        <Select value={selectedYear?.id} onValueChange={(yearId) => switchYear(yearId)} >
                                            <SelectTrigger className="h-9 bg-[#f9fafb] w-full dark:bg-[#171717]  border ">
                                                <SelectValue>
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("h-2 w-2 rounded-full", isViewingPastYear ? "bg-amber-500" : "bg-green-500")}></div>
                                                        <span className="text-sm font-medium truncate">
                                                            {selectedYear ? selectedYear.name : 'Select Session'}
                                                            {isViewingPastYear && <span className="text-[10px] ml-1 opacity-60">(viewing)</span>}
                                                        </span>
                                                    </div>
                                                </SelectValue>
                                            </SelectTrigger>
                                            <SelectContent>
                                                {switchableYears.map((year) => (
                                                    <SelectItem key={year.id} value={year.id}>
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn(
                                                                "h-2 w-2 rounded-full",
                                                                year.isActive ? "bg-green-500" : "bg-transparent border border-muted-foreground"
                                                            )}></div>
                                                            <span>{year.name}</span>
                                                            {year.isActive && <span className="text-[10px] text-green-600 ml-1">(active)</span>}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </SidebarMenuButton>
                                ) : (
                                    <SidebarMenuButton asChild className={'mt-1.5'} tooltip={selectedYear?.name || 'No Session'}>
                                        <div className="h-9 w-9 dark:bg-[#171717] rounded-md bg-white flex items-center justify-center border ">
                                            <div className={cn("h-2.5 w-2.5 rounded-full", isViewingPastYear ? "bg-amber-500" : "bg-green-500")}></div>
                                        </div>
                                    </SidebarMenuButton>
                                )}

                                {/* "Back to active year" button when viewing a different year */}
                                {isViewingPastYear && !isCollapsed && (
                                    <button
                                        onClick={resetToActiveYear}
                                        className="mt-1.5 w-full text-xs text-center py-1 px-2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                                    >
                                        ↩ Back to {activeYear?.name}
                                    </button>
                                )}
                            </>
                        )}
                    </SidebarMenuItem>
                </SidebarMenu>

            </SidebarHeader>
            <SidebarContent
                className={cn(
                    'bg-background  overflow-y-auto',
                    isCollapsed && 'scrollbar-hide-collapsed'
                )}
            >
                {authLoading ? (
                    <SidebarSkeleton isCollapsed={isCollapsed} sections={SidebarData} />
                ) : (
                    <NavSidebarSections
                        sections={SidebarData}
                        userRole={fullUser?.role?.name}
                        activePath={pathname}
                    />
                )}
            </SidebarContent>
            <SidebarFooter className='border-t bg-background'>
                {authLoading ? (
                    <SidebarFooterSkeleton isCollapsed={isCollapsed} />
                ) : (
                    <NavUser user={navUser.user} />
                )}
            </SidebarFooter>
        </Sidebar>
    )
}

