'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select'
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle
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
    const [subjectFilter, setSubjectFilter] = useState('ALL')
    const [page, setPage] = useState(1)
    const [dialogData, setDialogData] = useState(null)
    const itemsPerPage = 5
    const [loading, setLoading] = useState(false)
    const fetchNonTeachers = async () => {
        if (!schoolId) return
        setLoading(true) // ✅ Start loader
        try {
            const res = await fetch(`/api/schools/non-teaching-staff/${schoolId}`)
            const json = await res.json()
            const data = json?.data || []

            if (!Array.isArray(data)) {
                console.error('Invalid data format:', data)
                setTeachers([])
                setFiltered([])
                return
            }

            setTeachers(data)
            setFiltered(data)
        } catch (err) {
            console.error('Failed to fetch staff', err)
            setTeachers([])
            setFiltered([])
        } finally {
            setLoading(false) // ✅ Stop loader
        }
    }

    useEffect(() => {
        fetchNonTeachers()
    }, [schoolId])

    useEffect(() => {
        let filteredList = [...teachers]
        if (subjectFilter !== 'ALL') {
            filteredList = filteredList.filter((t) => t.subject === subjectFilter)
        }
        if (search) {
            filteredList = filteredList.filter(
                (t) =>
                    t.name.toLowerCase().includes(search.toLowerCase()) ||
                    t.email.toLowerCase().includes(search.toLowerCase())
            )
        }
        setFiltered(filteredList)
        setPage(1)
    }, [search, subjectFilter, teachers])

    const paginated = Array.isArray(filtered)
        ? filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage)
        : []
    const pageCount = Math.ceil(filtered.length / itemsPerPage)

    return (
        <div className="p-6 space-y-6">
            <h2 className="text-2xl font-semibold">Non-Teaching Staff</h2>

            <div className="flex flex-row justify-between">
                <Input
                    placeholder="Search by name or email"
                    className="w-[180px] bg-muted"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <div className="flex flex-row gap-2">
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
                    <Button variant="outline" className="bg-muted" onClick={fetchNonTeachers}>
                        <RefreshCw />
                    </Button>
                    <Link href={`${schoolId}/profiles/staff/new`}>
                        <Button>
                            <Plus />
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
                            <TableHead>Subject</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="**:data-[slot=table-cell]:first:w-8">
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground" />
                                    <p className="text-sm mt-2 text-muted-foreground">Loading staff...</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginated.map((teacher) => (
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
                                <PaginationPrevious onClick={() => setPage((p) => Math.max(p - 1, 1))} />
                            </PaginationItem>
                            <PaginationItem>
                                <span className="text-sm px-2">
                                    Page {page} of {pageCount}
                                </span>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext onClick={() => setPage((p) => Math.min(p + 1, pageCount))} />
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
                                { label: 'Subject', value: dialogData.subject },
                                { label: 'Phone', value: dialogData.phone || 'N/A' },
                                { label: 'Gender', value: dialogData.gender || 'N/A' },
                                { label: 'Status', value: dialogData.status || 'Active' }
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
