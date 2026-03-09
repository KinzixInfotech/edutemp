"use client"

import { useState, useCallback, useEffect, useMemo, Fragment } from "react"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    LabelList,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import {
    Loader2, Users, School, BookOpen, TrendingUp, Eye, Plus, Search,
    Trash2, GraduationCap, AlertTriangle, UserX, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight, Download, ChevronDown,
    ChevronUp, X, Calendar, FileSpreadsheet, Filter,
    RefreshCw, Settings2, Info
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Combobox,
    ComboboxTrigger,
    ComboboxContent,
    ComboboxInput,
    ComboboxEmpty,
    ComboboxList,
    ComboboxItem,
} from "@/components/ui/combobox"
import { Item, ItemContent, ItemTitle, ItemDescription } from "@/components/ui/item"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"
import * as XLSX from 'xlsx'

// ─── Constants ─────────────────────────────────────────────────────
const PREDEFINED_GRADES = [
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

const NAMING_PATTERNS = [
    { value: "alpha", label: "A, B, C, D…", gen: (n) => 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').slice(0, n) },
    { value: "numeric", label: "1, 2, 3, 4…", gen: (n) => Array.from({ length: n }, (_, i) => String(i + 1)) },
    { value: "color", label: "Red, Blue, Green…", gen: (n) => ['Red', 'Blue', 'Green', 'Yellow', 'Purple', 'Orange', 'Pink', 'Violet', 'Indigo', 'Teal'].slice(0, n) },
    { value: "greek", label: "Alpha, Beta, Gamma…", gen: (n) => ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'].slice(0, n) },
]

const displayClassName = (name) => {
    const num = parseInt(name, 10)
    if (isNaN(num)) return name
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
    return romanNumerals[num - 1] || name
}

// ─── Teacher Combobox ───────────────────────────────────────────────
function TeacherCombobox({ teachers, value, onChange, disabled }) {
    const selected = teachers.find((t) => t.userId === value)

    return (
        <Combobox
            items={teachers}
            value={value}
            onValueChange={onChange}
            itemToStringValue={(t) => t.name}
            disabled={disabled}
            placeholder="Assign Teacher"
        >
            <ComboboxTrigger>
                {selected && (
                    <span className="flex items-center gap-2 truncate">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={selected.user?.profilePicture} />
                            <AvatarFallback className="text-[10px]">{selected.name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{selected.name}</span>
                    </span>
                )}
            </ComboboxTrigger>
            <ComboboxContent className="w-[300px]">
                <ComboboxInput placeholder="Search teacher..." />
                <ComboboxEmpty>No teacher found.</ComboboxEmpty>
                <ComboboxList>
                    {(teacher) => (
                        <ComboboxItem key={teacher.userId} value={teacher}>
                            <Item size="xs" className="p-0">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={teacher.user?.profilePicture} />
                                    <AvatarFallback className="text-[10px]">{teacher.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <ItemContent>
                                    <ItemTitle className="whitespace-nowrap">{teacher.name}</ItemTitle>
                                    {(teacher._sectionCount || 0) > 0 && (
                                        <ItemDescription>
                                            {teacher._sectionCount} section{teacher._sectionCount !== 1 ? 's' : ''} assigned
                                        </ItemDescription>
                                    )}
                                </ItemContent>
                            </Item>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    )
}

// ─── Capacity Indicator ────────────────────────────────────────────
function CapacityIndicator({ current, max }) {
    if (!max) {
        return current > 0 ? (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800 font-medium text-xs">
                <Users className="h-3 w-3 mr-1" />{current} students
            </Badge>
        ) : (
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800 font-medium text-xs">
                0 students
            </Badge>
        )
    }
    const ratio = (current / max) * 100
    const color = ratio > 100 ? "bg-red-500" : ratio >= 80 ? "bg-orange-500" : "bg-green-500"
    const textColor = ratio > 100 ? "text-red-600" : ratio >= 80 ? "text-orange-600" : "text-green-600"
    return (
        <div className="space-y-1 min-w-[100px]">
            <div className="flex items-center justify-between text-xs">
                <span className={cn("font-medium", textColor)}>{current}/{max}</span>
                {ratio > 100 && <AlertTriangle className="h-3 w-3 text-red-500" />}
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${Math.min(ratio, 100)}%` }} />
            </div>
        </div>
    )
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function ManageClassSectionPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId
    const router = useRouter()
    const queryClient = useQueryClient()

    // State
    const [searchQuery, setSearchQuery] = useState("")
    const debouncedSearch = useDebounce(searchQuery, 400)
    const [teacherFilter, setTeacherFilter] = useState("ALL")
    const [capacityFilter, setCapacityFilter] = useState("ALL")
    const [sortBy, setSortBy] = useState("name_asc")
    const [page, setPage] = useState(1)
    const itemsPerPage = 20

    // Create modal state
    const [createOpen, setCreateOpen] = useState(false)
    const [newClassName, setNewClassName] = useState("")
    const [newCapacity, setNewCapacity] = useState("40")
    const [newSections, setNewSections] = useState("3")
    const [namingPattern, setNamingPattern] = useState("alpha")
    const [showAdvanced, setShowAdvanced] = useState(false)

    // Other dialogs
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [selectedTeacher, setSelectedTeacher] = useState(null)
    const [selectedSectionId, setSelectedSectionId] = useState(null)
    const [addSectionOpen, setAddSectionOpen] = useState(false)
    const [addSectionClassId, setAddSectionClassId] = useState(null)
    const [addSectionName, setAddSectionName] = useState("")
    const [expandedClasses, setExpandedClasses] = useState(new Set())


    // Reset page on filters
    useEffect(() => { setPage(1) }, [debouncedSearch, teacherFilter, capacityFilter])

    // ─── Queries ───────────────────────────────────────────────────
    const { data: stats } = useQuery({
        queryKey: ['class-stats', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes/stats`)
            if (!res.ok) throw new Error('Failed to fetch stats')
            return res.json()
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 5,
    })

    const { data: teachersData = { staff: [] } } = useQuery({
        queryKey: ['teaching-staff', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/teaching-staff/${schoolId}?limit=500`)
            if (!res.ok) throw new Error('Failed to fetch teachers')
            return res.json()
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 5,
    })
    const rawTeachers = Array.isArray(teachersData) ? teachersData : (teachersData?.staff || [])

    const { data: classesResponse, isLoading, isFetching } = useQuery({
        queryKey: ['classes', schoolId, debouncedSearch, teacherFilter, capacityFilter, sortBy, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                getAcademicYear: 'true',
                page: String(page),
                limit: String(itemsPerPage),
                sort: sortBy,
            })
            if (debouncedSearch) params.set('search', debouncedSearch)
            if (teacherFilter !== 'ALL') params.set('teacherFilter', teacherFilter)
            if (capacityFilter !== 'ALL') params.set('capacityFilter', capacityFilter)
            const res = await fetch(`/api/schools/${schoolId}/classes?${params.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch classes')
            return res.json()
        },
        enabled: !!schoolId,
        staleTime: 0,
        placeholderData: (prev) => prev,
    })

    const classes = classesResponse?.data || (Array.isArray(classesResponse) ? classesResponse : [])
    const classesMeta = classesResponse?.meta || null
    const showTableSkeleton = isLoading || (isFetching && !classesResponse)

    // Auto-expand all classes when data loads
    useEffect(() => {
        if (classes.length > 0) {
            setExpandedClasses(prev => {
                if (prev.size === 0) return new Set(classes.map(c => c.id))
                return prev
            })
        }
    }, [classes])

    // Active academic year
    const activeYear = classes.find(c => c.AcademicYear)?.AcademicYear
    const academicYearLabel = activeYear?.name || activeYear?.year || 'Current'

    // Compute teacher section counts
    const teacherSectionMap = {}
    classes.forEach(cls => {
        cls.sections?.forEach(sec => {
            if (sec.teachingStaffUserId) {
                teacherSectionMap[sec.teachingStaffUserId] = (teacherSectionMap[sec.teachingStaffUserId] || 0) + 1
            }
        })
    })
    const teachers = rawTeachers.map(t => ({ ...t, _sectionCount: teacherSectionMap[t.userId] || 0 }))

    // ─── Chart data (from all classes, not paginated) ─────────────
    const [chartsOpen, setChartsOpen] = useState(true)

    const { data: allClassesForCharts = [] } = useQuery({
        queryKey: ['classes-chart-data', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes?limit=-1&getAcademicYear=true`)
            if (!res.ok) throw new Error('Failed')
            const json = await res.json()
            return Array.isArray(json) ? json : (json?.data || [])
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 5,
    })



    // Capacity: stacked bar (students + remaining)
    const sectionCapacityData = useMemo(() => {
        const data = []
        allClassesForCharts.forEach(cls => {
            cls.sections?.forEach(sec => {
                const students = sec._count?.students || 0
                const cap = cls.capacity || 0
                const remaining = Math.max(0, cap - students)
                const utilization = cap > 0 ? Math.round((students / cap) * 100) : 0
                data.push({
                    name: `${displayClassName(cls.className)}-${sec.name}`,
                    rawName: cls.className,
                    students,
                    remaining,
                    capacity: cap,
                    utilization,
                })
            })
        })
        return data.sort((a, b) => b.utilization - a.utilization).slice(0, 10)
    }, [allClassesForCharts])

    // Distribution: sorted by student count, with over-capacity flag
    const studentDistributionData = useMemo(() => {
        const data = []
        allClassesForCharts.forEach(cls => {
            cls.sections?.forEach(sec => {
                const students = sec._count?.students || 0
                const cap = cls.capacity || 0
                data.push({
                    name: `${displayClassName(cls.className)}-${sec.name}`,
                    rawName: cls.className,
                    students,
                    capacity: cap,
                    isOver: cap > 0 && students > cap,
                })
            })
        })
        return data.sort((a, b) => b.students - a.students).slice(0, 10)
    }, [allClassesForCharts])

    // Workload: teachers and their section counts
    const teacherWorkloadData = useMemo(() => {
        return teachers
            .filter(t => t._sectionCount > 0)
            .map(t => ({
                name: t.name,
                sections: t._sectionCount,
            }))
            .sort((a, b) => b.sections - a.sections)
            .slice(0, 10)
    }, [teachers])

    const handleChartBarClick = useCallback((entry) => {
        if (!entry) return
        const searchTerm = entry.rawName || entry.name
        if (!searchTerm) return
        setSearchQuery(searchTerm)
        setPage(1)
    }, [])

    const ChartTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-xl text-xs">
                <p className="font-medium mb-1">{label}</p>
                {payload.map((p, i) => (
                    <p key={i} className="text-muted-foreground">
                        {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
                    </p>
                ))}
            </div>
        )
    }

    const CapacityTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null
        const entry = payload[0]?.payload
        return (
            <div className="rounded-lg border bg-background p-2.5 shadow-xl text-xs">
                <p className="font-medium mb-1">{label}</p>
                <p className="text-muted-foreground">Students: <span className="font-semibold text-foreground">{entry?.students}</span></p>
                <p className="text-muted-foreground">Capacity: <span className="font-semibold text-foreground">{entry?.capacity}</span></p>
                <p className="text-muted-foreground">Utilization: <span className="font-semibold text-foreground">{entry?.utilization}%</span></p>
            </div>
        )
    }

    // ─── Flatten sections into rows (from server-side results) ─────
    const paginatedRows = useMemo(() => {
        const rows = []
        classes.forEach(cls => {
            if (!cls.sections?.length) {
                rows.push({ type: 'empty-class', cls, sec: null })
            } else {
                cls.sections.forEach((sec, idx) => {
                    rows.push({ type: 'section', cls, sec, isFirst: idx === 0 })
                })
            }
        })
        return rows
    }, [classes])

    // Server-side pagination meta
    const totalRows = classesMeta?.total || paginatedRows.length
    const totalPages = classesMeta?.totalPages || 1
    const startItem = totalRows === 0 ? 0 : (page - 1) * itemsPerPage + 1
    const endItem = Math.min(page * itemsPerPage, totalRows)

    const getPageNumbers = () => {
        const pages = []
        const maxVisible = 5
        let start = Math.max(1, page - Math.floor(maxVisible / 2))
        let end = Math.min(totalPages, start + maxVisible - 1)
        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1)
        for (let i = start; i <= end; i++) pages.push(i)
        return pages
    }

    // ─── Mutations ─────────────────────────────────────────────────
    const createClassMutation = useMutation({
        mutationFn: async (classData) => {
            const res = await fetch(`/api/schools/${schoolId}/classes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(classData)
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Failed to create class')
            }
            return res.json()
        },
        onSuccess: (data) => {
            const sectionCount = data.sections?.length || 0
            toast.success(`Class ${displayClassName(data.className)} created with ${sectionCount} section${sectionCount !== 1 ? 's' : ''}`)
            setCreateOpen(false)
            resetCreateForm()
            queryClient.invalidateQueries({ queryKey: ['classes'] })
            queryClient.invalidateQueries({ queryKey: ['class-stats', schoolId] })
        },
        onError: (error) => toast.error(error.message || "Failed to create class")
    })

    const createSectionMutation = useMutation({
        mutationFn: async ({ classId, sectionData }) => {
            const res = await fetch(`/api/schools/${schoolId}/classes/${classId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sectionData)
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || 'Failed to add section')
            }
            return res.json()
        },
        onSuccess: async () => {
            toast.success("Section added")
            // Auto-expand the class that just got a new section
            if (addSectionClassId) {
                setExpandedClasses(prev => {
                    const next = new Set(prev)
                    next.add(addSectionClassId)
                    return next
                })
            }
            setAddSectionOpen(false)
            setAddSectionName("")
            setAddSectionClassId(null)
            // Bust server-side Redis cache first, then refetch
            await fetch(`/api/schools/${schoolId}/classes?noCache=true&limit=1`).catch(() => { })
            queryClient.invalidateQueries({ queryKey: ['classes'], refetchType: 'all' })
            queryClient.invalidateQueries({ queryKey: ['class-stats'], refetchType: 'all' })
        },
        onError: (error) => toast.error(error.message || "Failed to add section")
    })

    const assignSupervisorMutation = useMutation({
        mutationFn: async ({ sectionId, teacherId }) => {
            const res = await fetch(`/api/schools/${schoolId}/classes/${sectionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ teacherId })
            })
            if (!res.ok) throw new Error('Failed to assign supervisor')
            return res.json()
        },
        onSuccess: () => {
            toast.success("Class teacher assigned")
            queryClient.invalidateQueries({ queryKey: ['classes'] })
            setConfirmOpen(false)
        },
        onError: () => toast.error("Failed to assign teacher")
    })

    // ─── Handlers ──────────────────────────────────────────────────
    const resetCreateForm = () => {
        setNewClassName("")
        setNewCapacity("40")
        setNewSections("3")
        setNamingPattern("alpha")
        setShowAdvanced(false)
    }

    const numSections = parseInt(newSections) || 0
    const currentPattern = NAMING_PATTERNS.find(p => p.value === namingPattern) || NAMING_PATTERNS[0]
    const maxSections = currentPattern.gen(26).length
    const previewSectionNames = currentPattern.gen(Math.min(numSections, maxSections))

    const handleCreateClass = () => {
        if (!newClassName) return toast.error("Select a grade")
        if (numSections > 10) {
            if (!window.confirm(`You're about to create ${numSections} sections. Are you sure?`)) return
        }
        createClassMutation.mutate({
            name: newClassName.toUpperCase(),
            schoolId,
            capacity: newCapacity || null,
            sections: numSections,
            namingPattern: namingPattern,
            sectionNames: previewSectionNames,
        })
    }

    const handleSupervisorChange = (sectionId, teacherId) => {
        setSelectedSectionId(sectionId)
        setSelectedTeacher(teacherId)
        setConfirmOpen(true)
    }

    const confirmSupervisorChange = () => {
        if (!selectedSectionId || !selectedTeacher) return
        assignSupervisorMutation.mutate({ sectionId: selectedSectionId, teacherId: selectedTeacher })
    }

    const handleAddSectionToClass = () => {
        if (!addSectionClassId || !addSectionName) return toast.error("Select a section name")
        createSectionMutation.mutate({
            classId: addSectionClassId,
            sectionData: { name: addSectionName.toUpperCase() }
        })
    }

    // XLSX export
    const handleExportXLSX = useCallback(async () => {
        try {
            toast.info("Preparing export...")
            const res = await fetch(`/api/schools/${schoolId}/classes?limit=-1&getAcademicYear=true`)
            if (!res.ok) throw new Error('Failed to fetch')
            const allData = await res.json()
            const allClasses = Array.isArray(allData) ? allData : (allData?.data || [])
            const rows = []
            allClasses.forEach(cls => {
                if (!cls.sections?.length) {
                    rows.push({
                        Class: displayClassName(cls.className),
                        Section: '—',
                        Students: 0,
                        Capacity: cls.capacity || '—',
                        'Class Teacher': '—',
                    })
                } else {
                    cls.sections.forEach(sec => {
                        rows.push({
                            Class: displayClassName(cls.className),
                            Section: sec.name,
                            Students: sec._count?.students || 0,
                            Capacity: cls.capacity || '—',
                            'Class Teacher': sec.teachingStaff?.name || 'Not Assigned',
                        })
                    })
                }
            })
            if (!rows.length) return toast.error("No data to export")
            const ws = XLSX.utils.json_to_sheet(rows)
            ws['!cols'] = Object.keys(rows[0]).map(k => ({
                wch: Math.max(k.length, ...rows.map(r => String(r[k]).length)) + 2
            }))
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, 'Classes')
            XLSX.writeFile(wb, `Classes_Overview_${new Date().toISOString().split('T')[0]}.xlsx`)
            toast.success("Report downloaded")
        } catch {
            toast.error("Failed to export data")
        }
    }, [schoolId])

    // Skeleton row
    const SkeletonRow = () => (
        <TableRow>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-8" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-8 w-40" /></TableCell>
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
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* Confirm Teacher Assignment */}
            <ConfirmDialog
                open={confirmOpen}
                onOpenChange={() => setConfirmOpen(false)}
                onConfirm={confirmSupervisorChange}
                title="Confirm Teacher Assignment"
                description="Are you sure you want to assign this teacher as class teacher? This will override any existing assignment."
                confirmText="Yes, assign"
                confirmName=""
            />

            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <School className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 text-blue-600 lg:h-8 flex-shrink-0" />
                        <span>Class Management</span>
                    </h1>
                    <p className="text-xs sm:text-sm mt-2 text-muted-foreground">
                        Create classes, manage sections, and assign teachers • <span className="font-medium">{academicYearLabel}</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={isLoading || classes.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export XLSX
                    </Button>
                    <Button className="dark:text-white" size="sm" onClick={() => { resetCreateForm(); setCreateOpen(true) }}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Class
                    </Button>
                </div>
            </div>

            <Separator />

            {/* ─── Stats Cards ────────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {stats ? (
                    <>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Classes</p>
                                        <p className="text-2xl font-bold mt-1">{stats.totalClasses}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Active classes</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                        <School className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Sections</p>
                                        <p className="text-2xl font-bold mt-1">{stats.totalSections}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Across all classes</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Students</p>
                                        <p className="text-2xl font-bold mt-1">{stats.totalStudents}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Enrolled students</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                        <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg / Class</p>
                                        <p className="text-2xl font-bold mt-1">{stats.avgStudentsPerClass}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Students per class</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                        <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">No Teacher</p>
                                        <p className="text-2xl font-bold mt-1">{stats.sectionsWithoutTeacher}</p>
                                        <p className="text-xs text-muted-foreground mt-1">Sections unassigned</p>
                                    </div>
                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stats.sectionsWithoutTeacher > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-muted")}>
                                        <UserX className={cn("h-5 w-5", stats.sectionsWithoutTeacher > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Empty Sections</p>
                                        <p className="text-2xl font-bold mt-1">{stats.emptySections}</p>
                                        <p className="text-xs text-muted-foreground mt-1">0 students enrolled</p>
                                    </div>
                                    <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stats.emptySections > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted")}>
                                        <AlertTriangle className={cn("h-5 w-5", stats.emptySections > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                ) : (
                    Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="pt-5 pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Skeleton className="h-3 w-20 mb-2" />
                                        <Skeleton className="h-7 w-12 mb-1" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* ─── Charts (Collapsible) ─────────────────────────── */}
            <Card>
                <CardContent className="pt-4 pb-3">
                    <button
                        className="flex items-center justify-between w-full text-left"
                        onClick={() => setChartsOpen(v => !v)}
                    >
                        <div className="flex items-center gap-4">
                            <div>
                                <p className="text-sm font-semibold">Analytics Overview</p>
                                <p className="text-xs text-muted-foreground">Capacity, distribution & workload insights</p>
                            </div>
                            {!chartsOpen && sectionCapacityData.length > 0 && (
                                <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />{sectionCapacityData.length} sections</span>
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500" />{studentDistributionData.filter(d => !d.isOver).length} healthy</span>
                                    {studentDistributionData.filter(d => d.isOver).length > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{studentDistributionData.filter(d => d.isOver).length} over capacity</span>}
                                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-500" />{teacherWorkloadData.length} teachers</span>
                                </div>
                            )}
                        </div>
                        {chartsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>
                </CardContent>

                {chartsOpen && (
                    <CardContent className="pt-0 pb-5">
                        {allClassesForCharts.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <School className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No class data available for charts yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Section Capacity Utilization — Stacked Bar */}
                                <Card className="border shadow-none">
                                    <CardHeader className="pb-1 pt-4 px-4">
                                        <CardTitle className="text-sm">Section Capacity</CardTitle>
                                        <p className="text-[11px] text-muted-foreground">Top 10 · Click to filter</p>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4">
                                        {sectionCapacityData.length === 0 ? (
                                            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">No sections found</div>
                                        ) : (
                                            <div className="h-[200px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={sectionCapacityData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} interval={0} className="text-muted-foreground" />
                                                        <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                                                        <Tooltip content={<CapacityTooltip />} />
                                                        <Bar dataKey="students" name="Students" stackId="cap" fill="hsl(221, 83%, 53%)" radius={[0, 0, 0, 0]} cursor="pointer" onClick={(d) => handleChartBarClick(d?.payload)} />
                                                        <Bar dataKey="remaining" name="Remaining" stackId="cap" fill="hsl(220, 14%, 90%)" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => handleChartBarClick(d?.payload)}>
                                                            <LabelList dataKey="utilization" position="top" formatter={(v) => `${v}%`} style={{ fontSize: 8, fill: 'hsl(220, 8%, 46%)' }} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Student Distribution — Sorted Comparison */}
                                <Card className="border shadow-none">
                                    <CardHeader className="pb-1 pt-4 px-4">
                                        <CardTitle className="text-sm">Student Distribution</CardTitle>
                                        <p className="text-[11px] text-muted-foreground">Top 10 by size · Red = over capacity</p>
                                    </CardHeader>
                                    <CardContent className="px-4 pb-4">
                                        {studentDistributionData.length === 0 ? (
                                            <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">No students enrolled yet</div>
                                        ) : (
                                            <div className="h-[200px] w-full">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={studentDistributionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                                        <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-45} textAnchor="end" height={50} interval={0} className="text-muted-foreground" />
                                                        <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                                                        <Tooltip content={<ChartTooltip />} />
                                                        <Bar dataKey="students" name="Students" radius={[4, 4, 0, 0]} cursor="pointer" onClick={(d) => handleChartBarClick(d?.payload)}>
                                                            {studentDistributionData.map((entry, idx) => (
                                                                <Cell key={idx} fill={entry.isOver ? 'hsl(0, 72%, 51%)' : 'hsl(142, 71%, 45%)'} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>


                            </div>
                        )}
                    </CardContent>
                )}
            </Card>

            <div className="h-1" />

            {/* ─── Filters Card ────────────────────────────────────── */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by class, section, or teacher..."
                                className="pl-9 text-sm bg-muted"
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
                            />
                        </div>

                        <Select value={teacherFilter} onValueChange={(val) => { setTeacherFilter(val); setPage(1) }}>
                            <SelectTrigger className="bg-muted text-sm">
                                <GraduationCap className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Teacher" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Sections</SelectItem>
                                <SelectItem value="ASSIGNED">Teacher Assigned</SelectItem>
                                <SelectItem value="UNASSIGNED">No Teacher</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={capacityFilter} onValueChange={(val) => { setCapacityFilter(val); setPage(1) }}>
                            <SelectTrigger className="bg-muted text-sm">
                                <Filter className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Capacity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Capacity</SelectItem>
                                <SelectItem value="OVER">Overcrowded</SelectItem>
                                <SelectItem value="EMPTY">Empty (0 students)</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                                <SelectTrigger className="bg-muted text-sm flex-1">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name_asc">Name A-Z</SelectItem>
                                    <SelectItem value="name_desc">Name Z-A</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-muted"
                                onClick={async () => {
                                    // Bust server-side Redis cache by fetching with noCache
                                    await fetch(`/api/schools/${schoolId}/classes?noCache=true&limit=1`)
                                    // Then invalidate client-side queries to refetch fresh data
                                    queryClient.invalidateQueries({ queryKey: ['classes'], refetchType: 'all' })
                                    queryClient.invalidateQueries({ queryKey: ['class-stats'], refetchType: 'all' })
                                }}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Classes Table ───────────────────────────────────── */}
            <div className="border rounded-2xl bg-white dark:bg-muted/30">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead>Class</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Students</TableHead>
                                <TableHead className="min-w-[200px]">Class Teacher</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {showTableSkeleton ? (
                                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                            ) : classes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <School className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                        <h3 className="text-lg font-semibold mb-2">
                                            {searchQuery || teacherFilter !== 'ALL' || capacityFilter !== 'ALL'
                                                ? 'No sections match your filters'
                                                : 'No classes created yet'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {searchQuery || teacherFilter !== 'ALL' || capacityFilter !== 'ALL'
                                                ? 'Try adjusting your search or filters'
                                                : 'Create your first class to get started'}
                                        </p>
                                        {!searchQuery && teacherFilter === 'ALL' && capacityFilter === 'ALL' && (
                                            <Button size="sm" onClick={() => { resetCreateForm(); setCreateOpen(true) }}>
                                                <Plus className="mr-2 h-4 w-4" /> Create Class
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                classes.map(cls => {
                                    const isExpanded = expandedClasses.has(cls.id)
                                    const totalStudents = cls.sections?.reduce((sum, s) => sum + (s._count?.students || 0), 0) || 0
                                    const sectionCount = cls.sections?.length || 0
                                    const toggleExpand = () => {
                                        setExpandedClasses(prev => {
                                            const next = new Set(prev)
                                            if (next.has(cls.id)) next.delete(cls.id)
                                            else next.add(cls.id)
                                            return next
                                        })
                                    }

                                    return (
                                        <Fragment key={cls.id}>
                                            {/* Class Group Header */}
                                            <TableRow
                                                className="bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                                                onClick={toggleExpand}
                                            >
                                                <TableCell colSpan={5}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2.5">
                                                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                            <Badge variant="outline" className="font-semibold text-sm">
                                                                {displayClassName(cls.className)}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {sectionCount} {sectionCount === 1 ? 'section' : 'sections'} · {totalStudents} {totalStudents === 1 ? 'student' : 'students'}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={(e) => { e.stopPropagation(); setAddSectionClassId(cls.id); setAddSectionOpen(true) }}
                                                        >
                                                            <Plus className="h-3.5 w-3.5 mr-1" /> Section
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            {/* Sections (expanded) */}
                                            {isExpanded && (
                                                <>
                                                    {!cls.sections?.length ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5} className="py-4 text-center">
                                                                <span className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                                                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                                                                    No sections yet —
                                                                    <button
                                                                        className="text-primary underline underline-offset-2 text-sm"
                                                                        onClick={() => { setAddSectionClassId(cls.id); setAddSectionOpen(true) }}
                                                                    >
                                                                        Add one
                                                                    </button>
                                                                </span>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        cls.sections.map(sec => (
                                                            <TableRow key={sec.id} className="hover:bg-muted/50 transition-colors group">
                                                                <TableCell className="pl-10" />
                                                                <TableCell>
                                                                    <Badge variant="secondary" className="text-xs">{sec.name}</Badge>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <CapacityIndicator
                                                                        current={sec._count?.students || 0}
                                                                        max={cls.capacity}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <TeacherCombobox
                                                                        teachers={teachers}
                                                                        value={sec.teachingStaffUserId}
                                                                        onChange={(teacherId) => handleSupervisorChange(sec.id, teacherId)}
                                                                        disabled={assignSupervisorMutation.isPending}
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => router.push(`/dashboard/schools/create-classes/${cls.id}/students`)}
                                                                    >
                                                                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                                                                        View
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                    {/* Optimistic skeleton row while section is being created */}
                                                    {(createSectionMutation.isPending && createSectionMutation.variables?.classId === cls.id) && (
                                                        <TableRow className="animate-pulse">
                                                            <TableCell className="pl-10" />
                                                            <TableCell><div className="h-5 w-8 bg-muted rounded" /></TableCell>
                                                            <TableCell><div className="h-5 w-20 bg-muted rounded" /></TableCell>
                                                            <TableCell><div className="h-8 w-40 bg-muted rounded" /></TableCell>
                                                            <TableCell className="text-right"><div className="h-8 w-16 bg-muted rounded ml-auto" /></TableCell>
                                                        </TableRow>
                                                    )}
                                                </>
                                            )}
                                        </Fragment>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-muted-foreground">
                                Showing {startItem} – {endItem} of {totalRows} sections
                            </p>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
                                    <ChevronsLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {getPageNumbers().map(num => (
                                    <Button
                                        key={num}
                                        variant={page === num ? "default" : "outline"}
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setPage(num)}
                                    >
                                        {num}
                                    </Button>
                                ))}
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                                    <ChevronsRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Create Class Modal ─────────────────────────────── */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <School className="h-5 w-5" />
                            Create New Class
                        </DialogTitle>
                        <DialogDescription>
                            Set up a new grade with sections in one step.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Academic Year — auto-detected */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span className="text-sm text-blue-700 dark:text-blue-300">Academic Year: <strong>{academicYearLabel}</strong></span>
                        </div>

                        {/* Grade */}
                        <div className="space-y-1.5">
                            <Label>Grade</Label>
                            <Select value={newClassName} onValueChange={setNewClassName}>
                                <SelectTrigger className="bg-muted">
                                    <SelectValue placeholder="Select grade (e.g. V, VI, VII)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PREDEFINED_GRADES.map(({ value, label }) => (
                                        <SelectItem key={value} value={value}>{label} — Class {value}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Capacity */}
                        <div className="space-y-1.5">
                            <Label>Max Capacity per Section</Label>
                            <Input
                                type="number"
                                min="1"
                                max="200"
                                placeholder="e.g. 40"
                                value={newCapacity}
                                onChange={(e) => setNewCapacity(e.target.value)}
                                className="bg-muted"
                            />
                        </div>

                        {/* Number of Sections */}
                        <div className="space-y-1.5">
                            <Label>Number of Sections</Label>
                            <Input
                                type="number"
                                min="0"
                                max={maxSections}
                                placeholder="e.g. 3"
                                value={newSections}
                                onChange={(e) => setNewSections(e.target.value)}
                                className="bg-muted"
                            />
                            {numSections > 10 && (
                                <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {numSections} sections is unusually high. Are you sure?
                                </p>
                            )}
                        </div>

                        {/* Advanced Settings */}
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                        >
                            <Settings2 className="h-3.5 w-3.5" />
                            Advanced Settings
                            {showAdvanced
                                ? <ChevronUp className="h-3 w-3" />
                                : <ChevronDown className="h-3 w-3" />
                            }
                        </button>

                        {showAdvanced && (
                            <div className="space-y-3 pl-5 border-l-2 border-muted">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Section Naming Pattern</Label>
                                    <Select value={namingPattern} onValueChange={setNamingPattern}>
                                        <SelectTrigger className="bg-muted h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {NAMING_PATTERNS.map(p => (
                                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        {/* Preview */}
                        {newClassName && numSections > 0 && (
                            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <Info className="h-3 w-3" />
                                    This will create:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {previewSectionNames.map((name) => (
                                        <Badge key={name} variant="secondary" className="text-xs px-2.5 py-1 font-mono">
                                            {displayClassName(newClassName)} - {name}
                                            {newCapacity && <span className="text-muted-foreground ml-1">(Cap: {newCapacity})</span>}
                                        </Badge>
                                    ))}
                                </div>
                                {newCapacity && numSections > 0 && (
                                    <p className="text-[11px] text-muted-foreground">
                                        Total capacity: {parseInt(newCapacity) * numSections} students across {numSections} sections
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreateClass}
                            disabled={createClassMutation.isPending || !newClassName}
                            className="gap-2"
                        >
                            {createClassMutation.isPending && <Loader2 className="animate-spin h-4 w-4" />}
                            Create Class
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── Add Section Dialog ─────────────────────────────── */}
            <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Add Section</DialogTitle>
                        <DialogDescription>Add a new section to the selected class.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                        <div className="space-y-2">
                            <Label>Section Name</Label>
                            <Select value={addSectionName} onValueChange={setAddSectionName}>
                                <SelectTrigger className="bg-muted">
                                    <SelectValue placeholder="Select section name" />
                                </SelectTrigger>
                                <SelectContent>
                                    {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter(letter => {
                                        const cls = classes.find(c => c.id === addSectionClassId)
                                        const existing = cls?.sections?.map(s => s.name.toUpperCase()) || []
                                        return !existing.includes(letter)
                                    }).map(sec => (
                                        <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddSectionOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleAddSectionToClass}
                            disabled={createSectionMutation.isPending || !addSectionName}
                            className="gap-2"
                        >
                            {createSectionMutation.isPending && <Loader2 className="animate-spin h-4 w-4" />}
                            Add Section
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}