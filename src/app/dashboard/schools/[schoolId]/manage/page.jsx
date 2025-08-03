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
    Dialog,
    DialogTrigger,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
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
import { formatDate } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export default function ManageSchoolPage() {
    const { toggleSidebar } = useSidebar()
    const router = useRouter()
    const { schoolId } = useParams()
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState("teachers")
    const [profiles, setProfiles] = useState({})
    const [school, setSchoolData] = useState({});
    const [adminDialogOpen, setAdminDialogOpen] = useState(false)

    useEffect(() => {
        const fetchSchool = async () => {
            try {
                const res = await fetch(`/api/schools/get-school/${schoolId}`);
                const data = await res.json();
                setSchoolData(data.school);
                console.log(data.school);
            } catch (err) {
                console.error("Failed to fetch school:", err);
            }
        };

        fetchSchool();
    }, []);

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
                { key: "name", label: "Name" },
                { key: "dob", label: "DOB" },
                { key: "gender", label: "Gender" },
                { key: "FatherName", label: "Father Name" },
                { key: "MotherName", label: "Mother Name" },
            ],
        },
        parents: {
            label: "Parents",
            columns: [
                { key: "guardianName", label: "Guardian" },
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
                                            <CommandItem>Class: {child.class?.className || "N/A"}</CommandItem>
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

    const roleTabs = Object.entries(profileTabsConfig).map(([key, val]) => ({
        key,
        label: val.label,
    }))

    const fetchProfiles = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/schools/${schoolId}/profiles`)
            const data = await res.json()
            console.log(data, 'from manage')
            setProfiles(data)
            toast.success("Profiles loaded")
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


    const renderValue = (value) => {
        if (typeof value === "object" && value !== null) {
            return value.className || value.name || value.title || "[Object]"
        }
        return value ?? "-"
    }

    return (
        <div className="p-6 space-y-6">

            <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold"></h1>
                <Button className="text-white capitalize" onClick={handleAdd}>
                    Add {activeTab.slice(0, -1)}
                </Button>
            </div>
            <Card className="w-full mt-6 rounded-2xl  border border-border bg-white dark:bg-[#18181b]">
                <div className="flex flex-col md:flex-row items-center gap-6 p-6">
                    {/* School Logo */}
                    <div className="w-24 h-24 flex-shrink-0 overflow-hidden rounded-full border border-gray-300 dark:border-gray-600">
                        <img
                            src={school.profilePicture || "/placeholder.png"}
                            alt={school.name}
                            className="object-cover w-full h-full"
                        />

                    </div>
                    {/* School Info */}
                    <div className="flex-1">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{school.name}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            ID: <span className="underline" >{school.id || "Unknown Location"}</span>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {school.location || "Unknown Location"}
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 text-sm">
                            <div>
                                <p className="text-muted-foreground">School Code</p>
                                <p className="font-medium">{school.schoolCode}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Contact</p>
                                <p className="font-medium">{school.contactNumber || "N/A"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Subscription</p>
                                <p className="font-medium">{school.SubscriptionType || "Free"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Time Zone</p>
                                <p className="font-medium">{school.timezone || "Asia/Kolkata"}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground ">Created At</p>
                                <p className="text-sm font-semibold">
                                    {formatDate(school.createdAt)}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground ">Last Updated At</p>
                                <p className="text-sm font-semibold">
                                    {formatDate(school.updatedAt)}
                                </p>
                            </div>
                            <div>
                                <Dialog open={adminDialogOpen} onOpenChange={setAdminDialogOpen}>
                                    <DialogTrigger asChild>
                                        <div onClick={() => setAdminDialogOpen(true)} className="cursor-pointer">
                                            <p className="text-muted-foreground">Assigned Admin</p>
                                            <p className="text-sm underline font-semibold">View</p>
                                        </div>
                                    </DialogTrigger>

                                    <DialogContent className="max-w-md  dark:border-muted dark:bg-[#18181b]">
                                        <DialogHeader>
                                            <DialogTitle>Assigned Admin</DialogTitle>
                                            <DialogDescription>
                                                Admin linked to this school
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4 mt-4  dark:border-muted dark:bg-[#18181b]">
                                            {school.admins?.length > 0 ? (
                                                school.admins.map((admin, idx) => (
                                                    <div key={idx} className="flex items-center  gap-2">
                                                        <img
                                                            src={admin.User?.profilePicture || "/default.png"}
                                                            alt={admin.User?.name}
                                                            className="w-20 h-20 rounded-full object-cover"
                                                        />
                                                        <div className="bg-muted w-full px-2.5  rounded-lg py-2.5" >
                                                            <p className="font-medium">{admin.User?.name || "Unnamed"}</p>
                                                            <p className="text-sm text-muted-foreground">{admin.User?.email}</p>
                                                            <p className="text-sm text-muted-foreground ">UserId: <span className="underline">{admin.userId}</span> </p>
                                                            <p className="text-sm text-muted-foreground lowercase">Status: {admin.User?.status}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-sm text-muted-foreground">No admins assigned.</p>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>

                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="flex w-full overflow-x-auto whitespace-nowrap no-scrollbar gap-2 px-2 sm:px-4">
                    {roleTabs.map((tab) => (
                        <TabsTrigger key={tab.key} value={tab.key} className="flex-shrink-0">
                            {tab.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {roleTabs.map((tab) => (
                    <TabsContent key={tab.key} value={tab.key} className="pt-4">
                        <Card>
                            <CardContent className="overflow-x-auto min-w-[700px] lg:w-[896px]">
                                <Table className="min-w-[700px] lg:w-[896px]">
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
                                                <TableCell colSpan={99} className="text-center py-6">
                                                    <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                                        <Loader2 className="animate-spin h-4 w-4" />
                                                        Loading...
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : currentList.length === 0 ? (
                                            <TableRow>
                                                {profileTabsConfig[tab.key].columns.map((col) => (
                                                    <TableCell
                                                        key={col.key}
                                                        className="text-center text-muted-foreground"
                                                    >
                                                        No data
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-center text-muted-foreground">
                                                    No actions
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            currentList.map((item) => (
                                                <TableRow key={item.id}>
                                                    {profileTabsConfig[tab.key].columns.map((col) => (
                                                        <TableCell key={col.key}>
                                                            {typeof col.render === "function"
                                                                ? col.render(item[col.key], profiles)
                                                                : renderValue(item[col.key])}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-right space-x-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() =>
                                                                router.push(
                                                                    `/schools/${schoolId}/profiles/${tab.key}/${item.id}/edit`
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
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
