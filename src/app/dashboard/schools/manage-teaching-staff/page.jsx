'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
export default function TeacherListPage() {
    const { fullUser } = useAuth()
    const schoolId = fullUser?.schoolId;
    const [teachers, setTeachers] = useState([
        {
            id: '1',
            name: 'Anjali Sharma',
            email: 'anjali.sharma@example.com',
            subject: 'Math',
            profilePicture: 'https://i.pravatar.cc/150?img=1',
            phone: '9876543210',
            gender: 'Female',
            status: 'Active'
        },
        {
            id: '2',
            name: 'Rohit Verma',
            email: 'rohit.verma@example.com',
            subject: 'Science',
            profilePicture: 'https://i.pravatar.cc/150?img=2',
            phone: '9123456780',
            gender: 'Male',
            status: 'Inactive'
        },
        {
            id: '3',
            name: 'Fatima Khan',
            email: 'fatima.khan@example.com',
            subject: 'English',
            profilePicture: 'https://i.pravatar.cc/150?img=3',
            phone: '9988776655',
            gender: 'Female',
            status: 'Active'
        },
        {
            id: '4',
            name: 'Arjun Mehta',
            email: 'arjun.mehta@example.com',
            subject: 'History',
            profilePicture: 'https://i.pravatar.cc/150?img=4',
            phone: '9090909090',
            gender: 'Male',
            status: 'Active'
        },
        {
            id: '5',
            name: 'Priya Nair',
            email: 'priya.nair@example.com',
            subject: 'Science',
            profilePicture: 'https://i.pravatar.cc/150?img=5',
            phone: '9234567890',
            gender: 'Female',
            status: 'Inactive'
        }
    ])
    const [filtered, setFiltered] = useState([])
    const [search, setSearch] = useState('')
    const [subjectFilter, setSubjectFilter] = useState('ALL')
    const [page, setPage] = useState(1)
    const [dialogData, setDialogData] = useState(null)
    const itemsPerPage = 5

    const fetchTeachers = async () => {
        try {
            const res = await fetch('/api/teachers')
            const data = await res.json()
            setTeachers(data)
            setFiltered(data)
        } catch {
            setTeachers([])
        }
    }

    useEffect(() => {
        let filteredList = [...teachers]
        if (subjectFilter !== 'ALL') {
            filteredList = filteredList.filter(t => t.subject === subjectFilter)
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
                <div className='flex flex-row gap-2'>
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
                        <Button variant='outline' className='bg-muted'>
                            <RefreshCw />
                        </Button>
                        <Link href={`${schoolId}/profiles/teacher/new`}>
                            <Button>
                                <Plus />
                            </Button>
                        </Link>
                    </Select>
                </div>
            </div>
            <div className="overflow-x-auto overflow-hidden rounded-lg border">

                <Table className="min-w-[800px]">
                    <TableHeader className="bg-muted sticky top-0 z-10">
                        <TableRow>
                            <TableHead>Photo</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="**:data-[slot=table-cell]:first:w-8">
                        {paginated.map(teacher => (
                            <TableRow key={teacher.id}>
                                <TableCell>
                                    <Avatar>
                                        <AvatarImage src={teacher.profilePicture} />
                                        <AvatarFallback>{teacher.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell>{teacher.name}</TableCell>
                                <TableCell>{teacher.email}</TableCell>
                                <TableCell>{teacher.subject}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="outline" size="sm" onClick={() => setDialogData(teacher)}>View </Button>
                                </TableCell>
                            </TableRow>
                        ))}
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
                <Dialog open={!!dialogData} onOpenChange={() => setDialogData(null)}>
                    <DialogContent className="max-w-md w-full border-muted">
                        <DialogHeader className="items-center">
                            <Avatar className="w-24 h-24 mx-auto">
                                <AvatarImage src={dialogData.profilePicture} />
                                <AvatarFallback>{dialogData.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <DialogTitle className="text-center mt-2 text-xl font-bold">
                                {dialogData.name}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="mt-4 grid grid-cols-2  bg-muted rounded-lg text-sm">
                            {[
                                { label: 'Email', value: dialogData.email },
                                { label: 'Subject', value: dialogData.subject },
                                { label: 'Phone', value: dialogData.phone || 'N/A' },
                                { label: 'Gender', value: dialogData.gender || 'N/A' },
                                { label: 'Status', value: dialogData.status || 'Active' },
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className={`px-4 py-3 ${i % 2 === 0 ? 'border-r' : ''} border-b border-muted`}
                                >
                                    <div className="font-medium">{item.label}</div>
                                    <div>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

        </div >
    )
}
