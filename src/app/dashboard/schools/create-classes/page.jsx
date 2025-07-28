"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function AddClassPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId

    const [className, setClassName] = useState("")
    const [section, setSection] = useState("")
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetchingLoading, setFetchingLoading] = useState(false)

    const fetchClasses = async () => {
        if (!schoolId) return
        setFetchingLoading(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            const data = await res.json()
            // ✅ Defensive: ensure array
            if (Array.isArray(data)) {
                setClasses(data)
            } else {
                setClasses([])
                console.error("Unexpected data format:", data)
            }
        } catch (err) {
            toast.error("Failed to load classes")
            setClasses([])
        } finally {
            setFetchingLoading(false)
        }
    }

    const handleAddClass = async () => {
        if (!className || !section) return toast.error("Class and section required")
        setLoading(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: className.toUpperCase(),
                    sections: [section.toUpperCase()],
                }),
            })
            if (!res.ok) throw new Error()
            toast.success("Class added")
            setClassName("")
            setSection("")
            fetchClasses()
        } catch {
            toast.error("Failed to add class")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (schoolId) fetchClasses()
    }, [schoolId])

    if (!schoolId) {
        return <div className="p-6 text-red-500 font-medium">School ID not available.</div>
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-semibold">Manage Classes</h1>

            <Card>
                <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                    <Input
                        placeholder="Class Name (e.g., 10)"
                        className="uppercase"
                        value={className}
                        onChange={(e) => setClassName(e.target.value)}
                    />
                    <Input
                        placeholder="Section (e.g., A)"
                        className="uppercase"
                        value={section}
                        onChange={(e) => setSection(e.target.value)}
                    />
                    <Button className="text-white flex gap-2 items-center" disabled={loading} onClick={handleAddClass}>
                        {loading && <Loader2 className="animate-spin w-4 h-4" />}
                        Add Class
                    </Button>
                </CardContent>
            </Card>

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
                                classes.map((cls) =>
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
                                )
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
