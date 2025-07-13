"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function AddClassPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    if (!schoolId) {
        return (
            <div className="p-6 text-red-500 font-medium">
                Error: School ID not available. Please log in or select a school.
            </div>
        )
    }
    const [className, setClassName] = useState("")
    const [section, setSection] = useState("")
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(false)
    const [fetchingLoading, setFetchingLoading] = useState(false)

    const fetchClasses = async () => {
        setFetchingLoading(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            const data = await res.json()
            setClasses(data)
        } catch {
            toast.error("Failed to load classes")
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
                    section: section.toUpperCase(),
                })
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
                                <TableHead>Section</TableHead>
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
                                        No classes found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                classes.map((cls) => (
                                    <TableRow key={cls.id}>
                                        <TableCell>{cls.name}</TableCell>
                                        <TableCell>{cls.section}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
