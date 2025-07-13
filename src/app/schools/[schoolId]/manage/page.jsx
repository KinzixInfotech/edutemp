"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Command,
    CommandList,
    CommandItem,
} from "@/components/ui/command"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"

export default function ManageSchoolPage() {
    const { toggleSidebar } = useSidebar()
    const profileTabsConfig = {
        teachers: {
            label: "Teachers",
            columns: [
                { key: "name", label: "Name" },
                { key: "class", label: "Class" },
                { key: "dob", label: "DOB" },
                { key: "email", label: "Email" },
                { key: "bloodGroup", label: "Blood" },
            ],
        },
        students: {
            label: "Students",
            columns: [
                { key: "admissionNo", label: "Admission Number" },
                { key: "studentName", label: "Name" },
                { key: "dob", label: "DOB" },
                { key: "gender", label: "Gender" },
                { key: "fatherName", label: "Father Name" },
                { key: "motherName", label: "Mother Name" },
            ],
        },
        parents: {
            label: "Parents",
            columns: [
                { key: "guardianName", label: "Guradian" },
                {
                    key: "childId",
                    label: "Child",
                    render: (id, allProfiles) => {
                        const child = allProfiles.students?.find((s) => s.id === id)
                        if (!child) return "Unknown"
                        return (
                            <Popover>
                                <PopoverTrigger className=" underline cursor-pointer">
                                    {child.name}
                                </PopoverTrigger>
                                <PopoverContent className="w-64">
                                    <Command>
                                        <CommandList>
                                            <CommandItem>Name: {child.name}</CommandItem>
                                            <CommandItem>Class: {child.class}</CommandItem>
                                            <CommandItem>Email: {child.email || "N/A"}</CommandItem>
                                            <CommandItem>DOB: {child.dob || "N/A"}</CommandItem>
                                            <CommandItem>Location: {child.location || "N/A"}</CommandItem>
                                            <CommandItem>Blood Group: {child.bloodGroup || "N/A"}</CommandItem>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )
                    }
                }
            ],
        },
        accountants: {
            label: "Accountants",
            columns: [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "mobile", label: "Mobile" },
                { key: "dob", label: "DOB" },
                { key: "bloodGroup", label: "Blood" },
            ],
        },
        librarians: {
            label: "Librarians",
            columns: [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "dob", label: "DOB" },
                { key: "bloodGroup", label: "Blood" },
                { key: "location", label: "Location" },
            ],
        },
        peons: {
            label: "Peons",
            columns: [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "dob", label: "DOB" },
                { key: "address", label: "Address" },
                { key: "bloodGroup", label: "Blood" },
                { key: "role", label: "Role" },
            ],
        },
        busDrivers: {
            label: "Bus Drivers",
            columns: [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "dob", label: "DOB" },
                { key: "address", label: "Address" },
                { key: "bloodGroup", label: "Blood" },
                { key: "busNumber", label: "Bus #" },
                { key: "studentCount", label: "Student Count" },
            ],
        },
        labAssistants: {
            label: "Lab Assistants",
            columns: [
                { key: "name", label: "Name" },
                { key: "email", label: "Email" },
                { key: "dob", label: "DOB" },
                { key: "address", label: "Address" },
                { key: "bloodGroup", label: "Blood" },
                { key: "labName", label: "Lab" },
            ],
        },
    }
    const router = useRouter()
    const { schoolId } = useParams()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("teachers")
    const [profiles, setProfiles] = useState({})

    const roleTabs = Object.entries(profileTabsConfig).map(([key, val]) => ({
        key,
        label: val.label,
    }))

    const fetchProfiles = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/schools/${schoolId}/profiles`)
            const data = await res.json()
            setProfiles(data)
            toast.success("Profiles loaded")
            // const data = await res.json()
        } catch (err) {
            toast.error("Failed to fetch profiles")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchProfiles()
    }, [schoolId])

    const currentList = profiles[activeTab] || []

    const handleAdd = () => {
        router.push(`/schools/${schoolId}/profiles/${activeTab}/new`)
    }

    const handleDelete = async (profileId) => {
        try {
            const res = await fetch(
                `/api/schools/${schoolId}/profiles/${activeTab}/${profileId}`,
                { method: "DELETE" }
            )
            if (!res.ok) throw new Error()
            setProfiles((prev) => ({
                ...prev,
                [activeTab]: prev[activeTab].filter((p) => p.id !== profileId),
            }))
            toast.success("Profile deleted")
        } catch {
            toast.error("Delete failed")
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold">Manage School: {schoolId}</h1>
                <Button className={'text-white capitalize'} onClick={handleAdd}>Add {activeTab.slice(0, -1)}</Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex w-full overflow-x-auto whitespace-nowrap no-scrollbar gap-2 px-2 sm:px-4">
                    {roleTabs.map((tab) => (
                        <TabsTrigger
                            key={tab.key}
                            value={tab.key}
                            className="flex-shrink-0"
                        >
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>


                {roleTabs.map((tab) => (
                    <TabsContent key={tab.key} value={tab.key} className="pt-4">
                        <Card>
                            <CardContent className="overflow-x-auto min-w-[700px] lg:w-[896px]">
                                <Table className="min-w-[700px] lg:w-[896px] ">
                                    <TableHeader>
                                        <TableRow>
                                            {profileTabsConfig[tab.key].columns.map((col) => (
                                                <TableHead key={col.key}>{col.label}</TableHead>
                                            ))}
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-6">
                                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                        <Loader2 className="animate-spin h-4 w-4" />
                                                        Loading...
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : currentList.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-6">
                                                    No {tab.label} found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            currentList.map((item) => (
                                                <TableRow key={item.id}>
                                                    {profileTabsConfig[tab.key].columns.map((col) => (
                                                        <TableCell key={col.key}>
                                                            {typeof col.render === "function"
                                                                ? col.render(item[col.key], profiles)
                                                                : item[col.key] ?? "-"}
                                                        </TableCell>
                                                    ))}

                                                    <TableCell className="text-right space-x-2">
                                                        <Button size="sm" variant="outline" onClick={() => router.push(`/schools/${schoolId}/profiles/${tab.key}/${item.id}/edit`)}>
                                                            Edit
                                                        </Button>
                                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>
                                                            Delete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}
