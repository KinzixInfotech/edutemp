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

import {
    Bell, Check, Globe, Home, Keyboard, Link, Lock, Menu, MessageCircle,
    Paintbrush, Settings, Video
} from "lucide-react"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useSettingsDialog } from "@/context/Settingsdialog-context"

const data = {
    nav: [
        { name: "Profile", icon: Home },
        { name: "Notifications", icon: Bell },
        { name: "Navigation", icon: Menu },
        { name: "Appearance", icon: Paintbrush },
        { name: "Messages & media", icon: MessageCircle },
        { name: "Language & region", icon: Globe },
        { name: "Accessibility", icon: Keyboard },
        { name: "Mark as read", icon: Check },
        { name: "Audio & video", icon: Video },
        { name: "Connected accounts", icon: Link },
        { name: "Privacy & visibility", icon: Lock },
        { name: "Advanced", icon: Settings },
    ],
}
function ProfileItem({ label, value }) {
    return (
        <div>
            <p className="text-muted-foreground">{label}</p>
            <p>{value || "-"}</p>
        </div>
    );
}
// Simulated profile data
const currentUser = {
    name: "John Doe",
    dob: "2002-06-15",
    role: "student", // or teacher, parent, etc.
    photo: "https://api.dicebear.com/7.x/lorelei/svg?seed=John",
    extra: {
        admissionNo: "ADM123",
        class: "10-A",
        bloodGroup: "O+",
        email: "john@example.com",
    },
}

export function SettingsDialog() {
    const { open, setOpen } = useSettingsDialog()
    const [selectedSection, setSelectedSection] = useState("Profile")
    const { fullUser } = useAuth();
    const renderContent = () => {
        if (selectedSection === "Profile") {
            return (
                <div className="space-y-4">
                    {/* Avatar & Name */}

                    <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16">
                            <AvatarImage src={fullUser?.profilePicture} />
                            <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-xl font-semibold">{fullUser?.name}</h2>
                            <p>DOB: {fullUser?.studentdatafull?.dob ? new Date(fullUser?.studentdatafull?.dob).toLocaleDateString() : "Please Add DOB"}</p>
                        </div>
                    </div>

                    {/* Profile Fields */}
                    {currentUser.role === "student" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <ProfileItem label="Admission No" value={fullUser?.studentdatafull?.admissionNo} />
                            <ProfileItem
                                label="Class"
                                value={`${fullUser?.classs?.className || "-"} - ${fullUser?.section?.name || "-"}`}
                            />
                            <ProfileItem label="Email" value={fullUser?.email} />
                            <ProfileItem label="Blood Group" value={fullUser?.studentdatafull?.bloodGroup} />
                            <ProfileItem label="Gender" value={fullUser?.studentdatafull?.gender} />
                            <ProfileItem
                                label="Admission Date"
                                value={new Date(fullUser?.studentdatafull?.admissionDate).toLocaleDateString()}
                            />
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
                    )}
                </div>
            );
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
