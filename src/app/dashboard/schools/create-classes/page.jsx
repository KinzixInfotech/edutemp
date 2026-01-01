"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table"
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, Users, School, BookOpen, TrendingUp, Eye } from "lucide-react"
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
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Check, ChevronsUpDown } from "lucide-react"

function TeacherCombobox({ teachers, value, onChange, disabled }) {
    const [open, setOpen] = useState(false)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {value
                        ? teachers.find((teacher) => teacher.userId === value)?.name
                        : "Assign Class Teacher"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
                <Command>
                    <CommandInput placeholder="Search teacher..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>No teacher found.</CommandEmpty>
                        <CommandGroup>
                            {teachers.map((teacher) => (
                                <CommandItem
                                    key={teacher.userId}
                                    value={teacher.name}
                                    onSelect={() => {
                                        onChange(teacher.userId)
                                        setOpen(false)
                                    }}
                                >
                                    {teacher.name}
                                    <Check
                                        className={cn(
                                            "ml-auto h-4 w-4",
                                            value === teacher.userId ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}

export default function ManageClassSectionPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId
    const router = useRouter()
    const queryClient = useQueryClient()
 
    const [className, setClassName] = useState("")
    const [sectionName, setSectionName] = useState("")
    const [selectedClassId, setSelectedClassId] = useState("")
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

    // Fetch stats using TanStack Query
    const { data: stats } = useQuery({
        queryKey: ['class-stats', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes/stats`)
            if (!res.ok) throw new Error('Failed to fetch stats')
            return res.json()
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 5, // 5 minutes
    })

    // Fetch teachers using TanStack Query
    const { data: teachersData = { data: [] } } = useQuery({
        queryKey: ['teaching-staff', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/teaching-staff/${schoolId}`)
            if (!res.ok) throw new Error('Failed to fetch teachers')
            return res.json()
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 5,
    })

    const teachers = Array.isArray(teachersData) ? teachersData : []

    // Fetch classes using TanStack Query
    const { data: classes = [], isLoading: fetchingLoading } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`)
            if (!res.ok) throw new Error('Failed to fetch classes')
            const data = await res.json()
            return Array.isArray(data) ? data : []
        },
        enabled: !!schoolId,
        staleTime: 0, // Always fetch fresh data to show latest assignments
    })

    // Create class mutation
    const createClassMutation = useMutation({
        mutationFn: async (classData) => {
            const res = await fetch(`/api/schools/${schoolId}/classes`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(classData)
            })
            if (!res.ok) throw new Error('Failed to create class')
            return res.json()
        },
        onSuccess: () => {
            toast.success("Class created")
            setClassName("")
            queryClient.invalidateQueries(['classes', schoolId])
            queryClient.invalidateQueries(['class-stats', schoolId])
        },
        onError: () => {
            toast.error("Failed to create class")
        }
    })

    // Create section mutation
    const createSectionMutation = useMutation({
        mutationFn: async ({ classId, sectionData }) => {
            const res = await fetch(`/api/schools/${schoolId}/classes/${classId}/sections`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sectionData)
            })
            if (!res.ok) throw new Error('Failed to add section')
            return res.json()
        },
        onSuccess: () => {
            toast.success("Section added")
            setSectionName("")
            queryClient.invalidateQueries(['classes', schoolId])
            queryClient.invalidateQueries(['class-stats', schoolId])
        },
        onError: () => {
            toast.error("Failed to add section")
        }
    })

    // Assign supervisor mutation
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
            toast.success("Supervisor assigned successfully")
            queryClient.invalidateQueries(['classes', schoolId])
            setConfirmOpen(false)
        },
        onError: (error) => {
            console.error("❌ Supervisor assign error:", error)
            toast.error("Failed to assign supervisor")
        }
    })

    const handleSupervisorChange = (sectionId, teacherId) => {
        setSelectedClassIdToUpdate(sectionId)
        setSelectedTeacher(teacherId)
        setConfirmOpen(true)
    }

    const confirmSupervisorChange = () => {
        if (!selectedClassIdToUpdate || !selectedTeacher) {
            toast.error("Missing section or teacher selection")
            return
        }
        assignSupervisorMutation.mutate({
            sectionId: selectedClassIdToUpdate,
            teacherId: selectedTeacher
        })
    }

    const handleAddClass = () => {
        if (!className) return toast.error("Class name is required")
        createClassMutation.mutate({
            name: className.toUpperCase(),
            schoolId
        })
    }

    const handleAddSection = () => {
        if (!selectedClassId || !sectionName) return toast.error("Class and Section required")
        createSectionMutation.mutate({
            classId: selectedClassId,
            sectionData: { name: sectionName.toUpperCase() }
        })
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
                confirmName=""
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Classes & Sections</h1>
                    <p className="text-muted-foreground mt-1">Create and manage your school's classes, sections, and assign teachers</p>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
                            <School className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalClasses}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sections</CardTitle>
                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalSections}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalStudents}</div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. per Class</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.avgStudentsPerClass}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Create Forms */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Create Class */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Create New Class</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4">
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
                            className="text-white flex gap-2 items-center w-full sm:w-auto"
                            disabled={createClassMutation.isPending}
                            onClick={handleAddClass}
                        >
                            {createClassMutation.isPending && <Loader2 className="animate-spin w-4 h-4" />}
                            Add Class
                        </Button>
                    </CardContent>
                </Card>

                {/* Create Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Add Section to Class</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-4">
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
                            className="text-white flex gap-2 items-center w-full sm:w-auto"
                            disabled={createSectionMutation.isPending}
                            onClick={handleAddSection}
                        >
                            {createSectionMutation.isPending && <Loader2 className="animate-spin w-4 h-4" />}
                            Add Section
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Classes & Sections Overview</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table className="min-w-[800px]">
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-[20%]">Class</TableHead>
                                    <TableHead className="w-[15%]">Section</TableHead>
                                    <TableHead className="w-[15%]">Students</TableHead>
                                    <TableHead className="w-[35%]">Class Teacher</TableHead>
                                    <TableHead className="w-[15%]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fetchingLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">
                                            <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                                <Loader2 className="animate-spin w-4 h-4" />
                                                Loading classes...
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : classes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                            No classes or sections found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    classes.map((cls) =>
                                        cls.sections?.length > 0 ? (
                                            cls.sections.map((sec) => (
                                                <TableRow key={sec.id} className="hover:bg-muted/50">
                                                    <TableCell className="font-medium">{displayClassName(cls.className)}</TableCell>
                                                    <TableCell>{sec.name}</TableCell>
                                                    <TableCell>
                                                        <span className="inline-flex items-center gap-1 text-sm">
                                                            <Users className="h-3 w-3" />
                                                            {sec._count?.students || 0}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <TeacherCombobox
                                                            teachers={teachers}
                                                            value={sec.teachingStaffUserId}
                                                            onChange={(teacherId) => handleSupervisorChange(sec.id, teacherId)}
                                                            disabled={false}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => router.push(`/dashboard/schools/create-classes/${cls.id}/students`)}
                                                            className="gap-2"
                                                        >
                                                            <Eye className="h-3 w-3" />
                                                            View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow key={`empty-${cls.id}`}>
                                                <TableCell className="font-medium">{displayClassName(cls.className)}</TableCell>
                                                <TableCell colSpan={4} className="text-muted-foreground">No sections</TableCell>
                                            </TableRow>
                                        )
                                    )
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}