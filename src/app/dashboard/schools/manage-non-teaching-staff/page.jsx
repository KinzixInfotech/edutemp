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
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
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
                            <SelectItem value="ALL">All Designation</SelectItem>
                            <SelectItem value="Math">Math</SelectItem>
                            <SelectItem value="Science">Science</SelectItem>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="History">History</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="bg-muted" onClick={fetchNonTeachers}>
                        <RefreshCw />
                    </Button>
                    <Link href={`/dashboard/schools/${schoolId}/profiles/staff/new`}>
                        <Button className='dark:text-white'>
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
                            <TableHead>Designation</TableHead>
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
                                            <AvatarImage src={teacher.user?.profilePicture} />
                                            <AvatarFallback>{teacher.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                    </TableCell>
                                    <TableCell>{teacher.name}</TableCell>
                                    <TableCell>{teacher.email}</TableCell>
                                    <TableCell>{teacher.designation}</TableCell>
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
                                { label: 'Designation', value: dialogData.designation },
                                { label: 'Employee ID', value: dialogData.employeeId },
                                { label: 'Gender', value: dialogData.gender },
                                { label: 'DOB', value: new Date(dialogData.dob).toLocaleDateString() },
                                { label: 'Age', value: dialogData.age },
                                { label: 'Blood Group', value: dialogData.bloodGroup },
                                { label: 'Contact Number', value: dialogData.contactNumber },
                                { label: 'Address', value: dialogData.address },
                                { label: 'City', value: dialogData.City },
                                { label: 'District', value: dialogData.district },
                                { label: 'State', value: dialogData.state },
                                { label: 'Country', value: dialogData.country },
                                { label: 'Postal Code', value: dialogData.PostalCode },
                                { label: 'Status', value: dialogData.user?.status || 'Active' }
                            ].map((item, i) => (
                                <div
                                    key={i}
                                    className={`px-4 py-3 ${i % 2 === 0 ? 'border-r' : ''} border-b `}
                                >
                                    <div className="font-medium">{item.label}</div>
                                    <div>{item.value || 'N/A'}</div>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    )
}
