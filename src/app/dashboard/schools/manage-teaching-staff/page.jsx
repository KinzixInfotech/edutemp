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

                    <Link href={`/${schoolId}/profiles/teacher/new`}>
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
                            <TableHead>Subjects</TableHead>
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
                                            <AvatarImage src={teacher.profilePicture} />
                                            <AvatarFallback>{teacher.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>{teacher.name}</TableCell>
                                    <TableCell>{teacher.email}</TableCell>
                                    <TableCell>
                                        {teacher.subjects?.map(s => s.name).join(', ') || 'N/A'}
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

                        <div className="mt-4 grid grid-cols-2 bg-muted rounded-lg text-sm">
                            {[
                                { label: 'Email', value: dialogData.email },
                                {
                                    label: 'Subjects',
                                    value: dialogData.subjects?.map(s => s.name).join(', ') || 'N/A'
                                },
                                { label: 'Phone', value: dialogData.contactNumber || 'N/A' },
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
        </div>
    )
}
