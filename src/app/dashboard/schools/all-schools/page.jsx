'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    School,
    Search,
    RefreshCw,
    Plus,
    Users,
    GraduationCap,
    Building2,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    RotateCcw,
    Eye,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

export default function AllSchoolsPage() {
    // State
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [subscriptionFilter, setSubscriptionFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [sortColumn, setSortColumn] = useState('name')
    const [sortDirection, setSortDirection] = useState('asc')

    // Debounce search
    const handleSearchChange = (value) => {
        setSearch(value)
        clearTimeout(window.__schoolSearchTimer)
        window.__schoolSearchTimer = setTimeout(() => {
            setDebouncedSearch(value)
            setCurrentPage(1)
        }, 400)
    }

    // Fetch schools
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['schools-enhanced', currentPage, pageSize, debouncedSearch, subscriptionFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: pageSize.toString(),
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(subscriptionFilter !== 'all' && { subscription: subscriptionFilter }),
            })
            const res = await fetchWithAuth(`/api/schools/all-enhanced?${params}`)
            if (!res.ok) throw new Error('Failed to fetch schools')
            return res.json()
        },
        keepPreviousData: true,
    })

    const meta = data?.meta || {}
    const stats = data?.stats || {}

    // Sort locally within the current page
    const sortedSchools = useMemo(() => {
        const rows = data?.schools || []
        if (!rows.length) return []
        return [...rows].sort((a, b) => {
            let aVal, bVal
            switch (sortColumn) {
                case 'name':
                    aVal = a.name || ''; bVal = b.name || ''
                    break
                case 'students':
                    aVal = a._count?.Student || 0; bVal = b._count?.Student || 0
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                case 'staff':
                    aVal = (a._count?.TeachingStaff || 0) + (a._count?.NonTeachingStaff || 0)
                    bVal = (b._count?.TeachingStaff || 0) + (b._count?.NonTeachingStaff || 0)
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                case 'classes':
                    aVal = a._count?.classes || 0; bVal = b._count?.classes || 0
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                case 'code':
                    aVal = a.schoolCode || ''; bVal = b.schoolCode || ''
                    break
                default:
                    aVal = a.name || ''; bVal = b.name || ''
            }
            if (typeof aVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        })
    }, [data?.schools, sortColumn, sortDirection])

    const clearAllFilters = () => {
        setSearch('')
        setDebouncedSearch('')
        setSubscriptionFilter('all')
        setCurrentPage(1)
    }

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc')
        } else {
            setSortColumn(column)
            setSortDirection('asc')
        }
    }

    const renderSortableHeader = (column, label) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center gap-1">
                {label}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? 'text-primary' : 'text-muted-foreground/50'}`} />
            </div>
        </TableHead>
    )

    const renderTableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
            ))}
        </>
    )

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        All Schools
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage and monitor all schools in the system</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/dashboard/schools/create-school">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4 mr-2" />
                            Create School
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                        <Building2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSchools ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Registered in system</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
                        <School className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.activeSchools ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Currently operational</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <GraduationCap className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats.totalStudents?.toLocaleString() ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Across all schools</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Teachers</CardTitle>
                        <Users className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.totalTeachers?.toLocaleString() ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Across all schools</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-none border">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search schools by name, code, location, domain..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={subscriptionFilter} onValueChange={(v) => { setSubscriptionFilter(v); setCurrentPage(1) }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Subscription" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Subscriptions</SelectItem>
                                <SelectItem value="A">Plan A</SelectItem>
                                <SelectItem value="B">Plan B</SelectItem>
                                <SelectItem value="C">Plan C</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Rows per page" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 per page</SelectItem>
                                <SelectItem value="25">25 per page</SelectItem>
                                <SelectItem value="50">50 per page</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={clearAllFilters}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="border-0 shadow-none border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Schools ({meta.total ?? 0})</CardTitle>
                            <CardDescription>All registered schools with student and staff counts</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:bg-background/50 bg-muted/50">
                                    <TableHead className="w-[50px]">Logo</TableHead>
                                    {renderSortableHeader('code', 'Code')}
                                    {renderSortableHeader('name', 'School Name')}
                                    <TableHead>Location</TableHead>
                                    {renderSortableHeader('students', 'Students')}
                                    {renderSortableHeader('staff', 'Staff')}
                                    {renderSortableHeader('classes', 'Classes')}
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    renderTableLoadingRows()
                                ) : sortedSchools.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <Building2 className="w-12 h-12 text-muted-foreground/50" />
                                                <p className="text-muted-foreground">No schools found</p>
                                                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                                                    Clear filters
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedSchools.map((school, index) => {
                                        const totalStaff = (school._count?.TeachingStaff || 0) + (school._count?.NonTeachingStaff || 0)
                                        return (
                                            <TableRow key={school.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? 'bg-muted dark:bg-background/50' : ''}`}>
                                                <TableCell>
                                                    <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0">
                                                        {school.profilePicture ? (
                                                            <img
                                                                src={school.profilePicture}
                                                                alt={school.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">{school.schoolCode}</TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{school.name}</p>
                                                        <p className="text-xs text-muted-foreground">{school.domain}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{school.location || '—'}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                        {school._count?.Student || 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                                        {totalStaff}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                        {school._count?.classes || 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={
                                                        school.status === 'SUSPENDED'
                                                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                                                            : school.status === 'PAST_DUE'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                                                                : school.status === 'TERMINATED'
                                                                    ? 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900/40 dark:text-zinc-300 dark:border-zinc-800'
                                                                    : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                                    }>
                                                        {school.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link href={`/dashboard/schools/${school.id}/manage`}>
                                                            <Button size="sm" variant="outline">
                                                                <Eye className="w-3.5 h-3.5 mr-1" />
                                                                View
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {meta.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm">
                            <p className="text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total} schools
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => p - 1)}
                                    disabled={!meta.hasPreviousPage || isFetching}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Prev
                                </Button>
                                <span className="px-3 py-1 text-sm font-medium">
                                    {currentPage} / {meta.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => p + 1)}
                                    disabled={!meta.hasNextPage || isFetching}
                                >
                                    Next
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
