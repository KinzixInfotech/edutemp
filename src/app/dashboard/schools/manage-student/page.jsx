'use client';
export const dynamic = 'force-dynamic';


import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from "@/lib/utils"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, RefreshCw, Loader2, Trash2, Slash } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export default function StudentListPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId

    const [selected, setSelected] = useState([])
    const [dialogData, setDialogData] = useState(null)
    const [search, setSearch] = useState('')
    const [selectedParentId, setSelectedParentId] = useState(null)
    const [classFilter, setClassFilter] = useState('ALL')
    const [sectionFilter, setSectionFilter] = useState('ALL')
    const [page, setPage] = useState(1)
    const itemsPerPage = 5

    // Fetch classes & sections
    const { data: allClasses = [] } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/classes`)
            return res.data || []
        },
        enabled: !!schoolId
    })

    // Derive sections dynamically based on selected class
    const allSections = classFilter === 'ALL'
        ? allClasses.flatMap(c => c.sections || [])
        : allClasses.find(c => c.className === classFilter)?.sections || []

    // Fetch students with pagination, search, class & section filter
    const { data: studentData = {}, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
        queryKey: ['students', schoolId, page, search, classFilter, sectionFilter],
        queryFn: async () => {
            const classId = classFilter === 'ALL' ? '' : allClasses.find(c => c.className === classFilter)?.classId || ''
            const sectionId = sectionFilter === 'ALL' ? '' : allSections.find(s => s.name === sectionFilter)?.sectionId || ''
            const res = await axios.get(`/api/schools/${schoolId}/students`, {
                params: { page, limit: itemsPerPage, classId, sectionId, search }
            })
            return res.data || {}
        },
        enabled: !!schoolId
    })

    const students = studentData.students || []
    const total = studentData.total || 0
    const pageCount = Math.ceil(total / itemsPerPage)

    // Fetch all parents (for dialog linking)
    const { data: allParents = [] } = useQuery({
        queryKey: ['parents', schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/parents`)
            return res.data.parents || []
        },
        enabled: !!schoolId && !!dialogData
    })

    const toggleSelect = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const handleDeleteSelected = () => console.log('Deleting:', selected)
    const handleInactivateSelected = () => console.log('Inactivating:', selected)

    const openDialog = (student) => {
        setDialogData(student)
        setSelectedParentId(student.parentId || null)
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
                                <SelectItem key={cls.id} value={cls.className}>{cls.className}</SelectItem>
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
                                <SelectItem key={sec.id} value={sec.name}>{sec.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button variant="outline" className="bg-muted" onClick={refetchStudents}>
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
                                    checked={selected.length === students.length && students.length > 0}
                                    onChange={(e) => setSelected(e.target.checked ? students.map(s => s.userId) : [])}
                                />
                            </TableHead>
                            <TableHead>Photo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Class / Sections</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {studentsLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-10">
                                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground" />
                                    <p className="text-sm mt-2 text-muted-foreground">Loading...</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            students.map(student => (
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
                                            <AvatarFallback>{student.name?.[0]?.toUpperCase() || ""}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>{student.name}</TableCell>
                                    <TableCell>{student.user?.email || 'N/A'}</TableCell>
                                    <TableCell>{student.class?.className || 'N/A'} - {student.section?.name || 'N/A'}</TableCell>
                                    <TableCell>
                                        <span className={`inline-block w-16 text-center px-1 py-0.5 rounded-full text-xs font-medium border ${student.user?.status === "ACTIVE" ? "text-green-700 border-green-700 bg-green-100" : "text-red-700 border-red-700 bg-red-100"}`}>
                                            {student.user?.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="outline" size="sm" onClick={() => openDialog(student)}>
                                            View
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>

                {total > itemsPerPage && (
                    <Pagination className="mt-4">
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious onClick={() => setPage(p => Math.max(p - 1, 1))} />
                            </PaginationItem>
                            <PaginationItem>
                                <span className="text-sm px-2">Page {page} of {pageCount}</span>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext onClick={() => setPage(p => Math.min(p + 1, pageCount))} />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>


            {/* Dialog remains exactly the same */}
            {dialogData && (
                <Dialog open={!!dialogData} onOpenChange={() => setDialogData(null)}>
                    <DialogContent className="max-w-md w-full border max-h-[90vh] overflow-y-auto bg-muted">
                        <DialogHeader className="items-center">

                            <div className='bg-white dark:bg-[#18181b] w-full rounded-lg py-3.5 flex items-center flex-col gap-2'>
                                <Avatar className="w-24 h-24 mx-auto">
                                    <AvatarImage src={dialogData.user?.profilePicture} />
                                    <AvatarFallback>{dialogData.name?.[0]?.toUpperCase() || ""}</AvatarFallback>
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
