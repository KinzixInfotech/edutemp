"use client"
import { useAuth } from '@/context/AuthContext';
import React, { useState } from "react"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/ui/sidebar"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Bell, Check, Globe, Home, Keyboard, Link, Lock, Menu, MessageCircle,
    Paintbrush, Settings, Video
} from "lucide-react"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useSettingsDialog } from "@/context/Settingsdialog-context"
import { ModeToggle } from './toggle';
import { useTheme } from 'next-themes';

const data = {
    nav: [
        { name: "Profile", icon: Home },
        { name: "Attendance", icon: Home },
        { name: "Notifications", icon: Bell },
        { name: "Appearance", icon: Paintbrush },
        { name: "Messages & media", icon: MessageCircle },
    ],
}
const DynamicGoogleMap = ({ locationQuery }) => {
    const encodedQuery = encodeURIComponent(locationQuery);

    const src = `https://www.google.com/maps?q=${encodedQuery}&t=k&output=embed`;
    return (
        <div className="max-w-full rounded-full h-72 px-1 pt-2.5">
            <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                className='rounded-lg'
                referrerPolicy="no-referrer-when-downgrade"
                src={src}
            />
        </div>
    );
};
function ProfileItem({ label, value }) {
    return (
        <div>
            <p className="text-muted-foreground">{label}</p>
            <p>{value || "-"}</p>
        </div>
    );
}

export function SettingsDialog() {
    const { setTheme } = useTheme()
    const { open, setOpen } = useSettingsDialog()
    const [selectedSection, setSelectedSection] = useState("Profile")
    const { fullUser } = useAuth();
    const dob =
        fullUser?.role?.name === "STUDENT"
            ? fullUser?.studentdatafull?.dob
            : fullUser?.teacherdata?.dob || fullUser?.adminData?.dob;
    const renderContent = () => {
        let profileFields = null;
        console.log(fullUser?.role?.name);
        switch (fullUser?.role?.name) {
            case "STUDENT":
                profileFields = (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <ProfileItem label="Admission No" value={fullUser?.studentdatafull?.admissionNo} />
                        <ProfileItem label="Class" value={`${fullUser?.classs?.className || "-"} - ${fullUser?.section?.name || "-"}`} />
                        <ProfileItem label="Email" value={fullUser?.email} />
                        <ProfileItem label="Blood Group" value={fullUser?.studentdatafull?.bloodGroup} />
                        <ProfileItem label="Gender" value={fullUser?.studentdatafull?.gender} />
                        <ProfileItem label="Admission Date" value={new Date(fullUser?.studentdatafull?.admissionDate).toLocaleDateString()} />
                        <ProfileItem label="Roll Number" value={fullUser?.studentdatafull?.rollNumber} />
                        <ProfileItem label="Fee Status" value={fullUser?.studentdatafull?.FeeStatus} />
                        <ProfileItem label="Father Name" value={fullUser?.studentdatafull?.FatherName} />
                        <ProfileItem label="Father Number" value={fullUser?.studentdatafull?.FatherNumber} />
                        <ProfileItem label="Mother Name" value={fullUser?.studentdatafull?.MotherName} />
                        <ProfileItem label="Mother Number" value={fullUser?.studentdatafull?.MotherNumber} />
                        <ProfileItem label="Contact Number" value={fullUser?.studentdatafull?.contactNumber} />
                        <ProfileItem label="House" value={fullUser?.studentdatafull?.House} />
                        <ProfileItem label="City" value={fullUser?.studentdatafull?.city} />
                        <ProfileItem label="State" value={fullUser?.studentdatafull?.state} />
                        <ProfileItem label="Country" value={fullUser?.studentdatafull?.country} />
                        <ProfileItem label="Postal Code" value={fullUser?.studentdatafull?.postalCode} />
                        <ProfileItem label="Address" value={fullUser?.studentdatafull?.Address} />
                        <ProfileItem label="Status" value={fullUser?.studentdatafull?.Status} />
                    </div>
                );
                break;

            case "TEACHER":
                profileFields = (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <ProfileItem label="Name" value={fullUser?.name} />
                        <ProfileItem label="Email" value={fullUser?.email} />
                        <ProfileItem label="Department" value={fullUser?.teacherdata?.department} />
                        <ProfileItem label="Qualification" value={fullUser?.teacherdata?.qualification} />
                        <ProfileItem label="Experience" value={fullUser?.teacherdata?.experience} />
                        <ProfileItem label="Gender" value={fullUser?.teacherdata?.gender} />
                        <ProfileItem label="Contact Number" value={fullUser?.teacherdata?.contactNumber} />
                        <ProfileItem label="Address" value={fullUser?.teacherdata?.address} />
                    </div>
                );
                break;

            case "ADMIN":
                profileFields = (
                    <div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <ProfileItem label="Name" value={fullUser?.name} />
                            <ProfileItem label="User Id" value={fullUser?.id} />
                            <ProfileItem label="Email" value={fullUser?.email} />
                            <ProfileItem label="Role" value={fullUser?.role?.name} />
                            <ProfileItem label="School" value={fullUser?.school?.name} />
                            <ProfileItem label="School Domain" value={fullUser?.school?.domain} />
                            <ProfileItem label="UI Language" value={fullUser?.school?.Language} />
                        </div>
                        <DynamicGoogleMap locationQuery="Ranchi, Jharkhand" />
                    </div>
                );
                break;
            case "SUPER_ADMIN":
                profileFields = (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <ProfileItem label="Name" value={fullUser?.name} />
                        <ProfileItem label="Email" value={fullUser?.email} />
                        <ProfileItem label="Role" value={fullUser?.role?.name} />
                        {/* <ProfileItem label="Contact Number" value={fullUser?.adminData?.contactNumber} /> */}
                    </div>
                );
                break;

            default:
                console.warn("Unknown role:", fullUser?.role?.name);
                profileFields = <p className="text-muted-foreground">No profile information available for this role.</p>;
        }
        if (selectedSection === "Profile") {
            return (
                <div className="space-y-4 ">
                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                            <AvatarImage src={fullUser?.profilePicture} />
                            <AvatarFallback>{fullUser?.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-semibold">{fullUser?.name}</h2>
                            <p>DOB: {dob ? new Date(dob).toLocaleDateString() : "Please Add DOB"}</p>

                        </div>
                    </div>
                    {profileFields}
                </div>
            )
        }
        if (selectedSection === "Appearance") {
            return (
                <div className="space-y-6 p-6 ">
                    {/* Header */}
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight">Appearance</h2>
                        <p className="text-muted-foreground">Customize the look and feel of your profile and app theme.</p>
                    </div>



                    {/* Theme Toggle */}
                    <div className="space-y-2 p-6 rounded-xl   border  max-w-2xl">
                        <label className="text-sm font-medium">Theme</label>
                        <p className="text-sm text-muted-foreground mb-2">
                            Choose between light and dark mode.
                        </p>
                        {/* <ModeToggle /> */}
                        <div className='flex items-center justify-center'>
                            <DropdownMenu >
                                <DropdownMenuTrigger >
                                    <Button variant="outline" size="icon" >
                                        <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                                        <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                                        <span className="sr-only">Toggle theme</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setTheme("light")}>
                                        Light
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                                        Dark
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setTheme("system")}>
                                        System
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            )

        }

        // Default section
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-semibold">{selectedSection}</h2>
                <p className="text-muted-foreground text-sm">
                    Customize your {selectedSection.toLowerCase()} settings here.
                </p>
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-muted/50 aspect-video max-w-3xl rounded-xl"
                    />
                ))}
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
                <DialogTitle className="sr-only">Settings</DialogTitle>
                <DialogDescription className="sr-only">
                    Customize your settings here.
                </DialogDescription>
                <SidebarProvider className="items-start">
                    <Sidebar collapsible="none" className="hidden md:flex ">
                        <SidebarContent>
                            <SidebarGroup className='bg-[#f4f4f5] dark:bg-[#27272a] h-full'>
                                <SidebarGroupContent>
                                    <SidebarMenu>
                                        {data.nav.map((item) => (
                                            <SidebarMenuItem key={item.name}>
                                                <SidebarMenuButton
                                                    asChild
                                                    variant={'default'}
                                                    // isActive={selectedSection === item.name}
                                                    className={`w-full font-semibold hover:cursor-pointer ${selectedSection === item.name ? "bg-white hover:bg-white font-semibold text-black shadow-md " : ""}`}

                                                >
                                                    <button onClick={() => setSelectedSection(item.name)} className="w-full text-left flex items-center gap-2">
                                                        <item.icon className="w-4 h-4" />
                                                        <span>{item.name}</span>
                                                    </button>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        ))}
                                    </SidebarMenu>
                                </SidebarGroupContent>
                            </SidebarGroup>
                        </SidebarContent>
                    </Sidebar>
                    <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
                        <header className="flex h-16 shrink-0 items-center gap-2 px-4">
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink href="#">Account</BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>{selectedSection}</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </header>
                        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
                            {renderContent()}
                        </div>
                    </main>
                </SidebarProvider>
            </DialogContent>
        </Dialog >
    )
}