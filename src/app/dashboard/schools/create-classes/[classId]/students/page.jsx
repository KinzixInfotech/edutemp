"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import { Loader2, ArrowLeft, Users, Calendar, Hash, UserCheck } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"

export default function ClassStudentsPage() {
    const params = useParams()
    const router = useRouter()
    const { fullUser } = useAuth()
    const { classId } = params
    const schoolId = fullUser?.schoolId

    const { data: students = [], isLoading } = useQuery({
        queryKey: ['class-students', schoolId, classId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes/${classId}/students`)
            if (!res.ok) throw new Error('Failed to fetch students')
            return res.json()
        },
        enabled: !!schoolId && !!classId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    const { data: classInfo } = useQuery({
        queryKey: ['class-info', schoolId, classId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes?limit=-1`)
            if (!res.ok) throw new Error('Failed to fetch class')
            const classes = await res.json()
            return classes.find(c => c.id === parseInt(classId))
        },
        enabled: !!schoolId && !!classId,
        staleTime: 1000 * 60 * 5,
    })

    const displayClassName = (name) => {
        const num = parseInt(name, 10)
        if (isNaN(num)) return name
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
        return romanNumerals[num - 1] || name
    }

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A'
        try {
            return new Date(dateString).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            })
        } catch {
            return 'Invalid Date'
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Class {classInfo ? displayClassName(classInfo.className) : ''} Students
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {students.length} student{students.length !== 1 ? 's' : ''} enrolled
                    </p>
                </div>
            </div>

            {/* Students Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Student List</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="animate-spin w-6 h-6" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No students found in this class</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Roll No.</TableHead>
                                        <TableHead className="w-[120px]">Admission No.</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="w-[100px]">Section</TableHead>
                                        <TableHead className="w-[120px]">Status</TableHead>
                                        <TableHead className="w-[140px]">Admission Date</TableHead>
                                        <TableHead>Contact</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {students.map((student) => (
                                        <TableRow key={student.userId} className="hover:bg-muted/50">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="h-3 w-3 text-muted-foreground" />
                                                    {student.rollNumber || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {student.admissionNo || 'N/A'}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {student.name || student.user?.name || 'Unknown'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-1 bg-muted rounded text-sm">
                                                    {student.section?.name || 'N/A'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <UserCheck className={`h-3 w-3 ${student.isAlumni ? 'text-orange-500' : 'text-green-500'}`} />
                                                    <span className={`text-sm ${student.isAlumni ? 'text-orange-600' : 'text-green-600'}`}>
                                                        {student.isAlumni ? 'Alumni' : 'Active'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(student.admissionDate)}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {student.contactNumber || 'N/A'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
