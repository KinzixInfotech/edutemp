"use client"
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Link from 'next/link'
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import { BrushCleaning, RefreshCw } from 'lucide-react';
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function StudentPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId

    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)

    const [selectedSession, setSelectedSession] = useState("")
    const [selectedClass, setSelectedClass] = useState("")
    const [selectedSection, setSelectedSection] = useState("")
    const [searchTerm, setSearchTerm] = useState("")

    const fetchStudents = async () => {
        try {
            const res = await fetch(`/api/schools/${schoolId}/profiles`)
            const data = await res.json()
            setStudents(data.students)
        } catch {
            toast.error("Failed to fetch students")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (schoolId) fetchStudents()
    }, [schoolId])

    const generateAcademicSessions = (startYear = 2015) => {
        const currentYear = new Date().getFullYear()
        const sessions = []
        for (let year = startYear; year <= currentYear; year++) {
            sessions.push(`${year}-${year + 1}`)
        }
        return sessions.reverse()
    }

    const sessions = generateAcademicSessions()
    const classes = [...new Set(students.map(s => s.class?.className).filter(Boolean))]
    const sections = [...new Set(students.map(s => s.section?.name).filter(Boolean))]

    const filteredStudents = students.filter((s) => {
        const matchSession = selectedSession ? s.academicYear === selectedSession : true
        const matchClass = selectedClass ? s.class?.className === selectedClass : true
        const matchSection = selectedSection ? s.section?.name === selectedSection : true
        const matchSearch = searchTerm
            ? (
                s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.admissionNo?.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : true

        return matchSession && matchClass && matchSection && matchSearch
    })

    const resetFilters = () => {
        setSelectedSession("")
        setSelectedClass("")
        setSelectedSection("")
        setSearchTerm("")
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <CardTitle className="text-xl">Student List</CardTitle>
                    <div className="flex flex-wrap gap-2">

                        <Input
                            placeholder="Search by name, email, or admission no"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-[220px]"
                        />

                        <Select onValueChange={setSelectedSession} value={selectedSession}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Filter by Session" />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions.map((session) => (
                                    <SelectItem key={session} value={session}>
                                        {session}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select onValueChange={setSelectedClass} value={selectedClass}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Filter by Class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls} value={cls}>
                                        {cls}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select onValueChange={setSelectedSection} value={selectedSection}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Filter by Section" />
                            </SelectTrigger>
                            <SelectContent>
                                {sections.map((sec) => (
                                    <SelectItem key={sec} value={sec}>
                                        {sec}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button variant="outline" onClick={resetFilters}>
                            <BrushCleaning />
                        </Button>

                        <Link href={`${schoolId}/profiles/students/new`}>
                            <Button className="bg-primary text-white">Add Student</Button>
                        </Link>

                        <Button
                            className="bg-primary w-20 transition-all disabled:bg-gray-500 text-white"
                            onClick={() => {
                                setLoading(true)
                                fetchStudents()
                            }}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-4 w-4" />
                            ) : <RefreshCw />}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead><Checkbox aria-label="Select all" /></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Session</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-6">
                                        <div className="flex justify-center items-center gap-2 text-muted-foreground">
                                            <Loader2 className="animate-spin h-4 w-4" />
                                            Loading students...
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredStudents.map((student) => (
                                    <TableRow key={student.userId}>
                                        <TableCell>
                                            <Checkbox aria-label={`Select ${student.name}`} />
                                        </TableCell>
                                        <TableCell>{student.name}</TableCell>
                                        <TableCell>
                                            {student.class?.className || "-"} - {student.section?.name || "-"}
                                        </TableCell>
                                        <TableCell>{student.academicYear || "-"}</TableCell>
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
