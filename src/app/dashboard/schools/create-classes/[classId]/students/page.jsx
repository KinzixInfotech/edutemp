"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Loader2, ArrowLeft, Users, Calendar, Hash, UserCheck,
    Search, Download, X, Eye, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, GraduationCap, User2,
    FileSpreadsheet, Filter, RefreshCw,
} from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"
import * as XLSX from 'xlsx'
import { toast } from "sonner"

// ─── Display helpers ───────────────────────────────────────────────
function displayClassName(name) {
    const num = parseInt(name, 10)
    if (isNaN(num)) return name
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    return romanNumerals[num - 1] || name
}

function formatDate(dateString) {
    if (!dateString) return 'N/A'
    try {
        return new Date(dateString).toLocaleDateString('en-IN', {
            year: 'numeric', month: 'short', day: 'numeric'
        })
    } catch { return 'Invalid Date' }
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function ClassStudentsPage() {
    const params = useParams()
    const router = useRouter()
    const { fullUser } = useAuth()
    const queryClient = useQueryClient()
    const { classId } = params
    const schoolId = fullUser?.schoolId

    // State
    const [searchQuery, setSearchQuery] = useState("")
    const debouncedSearch = useDebounce(searchQuery, 400)
    const [sectionFilter, setSectionFilter] = useState("all")
    const [statusFilter, setStatusFilter] = useState("active")
    const [genderFilter, setGenderFilter] = useState("all")
    const [sortBy, setSortBy] = useState("roll_asc")
    const [page, setPage] = useState(1)
    const [selectedIds, setSelectedIds] = useState(new Set())
    const limit = 20

    // Reset page on filter change
    useEffect(() => { setPage(1) }, [debouncedSearch, sectionFilter, statusFilter, genderFilter])

    // ─── Queries ───────────────────────────────────────────────────
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

    const { data: studentsData, isLoading, isFetching } = useQuery({
        queryKey: ['class-students', schoolId, classId, debouncedSearch, sectionFilter, statusFilter, genderFilter, sortBy, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
                sortBy,
            })
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (sectionFilter !== "all") params.set("sectionId", sectionFilter)
            if (statusFilter !== "all") params.set("status", statusFilter)
            if (genderFilter !== "all") params.set("gender", genderFilter)

            const res = await fetch(`/api/schools/${schoolId}/classes/${classId}/students?${params}`)
            if (!res.ok) throw new Error('Failed to fetch students')
            return res.json()
        },
        enabled: !!schoolId && !!classId,
        keepPreviousData: true,
    })

    const students = studentsData?.students || []
    const total = studentsData?.total || 0
    const totalPages = studentsData?.totalPages || 1

    // ─── Computed Stats ────────────────────────────────────────────
    const sections = classInfo?.sections || []
    const classTeacher = sections.find(s => s.teachingStaff)?.teachingStaff
    const totalClassStudents = sections.reduce((sum, s) => sum + (s._count?.students || 0), 0)
    const boysCount = students.filter(s => s.gender?.toLowerCase() === 'male').length
    const girlsCount = students.filter(s => s.gender?.toLowerCase() === 'female').length

    // ─── Selection ─────────────────────────────────────────────────
    const allSelected = students.length > 0 && students.every(s => selectedIds.has(s.userId))
    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set())
        else setSelectedIds(new Set(students.map(s => s.userId)))
    }
    const toggleOne = (id) => {
        const next = new Set(selectedIds)
        next.has(id) ? next.delete(id) : next.add(id)
        setSelectedIds(next)
    }

    // ─── Pagination helpers ────────────────────────────────────────
    const startItem = total === 0 ? 0 : (page - 1) * limit + 1
    const endItem = Math.min(page * limit, total)
    const getPageNumbers = () => {
        const pages = []
        const maxVisible = 5
        let start = Math.max(1, page - Math.floor(maxVisible / 2))
        let end = Math.min(totalPages, start + maxVisible - 1)
        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
        for (let i = start; i <= end; i++) pages.push(i)
        return pages
    }

    // ─── XLSX Export ───────────────────────────────────────────────
    const handleExport = useCallback(async () => {
        try {
            toast.loading('Generating report...', { id: 'xlsx-export' })
            const params = new URLSearchParams({ limit: '-1' })
            if (debouncedSearch) params.set("search", debouncedSearch)
            if (sectionFilter !== "all") params.set("sectionId", sectionFilter)
            if (statusFilter !== "all") params.set("status", statusFilter)
            if (genderFilter !== "all") params.set("gender", genderFilter)

            const res = await fetch(`/api/schools/${schoolId}/classes/${classId}/students?${params}`)
            const allStudents = await res.json()
            const list = Array.isArray(allStudents) ? allStudents : allStudents.students || []

            const rows = list.map((s, i) => ({
                '#': i + 1,
                'Roll No': s.rollNumber || '',
                'Admission No': s.admissionNo || '',
                'Name': s.name || '',
                'Section': s.section?.name || '',
                'Gender': s.gender || '',
                'Father': s.FatherName || '',
                'Mother': s.MotherName || '',
                'Contact': s.contactNumber || '',
                'Admission Date': s.admissionDate ? formatDate(s.admissionDate) : '',
                'Status': s.isAlumni ? 'Alumni' : 'Active',
            }))

            if (!rows.length) {
                toast.error('No data to export', { id: 'xlsx-export' })
                return
            }

            const ws = XLSX.utils.json_to_sheet(rows)
            ws['!cols'] = Object.keys(rows[0]).map(k => ({
                wch: Math.max(k.length, ...rows.map(r => String(r[k]).length)) + 2
            }))
            const wb = XLSX.utils.book_new()
            const sheetName = `Class ${displayClassName(classInfo?.className || classId)}`
            XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))
            XLSX.writeFile(wb, `${sheetName}_Students.xlsx`)
            toast.success('Report downloaded', { id: 'xlsx-export' })
        } catch {
            toast.error('Failed to generate report', { id: 'xlsx-export' })
        }
    }, [schoolId, classId, debouncedSearch, sectionFilter, statusFilter, genderFilter, classInfo])

    // ─── Skeleton Row ──────────────────────────────────────────────
    const SkeletonRow = () => (
        <TableRow>
            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
            <TableCell>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="space-y-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-8 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
        </TableRow>
    )

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8  mx-auto space-y-4 sm:space-y-6">

            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 text-blue-600 lg:h-8 flex-shrink-0" />
                            <span>
                                Class {classInfo ? displayClassName(classInfo.className) : <Skeleton className="h-7 w-16 inline-block" />} Students
                            </span>
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                            {classInfo?.AcademicYear && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {classInfo.AcademicYear.name || classInfo.AcademicYear.year}
                                </span>
                            )}
                            {classTeacher && (
                                <span className="flex items-center gap-1">
                                    <GraduationCap className="h-3 w-3" />
                                    {classTeacher.name}
                                </span>
                            )}
                            <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {totalClassStudents} student{totalClassStudents !== 1 ? 's' : ''}
                                {classInfo?.capacity ? ` / ${classInfo.capacity} cap.` : ''}
                            </span>
                            {sections.length > 0 && (
                                <span>
                                    Sections: {sections.map(s => s.name).join(', ')}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading || total === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export XLSX
                    </Button>
                </div>
            </div>

            {/* ─── Stats Cards ─────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalClassStudents}</div>
                        <p className="text-xs text-muted-foreground">
                            {classInfo?.capacity ? `of ${classInfo.capacity} capacity` : 'Enrolled in class'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Boys</CardTitle>
                        <User2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{boysCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {students.length > 0 ? `${Math.round(boysCount / students.length * 100)}% on this page` : 'No data yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Girls</CardTitle>
                        <User2 className="h-4 w-4 text-pink-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{girlsCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {students.length > 0 ? `${Math.round(girlsCount / students.length * 100)}% on this page` : 'No data yet'}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Sections</CardTitle>
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{sections.length}</div>
                        <p className="text-xs text-muted-foreground">Active sections</p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Filters Card ────────────────────────────────────── */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, roll no, admission no..."
                                className="pl-9 text-sm bg-muted"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {sections.length > 1 && (
                            <Select value={sectionFilter} onValueChange={(val) => { setSectionFilter(val); setPage(1) }}>
                                <SelectTrigger className="bg-muted text-sm">
                                    <Hash className="mr-2 h-4 w-4 flex-shrink-0" />
                                    <SelectValue placeholder="Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Sections</SelectItem>
                                    {sections.map(sec => (
                                        <SelectItem key={sec.id} value={String(sec.id)}>
                                            Section {sec.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1) }}>
                            <SelectTrigger className="bg-muted text-sm">
                                <Filter className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="alumni">Alumni</SelectItem>
                                <SelectItem value="all">All Status</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={genderFilter} onValueChange={(val) => { setGenderFilter(val); setPage(1) }}>
                            <SelectTrigger className="bg-muted text-sm">
                                <User2 className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Gender</SelectItem>
                                <SelectItem value="Male">Boys</SelectItem>
                                <SelectItem value="Female">Girls</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                                <SelectTrigger className="bg-muted text-sm flex-1">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="roll_asc">Roll ↑</SelectItem>
                                    <SelectItem value="roll_desc">Roll ↓</SelectItem>
                                    <SelectItem value="name_asc">Name A-Z</SelectItem>
                                    <SelectItem value="name_desc">Name Z-A</SelectItem>
                                    <SelectItem value="admission_desc">Newest First</SelectItem>
                                    <SelectItem value="admission_asc">Oldest First</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-muted"
                                onClick={() => queryClient.invalidateQueries(['class-students', schoolId, classId])}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Bulk Actions ─────────────────────────────────────── */}
            {selectedIds.size > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm font-medium">
                                {selectedIds.size} student{selectedIds.size !== 1 ? 's' : ''} selected
                            </p>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                                    Clear Selection
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ─── Students Table ──────────────────────────────────── */}
            <div className="border rounded-2xl bg-white dark:bg-muted/30">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        className="cursor-pointer"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                    />
                                </TableHead>
                                <TableHead>Roll</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Parent</TableHead>
                                <TableHead>Gender</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12">
                                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                        <h3 className="text-lg font-semibold mb-2">
                                            {searchQuery || sectionFilter !== "all" || genderFilter !== "all"
                                                ? 'No students match your filters'
                                                : 'No students in this class'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {searchQuery || sectionFilter !== "all" || genderFilter !== "all"
                                                ? 'Try adjusting your search or filters'
                                                : 'Students will appear here once enrolled'}
                                        </p>
                                        {(searchQuery || sectionFilter !== "all" || genderFilter !== "all") && (
                                            <Button
                                                variant="link"
                                                onClick={() => {
                                                    setSearchQuery(""); setSectionFilter("all"); setGenderFilter("all")
                                                }}
                                            >
                                                Clear all filters
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student) => (
                                    <TableRow
                                        key={student.userId}
                                        className="hover:bg-muted/50 transition-colors"
                                    >
                                        <TableCell>
                                            <input
                                                type="checkbox"
                                                className="cursor-pointer"
                                                checked={selectedIds.has(student.userId)}
                                                onChange={() => toggleOne(student.userId)}
                                            />
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {student.rollNumber || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={student.user?.profilePicture} />
                                                    <AvatarFallback className="text-xs">
                                                        {student.name?.[0]?.toUpperCase() || "S"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">{student.name || 'Unknown'}</p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {student.admissionNo ? `#${student.admissionNo}` : student.email || ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <Badge variant="outline" className="text-xs">
                                                {student.section?.name || '—'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {student.FatherName || student.MotherName || '—'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    student.gender?.toLowerCase() === 'male'
                                                        ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400"
                                                        : "bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-400"
                                                )}
                                            >
                                                {student.gender || '—'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-xs",
                                                    student.isAlumni
                                                        ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400"
                                                        : "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400"
                                                )}
                                            >
                                                {student.isAlumni ? 'Alumni' : 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/schools/profiles/students/${student.userId}`)}
                                            >
                                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {startItem} – {endItem} of {total} students
                            </p>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1 || isFetching}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1 || isFetching}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {getPageNumbers().map(num => (
                                    <Button
                                        key={num}
                                        variant={page === num ? "default" : "outline"}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(num)}
                                        disabled={isFetching}
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages || isFetching}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page === totalPages || isFetching}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
