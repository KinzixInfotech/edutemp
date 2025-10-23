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
    const [sectionName, setSectionName] = useState("")
    const [selectedClassId, setSelectedClassId] = useState("")
    const [classes, setClasses] = useState([])
    const [loadingClass, setLoadingClass] = useState(false)
    const [loadingSection, setLoadingSection] = useState(false)
    const [fetchingLoading, setFetchingLoading] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [selectedTeacher, setSelectedTeacher] = useState(null)
    const [selectedClassIdToUpdate, setSelectedClassIdToUpdate] = useState(null)

    const predefinedClasses = [
        { value: "NURSERY", label: "Nursery" },
        { value: "LKG", label: "LKG" },
        { value: "UKG", label: "UKG" },
        { value: "PREP", label: "Prep" },
        { value: "1", label: "I" },
        { value: "2", label: "II" },
        { value: "3", label: "III" },
        { value: "4", label: "IV" },
        { value: "5", label: "V" },
        { value: "6", label: "VI" },
        { value: "7", label: "VII" },
        { value: "8", label: "VIII" },
        { value: "9", label: "IX" },
        { value: "10", label: "X" },
        { value: "11", label: "XI" },
        { value: "12", label: "XII" },
    ]

    const sectionsList = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

    const displayClassName = (name) => {
        const num = parseInt(name, 10)
        if (isNaN(num)) {
            return name
        } else {
            const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
            return romanNumerals[num - 1] || name
        }
    }

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
    const handleSupervisorChange = (sectionId, teacherId) => {
        setSelectedClassIdToUpdate(sectionId) // now this is actually sectionId
        setSelectedTeacher(teacherId)
        setConfirmOpen(true)
    }

    const confirmSupervisorChange = async () => {
        if (!selectedClassIdToUpdate || !selectedTeacher) {
            toast.error("Missing section or teacher selection")
            return
        }

        try {
            const res = await fetch(`/api/schools/${schoolId}/classes/${selectedClassIdToUpdate}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teacherId: selectedTeacher }),
            });
            if (!res.ok) throw new Error()

            toast.success("Supervisor assigned successfully")
            fetchClasses()
            setConfirmOpen(false)
        } catch (error) {
            console.error("❌ Supervisor assign error:", error)
            toast.error("Error:", error)
        }
    }

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
            <h1 className="text-xl font-semibold ">Manage Classes & Sections</h1>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Create Class */}
                <Card>
                    <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                        <Select value={className} onValueChange={setClassName}>
                            <SelectTrigger className="w-full bg-muted">
                                <SelectValue placeholder="Select Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {predefinedClasses.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            className="text-white flex gap-2 items-center"
                            disabled={loadingClass}
                            onClick={handleAddClass}
                        >
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
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id}>
                                        {displayClassName(cls.className)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={sectionName} onValueChange={setSectionName}>
                            <SelectTrigger className="w-full bg-muted">
                                <SelectValue placeholder="Select Section" />
                            </SelectTrigger>
                            <SelectContent>
                                {sectionsList.map((sec) => (
                                    <SelectItem key={sec} value={sec}>
                                        {sec}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            className="text-white flex gap-2 items-center"
                            disabled={loadingSection}
                            onClick={handleAddSection}
                        >
                            {loadingSection && <Loader2 className="animate-spin w-4 h-4" />}
                            Add Section
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <div className="overflow-x-auto overflow-hidden rounded-lg border">

                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[33%]">Class</TableHead>
                            <TableHead className="w-[33%]">Sections</TableHead>
                            <TableHead className="w-[33%]">Class Teacher</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fetchingLoading ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-4">
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <Loader2 className="animate-spin w-4 h-4" />
                                        Loading classes...
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : classes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center text-muted-foreground">
                                    No classes or sections found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            classes.map((cls) =>
                                cls.sections?.length > 0 ? (
                                    cls.sections.map((sec) => (
                                        <TableRow key={sec.id}>
                                            <TableCell>{displayClassName(cls.className)}</TableCell>
                                            <TableCell>{sec.name}</TableCell>
                                            <TableCell>
                                                <Select
                                                    value={sec.teachingStaffUserId || ""}
                                                    onValueChange={(teacherId) =>
                                                        handleSupervisorChange(sec.id, teacherId) // pass sectionId
                                                    }
                                                >
                                                    <SelectTrigger className="w-full">
                                                        <SelectValue placeholder="Assign Class Teacher" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {teachers.length > 0 ? (
                                                            teachers.map((t) => (
                                                                <SelectItem key={t.userId} value={t.userId}>
                                                                    {t.name}
                                                                </SelectItem>
                                                            ))
                                                        ) : (
                                                            <div className="px-2  text-muted-foreground">No Teachers Found</div>
                                                        )}

                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow key={`empty-${cls.id}`}>
                                        <TableCell>{displayClassName(cls.className)}</TableCell>
                                        <TableCell colSpan={2}>No sections</TableCell>
                                    </TableRow>
                                )
                            )
                        )}
                    </TableBody>

                </Table>
            </div>
        </div>
    )
}