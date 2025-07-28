"use client"

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Link from 'next/link'
import {
    Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card"
import { RefreshCcw } from "lucide-react"
import {
    Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function StudentPage() {

    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    // useParams()
    const [students, setStudents] = useState([])
    const [selectedSession, setSelectedSession] = useState("")
    const [loading, setLoading] = useState(true)
    const fetchStudents = async () => {
        try {
            alert
            const res = await fetch(`/api/schools/${schoolId}/students`)
            const data = await res.json()
            setStudents(data.students)
            console.log(data)
        } catch {
            toast.error("Failed to fetch students")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (schoolId) fetchStudents()
    }, [schoolId])

    const filteredStudents = selectedSession
        ? students.filter((s) => s.session === selectedSession)
        : students
console.log(filteredStudents)
    const sessions = [...new Set((students || []).map((s) => s.session))]
    return (
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
            <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                    <CardTitle className="text-xl">Student List</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button className="bg-primary w-20 transition-all  disabled:bg-gray-500 cursor-pointer  text-white" onClick={() => {
                            setLoading(true)
                            fetchStudents()
                        }} disabled={loading}>

                            {
                                loading ? (
                                    <Loader2 className="animate-spin h-4 w-4" color="black" />
                                ) : 'Refresh'
                            }
                        </Button>
                        {/* <button
                            onClick={() => {
                                setLoading(true)
                                fetchStudents()
                            }}
                            title="Refresh students"
                            className="hover:text-primary transition-colors"
                        >
                            <RefreshCcw className="h-5 w-5" />
                        </button> */}
                        <Select onValueChange={setSelectedSession}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filter by Session" />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions.map((session) => (
                                    <SelectItem key={session} value={session || null}>
                                        {session || null}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Link href={`${schoolId}/profiles/students/new`}>
                            <Button className="bg-primary text-white">Add Student</Button>
                        </Link>
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
                            ) : filteredStudents && filteredStudents.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                                        No students found for this session.
                                    </TableCell>
                                </TableRow>
                            ) : (
                               filteredStudents && filteredStudents.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell><Checkbox aria-label={`Select ${student.studentName}`} /></TableCell>
                                        <TableCell>{student.studentName}</TableCell>
                                        <TableCell>
                                            {student.class ? `${student.class.name} ${student.class.section}` : "-"}
                                        </TableCell>
                                        <TableCell>{student.session}</TableCell>
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
