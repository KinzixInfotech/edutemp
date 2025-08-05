"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import ConfirmDialog from '@/components/ui/ConfirmDialog'

import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
export default function ManageClassSectionPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId
    const [teachers, setTeachers] = useState([])
    const [className, setClassName] = useState("")
    const [capacity, setCapacity] = useState("")
    const [sectionName, setSectionName] = useState("")
    const [selectedClassId, setSelectedClassId] = useState("")
    const [classes, setClasses] = useState([])
    const [loadingClass, setLoadingClass] = useState(false)
    const [loadingSection, setLoadingSection] = useState(false)
    const [fetchingLoading, setFetchingLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [selectedTeacher, setSelectedTeacher] = useState(null)
    const [selectedClassIdToUpdate, setSelectedClassIdToUpdate] = useState(null)

    useEffect(() => {
        if (schoolId) {
            fetchClasses()
            fetchTeachers()
        }
    }, [schoolId])
    const fetchTeachers = async () => {
        try {
            const res = await fetch(`/api/schools/teaching-staff/${schoolId}`)
            const data = await res.json()
            setTeachers(Array.isArray(data.data) ? data.data : [])
        } catch {
            toast.error("Failed to load teachers")
            setTeachers([])
        }
    }
    const fetchClasses = async () => {
        if (!schoolId) return
        setFetchingLoading(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            const data = await res.json()
            setClasses(Array.isArray(data) ? data : [])
        } catch {
            toast.error("Failed to load classes")
            setClasses([])
        } finally {
            setFetchingLoading(false)
        }
    }
    const handleSupervisorChange = (classId, teacherId) => {
        setSelectedClassIdToUpdate(classId)
        setSelectedTeacher(teacherId)
        setConfirmOpen(true)
    }
    const confirmSupervisorChange = async () => {
        if (!selectedClassIdToUpdate || !selectedTeacher) {
            toast.error("Missing class or teacher selection");
            return;
        }

        try {
            const res = await fetch(`/api/schools/${schoolId}/classes/${selectedClassIdToUpdate}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ teachingStaffUserId: selectedTeacher }),
            });

            if (!res.ok) throw new Error();

            toast.success("Supervisor assigned successfully");
            fetchClasses();
            setConfirmOpen(false);
        } catch (error) {
            console.error("❌ Supervisor assign error:", error);
            toast.error("Failed to assign supervisor");
        }
    };

    const handleAddClass = async () => {
        if (!className) return toast.error("Class name is required")
        setLoadingClass(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: className.toUpperCase(),
                    schoolId,
                    capacity: parseInt(capacity, 10)
                })

            })
            if (!res.ok) throw new Error()
            toast.success("Class created")
            setClassName("")
            fetchClasses()
        } catch {
            toast.error("Failed to create class")
        } finally {
            setLoadingClass(false)
        }
    }

    const handleAddSection = async () => {
        if (!selectedClassId || !sectionName) return toast.error("Class and Section required")
        setLoadingSection(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes/${selectedClassId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: sectionName.toUpperCase() })
            })
            if (!res.ok) throw new Error()
            toast.success("Section added")
            setSectionName("")
            fetchClasses()
        } catch {
            toast.error("Failed to add section")
        } finally {
            setLoadingSection(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={() => setConfirmOpen(false)}
                onConfirm={confirmSupervisorChange}
                title="Confirm Supervisor Assignment"
                description="Are you sure you want to assign this teacher as supervisor? This will override any existing assignment."
                confirmText="Yes, assign"
                confirmName="" // Optional – use if you want type-to-confirm
            />
            <h1 className="text-xl font-semibold">Manage Classes & Sections</h1>

            {/* Create Class */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                    <Input
                        placeholder="Class Name (e.g., 10)"
                        className="uppercase bg-muted"
                        type='number'
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                    />
                    <Input
                        placeholder="capacity"
                        className="uppercase bg-muted"
                        type='number'
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                    />
                    <Button className="text-white flex gap-2 items-center" disabled={loadingClass} onClick={handleAddClass}>
                        {loadingClass && <Loader2 className="animate-spin w-4 h-4" />}
                        Add Class
                    </Button>
                </CardContent>
            </Card>
            {/* Create Section */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                    <Select
                        value={selectedClassId}
                        onValueChange={(value) => setSelectedClassId(value)}
                    >
                        <SelectTrigger className="w-full bg-muted">
                            <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Select Class</SelectItem>
                            {classes.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                    {cls.className}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Section Name (e.g., A)"
                        className="uppercase bg-muted"
                        value={sectionName}
                        onChange={(e) => setSectionName(e.target.value)}
                    />
                    <Button className="text-white flex gap-2 items-center" disabled={loadingSection} onClick={handleAddSection}>
                        {loadingSection && <Loader2 className="animate-spin w-4 h-4" />}
                        Add Section
                    </Button>
                </CardContent>
            </Card>

            {/* Table */}
            <div className="overflow-x-auto overflow-hidden rounded-lg border">

                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[25%]">Class</TableHead>
                            <TableHead className="w-[25%]">Sections</TableHead>
                            <TableHead className="w-[25%]">Capacity</TableHead>
                            <TableHead className="w-[25%]">Class Teacher</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fetchingLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="animate-spin w-4 h-4" />
                                        Loading classes...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : classes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground">
                                    No classes or sections found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            classes.map((cls) => (
                                <TableRow key={cls.id}>
                                    <TableCell>{cls.className}</TableCell>
                                    <TableCell>
                                        {Array.isArray(cls.sections) && cls.sections.length > 0
                                            ? cls.sections.map((sec) => sec.name).join(", ")
                                            : "No sections"}
                                    </TableCell>
                                    <TableCell>{cls.capacity}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={cls.teachingStaffUserId || ""}
                                            onValueChange={(teacherId) => handleSupervisorChange(cls.id, teacherId)}
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Assign Supervisor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {teachers.map((t) => (
                                                    <SelectItem key={t.userId} value={t.userId}>
                                                        {t.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}