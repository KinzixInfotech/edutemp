"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
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

    const [className, setClassName] = useState("")
    const [sectionName, setSectionName] = useState("")
    const [selectedClassId, setSelectedClassId] = useState("")
    const [classes, setClasses] = useState([])
    const [loadingClass, setLoadingClass] = useState(false)
    const [loadingSection, setLoadingSection] = useState(false)
    const [fetchingLoading, setFetchingLoading] = useState(false)

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

    const handleAddClass = async () => {
        if (!className) return toast.error("Class name is required")
        setLoadingClass(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: className.toUpperCase(), schoolId })
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

    useEffect(() => {
        if (schoolId) fetchClasses()
    }, [schoolId])

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-semibold">Manage Classes & Sections</h1>

            {/* Create Class */}
            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                    <Input
                        placeholder="Class Name (e.g., 10)"
                        className="uppercase"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
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
                        <SelectTrigger className="w-full">
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
                        className="uppercase"
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
            <Card>
                <CardContent className="p-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Class</TableHead>
                                <TableHead>Sections</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fetchingLoading ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center py-4">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="animate-spin w-4 h-4" />
                                            Loading classes...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : classes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                                        No classes or sections found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                classes.map((cls) => (
                                    Array.isArray(cls.sections) && cls.sections.length > 0 ? (
                                        cls.sections.map((sec) => (
                                            <TableRow key={`sec-${cls.id}-${sec.id}`}>
                                                <TableCell>{cls.className}</TableCell>
                                                <TableCell>{sec.name}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow key={`cls-${cls.id}`}>
                                            <TableCell>{cls.className}</TableCell>
                                            <TableCell className="text-muted-foreground">No sections</TableCell>
                                        </TableRow>
                                    )
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}