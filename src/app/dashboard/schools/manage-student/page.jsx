'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table'
import {
    Avatar, AvatarFallback, AvatarImage
} from '@/components/ui/avatar'
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

import { Button } from '@/components/ui/button'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem
} from '@/components/ui/select'
import {
    Pagination, PaginationContent, PaginationItem,
    PaginationNext, PaginationPrevious
} from '@/components/ui/pagination'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Loader2, Trash2, Slash } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function StudentListPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId

    const [students, setStudents] = useState([])
    const [filtered, setFiltered] = useState([])
    const [selected, setSelected] = useState([])
    const [dialogData, setDialogData] = useState(null)
    const [search, setSearch] = useState('')
    const [allParents, setAllParents] = useState([])
    const [selectedParentId, setSelectedParentId] = useState(null)
    const [classFilter, setClassFilter] = useState('ALL')
    const [sectionFilter, setSectionFilter] = useState('ALL')
    const [loading, setLoading] = useState(false)
    const [page, setPage] = useState(1)
    const itemsPerPage = 5

    const fetchStudents = async () => {
        if (!schoolId) return
        setLoading(true)
        try {
            const res = await fetch(`/api/schools/${schoolId}/students`)
            const json = await res.json()
            const data = json?.students || []
            setStudents(data)
            setFiltered(data)
        } catch (err) {
            console.error('Fetch error:', err)
        } finally {
            setLoading(false)
        }
    }
    useEffect(() => {
        if (dialogData) {
            setSelectedParentId(dialogData.parent?.userId || null)
            fetchAllParents()
        }
    }, [dialogData])

    const fetchAllParents = async () => {
        try {
            const res = await fetch(`/api/schools/${schoolId}/parents`)
            const { parents } = await res.json()
            setAllParents(parents || [])
        } catch (err) {
            console.error("Failed to fetch parents", err)
        }
    }

    useEffect(() => {
        fetchStudents()
    }, [schoolId])

    useEffect(() => {
        let result = [...students]

        if (classFilter !== 'ALL') {
            result = result.filter(s => s.class?.className === classFilter)
        }
        if (sectionFilter !== 'ALL') {
            result = result.filter(s => s.class?.sections?.some(sec => sec.name === sectionFilter))
        }
        if (search) {
            result = result.filter(
                s =>
                    s.name.toLowerCase().includes(search.toLowerCase()) ||
                    s.user?.email?.toLowerCase().includes(search.toLowerCase())
            )
        }

        setFiltered(result)
        setPage(1)
    }, [search, classFilter, sectionFilter, students])

    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    const pageCount = Math.ceil(filtered.length / itemsPerPage)

    const allClasses = Array.from(new Set(students.map(s => s.class?.className).filter(Boolean)))
    const allSections = Array.from(
        new Set(
            students.flatMap(s => s.class?.sections?.map(sec => sec.name) || [])
        )
    )

    const toggleSelect = (id) => {
        setSelected(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const handleDeleteSelected = () => {
        console.log('Deleting:', selected)
        // Replace with real API call to delete
    }

    const handleInactivateSelected = () => {
        console.log('Inactivating:', selected)
        // Replace with real API call to inactivate
    }
    const openDialog = async (student) => {
        setDialogData(student)
        setSelectedParentId(student.parentId || null)

        // Fetch parent list (you can replace this with your real API)
        const res = await fetch(`/api/schools/${schoolId}/parents`)
        const json = await res.json()
        setParentOptions(json?.parents || [])
    }

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-semibold">Manage Students</h2>

            <div className="flex flex-wrap justify-between items-center gap-2">
                <Input
                    placeholder="Search by name or email"
                    className="w-[180px] bg-muted"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="flex gap-2">
                    <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-[140px] bg-muted">
                            <SelectValue placeholder="Class" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Classes</SelectItem>
                            {allClasses.map(cls => (
                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={sectionFilter} onValueChange={setSectionFilter}>
                        <SelectTrigger className="w-[140px] bg-muted">
                            <SelectValue placeholder="Section" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Sections</SelectItem>
                            {allSections.map(sec => (
                                <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" className="bg-muted" onClick={fetchStudents}>
                        <RefreshCw size={16} />
                    </Button>

                    <Link href={`/dashboard/schools/${schoolId}/profiles/students/new`}>
                        <Button className='dark:text-white'>
                            <Plus size={16} />
                        </Button>
                    </Link>
                </div>
            </div>

            {selected.length > 0 && (
                <div className="flex gap-3">
                    <Button variant="destructive" onClick={handleDeleteSelected}>
                        <Trash2 size={16} className="mr-2" /> Delete Selected
                    </Button>
                    <Button variant="outline" onClick={handleInactivateSelected}>
                        <Slash size={16} className="mr-2" /> Inactivate Selected
                    </Button>
                </div>
            )}

            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-12">
                                <input
                                    type="checkbox"
                                    checked={selected.length === paginated.length}
                                    onChange={(e) =>
                                        setSelected(
                                            e.target.checked ? paginated.map(s => s.userId) : []
                                        )
                                    }
                                />
                            </TableHead>
                            <TableHead>Photo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Class</TableHead>
                            {/* <TableHead>Section</TableHead> */}
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-10">
                                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground" />
                                    <p className="text-sm mt-2 text-muted-foreground">Loading...</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((student) => (
                                <TableRow key={student.userId}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(student.userId)}
                                            onChange={() => toggleSelect(student.userId)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Avatar>
                                            <AvatarImage src={student.user.profilePicture} />
                                            <AvatarFallback>{student.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.user?.email || 'N/A'}</TableCell>
                                    <TableCell>{student.class?.className || 'N/A'}'{student.class?.sections?.map(s => s.name).join(', ') || 'N/A'}</TableCell>
                                    <TableCell>{student.status || 'Active'}</TableCell>

                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openDialog(student)}
                                        >
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {filtered.length > itemsPerPage && (
                    <Pagination className="mt-4">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious onClick={() => setPage(p => Math.max(p - 1, 1))} />
                            </PaginationItem>
                            <PaginationItem>
                                <span className="text-sm px-2">
                                    Page {page} of {pageCount}
                                </span>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext onClick={() => setPage(p => Math.min(p + 1, pageCount))} />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>

            {dialogData && (
                <Dialog open={!!dialogData} onOpenChange={() => setDialogData(null)}>
                    <DialogContent className="max-w-md w-full border max-h-[90vh] overflow-y-auto bg-muted">
                        <DialogHeader className="items-center">

                            <div className='bg-white dark:bg-[#18181b] w-full rounded-lg py-3.5 flex items-center flex-col gap-2'>
                                <Avatar className="w-24 h-24 mx-auto">
                                    <AvatarImage src={dialogData.user?.profilePicture} />
                                    <AvatarFallback>{dialogData.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <DialogTitle className="text-center mt-2 text-xl font-bold">
                                    {dialogData.name}
                                </DialogTitle>
                                <span className="text-center font-regular text-sm text-gray-500">
                                    {dialogData.email} - <span >{dialogData.class?.className}
                                        {dialogData.class?.sections?.map(s => s.name).join(', ') || 'N/A'}
                                    </span>

                                </span>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "border mt-1.5",
                                        dialogData.user.status === "ACTIVE"
                                            ? "bg-green-100 text-green-700 border-green-200"
                                            : "bg-red-100 text-red-700 border-red-200"
                                    )}
                                >
                                    {dialogData.user.status}
                                </Badge>
                            </div>
                        </DialogHeader>

                        <div className="mt-2 grid grid-cols-2 bg-white dark:bg-[#18181b] rounded-lg text-sm">
                            {[
                                { label: 'Email', value: dialogData.user?.email },
                                { label: 'Class', value: dialogData.class?.className },
                                { label: 'Sections', value: dialogData.class?.sections?.map(s => s.name).join(', ') },
                                { label: 'User ID', value: dialogData.userId },
                                { label: 'Admission No', value: dialogData.admissionNo },
                                { label: 'Admission Date', value: new Date(dialogData.admissionDate).toLocaleDateString() },
                                { label: 'Date of Birth', value: new Date(dialogData.dob).toLocaleDateString() },
                                { label: 'Blood Group', value: dialogData.bloodGroup },
                                { label: 'Roll Number', value: dialogData.rollNumber },
                                { label: 'Fee Status', value: dialogData.FeeStatus },
                                { label: 'Status', value: dialogData.user?.status },
                                { label: 'Address', value: dialogData.Address },
                                { label: 'City', value: dialogData.city },
                                { label: 'State', value: dialogData.state },
                                { label: 'Country', value: dialogData.country },
                                { label: 'Postal Code', value: dialogData.postalCode },
                                { label: 'Father Name', value: dialogData.FatherName },
                                { label: 'Father Number', value: dialogData.FatherNumber },
                                { label: 'Mother Name', value: dialogData.MotherName },
                                { label: 'Mother Number', value: dialogData.MotherNumber },
                                { label: 'Guardian Name', value: dialogData.GuardianName },
                                { label: 'Guardian Relation', value: dialogData.GuardianRelation },
                                { label: 'House', value: dialogData.House }
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className={`px-4 py-3 ${i % 2 === 0 ? 'border-r' : ''} border-b border`}
                                >
                                    <div className="font-medium">{item.label}</div>
                                    <div>{item.value || 'N/A'}</div>
                                </div>
                            ))}
                            <div className="px-4 py-3 border-b border">
                                <div className="font-medium mb-2">Link Parent Account</div>
                                <Select
                                    value={selectedParentId || ''}
                                    onValueChange={(val) => setSelectedParentId(val)}
                                >
                                    <SelectTrigger className="bg-white w-full">
                                        <SelectValue placeholder="Select Parent" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allParents.map((parent) => (
                                            <SelectItem key={parent.userId} value={parent.userId}>
                                                {parent.name} ({parent.user?.email || 'No Email'})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {/* Parent Selection */}

                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
