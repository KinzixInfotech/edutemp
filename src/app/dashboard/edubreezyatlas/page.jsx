'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Globe, Search, RefreshCw, Plus, Eye, EyeOff, Trash2, Edit, Star,
    Building2, ChevronLeft, ChevronRight, ArrowUpDown, RotateCcw,
    Loader2, BadgeCheck, Sparkles, BarChart3, X, Upload, Save,
    MapPin, Phone, Mail, Link2, DollarSign, Users, GraduationCap,
    Download, FileSpreadsheet, XCircle, CheckCircle2, Play, TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import { useR2Upload } from '@/hooks/useR2Upload'
import * as XLSX from 'xlsx'
import { Progress } from '@/components/ui/progress'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import { z } from 'zod'

const fetchWithAuth = async (url, options = {}) => {
    const headers = { ...options?.headers };
    return fetch(url, { ...options, headers });
};

const atlasFormSchema = z.object({
    isNewSchool: z.boolean().optional().default(false),
    newSchoolName: z.string().optional().default(''),
    schoolId: z.string().optional().default(''),
    tagline: z.string().trim().min(1, 'Tagline is required').max(100, 'Tagline must be 100 characters or less'),
    description: z.string().trim().min(1, 'Description is required'),
}).superRefine((data, ctx) => {
    if (data.isNewSchool) {
        if (!data.newSchoolName?.trim()) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['newSchoolName'],
                message: 'New school name is required',
            });
        }
    } else if (!data.schoolId?.trim()) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['schoolId'],
            message: 'Please select an ERP school',
        });
    }
});

// ─── Constants ──────────────────────────────────────────────
const DEFAULT_FORM = {
    isNewSchool: false,
    newSchoolName: '',
    schoolId: '',
    location: '',
    tagline: '',
    description: '',
    vision: '',
    mission: '',
    coverImage: '',
    logoImage: '',
    videoUrl: '',
    publicEmail: '',
    publicPhone: '',
    website: '',
    minFee: '',
    maxFee: '',
    feeStructureUrl: '',
    detailedFeeStructure: {
        avgFee: '',
        admissionFee: '',
        monthlyTuition: '',
    },
    establishedYear: '',
    totalStudents: '',
    totalTeachers: '',
    studentTeacherRatio: '',
    latitude: '',
    longitude: '',
    isPubliclyVisible: false,
    isFeatured: false,
    isVerified: false,
    boards: [],
    genderType: '',
    religiousAffiliation: '',
    socials: { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
    leadership: [],
}

// ─── Main Page Component ─────────────────────────────────────
export default function EdubreezyAtlasPage() {
    const queryClient = useQueryClient()

    // State
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [visibilityFilter, setVisibilityFilter] = useState('all')
    const [featuredFilter, setFeaturedFilter] = useState('all')
    const [listingSourceFilter, setListingSourceFilter] = useState('all')
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)
    const [sortColumn, setSortColumn] = useState('updatedAt')
    const [sortDirection, setSortDirection] = useState('desc')

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false)
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
    const [editingProfile, setEditingProfile] = useState(null)
    const [formData, setFormData] = useState(DEFAULT_FORM)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    // Debounce search
    const handleSearchChange = (value) => {
        setSearch(value)
        clearTimeout(window.__atlasSearchTimer)
        window.__atlasSearchTimer = setTimeout(() => {
            setDebouncedSearch(value)
            setCurrentPage(1)
        }, 400)
    }

    // ─── Queries ─────────────────────────────────
    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['atlas-profiles', currentPage, pageSize, debouncedSearch, visibilityFilter, featuredFilter, listingSourceFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: currentPage.toString(),
                limit: pageSize.toString(),
                ...(debouncedSearch && { search: debouncedSearch }),
                ...(visibilityFilter !== 'all' && { visibility: visibilityFilter }),
                ...(featuredFilter !== 'all' && { featured: featuredFilter }),
                ...(listingSourceFilter !== 'all' && { listingSource: listingSourceFilter }),
            })
            const res = await fetchWithAuth(`/api/edubreezyatlas?${params}`)
            if (!res.ok) throw new Error('Failed to fetch atlas profiles')
            return res.json()
        },
        keepPreviousData: true,
    })

    // Fetch all schools for the school selector dropdown
    const { data: schoolsData } = useQuery({
        queryKey: ['all-schools-for-atlas'],
        queryFn: async () => {
            const res = await fetchWithAuth('/api/schools/all-enhanced?limit=500')
            if (!res.ok) throw new Error('Failed to fetch schools')
            return res.json()
        },
        staleTime: 5 * 60 * 1000,
    })

    const profiles = data?.profiles || []
    const meta = data?.meta || {}
    const stats = data?.stats || {}
    const allSchools = schoolsData?.schools || []

    // ─── Mutations ───────────────────────────────
    const saveMutation = useMutation({
        mutationFn: async (payload) => {
            if (editingProfile) {
                // Update existing
                const res = await fetchWithAuth(`/api/edubreezyatlas/${editingProfile.schoolId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error('Failed to update profile')
                return res.json()
            } else {
                // Create new
                const res = await fetchWithAuth('/api/edubreezyatlas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                })
                if (!res.ok) throw new Error('Failed to create profile')
                return res.json()
            }
        },
        onSuccess: (data) => {
            toast.success(data.message || 'Profile saved successfully')
            queryClient.invalidateQueries({ queryKey: ['atlas-profiles'] })
            setDialogOpen(false)
            setEditingProfile(null)
            setFormData(DEFAULT_FORM)
        },
        onError: (err) => toast.error(err.message),
    })

    const deleteMutation = useMutation({
        mutationFn: async (schoolId) => {
            const res = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to remove school')
            return res.json()
        },
        onSuccess: (data) => {
            toast.success(data.message)
            queryClient.invalidateQueries({ queryKey: ['atlas-profiles'] })
            setDeleteConfirm(null)
        },
        onError: (err) => toast.error(err.message),
    })

    const toggleVisibilityMutation = useMutation({
        mutationFn: async ({ schoolId, isPubliclyVisible }) => {
            const res = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPubliclyVisible }),
            })
            if (!res.ok) throw new Error('Failed to toggle visibility')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atlas-profiles'] })
            toast.success('Visibility updated')
        },
        onError: (err) => toast.error(err.message),
    })

    // ─── Handlers ────────────────────────────────
    const openAddDialog = () => {
        setEditingProfile(null)
        setFormData(DEFAULT_FORM)
        setDialogOpen(true)
    }

    const openEditDialog = (profile) => {
        setEditingProfile(profile)
        setFormData({
            schoolId: profile.schoolId,
            location: profile.school?.location || '',
            tagline: profile.tagline || '',
            description: profile.description || '',
            vision: profile.vision || '',
            mission: profile.mission || '',
            coverImage: profile.coverImage || '',
            logoImage: profile.logoImage || '',
            videoUrl: profile.videoUrl || '',
            publicEmail: profile.publicEmail || '',
            publicPhone: profile.publicPhone || '',
            website: profile.website || '',
            minFee: profile.minFee || '',
            maxFee: profile.maxFee || '',
            feeStructureUrl: profile.feeStructureUrl || '',
            establishedYear: profile.establishedYear || '',
            totalStudents: profile.totalStudents || '',
            totalTeachers: profile.totalTeachers || '',
            studentTeacherRatio: profile.studentTeacherRatio || '',
            latitude: profile.latitude || '',
            longitude: profile.longitude || '',
            isPubliclyVisible: profile.isPubliclyVisible ?? false,
            isFeatured: profile.isFeatured ?? false,
            isVerified: profile.isVerified ?? false,
            detailedFeeStructure: profile.detailedFeeStructure || { avgFee: '', admissionFee: '', monthlyTuition: '' },
            boards: profile.boards || [],
            genderType: profile.genderType || '',
            religiousAffiliation: profile.religiousAffiliation || '',
            socials: profile.socials || { facebook: '', instagram: '', twitter: '', linkedin: '', youtube: '' },
            leadership: profile.leadership || [],
        })
        setDialogOpen(true)
    }

    const handleSubmit = (submittedFormData) => {
        if (!editingProfile && !submittedFormData.isNewSchool && !submittedFormData.schoolId) {
            toast.error('Please select a school')
            return
        }
        if (!editingProfile && submittedFormData.isNewSchool && !submittedFormData.newSchoolName?.trim()) {
            toast.error('Please enter a new school name')
            return
        }
        // Clean numeric fields
        const payload = {
            ...submittedFormData,
            minFee: submittedFormData.minFee ? parseInt(submittedFormData.minFee) : null,
            maxFee: submittedFormData.maxFee ? parseInt(submittedFormData.maxFee) : null,
            establishedYear: submittedFormData.establishedYear ? parseInt(submittedFormData.establishedYear) : null,
            totalStudents: submittedFormData.totalStudents ? parseInt(submittedFormData.totalStudents) : 0,
            totalTeachers: submittedFormData.totalTeachers ? parseInt(submittedFormData.totalTeachers) : 0,
            studentTeacherRatio: submittedFormData.studentTeacherRatio ? parseFloat(submittedFormData.studentTeacherRatio) : null,
            latitude: submittedFormData.latitude ? parseFloat(submittedFormData.latitude) : null,
            longitude: submittedFormData.longitude ? parseFloat(submittedFormData.longitude) : null,
        }
        saveMutation.mutate(payload)
    }

    const clearAllFilters = () => {
        setSearch('')
        setDebouncedSearch('')
        setVisibilityFilter('all')
        setFeaturedFilter('all')
        setListingSourceFilter('all')
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

    // Local sort
    const sortedProfiles = useMemo(() => {
        if (!profiles.length) return []
        return [...profiles].sort((a, b) => {
            let aVal, bVal
            switch (sortColumn) {
                case 'name':
                    aVal = a.school?.name || ''; bVal = b.school?.name || ''
                    break
                case 'views':
                    aVal = a.profileViews || 0; bVal = b.profileViews || 0
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                case 'rating':
                    aVal = a.overallRating || 0; bVal = b.overallRating || 0
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
                default:
                    aVal = a.school?.name || ''; bVal = b.school?.name || ''
            }
            if (typeof aVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal
        })
    }, [profiles, sortColumn, sortDirection])

    // ─── Sub-components ──────────────────────────
    const SortableHeader = ({ column, children }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? 'text-primary' : 'text-muted-foreground/50'}`} />
            </div>
        </TableHead>
    )

    const TableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-10 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
            ))}
        </>
    )

    const ViewsDeltaCell = ({ profileViews = 0, averageViews = 0 }) => {
        const safeAverage = averageViews || 0
        const deltaPercent = safeAverage > 0
            ? Math.round(((profileViews - safeAverage) / safeAverage) * 100)
            : 0
        const isUp = deltaPercent > 0
        const isDown = deltaPercent < 0
        const trendColor = isUp ? '#16a34a' : isDown ? '#dc2626' : '#64748b'
        const chartData = [
            { point: 0, value: safeAverage || 0 },
            { point: 1, value: profileViews || 0 },
        ]

        return (
            <div className="flex items-center gap-3 min-w-[150px]">
                <div className="h-10 w-20">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                            <defs>
                                <linearGradient id={`views-delta-${profileViews}-${safeAverage}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={trendColor} stopOpacity={0.35} />
                                    <stop offset="100%" stopColor={trendColor} stopOpacity={0.05} />
                                </linearGradient>
                            </defs>
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={trendColor}
                                strokeWidth={2}
                                fill={`url(#views-delta-${profileViews}-${safeAverage})`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium">
                    {isUp ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                    ) : isDown ? (
                        <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                        <Minus className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={isUp ? 'text-green-600' : isDown ? 'text-red-600' : 'text-slate-500'}>
                        {safeAverage > 0 ? `${Math.abs(deltaPercent)}%` : '0%'}
                    </span>
                    <span className="text-muted-foreground">vs avg</span>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* ─── Header ──────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Globe className="w-8 h-8 text-emerald-600" />
                        Edubreezy Atlas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage school listings on the Atlas marketplace</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-900/30" onClick={() => setBulkDialogOpen(true)}>
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Bulk Upload
                    </Button>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={openAddDialog}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add School
                    </Button>
                </div>
            </div>

            {/* ─── Stats Cards ──────────────────────── */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Listed</CardTitle>
                        <Globe className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalListed ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Publicly visible schools</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ERP Listed</CardTitle>
                        <Building2 className="h-4 w-4 text-sky-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-sky-600">{stats.erpListed ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Profiles synced from ERP schools</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Independent</CardTitle>
                        <Plus className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.independentListed ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Atlas-only manual listings</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Featured</CardTitle>
                        <Sparkles className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{stats.totalFeatured ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Highlighted on homepage</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Verified</CardTitle>
                        <BadgeCheck className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.totalVerified ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Blue tick badge</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Views</CardTitle>
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats.averageViews?.toLocaleString() ?? '—'}</div>
                        <p className="text-xs text-muted-foreground">Average profile views per listed school</p>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Filters ─────────────────────────── */}
            <Card className="border-0 shadow-none border">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by school name, location, tagline..."
                                value={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={visibilityFilter} onValueChange={(v) => { setVisibilityFilter(v); setCurrentPage(1) }}>
                            <SelectTrigger><SelectValue placeholder="Visibility" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Visibility</SelectItem>
                                <SelectItem value="visible">Visible</SelectItem>
                                <SelectItem value="hidden">Hidden</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={featuredFilter} onValueChange={(v) => { setFeaturedFilter(v); setCurrentPage(1) }}>
                            <SelectTrigger><SelectValue placeholder="Featured" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Schools</SelectItem>
                                <SelectItem value="yes">Featured Only</SelectItem>
                                <SelectItem value="no">Non-Featured</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={listingSourceFilter} onValueChange={(v) => { setListingSourceFilter(v); setCurrentPage(1) }}>
                            <SelectTrigger><SelectValue placeholder="Listing Source" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sources</SelectItem>
                                <SelectItem value="erp">ERP</SelectItem>
                                <SelectItem value="independent">Independent</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button variant="outline" onClick={clearAllFilters}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Data Table ──────────────────────── */}
            <Card className="border-0 shadow-none border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Atlas Schools ({meta.total ?? 0})</CardTitle>
                            <CardDescription>Schools listed on the Atlas marketplace</CardDescription>
                        </div>
                        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="10">10 per page</SelectItem>
                                <SelectItem value="25">25 per page</SelectItem>
                                <SelectItem value="50">50 per page</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:bg-background/50 bg-muted/50">
                                    <TableHead className="w-[50px]">Logo</TableHead>
                                    <SortableHeader column="name">School Name</SortableHeader>
                                    <TableHead>Location</TableHead>
                                    <TableHead>Tagline</TableHead>
                                    <TableHead>Status</TableHead>
                                    <SortableHeader column="views">Views</SortableHeader>
                                    <TableHead>Trend</TableHead>
                                    <SortableHeader column="rating">Rating</SortableHeader>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableLoadingRows />
                                ) : sortedProfiles.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <Globe className="w-12 h-12 text-muted-foreground/50" />
                                                <p className="text-muted-foreground">No Atlas profiles found</p>
                                                <Button variant="outline" size="sm" onClick={openAddDialog}>
                                                    <Plus className="w-4 h-4 mr-1" />
                                                    Add First School
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedProfiles.map((profile, index) => (
                                        <TableRow key={profile.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? 'bg-muted dark:bg-background/50' : ''}`}>
                                            <TableCell>
                                                <div className="w-9 h-9 rounded-full overflow-hidden border border-border bg-muted flex items-center justify-center flex-shrink-0">
                                                    {(profile.logoImage || profile.school?.profilePicture) ? (
                                                        <img
                                                            src={profile.logoImage || profile.school?.profilePicture}
                                                            alt={profile.school?.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-medium">{profile.school?.name}</p>
                                                        {profile.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                                                        <Badge
                                                            variant="outline"
                                                            className={
                                                                profile.listingSource === 'independent'
                                                                    ? 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                                                                    : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                                                            }
                                                        >
                                                            {profile.listingSource === 'independent' ? 'Independent' : 'ERP'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{profile.school?.schoolCode}</p>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{profile.school?.location || '—'}</TableCell>
                                            <TableCell className="text-sm max-w-[200px] truncate">{profile.tagline || '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {profile.isPubliclyVisible ? (
                                                        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 text-xs w-fit">
                                                            <Eye className="w-3 h-3 mr-1" />
                                                            Visible
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800 text-xs w-fit">
                                                            <EyeOff className="w-3 h-3 mr-1" />
                                                            Hidden
                                                        </Badge>
                                                    )}
                                                    {profile.isFeatured && (
                                                        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 text-xs w-fit">
                                                            <Sparkles className="w-3 h-3 mr-1" />
                                                            Featured
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                    {profile.profileViews || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <ViewsDeltaCell
                                                    profileViews={profile.profileViews || 0}
                                                    averageViews={stats.averageViews || 0}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {profile.overallRating > 0 ? (
                                                    <div className="flex items-center gap-1">
                                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                                        <span className="text-sm font-medium">{profile.overallRating.toFixed(1)}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => toggleVisibilityMutation.mutate({
                                                            schoolId: profile.schoolId,
                                                            isPubliclyVisible: !profile.isPubliclyVisible,
                                                        })}
                                                        title={profile.isPubliclyVisible ? 'Hide from Atlas' : 'Show on Atlas'}
                                                    >
                                                        {profile.isPubliclyVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => openEditDialog(profile)}
                                                        title="Edit profile"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Link href={`/dashboard/edubreezyatlas/${profile.schoolId}`}>
                                                        <Button size="sm" variant="outline" className="h-8">
                                                            <BarChart3 className="w-3.5 h-3.5 mr-1" />
                                                            View
                                                        </Button>
                                                    </Link>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleteConfirm(profile)}
                                                        title="Remove from Atlas"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {meta.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm">
                            <p className="text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, meta.total)} of {meta.total}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p - 1)} disabled={!meta.hasPreviousPage || isFetching}>
                                    <ChevronLeft className="w-4 h-4" /> Prev
                                </Button>
                                <span className="px-3 py-1 text-sm font-medium">{currentPage} / {meta.totalPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={!meta.hasNextPage || isFetching}>
                                    Next <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ─── Add/Edit Dialog ─────────────────── */}
            <AtlasFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                editingProfile={editingProfile}
                initialFormData={formData}
                onSubmit={handleSubmit}
                isSaving={saveMutation.isPending}
                allSchools={allSchools}
                existingProfileSchoolIds={profiles.map(p => p.schoolId)}
            />

            {/* ─── Bulk Upload Dialog ─────────────── */}
            <BulkUploadDialog
                open={bulkDialogOpen}
                onOpenChange={setBulkDialogOpen}
                onSuccess={() => {
                    setBulkDialogOpen(false)
                    queryClient.invalidateQueries({ queryKey: ['atlas-profiles'] })
                }}
            />

            {/* ─── Delete Confirmation ─────────────── */}
            <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove from Atlas?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will hide <strong>{deleteConfirm?.school?.name}</strong> from the Atlas marketplace.
                            The profile data will be preserved but the school will no longer be visible publicly.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMutation.mutate(deleteConfirm?.schoolId)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

// ─── Form Dialog Component ────────────────────────────────────
function AtlasFormDialog({ open, onOpenChange, editingProfile, initialFormData, onSubmit, isSaving, allSchools, existingProfileSchoolIds }) {
    const [formData, setFormData] = useState(initialFormData)
    const [fieldErrors, setFieldErrors] = useState({})

    useEffect(() => {
        if (open) {
            setFormData(initialFormData)
            setFieldErrors({})
        }
    }, [open, initialFormData])

    const onChange = (field, value) => {
        setFieldErrors(prev => {
            if (!prev[field]) return prev
            const next = { ...prev }
            delete next[field]
            return next
        })
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    // R2 upload for cover image
    const { startUpload: uploadCover, isUploading: isUploadingCover, progress: coverProgress } = useR2Upload({
        folder: 'profile',
        onUploadComplete: (res) => {
            if (res?.[0]?.url) onChange('coverImage', res[0].url)
        },
        onUploadError: (err) => toast.error('Cover upload failed: ' + err.message),
    })

    // R2 upload for logo
    const { startUpload: uploadLogo, isUploading: isUploadingLogo, progress: logoProgress } = useR2Upload({
        folder: 'profile',
        onUploadComplete: (res) => {
            if (res?.[0]?.url) onChange('logoImage', res[0].url)
        },
        onUploadError: (err) => toast.error('Logo upload failed: ' + err.message),
    })

    const handleCoverUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) uploadCover([file], { schoolId: formData.schoolId || 'global' })
    }

    const handleLogoUpload = (e) => {
        const file = e.target.files?.[0]
        if (file) uploadLogo([file], { schoolId: formData.schoolId || 'global' })
    }

    // Filter out schools that are already listed
    const availableSchools = useMemo(
        () => allSchools.filter(s => !existingProfileSchoolIds.includes(s.id)),
        [allSchools, existingProfileSchoolIds]
    )

    const handleSubmit = () => {
        const validation = atlasFormSchema.safeParse(formData)
        if (!validation.success) {
            const nextErrors = {}
            for (const issue of validation.error.issues) {
                const key = issue.path[0]
                if (typeof key === 'string' && !nextErrors[key]) {
                    nextErrors[key] = issue.message
                }
            }
            setFieldErrors(nextErrors)
            toast.error('Please fill the required fields')
            return
        }

        setFieldErrors({})
        onSubmit(formData)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!w-[min(960px,calc(100vw-2rem))] !max-w-[960px] max-h-[90vh] overflow-hidden p-0">
                <DialogHeader className="px-7 pt-7 pb-4">
                    <DialogTitle className="text-xl">
                        {editingProfile ? `Edit Atlas Profile — ${editingProfile.school?.name}` : 'Add School to Atlas'}
                    </DialogTitle>
                    <DialogDescription>
                        {editingProfile ? 'Update the marketplace profile for this school' : 'Select a school and fill in the marketplace details'}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[calc(90vh-188px)]">
                    <div className="pl-7 pr-10 pb-5 space-y-6">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="flex  w-full overflow-x-auto whitespace-nowrap justify-start h-auto p-1 bg-[#ebeef0] dark:bg-muted rounded-md scrollbar-hide">
                                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                                <TabsTrigger value="media">Media</TabsTrigger>
                                <TabsTrigger value="contact">Contact</TabsTrigger>
                                <TabsTrigger value="fees">Fees & Stats</TabsTrigger>
                                <TabsTrigger value="leadership">Leadership</TabsTrigger>
                                <TabsTrigger value="settings">Settings</TabsTrigger>
                            </TabsList>

                            {/* ─── Tab: Basic Info ──── */}
                            <TabsContent value="basic" className="space-y-4 mt-4">
                                {/* School Selector (only for new) */}
                                {!editingProfile && (
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                id="is-new-school"
                                                checked={formData.isNewSchool}
                                                onCheckedChange={(c) => {
                                                    onChange('isNewSchool', c)
                                                    if (c) onChange('schoolId', '')
                                                }}
                                            />
                                            <Label htmlFor="is-new-school">Create Independent Atlas School</Label>
                                        </div>

                                        {formData.isNewSchool ? (
                                            <div>
                                                <Label htmlFor="newSchoolName">New School Name <span className="text-destructive">*</span></Label>
                                                <Input
                                                    id="newSchoolName"
                                                    value={formData.newSchoolName || ''}
                                                    onChange={(e) => onChange('newSchoolName', e.target.value)}
                                                    placeholder="Enter school name..."
                                                    className="mt-2"
                                                />
                                                {fieldErrors.newSchoolName && (
                                                    <p className="mt-1 text-xs text-destructive">{fieldErrors.newSchoolName}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <div>
                                                <Label>Select ERP School <span className="text-destructive">*</span></Label>
                                                <Select
                                                    value={formData.schoolId}
                                                    onValueChange={(v) => {
                                                        const selectedSchool = availableSchools.find((school) => school.id === v)
                                                        onChange('schoolId', v)
                                                        onChange('location', selectedSchool?.location || '')
                                                    }}
                                                >
                                                    <SelectTrigger className="mt-2">
                                                        <SelectValue placeholder="Choose a school to list..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {availableSchools.map(s => (
                                                            <SelectItem key={s.id} value={s.id}>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-medium">{s.name}</span>
                                                                    <span className="text-xs text-muted-foreground">({s.schoolCode})</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                        {availableSchools.length === 0 && (
                                                            <div className="p-4 text-sm text-center text-muted-foreground">All schools are already listed</div>
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                                {fieldErrors.schoolId && (
                                                    <p className="mt-1 text-xs text-destructive">{fieldErrors.schoolId}</p>
                                                )}
                                                {formData.schoolId && formData.location && (
                                                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                                                        <MapPin className="w-4 h-4" />
                                                        <span>{formData.location}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        value={formData.location || ''}
                                        onChange={(e) => onChange('location', e.target.value)}
                                        placeholder="e.g. Hazaribagh, Jharkhand"
                                        className="mt-2"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="tagline">Tagline <span className="text-destructive">*</span></Label>
                                    <Input id="tagline" value={formData.tagline} onChange={(e) => onChange('tagline', e.target.value)} placeholder="A catchy tagline..." maxLength={100} className="mt-2" />
                                    <p className="text-xs text-muted-foreground mt-1">Short phrase (max 100 chars)</p>
                                    {fieldErrors.tagline && (
                                        <p className="mt-1 text-xs text-destructive">{fieldErrors.tagline}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                                    <Textarea id="description" value={formData.description} onChange={(e) => onChange('description', e.target.value)} placeholder="School description..." rows={4} className="mt-2" />
                                    {fieldErrors.description && (
                                        <p className="mt-1 text-xs text-destructive">{fieldErrors.description}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="vision">Vision</Label>
                                        <Textarea
                                            id="vision"
                                            value={formData.vision || ''}
                                            onChange={(e) => onChange('vision', e.target.value)}
                                            placeholder="Share the school's long-term vision..."
                                            rows={4}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="mission">Mission</Label>
                                        <Textarea
                                            id="mission"
                                            value={formData.mission || ''}
                                            onChange={(e) => onChange('mission', e.target.value)}
                                            placeholder="Share the school's mission..."
                                            rows={4}
                                            className="mt-2"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                    <div>
                                        <Label htmlFor="boards">Educational Boards</Label>
                                        <Input id="boards" value={formData.boards?.join(', ') || ''} onChange={(e) => onChange('boards', e.target.value.split(',').map(s => s.trim()))} placeholder="e.g. CBSE, ICSE, State Board" className="mt-2" />
                                        <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
                                    </div>
                                    <div>
                                        <Label htmlFor="genderType">Gender Focus</Label>
                                        <Select value={formData.genderType || ''} onValueChange={(v) => onChange('genderType', v)}>
                                            <SelectTrigger id="genderType" className="mt-2">
                                                <SelectValue placeholder="Select type..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="Co-ed">Co-ed</SelectItem>
                                                <SelectItem value="Boys">Boys</SelectItem>
                                                <SelectItem value="Girls">Girls</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label htmlFor="religiousAffiliation">Religious Affiliation</Label>
                                        <Select value={formData.religiousAffiliation || ''} onValueChange={(v) => onChange('religiousAffiliation', v === "none" ? "" : v)}>
                                            <SelectTrigger id="religiousAffiliation" className="mt-2">
                                                <SelectValue placeholder="Select affiliation..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="Hindu">Hindu</SelectItem>
                                                <SelectItem value="Muslim">Muslim</SelectItem>
                                                <SelectItem value="Christian">Christian</SelectItem>
                                                <SelectItem value="Sikh">Sikh</SelectItem>
                                                <SelectItem value="Buddhist">Buddhist</SelectItem>
                                                <SelectItem value="Jain">Jain</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ─── Tab: Media ─────── */}
                            <TabsContent value="media" className="space-y-6 mt-4">
                                {/* Cover Image */}
                                <div>
                                    <Label className="text-base font-medium">Cover Image</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Recommended: 1920×400px (wide banner)</p>
                                    {formData.coverImage && (
                                        <div className="relative rounded-lg overflow-hidden border mb-2 aspect-[4.8/1]">
                                            <img src={formData.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 hover:bg-red-500 transition-colors"
                                                onClick={() => onChange('coverImage', '')}
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <label className="cursor-pointer">
                                            <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={isUploadingCover} />
                                            <Button type="button" variant="outline" size="sm" asChild disabled={isUploadingCover}>
                                                <span>
                                                    {isUploadingCover ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> {coverProgress}%</> : <><Upload className="w-4 h-4 mr-1" /> Upload Cover</>}
                                                </span>
                                            </Button>
                                        </label>
                                        <Input type="url" value={formData.coverImage} onChange={(e) => onChange('coverImage', e.target.value)} placeholder="Or paste URL..." className="text-xs h-8 flex-1" />
                                    </div>
                                </div>

                                <Separator />

                                {/* Logo Image */}
                                <div>
                                    <Label className="text-base font-medium">School Logo</Label>
                                    <p className="text-xs text-muted-foreground mb-2">Recommended: 400×400px (square)</p>
                                    {formData.logoImage && (
                                        <div className="relative w-24 h-24 rounded-lg overflow-hidden border mb-2">
                                            <img src={formData.logoImage} alt="Logo" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                                                onClick={() => onChange('logoImage', '')}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 max-w-sm">
                                        <label className="cursor-pointer">
                                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                                            <Button type="button" variant="outline" size="sm" asChild disabled={isUploadingLogo}>
                                                <span>
                                                    {isUploadingLogo ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> {logoProgress}%</> : <><Upload className="w-4 h-4 mr-1" /> Upload Logo</>}
                                                </span>
                                            </Button>
                                        </label>
                                        <Input type="url" value={formData.logoImage} onChange={(e) => onChange('logoImage', e.target.value)} placeholder="Or paste URL..." className="text-xs h-8 flex-1" />
                                    </div>
                                </div>

                                <Separator />

                                {/* Video URL */}
                                <div>
                                    <Label htmlFor="videoUrl">Promotional Video URL</Label>
                                    <Input id="videoUrl" type="url" value={formData.videoUrl} onChange={(e) => onChange('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." className="mt-2" />
                                </div>
                            </TabsContent>

                            {/* ─── Tab: Contact ────── */}
                            <TabsContent value="contact" className="space-y-4 mt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="publicEmail">Public Email</Label>
                                        <Input id="publicEmail" type="email" value={formData.publicEmail} onChange={(e) => onChange('publicEmail', e.target.value)} placeholder="admissions@school.com" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="publicPhone">Public Phone</Label>
                                        <Input id="publicPhone" type="tel" value={formData.publicPhone} onChange={(e) => onChange('publicPhone', e.target.value)} placeholder="+91 1234567890" className="mt-2" />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" type="url" value={formData.website} onChange={(e) => onChange('website', e.target.value)} placeholder="https://www.school.com" className="mt-2" />
                                </div>

                                <Separator />

                                <h3 className="text-sm font-medium mt-2">Social Links</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="facebook">Facebook URL</Label>
                                        <Input id="facebook" type="url" value={formData.socials?.facebook || ''} onChange={(e) => onChange('socials', { ...formData.socials, facebook: e.target.value })} placeholder="https://facebook.com/..." className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="instagram">Instagram URL</Label>
                                        <Input id="instagram" type="url" value={formData.socials?.instagram || ''} onChange={(e) => onChange('socials', { ...formData.socials, instagram: e.target.value })} placeholder="https://instagram.com/..." className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="twitter">Twitter URL</Label>
                                        <Input id="twitter" type="url" value={formData.socials?.twitter || ''} onChange={(e) => onChange('socials', { ...formData.socials, twitter: e.target.value })} placeholder="https://twitter.com/..." className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="linkedin">LinkedIn URL</Label>
                                        <Input id="linkedin" type="url" value={formData.socials?.linkedin || ''} onChange={(e) => onChange('socials', { ...formData.socials, linkedin: e.target.value })} placeholder="https://linkedin.com/..." className="mt-2" />
                                    </div>
                                </div>

                                <Separator />

                                <h3 className="text-sm font-medium">Location Coordinates</h3>
                                <p className="text-xs text-muted-foreground">For Google Maps embed on the public profile</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="latitude">Latitude</Label>
                                        <Input id="latitude" type="number" step="0.000001" value={formData.latitude} onChange={(e) => onChange('latitude', e.target.value)} placeholder="e.g. 23.9991" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="longitude">Longitude</Label>
                                        <Input id="longitude" type="number" step="0.000001" value={formData.longitude} onChange={(e) => onChange('longitude', e.target.value)} placeholder="e.g. 85.3556" className="mt-2" />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ─── Tab: Fees & Stats ── */}
                            <TabsContent value="fees" className="space-y-4 mt-4">
                                <h3 className="text-sm font-medium">Fee Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="minFee">Min Fee (₹/year)</Label>
                                        <Input id="minFee" type="number" value={formData.minFee} onChange={(e) => {
                                            const val = e.target.value;
                                            onChange('minFee', val);
                                            if (val && formData.maxFee) {
                                                const avg = Math.round((parseInt(val) + parseInt(formData.maxFee)) / 2);
                                                onChange('detailedFeeStructure', { ...formData.detailedFeeStructure, avgFee: avg });
                                            }
                                        }} placeholder="50000" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="maxFee">Max Fee (₹/year)</Label>
                                        <Input id="maxFee" type="number" value={formData.maxFee} onChange={(e) => {
                                            const val = e.target.value;
                                            onChange('maxFee', val);
                                            if (val && formData.minFee) {
                                                const avg = Math.round((parseInt(formData.minFee) + parseInt(val)) / 2);
                                                onChange('detailedFeeStructure', { ...formData.detailedFeeStructure, avgFee: avg });
                                            }
                                        }} placeholder="200000" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="avgFee">Average Fee (₹/year)</Label>
                                        <Input id="avgFee" type="number" value={formData.detailedFeeStructure?.avgFee || ''} onChange={(e) => onChange('detailedFeeStructure', { ...formData.detailedFeeStructure, avgFee: e.target.value })} placeholder="125000" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="feeStructureUrl">Fee Structure PDF</Label>
                                        <Input id="feeStructureUrl" type="url" value={formData.feeStructureUrl} onChange={(e) => onChange('feeStructureUrl', e.target.value)} placeholder="https://..." className="mt-2" />
                                    </div>
                                </div>

                                <h3 className="text-sm font-medium mt-6">Detailed Fee Structure (Optional)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="admissionFee">Base Admission Fee (One-time)</Label>
                                        <Input id="admissionFee" type="number" value={formData.detailedFeeStructure?.admissionFee || ''} onChange={(e) => onChange('detailedFeeStructure', { ...formData.detailedFeeStructure, admissionFee: e.target.value })} placeholder="20000" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="monthlyTuition">Average Monthly Tuition</Label>
                                        <Input id="monthlyTuition" type="number" value={formData.detailedFeeStructure?.monthlyTuition || ''} onChange={(e) => onChange('detailedFeeStructure', { ...formData.detailedFeeStructure, monthlyTuition: e.target.value })} placeholder="5000" className="mt-2" />
                                    </div>
                                </div>

                                <Separator />

                                <h3 className="text-sm font-medium">Statistics</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="establishedYear">Established Year</Label>
                                        <Input id="establishedYear" type="number" value={formData.establishedYear} onChange={(e) => onChange('establishedYear', e.target.value)} placeholder="1990" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="totalStudents">Total Students</Label>
                                        <Input id="totalStudents" type="number" value={formData.totalStudents} onChange={(e) => {
                                            const val = e.target.value
                                            onChange('totalStudents', val)
                                            if (val && formData.totalTeachers) {
                                                onChange('studentTeacherRatio', (parseInt(val) / parseInt(formData.totalTeachers)).toFixed(1))
                                            }
                                        }} placeholder="500" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="totalTeachers">Total Teachers</Label>
                                        <Input id="totalTeachers" type="number" value={formData.totalTeachers} onChange={(e) => {
                                            const val = e.target.value
                                            onChange('totalTeachers', val)
                                            if (val && formData.totalStudents) {
                                                onChange('studentTeacherRatio', (parseInt(formData.totalStudents) / parseInt(val)).toFixed(1))
                                            }
                                        }} placeholder="50" className="mt-2" />
                                    </div>
                                    <div>
                                        <Label htmlFor="studentTeacherRatio">Student-Teacher Ratio</Label>
                                        <Input id="studentTeacherRatio" type="number" step="0.1" value={formData.studentTeacherRatio} onChange={(e) => onChange('studentTeacherRatio', e.target.value)} placeholder="15" className="mt-2" />
                                        <p className="text-xs text-muted-foreground mt-1">Auto-calculated from students & teachers</p>
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ─── Tab: Leadership ────── */}
                            <TabsContent value="leadership" className="space-y-4 mt-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-medium">Leadership Team</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => {
                                        const list = [...(formData.leadership || [])];
                                        if (list.length >= 10) return toast.error('Maximum 10 leaders allowed');
                                        list.push({ role: '', name: '', photo: '', linkedin: '' });
                                        onChange('leadership', list);
                                    }}>
                                        <Plus className="w-4 h-4 mr-1" /> Add Member
                                    </Button>
                                </div>
                                <div className="space-y-4">
                                    {formData.leadership?.length > 0 ? formData.leadership.map((leader, index) => (
                                        <div key={index} className="border p-4 rounded-md relative space-y-4">
                                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => {
                                                const list = [...formData.leadership];
                                                list.splice(index, 1);
                                                onChange('leadership', list);
                                            }}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mr-8">
                                                <div>
                                                    <Label>Role (e.g. Principal, Director)</Label>
                                                    <Input value={leader.role || ''} onChange={(e) => {
                                                        const list = [...formData.leadership];
                                                        list[index].role = e.target.value;
                                                        onChange('leadership', list);
                                                    }} placeholder="e.g. Principal" className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label>Name</Label>
                                                    <Input value={leader.name || ''} onChange={(e) => {
                                                        const list = [...formData.leadership];
                                                        list[index].name = e.target.value;
                                                        onChange('leadership', list);
                                                    }} placeholder="e.g. Dr. A. P. J. Abdul Kalam" className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label>Photo URL</Label>
                                                    <Input type="url" value={leader.photo || ''} onChange={(e) => {
                                                        const list = [...formData.leadership];
                                                        list[index].photo = e.target.value;
                                                        onChange('leadership', list);
                                                    }} placeholder="https://..." className="mt-1" />
                                                </div>
                                                <div>
                                                    <Label>LinkedIn URL</Label>
                                                    <Input type="url" value={leader.linkedin || ''} onChange={(e) => {
                                                        const list = [...formData.leadership];
                                                        list[index].linkedin = e.target.value;
                                                        onChange('leadership', list);
                                                    }} placeholder="https://linkedin.com/in/..." className="mt-1" />
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-6 text-sm text-muted-foreground border rounded-md border-dashed">
                                            No leadership members added yet. Click &quot;Add Member&quot; to begin.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* ─── Tab: Settings ────── */}
                            <TabsContent value="settings" className="space-y-4 mt-4">
                                <div className="flex items-center justify-between py-2">
                                    <div className="space-y-0.5">
                                        <Label>Publicly Visible</Label>
                                        <p className="text-sm text-muted-foreground">Show on atlas.edubreezy.com</p>
                                    </div>
                                    <Switch checked={formData.isPubliclyVisible} onCheckedChange={(v) => onChange('isPubliclyVisible', v)} />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-2">
                                    <div className="space-y-0.5">
                                        <Label>Featured School</Label>
                                        <p className="text-sm text-muted-foreground">Highlight on the Atlas homepage</p>
                                    </div>
                                    <Switch checked={formData.isFeatured} onCheckedChange={(v) => onChange('isFeatured', v)} />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between py-2">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <Label>Verified Badge</Label>
                                            {formData.isVerified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground">Show blue tick verification badge</p>
                                    </div>
                                    <Switch checked={formData.isVerified} onCheckedChange={(v) => onChange('isVerified', v)} />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </ScrollArea>

                <DialogFooter className="px-7 pb-6 pt-4 border-t bg-background/80">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> {editingProfile ? 'Update Profile' : 'List on Atlas'}</>}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ─── Bulk Upload Dialog Component ────────────────────────────────
function BulkUploadDialog({ open, onOpenChange, onSuccess }) {
    const [file, setFile] = useState(null)
    const [isParsing, setIsParsing] = useState(false)
    const [parsedData, setParsedData] = useState([])
    const [jobId, setJobId] = useState(null)
    const [jobStatus, setJobStatus] = useState(null) // null, 'running', 'done', 'error', 'cancelled'
    const [jobProgress, setJobProgress] = useState({ done: 0, failed: 0, total: 0, errors: [] })
    const [isPolling, setIsPolling] = useState(false)

    // Handle template download
    const downloadTemplate = () => {
        const templateData = [{
            schoolId: 'Enter strictly the correct school Id here',
            tagline: 'Empowering future leaders',
            description: 'A brief description',
            vision: 'To be a global center of excellence',
            mission: 'To provide quality education',
            coverImage: 'https://...',
            logoImage: 'https://...',
            videoUrl: 'https://...',
            publicEmail: 'contact@school.com',
            publicPhone: '+919999999999',
            website: 'https://www.school.com',
            minFee: 50000,
            maxFee: 200000,
            feeStructureUrl: 'https://...',
            establishedYear: 1990,
            totalStudents: 1500,
            totalTeachers: 100,
            studentTeacherRatio: 15.0,
            latitude: 23.999,
            longitude: 85.355,
            isPubliclyVisible: 'Yes',
            isFeatured: 'No',
            isVerified: 'Yes'
        }]

        const ws = XLSX.utils.json_to_sheet(templateData)

        // Auto-size columns crudely
        const colWidths = Object.keys(templateData[0]).map(() => ({ wch: 20 }))
        ws['!cols'] = colWidths

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Atlas_Template')
        XLSX.writeFile(wb, 'edubreezy_atlas_bulk_template.xlsx')
    }

    // Handle file selection
    const handleFileSelect = (e) => {
        const selectedFile = e.target.files?.[0]
        if (!selectedFile) return
        if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls') && !selectedFile.name.endsWith('.csv')) {
            toast.error('Please upload a valid Excel or CSV file')
            e.target.value = ''
            return
        }
        setFile(selectedFile)
        parseFile(selectedFile)
    }

    // Parse Excel
    const parseFile = (fileToParse) => {
        setIsParsing(true)
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result)
                const workbook = XLSX.read(data, { type: 'array' })
                const firstSheetName = workbook.SheetNames[0]
                const worksheet = workbook.Sheets[firstSheetName]
                const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' })

                // Map and clean rows
                const cleaned = rawJson.map(row => {
                    return {
                        schoolId: String(row.schoolId || '').trim(),
                        tagline: String(row.tagline || '').substring(0, 100),
                        description: row.description || null,
                        vision: row.vision || null,
                        mission: row.mission || null,
                        coverImage: row.coverImage || null,
                        logoImage: row.logoImage || null,
                        videoUrl: row.videoUrl || null,
                        publicEmail: row.publicEmail || null,
                        publicPhone: String(row.publicPhone || '').trim() || null,
                        website: row.website || null,
                        minFee: row.minFee ? parseInt(row.minFee) : null,
                        maxFee: row.maxFee ? parseInt(row.maxFee) : null,
                        feeStructureUrl: row.feeStructureUrl || null,
                        establishedYear: row.establishedYear ? parseInt(row.establishedYear) : null,
                        totalStudents: row.totalStudents ? parseInt(row.totalStudents) : 0,
                        totalTeachers: row.totalTeachers ? parseInt(row.totalTeachers) : 0,
                        studentTeacherRatio: row.studentTeacherRatio ? parseFloat(row.studentTeacherRatio) : null,
                        latitude: row.latitude ? parseFloat(row.latitude) : null,
                        longitude: row.longitude ? parseFloat(row.longitude) : null,
                        isPubliclyVisible: String(row.isPubliclyVisible).toLowerCase() === 'yes',
                        isFeatured: String(row.isFeatured).toLowerCase() === 'yes',
                        isVerified: String(row.isVerified).toLowerCase() === 'yes',
                    }
                }).filter(row => row.schoolId && row.schoolId !== 'Enter strictly the correct school Id here')

                setParsedData(cleaned)
                if (cleaned.length === 0) {
                    toast.error('No valid school data found. Did you fill out the template?')
                }
            } catch (err) {
                console.error(err)
                toast.error('Failed to parse file')
            } finally {
                setIsParsing(false)
            }
        }
        reader.readAsArrayBuffer(fileToParse)
    }

    // Submit to Producer API
    const submitBulk = async () => {
        if (!parsedData.length) return

        try {
            const res = await fetchWithAuth('/api/edubreezyatlas/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profiles: parsedData })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to start upload')

            setJobId(data.jobId)
            setJobStatus('running')
            setJobProgress({ done: 0, failed: 0, total: parsedData.length, errors: [] })
            setIsPolling(true)
            toast.success(`Job started! Processing ${parsedData.length} records.`)
        } catch (err) {
            toast.error(err.message)
        }
    }

    // Job Polling
    useQuery({
        queryKey: ['atlas-bulk-status', jobId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/edubreezyatlas/bulk/status/${jobId}`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            setJobProgress({
                done: data.done,
                failed: data.failed,
                total: data.total,
                errors: data.errors || []
            })

            if (data.status === 'done' || data.status === 'error' || data.status === 'cancelled') {
                setJobStatus(data.status)
                setIsPolling(false)
                if (data.status === 'done') {
                    if (data.failed > 0) toast.warning(`Completed with ${data.failed} errors.`)
                    else toast.success('Completed successfully!')
                }
            }
            return data
        },
        enabled: isPolling && !!jobId,
        refetchInterval: isPolling ? 3000 : false, // Poll every 3 seconds
    })

    // Cancel Job
    const cancelJob = async () => {
        if (!jobId) return
        try {
            const res = await fetchWithAuth(`/api/edubreezyatlas/bulk/status/${jobId}`, {
                method: 'DELETE'
            })
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error)
            }
            toast.info('Cancellation requested')
            // Don't set polling false immediately; let the next poll verify the cancelled state
        } catch (err) {
            toast.error(err.message)
        }
    }

    // Reset modal state on close
    const handleClose = (v) => {
        if (!v) {
            if (jobStatus === 'running') {
                toast.warning('Please cancel the job or wait for it to finish before closing.')
                return
            }
            setFile(null)
            setParsedData([])
            setJobId(null)
            setJobStatus(null)
            setIsPolling(false)
        }
        onOpenChange(v)
    }

    const percentage = jobProgress.total > 0
        ? Math.round(((jobProgress.done + jobProgress.failed) / jobProgress.total) * 100)
        : 0

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Bulk Upload Schools</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file to list or update multiple schools on Atlas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!jobId ? (
                        <>
                            {/* Step 1: Download Template */}
                            <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/40">
                                <div>
                                    <h4 className="font-medium text-sm">1. Download Template</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Use our standard format. The <code className="bg-muted px-1 rounded">schoolId</code> is required to uniquely identify the school.
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" className="w-fit" onClick={downloadTemplate}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Template
                                </Button>
                            </div>

                            {/* Step 2: Upload File */}
                            <div className="flex flex-col gap-3 p-4 border rounded-lg bg-muted/40">
                                <div>
                                    <h4 className="font-medium text-sm">2. Upload Filled Excel</h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Max 500 rows recommended per upload. Processing will happen in the background.
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className={`cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 ${isParsing ? 'opacity-50' : ''}`}>
                                        <input type="file" accept=".xlsx, .xls, .csv" className="hidden" onChange={handleFileSelect} disabled={isParsing} />
                                        {isParsing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Parsing...</> : <><Upload className="w-4 h-4 mr-2" /> Select File</>}
                                    </label>
                                    <span className="text-sm font-medium text-muted-foreground max-w-[200px] truncate">
                                        {file ? file.name : 'No file selected'}
                                    </span>
                                </div>

                                {parsedData.length > 0 && (
                                    <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 p-3 rounded-md text-sm flex items-center justify-between border border-emerald-200 dark:border-emerald-800">
                                        <span>Found <strong>{parsedData.length}</strong> valid rows ready to process.</span>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* Progress UI */
                        <div className="space-y-6 p-4 border rounded-lg bg-muted/20">
                            <div className="flex justify-between items-end mb-2">
                                <div>
                                    <h4 className="font-medium">Job Processing</h4>
                                    <p className="text-xs text-muted-foreground">ID: {jobId.split('_').pop()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-2xl font-bold">{percentage}%</span>
                                </div>
                            </div>

                            <Progress value={percentage} className="h-3" />

                            <div className="grid grid-cols-3 gap-4 pt-4">
                                <div className="p-3 bg-background border rounded-lg text-center">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
                                    <p className="font-mono text-xl">{jobProgress.total}</p>
                                </div>
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg text-center text-emerald-600 dark:text-emerald-400">
                                    <p className="text-xs uppercase tracking-wider mb-1">Success</p>
                                    <p className="font-mono text-xl">{jobProgress.done}</p>
                                </div>
                                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-lg text-center text-red-600 dark:text-red-400">
                                    <p className="text-xs uppercase tracking-wider mb-1">Failed</p>
                                    <p className="font-mono text-xl">{jobProgress.failed}</p>
                                </div>
                            </div>

                            {/* Show job status badges and errors */}
                            {jobStatus !== 'running' && (
                                <div className="pt-2">
                                    {jobStatus === 'done' && <Badge className="bg-emerald-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Finished</Badge>}
                                    {jobStatus === 'cancelled' && <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Cancelled</Badge>}

                                    {jobProgress.errors && jobProgress.errors.length > 0 && (
                                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                            <p className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2">{jobProgress.errors.length} Errors occurred:</p>
                                            <ScrollArea className="h-[100px] w-full text-xs text-red-600 dark:text-red-300">
                                                {jobProgress.errors.map((err, i) => (
                                                    <div key={i} className="mb-1 pb-1 border-b border-red-100 dark:border-red-800/50 last:border-0">
                                                        <span className="font-mono text-[10px] mr-2">[{err.schoolId}]</span>
                                                        {err.message}
                                                    </div>
                                                ))}
                                            </ScrollArea>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    {!jobId ? (
                        <>
                            <Button variant="outline" onClick={() => handleClose(false)}>Close</Button>
                            <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={parsedData.length === 0}
                                onClick={submitBulk}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Start Upload ({parsedData.length})
                            </Button>
                        </>
                    ) : (
                        <>
                            {jobStatus === 'running' ? (
                                <Button variant="destructive" onClick={cancelJob} disabled={!isPolling}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Cancel Job
                                </Button>
                            ) : (
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={onSuccess}>
                                    Done
                                </Button>
                            )}
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
