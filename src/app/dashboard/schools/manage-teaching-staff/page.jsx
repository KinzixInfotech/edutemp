'use client';
export const dynamic = 'force-dynamic';


import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from "@/lib/utils"
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Badge } from "@/components/ui/badge"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

export default function TeacherListPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId

    const [filtered, setFiltered] = useState([])
    const [search, setSearch] = useState('')
    const [subjectFilter, setSubjectFilter] = useState('ALL')
    const [page, setPage] = useState(1)
    const [dialogData, setDialogData] = useState(null)
    const itemsPerPage = 5

    const { data: teachers = [], isLoading, refetch } = useQuery({
        queryKey: ['teachers', schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/teaching-staff/${schoolId}`)
            return res.data.data || []
        },
        enabled: !!schoolId
    })

    // Filter and search
    const filteredTeachers = teachers.filter(t => {
        const matchesSubject = subjectFilter === 'ALL' || t.subjects?.some(sub => sub.name === subjectFilter)
        const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase())
        return matchesSubject && matchesSearch
    })

    const paginated = filteredTeachers.slice((page - 1) * itemsPerPage, page * itemsPerPage)
    const pageCount = Math.ceil(filteredTeachers.length / itemsPerPage)

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-semibold">Teaching Staff</h2>

            <div className='flex flex-row justify-between'>
                <Input
                    placeholder="Search by name or email"
                    className="w-[180px] bg-muted"
                    value={search}
                    onChange={e => { setSearch(e.target.value); setPage(1) }}
                />

                <div className='flex flex-row gap-2 items-center'>
                    <Select value={subjectFilter} onValueChange={val => { setSubjectFilter(val); setPage(1) }}>
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

                    <Button variant='outline' className='bg-muted' onClick={refetch}>
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
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <Loader2 className="w-6 h-6 mx-auto animate-spin text-muted-foreground" />
                                    <p className="text-sm mt-2 text-muted-foreground">Loading teachers...</p>
                                </TableCell>
                            </TableRow>
                        ) : paginated.length > 0 ? (
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
                                    <TableCell>{teacher.gender || 'N/A'}</TableCell>
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
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">No teachers found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

                {filteredTeachers.length > itemsPerPage && (
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
                                <DialogTitle className="text-center mt-2 text-xl font-bold">{dialogData.name}</DialogTitle>
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
