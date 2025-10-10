"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command"
import { SidebarData } from "./app-sidebar"
// Import all necessary icons from lucide-react or your icon library
import {
    House,
    Flag,
    BookCopy,
    UserPen,
    ListMinus as IconListDetails,
    ClipboardMinus as IconReport,
    ChartBar as IconChartBar,
    BotMessageSquare,
    Database as IconDatabase,
    BookMarked,
    User,
    CalendarCog,
    MonitorCog,
    DollarSign,
    Coins,
    Library,
    Car,
    FlaskRound,
    Timer,
    Grip,
    UserCircle,
    CircleUserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSettingsDialog } from "@/context/Settingsdialog-context";


export function CommandMenu() {
    const { fullUser } = useAuth()
    const userRole = fullUser?.role?.name;
    const { setOpen } = useSettingsDialog()

    const [open, setOpenCmd] = useState(false)
    const router = useRouter()

    useEffect(() => {
        const down = (e) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpenCmd((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    // const sidebarData = [
    //     {
    //         // title: "Main",
    //         items: [
    //             { label: "Home", url: "/dashboard/", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
    //             { label: "Self Attendance", url: "/dashboard/markattendance", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
    //             { label: "Noticeboard", url: "/dashboard/schools/noticeboard", icon: Flag, roles: ["ADMIN"] },
    //         ],
    //     },
    //     {
    //         title: "Admission Management",
    //         items: [
    //             {
    //                 label: "Manage Admission",
    //                 icon: BookCopy,
    //                 roles: ["ADMIN"],
    //                 submenu: [
    //                     { label: "OverView", url: "/dashboard/schools/admissions/overview", roles: ["ADMIN"] },
    //                     { label: "Form Builder/Settings", url: "/dashboard/schools/admissions/form-settings", roles: ["ADMIN"] },
    //                     { label: "Registration Fee", url: "/dashboard/schools/admissions/fees-verification", roles: ["ADMIN"] },
    //                     { label: "All Applications", url: "/dashboard/schools/admissions/applications", roles: ["ADMIN"] },
    //                     { label: "Enrolled Students", url: "/dashboard/schools/admissions/enrolled", roles: ["ADMIN"] },
    //                     { label: "Waitlist/Rejected", url: "/dashboard/schools/admissions/waitlist-rejected", roles: ["ADMIN"] },
    //                     // { label: "Screening", url: "/dashboard/schools/admissions/screening", roles: ["ADMIN"] },
    //                     // { label: "Shortlisting", url: "/dashboard/schools/admissions/shortlisting", roles: ["ADMIN"] },
    //                     // { label: "Tests/Interviews", url: "/dashboard/schools/admissions/test-interviews", roles: ["ADMIN"] },
    //                     // { label: "Offers", url: "/dashboard/schools/admissions/offers", roles: ["ADMIN"] },
    //                 ],
    //             },
    //         ],
    //     },
    //     {
    //         items: [
    //             { label: "Inventory", url: "/dashboard/schools/inventory", icon: House, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
    //             { label: "Syllabus Management", url: "/dashboard/schools/syllabus-managment/", icon: House, roles: ["ADMIN"] },
    //             { label: "Create Super Admin", url: "/dashboard/edubreezy/add-user", icon: IconListDetails, roles: ["SUPER_ADMIN"] },
    //             { label: "Audit Log", url: "/dashboard/auditlog", icon: IconChartBar, roles: ["SUPER_ADMIN"] },
    //             { label: "Edu AI", url: "/dashboard/schools/eduai", icon: BotMessageSquare, roles: ["ADMIN"] },
    //         ]
    //     },
    //     {
    //         title: "Staff Management",
    //         items: [
    //             {
    //                 label: "Manage Staff", url: "/dashboard/schools/manage-teaching-staff", icon: UserPen, roles: ["ADMIN"],
    //                 submenu: [
    //                     { label: "Manage Teaching Staff", url: "/dashboard/schools/manage-teaching-staff", roles: ["ADMIN"] },
    //                     { label: "Manage Non Teaching Staff", url: "/dashboard/schools/manage-non-teaching-staff", roles: ["ADMIN"] },
    //                     // { label: "Fee Strcuture", url: "/dashboard/fees/manage-fee-structure", roles: ["ADMIN"] },
    //                     // { label: "Report", url: "/dashboard/fees/manage-fee-structure", roles: ["ADMIN"] },
    //                 ],
    //             },
    //             { label: "All Schools", url: "/dashboard/schools/all-schools", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
    //         ],
    //     },
    //     {
    //         title: "Manage Classes",
    //         items: [
    //             { label: "Manage Classes", url: "/dashboard/schools/create-classes", icon: BookMarked, roles: ["ADMIN"] },
    //             { label: "Manage Student", url: "/dashboard/schools/manage-student", icon: User, roles: ["ADMIN"] },
    //             { label: "Manage Academic Year", url: "/dashboard/schools/academic-years", icon: CalendarCog, roles: ["ADMIN"] },
    //             { label: "Manage Attendance", url: "/dashboard/attendance/", icon: MonitorCog, roles: ["ADMIN"] },
    //             { label: "Notices & Circulars", url: "/dashboard/schools/manage-notice", icon: Flag, roles: ["ADMIN"] },
    //         ]
    //     },
    //     {
    //         title: "Fee Management",
    //         items: [
    //             {
    //                 label: "Fee Structure",
    //                 icon: DollarSign,
    //                 roles: ["ADMIN"],
    //                 submenu: [
    //                     { label: "Create Fee Structure", url: "/dashboard/fees/manage-fee-structure", roles: ["ADMIN"] },
    //                     { label: "View Fee Structures", url: "/dashboard/fees/fee-structures", roles: ["ADMIN"] },
    //                     { label: "Custom Fee Structure", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                 ],
    //             },
    //             {
    //                 label: "Fee Manage",
    //                 icon: Coins,
    //                 roles: ["ADMIN"],
    //                 submenu: [
    //                     { label: "Fee Manage", url: "/dashboard/fees/manage-fees", roles: ["ADMIN"] },
    //                     { label: "Payments", url: "/dashboard/fees/payments", roles: ["ADMIN"] },
    //                     { label: "Collect Fee", url: "/dashboard/fees/collect-fee", roles: ["ADMIN"] },
    //                     { label: "Report", url: "/dashboard/fees/report", roles: ["ADMIN"] },
    //                 ],
    //             },
    //         ],
    //     },
    //     {
    //         title: "Library Management",
    //         items: [
    //             {
    //                 label: "Manage Library",
    //                 icon: Library,
    //                 roles: ["ADMIN"],
    //                 submenu: [
    //                     { label: "Manage Books", url: "/dashboard/schools/library/catalog", roles: ["ADMIN"] },
    //                     { label: "Issue & Return", url: "/dashboard/schools/library/issue", roles: ["ADMIN"] },
    //                     // { label: "Book Categories", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                     { label: "Fines & Reports", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                 ],
    //             },
    //         ],
    //     },
    //     {
    //         title: "Transport Management",
    //         items: [
    //             {
    //                 label: "Manage Transport",
    //                 icon: Car,
    //                 roles: ["ADMIN"],
    //                 submenu: [
    //                     { label: "Manage Vehicle & Fleet", url: "/dashboard/schools/transport/vehicles", roles: ["ADMIN"] },
    //                     { label: "Route", url: "/dashboard/schools/transport/route", roles: ["ADMIN"] },
    //                     { label: "Student Assignment", url: "/dashboard/schools/transport/student-assign", roles: ["ADMIN"] },
    //                     // { label: "Fee Management", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                     { label: "Reporting", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                 ],
    //             },
    //         ],
    //     },
    //     {
    //         title: "Examination",
    //         items: [
    //             {
    //                 label: "Manage Exams",
    //                 icon: FlaskRound,
    //                 roles: ["ADMIN"],
    //                 submenu: [
    //                     { label: "Create Exam", url: "/dashboard/fees / manage - fee - structure", roles: ["ADMIN"] },
    //                     { label: "Schedule Exam", url: "/dashboard/fees/fee-structures", roles: ["ADMIN"] },
    //                     { label: "Input Marks", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                     { label: "Results & Reports", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                     { label: "Question Banks", url: "/dashboard/fees/fee-overrides", roles: ["ADMIN"] },
    //                 ],
    //             },
    //         ],
    //     },
    //     {
    //         title: "Edu Employees",
    //         items: [
    //             { label: "All Employees", url: "/dashboard/edubreezy/employees", icon: IconDatabase, roles: ['SUPER_ADMIN'] },
    //             { label: "Add Employee", url: "#", icon: IconReport, roles: ['SUPER_ADMIN'] },
    //         ],
    //     },
    //     {
    //         title: "Almuni",
    //         items: [
    //             { label: "Alumni Management", url: "/dashboard/schools/alumni/", icon: Timer, roles: ["SUPER_ADMIN", "STUDENT", "ADMIN", "MASTER_ADMIN", "TEACHER", "STAFF"] },
    //         ],
    //     },
    //     {
    //         title: "Other Management",
    //         items: [
    //             {
    //                 label: "Additional Management",
    //                 icon: Grip,
    //                 roles: ["ADMIN"],
    //                 submenu: [
    //                     // { label: "Manage Transport ", url: "/dashboard/schools/manage-gallery", roles: ["ADMIN"] },
    //                     { label: "Manage Time Table ", url: "/dashboard/schools/manage-time-table", roles: ["ADMIN"] },
    //                     { label: "Manage Gallery", url: "/dashboard/schools/manage-gallery", roles: ["ADMIN"] },
    //                 ]
    //             },
    //         ]
    //     },
    // ]

    return (
        <CommandDialog open={open} onOpenChange={setOpenCmd}>
            <CommandInput placeholder="Search & Navigate......" />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Profile">
                    <CommandItem
                        onSelect={() => {
                            setOpen(true);
                            setOpenCmd(false);
                        }}
                    >
                        <CircleUserRound className="mr-2 h-4 w-4" /> {/* Icon added here */}
                        Profile
                    </CommandItem>
                </CommandGroup>
                
                {SidebarData.map((section, sectionIndex) => {
                    const visibleItems =
                        section.items?.filter(
                            (item) => !item.roles || item.roles.includes(userRole)
                        ) || [];
                    if (visibleItems.length === 0) return null;

                    return (
                        <CommandGroup key={sectionIndex} heading={section.title}>
                            {visibleItems.map((item, itemIndex) => {
                                if (item.submenu && item.submenu.length > 0) {
                                    const visibleSubItems = item.submenu.filter(
                                        (sub) => !sub.roles || sub.roles.includes(userRole)
                                    );
                                    return visibleSubItems.map((sub, subIndex) => (
                                        <CommandItem
                                            key={`${itemIndex}-${subIndex}`}
                                            onSelect={() => {
                                                router.push(sub.url);
                                                setOpenCmd(false);
                                            }}
                                        >
                                            {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                            {item.label} &gt; {sub.label}
                                        </CommandItem>
                                    ));
                                }

                                return (
                                    <CommandItem
                                        key={itemIndex}
                                        onSelect={() => {
                                            router.push(item.url);
                                            setOpenCmd(false);
                                        }}
                                    >
                                        {item.icon && <item.icon className="mr-2 h-4 w-4" />}
                                        {item.label}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    );
                })}
            </CommandList>
        </CommandDialog>

    )
}