'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table'
import {
    Avatar, AvatarFallback, AvatarImage
} from '@/components/ui/avatar'
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import {
    Select, SelectTrigger, SelectValue,
    SelectContent, SelectItem
} from '@/components/ui/select'
import { Badge } from "@/components/ui/badge"
import {
    Pagination, PaginationContent, PaginationItem,
    PaginationNext, PaginationPrevious
} from '@/components/ui/pagination'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle
} from '@/components/ui/dialog'
import { Plus, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function TeacherListPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId
    const [teachers, setTeachers] = useState([])
    const [filtered, setFiltered] = useState([])
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [subjectFilter, setSubjectFilter] = useState('ALL')
    const [page, setPage] = useState(1)
    const [dialogData, setDialogData] = useState(null)
    const itemsPerPage = 5

    const fetchTeachers = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/schools/teaching-staff/${schoolId}`)
            const { data } = await res.json()
            setTeachers(data || [])
            setFiltered(data || [])
        } catch (err) {
            console.error("Failed to fetch teachers:", err)
            setTeachers([])
            setFiltered([])
        } finally {
            setLoading(false)
        }
    }


    useEffect(() => {
        if (schoolId) fetchTeachers()
    }, [schoolId])

    useEffect(() => {
        let filteredList = [...teachers]

        if (subjectFilter !== 'ALL') {
            filteredList = filteredList.filter(t =>
                t.subjects?.some(sub => sub.name === subjectFilter)
            )
        }

        if (search) {
            filteredList = filteredList.filter(t =>
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.email.toLowerCase().includes(search.toLowerCase())
            )
        }

        setFiltered(filteredList)
        setPage(1)
    }, [search, subjectFilter, teachers])

    const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    const pageCount = Math.ceil(filtered.length / itemsPerPage)

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-semibold">Teaching Staff</h2>

            <div className='flex flex-row justify-between'>
                <Input
                    placeholder="Search by name or email"
                    className="w-[180px] bg-muted"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />

                <div className='flex flex-row gap-2 items-center'>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                        <SelectTrigger className="w-[180px] bg-muted">
                            <SelectValue placeholder="Filter by subject" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">All Subjects</SelectItem>
                            <SelectItem value="Math">Math</SelectItem>
                            <SelectItem value="Science">Science</SelectItem>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="History">History</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant='outline' className='bg-muted' onClick={fetchTeachers}>
                        <RefreshCw size={16} />
                    </Button>

                    <Link href={`/dashboard/schools/${schoolId}/profiles/teacher/new`}>
                        <Button className='dark:text-white'>
                            <Plus size={16} />
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="overflow-x-auto overflow-hidden rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead>Photo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Gender</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                                    <p className="text-sm mt-2 text-muted-foreground">Loading teachers...</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map(teacher => (
                                <TableRow key={teacher.userId}>
                                    <TableCell>
                                        <Avatar>
                                            <AvatarImage src={teacher.user.profilePicture} />
                                            <AvatarFallback>{teacher.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>{teacher.name}</TableCell>
                                    <TableCell>{teacher.email}</TableCell>
                                    <TableCell>
                                        {/* {teacher.subjects?.map(s => s.name).join(', ') || 'N/A'} */}
                                        {teacher?.gender}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDialogData(teacher)}
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
                                <span className="text-sm px-2">Page {page} of {pageCount}</span>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext onClick={() => setPage(p => Math.min(p + 1, pageCount))} />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                )}
            </div>

            {dialogData && (
                <Dialog open={!!dialogData} onOpenChange={() => setDialogData(null)} >
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
                                    {dialogData.email} - <span className="underline">{dialogData.employeeId}</span>

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
                                { label: 'Email', value: dialogData.email },
                                { label: 'Account Password', value: dialogData.user.password },
                                { label: 'Employee ID', value: dialogData.employeeId },
                                { label: 'Designation', value: dialogData.designation },
                                { label: 'Phone', value: dialogData.contactNumber || 'N/A' },
                                { label: 'Gender', value: dialogData.gender || 'N/A' },
                                { label: 'Date of Birth', value: dialogData.dob?.split('T')[0] || 'N/A' },
                                { label: 'Age', value: dialogData.age || 'N/A' },
                                { label: 'Blood Group', value: dialogData.bloodGroup || 'N/A' },
                                { label: 'Status', value: dialogData.user?.status || 'Active' },
                                { label: 'Address Line 1', value: dialogData.address || 'N/A' },
                                { label: 'City', value: dialogData.City || 'N/A' },
                                { label: 'District', value: dialogData.district || 'N/A' },
                                { label: 'State', value: dialogData.state || 'N/A' },
                                { label: 'Postal Code', value: dialogData.PostalCode || 'N/A' },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className={`px-4 py-3 ${i % 2 === 0 ? 'border-r' : ''} border-b  break-words whitespace-normal max-w-full`}
                                >
                                    <div className="font-medium">{item.label}</div>
                                    <div>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    )
}
