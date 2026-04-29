'use client'

import { useState, use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend,
} from 'recharts'
import {
    School,
    Users,
    GraduationCap,
    BookOpen,
    Building2,
    Snowflake,
    AlertTriangle,
    ArrowLeft,
    RefreshCw,
    MapPin,
    Phone,
    Globe,
    Calendar,
    ShieldCheck,
    DollarSign,
    Bus,
    Layers,
    CircleDot,
    UserCog,
    Calculator,
    IndianRupee,
    AlertCircle,
    Sparkles,
    TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import SchoolAccountActionDialog from '@/components/schools/SchoolAccountActionDialog'

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#f97316']

const ROLE_TABS = [
    { key: 'teacher', label: 'Teachers', icon: Users, model: 'teachingStaff' },
    { key: 'student', label: 'Students', icon: GraduationCap, model: 'student' },
    { key: 'parent', label: 'Parents', icon: Users, model: 'parent' },
    { key: 'accountant', label: 'Accountants', icon: DollarSign, model: 'accountant' },
    { key: 'librarian', label: 'Librarians', icon: BookOpen, model: 'librarian' },
    { key: 'peon', label: 'Peons', icon: UserCog, model: 'nonTeachingStaff' },
    { key: 'driver', label: 'Drivers', icon: Bus, model: 'transportStaff' },
]

export default function ManageSchoolPage({ params }) {
    const { schoolId } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()

    const [activeTab, setActiveTab] = useState('teacher')
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [actionDialog, setActionDialog] = useState({ open: false, action: null })

    // ─── Fetch school data ───
    const { data: schoolData, isLoading: schoolLoading } = useQuery({
        queryKey: ['school', schoolId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/schools/get-school/${schoolId}`)
            if (!res.ok) throw new Error('Failed to fetch school')
            return res.json()
        },
    })

    // ─── Fetch school stats ───
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['school-stats', schoolId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/schools/${schoolId}/stats`)
            if (!res.ok) throw new Error('Failed to fetch stats')
            return res.json()
        },
    })

    // ─── Fetch profiles (uses /profiles which returns all students) ───
    const { data: profilesData, isLoading: profilesLoading } = useQuery({
        queryKey: ['school-profiles', schoolId, activeTab],
        queryFn: async () => {
            const roleTab = ROLE_TABS.find(t => t.key === activeTab)
            const model = roleTab?.model || activeTab
            const res = await fetchWithAuth(`/api/schools/${schoolId}/profiles?role=${model}`)
            if (!res.ok) throw new Error('Failed to fetch profiles')
            return res.json()
        },
    })

    // ─── Freeze mutation ───
    const schoolActionMutation = useMutation({
        mutationFn: async ({ action, reason }) => {
            let url = `/api/admin/schools/${schoolId}/freeze`
            let body = { type: 'SOFT', reason }

            if (action === 'freeze-hard') {
                body = { type: 'HARD', reason }
            } else if (action === 'unfreeze') {
                url = `/api/admin/schools/${schoolId}/unfreeze`
                body = {}
            } else if (action === 'terminate') {
                url = `/api/admin/schools/${schoolId}/terminate`
                body = { reason }
            }

            const res = await fetchWithAuth(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            if (!res.ok) {
                const payload = await res.json().catch(() => ({}))
                throw new Error(payload.error || 'Failed to update school status')
            }
            return res.json()
        },
        onSuccess: (data) => {
            toast.success(data.message)
            queryClient.invalidateQueries(['school', schoolId])
            queryClient.invalidateQueries(['schools-enhanced'])
            setActionDialog({ open: false, action: null })
        },
        onError: (err) => toast.error(err.message),
    })

    // ─── Delete mutation ───
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetchWithAuth(`/api/schools/${schoolId}/delete`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Failed to delete school')
            return res.json()
        },
        onSuccess: (data) => {
            toast.success(data.message)
            queryClient.invalidateQueries(['schools-enhanced'])
            router.push('/dashboard/schools/all-schools')
        },
        onError: (err) => toast.error(err.message),
    })

    const school = schoolData?.school || schoolData || {}
    const counts = stats?.counts || {}
    const fees = stats?.fees || {}
    const classDistribution = stats?.classDistribution || []
    const plan = stats?.plan || null

    // Extract profiles from various response shapes
    const profiles = profilesData?.students || profilesData?.profiles || profilesData?.data || profilesData || []
    const profileList = Array.isArray(profiles) ? profiles : []

    // Pie chart data for fees
    const feeChartData = fees.collected || fees.pending ? [
        { name: 'Collected', value: fees.collected || 0, fill: '#10b981' },
        { name: 'Pending', value: fees.pending || 0, fill: '#f59e0b' },
    ] : []

    const formatCurrency = (val) => {
        if (!val) return '₹0'
        if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`
        if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`
        return `₹${val}`
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/schools/all-schools">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                            {schoolLoading ? <Skeleton className="h-8 w-64" /> : (
                                <>
                                    {school.name || 'School'}
                                    <Badge variant="outline" className={
                                        school.status === 'SUSPENDED'
                                            ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400'
                                            : school.status === 'PAST_DUE'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                                                : school.status === 'TERMINATED'
                                                    ? 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-900/40 dark:text-zinc-300'
                                                    : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400'
                                    }>
                                        {school.status || 'ACTIVE'}
                                    </Badge>
                                </>
                            )}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {schoolLoading ? <Skeleton className="h-4 w-48" /> : `Code: ${school.schoolCode || '—'}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={() => {
                            queryClient.invalidateQueries(['school', schoolId])
                            queryClient.invalidateQueries(['school-stats', schoolId])
                            queryClient.invalidateQueries(['school-profiles', schoolId])
                        }}
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setActionDialog({ open: true, action: school.status === 'ACTIVE' ? 'freeze-soft' : 'unfreeze' })}
                        disabled={schoolActionMutation.isPending}
                    >
                        <Snowflake className="w-4 h-4 mr-2" />
                        {school.status === 'ACTIVE' ? 'Soft Freeze' : 'Unfreeze'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setActionDialog({ open: true, action: 'freeze-hard' })}
                        disabled={schoolActionMutation.isPending}
                    >
                        Hard Freeze
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setActionDialog({ open: true, action: 'terminate' })}
                        disabled={schoolActionMutation.isPending || school.status === 'TERMINATED'}
                    >
                        Terminate School
                    </Button>
                </div>
            </div>

            {/* School Info Card */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <Avatar className="w-20 h-20">
                                <AvatarImage src={school.profilePicture || school.logo} alt={school.name} />
                                <AvatarFallback className="text-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    {(school.name || 'S').slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        {/* Details grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                            {[
                                { icon: MapPin, label: 'Address', value: school.location },
                                { icon: Building2, label: 'City', value: school.city },
                                { icon: MapPin, label: 'State', value: school.state },
                                { icon: MapPin, label: 'Country', value: school.country },
                                { icon: Phone, label: 'Contact', value: school.contactNumber },
                                { icon: Globe, label: 'Domain', value: school.currentDomain || school.domain },
                                { icon: ShieldCheck, label: 'Subscription', value: school.SubscriptionType ? `Plan ${school.SubscriptionType}` : null },
                                { icon: Calendar, label: 'Created', value: school.createdAt ? formatDate(school.createdAt) : null },
                                { icon: Building2, label: 'Type', value: school.type },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="flex items-start gap-3">
                                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                        {schoolLoading ? (
                                            <Skeleton className="h-4 w-24 mt-1" />
                                        ) : (
                                            <p className="text-sm font-medium">{value || '—'}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Students', count: counts.students, icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/30' },
                    { label: 'Staff', count: counts.totalStaff, icon: Users, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                    { label: 'Classes', count: counts.classes, icon: BookOpen, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30' },
                    { label: 'Fee Collection', count: formatCurrency(fees.collected), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', subtitle: `of ${formatCurrency(fees.totalAmount)}` },
                ].map(({ label, count, icon: Icon, color, bg, subtitle }) => (
                    <Card key={label}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{label}</CardTitle>
                            <div className={`p-2 rounded-lg ${bg}`}>
                                <Icon className={`h-4 w-4 ${color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skeleton className="h-7 w-16" />
                            ) : (
                                <>
                                    <div className="text-2xl font-bold">{count ?? 0}</div>
                                    {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
                                </>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ERP Plan & Capacity Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-blue-600" />
                            <CardTitle className="text-base">ERP Plan & Capacity</CardTitle>
                        </div>
                        {plan && (
                            <Badge
                                variant="outline"
                                className={
                                    plan.status === 'ACTIVE' ? 'bg-green-50 text-green-600 border-green-200 dark:bg-green-900/30 dark:text-green-400' :
                                        plan.status === 'TRIAL' ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400' :
                                            'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400'
                                }
                            >
                                {plan.status}
                            </Badge>
                        )}
                    </div>
                    <CardDescription>Student capacity, pricing, and billing details</CardDescription>
                </CardHeader>
                <CardContent>
                    {statsLoading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-full" />
                            <div className="grid grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20" />)}
                            </div>
                        </div>
                    ) : plan ? (
                        <div className="space-y-5">
                            {/* Capacity Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Student Capacity Usage</span>
                                    <span className={`font-semibold ${plan.isOverLimit ? 'text-red-600' : plan.isNearLimit ? 'text-amber-600' : 'text-green-600'}`}>
                                        {plan.currentStudents} / {plan.includedCapacity}
                                        <span className="text-muted-foreground font-normal ml-1">({plan.capacityUsed}%)</span>
                                    </span>
                                </div>
                                <Progress
                                    value={Math.min(plan.capacityUsed, 100)}
                                    className={`h-3 ${plan.isOverLimit ? '[&>div]:bg-red-500' : plan.isNearLimit ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Soft limit: {plan.softCapacity?.toLocaleString()} students (includes 5% buffer)
                                </p>
                            </div>

                            {/* Plan Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="border-dashed">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Calculator className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">Units Purchased</span>
                                        </div>
                                        <p className="text-2xl font-bold">{plan.unitsPurchased}</p>
                                        <p className="text-xs text-muted-foreground">1 unit = 100 students</p>
                                    </CardContent>
                                </Card>

                                <Card className="border-dashed">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Users className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">Max Capacity</span>
                                        </div>
                                        <p className="text-2xl font-bold">{plan.includedCapacity?.toLocaleString()}</p>
                                        <p className="text-xs text-muted-foreground">
                                            +5% buffer = {plan.softCapacity?.toLocaleString()} max
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-dashed bg-green-50/50 dark:bg-green-900/10">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <IndianRupee className="w-4 h-4 text-green-600" />
                                            <span className="text-sm text-muted-foreground">Yearly Amount</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-600">
                                            ₹{plan.yearlyAmount?.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            You save ₹{plan.savings?.toLocaleString()}
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-dashed">
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <IndianRupee className="w-4 h-4 text-muted-foreground" />
                                            <span className="text-sm text-muted-foreground">Per Student / Year</span>
                                        </div>
                                        <p className="text-2xl font-bold">₹{plan.perStudentYearly}</p>
                                        <p className="text-xs text-muted-foreground">Effective rate</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Billing Period + Pricing Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-muted/50 rounded-lg p-4 border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">Billing Period</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {plan.billingStartDate ? new Date(plan.billingStartDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                {' → '}
                                                {plan.billingEndDate ? new Date(plan.billingEndDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                            </p>
                                        </div>
                                        {plan.isTrial && (
                                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                Trial: {plan.trialDays} days
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-muted/50 rounded-lg p-4 border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">Current Pricing</p>
                                            <p className="text-xs text-muted-foreground">Early Access Discount Applied</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-green-600">₹{plan.pricePerUnit?.toLocaleString()}</p>
                                            <p className="text-xs text-muted-foreground">per 100 students / year</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Capacity Warning */}
                            {(plan.isNearLimit || plan.isOverLimit) && (
                                <div className={`rounded-lg p-4 border ${plan.isOverLimit
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className={`w-5 h-5 mt-0.5 ${plan.isOverLimit ? 'text-red-600' : 'text-amber-600'}`} />
                                        <div>
                                            <p className={`font-medium text-sm ${plan.isOverLimit ? 'text-red-900 dark:text-red-300' : 'text-amber-900 dark:text-amber-300'}`}>
                                                {plan.isOverLimit ? 'Capacity Exceeded!' : 'Approaching Capacity Limit'}
                                            </p>
                                            <p className={`text-xs mt-1 ${plan.isOverLimit ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
                                                {plan.isOverLimit
                                                    ? `Currently at ${plan.currentStudents} students, exceeding the soft limit of ${plan.softCapacity}. An upgrade is required.`
                                                    : `Currently at ${plan.currentStudents} of ${plan.includedCapacity} students (${plan.capacityUsed}%). Consider upgrading soon.`
                                                }
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Sparkles className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
                            <p className="text-muted-foreground">No subscription plan configured</p>
                            <p className="text-xs text-muted-foreground mt-1">Plan details will appear here once configured during school creation</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Charts */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Student Distribution Bar Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Student Distribution by Class</CardTitle>
                        <CardDescription>Number of students in each class</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-[250px] w-full" />
                        ) : classDistribution.length === 0 ? (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <BookOpen className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                                    <p className="text-sm">No class data available</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <BarChart data={classDistribution}>
                                    <XAxis dataKey="className" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                                    <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)' }}
                                    />
                                    <Bar dataKey="students" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                        {classDistribution.map((_, i) => (
                                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Fee Overview Pie Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Fee Overview</CardTitle>
                        <CardDescription>Collection vs pending fees</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-[250px] w-full" />
                        ) : feeChartData.length === 0 ? (
                            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <DollarSign className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                                    <p className="text-sm">No fee data available</p>
                                </div>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={250}>
                                <PieChart>
                                    <Pie
                                        data={feeChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        innerRadius={40}
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={false}
                                        paddingAngle={3}
                                    />
                                    <Tooltip
                                        formatter={(value) => formatCurrency(value)}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--popover)', color: 'var(--popover-foreground)' }}
                                    />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Counts Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">School Overview</CardTitle>
                    <CardDescription>Detailed breakdown of all resources</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                        {[
                            { label: 'Teaching Staff', count: counts.teachingStaff, icon: Users },
                            { label: 'Non-teaching Staff', count: counts.nonTeachingStaff, icon: UserCog },
                            { label: 'Parents', count: counts.parents, icon: Users },
                            { label: 'Sections', count: counts.sections, icon: Layers },
                            { label: 'Vehicles', count: counts.vehicles, icon: Bus },
                            { label: 'Routes', count: counts.routes, icon: CircleDot },
                            { label: 'Total Users', count: counts.users, icon: Users },
                            { label: 'Fee Pending', count: formatCurrency(fees.pending), icon: DollarSign },
                            { label: 'Total Fees', count: formatCurrency(fees.totalAmount), icon: DollarSign },
                            { label: 'Fee Collected', count: formatCurrency(fees.collected), icon: DollarSign },
                        ].map(({ label, count, icon: Icon }) => (
                            <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 dark:bg-background/50">
                                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <div>
                                    <p className="text-xs text-muted-foreground">{label}</p>
                                    {statsLoading ? <Skeleton className="h-5 w-10 mt-0.5" /> : <p className="text-sm font-semibold">{count ?? 0}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Profiles Tabs */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">School Profiles</CardTitle>
                    <CardDescription>Browse all profiles registered under this school</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 dark:bg-background/50 p-1 mb-4">
                            {ROLE_TABS.map(({ key, label, icon: Icon }) => (
                                <TabsTrigger key={key} value={key} className="data-[state=active]:bg-background data-[state=active]:shadow gap-1.5">
                                    <Icon className="w-3.5 h-3.5" />
                                    {label}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {ROLE_TABS.map(({ key, label }) => (
                            <TabsContent key={key} value={key}>
                                <div className="rounded-lg border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50 dark:bg-background/50">
                                                <TableHead>Photo</TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Joined</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {profilesLoading ? (
                                                [1, 2, 3].map(i => (
                                                    <TableRow key={i}>
                                                        <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                                    </TableRow>
                                                ))
                                            ) : profileList.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className="text-center py-12">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <Users className="w-10 h-10 text-muted-foreground/50" />
                                                            <p className="text-muted-foreground">No {label.toLowerCase()} found</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                profileList.map((profile, index) => {
                                                    const user = profile.user || profile.User || {}
                                                    const name = profile.name || user.name || '—'
                                                    const email = profile.email || user.email || '—'
                                                    const phone = profile.phone || profile.contactNumber || user.phone || '—'
                                                    const avatar = profile.profilePicture || user.profilePicture || ''
                                                    const joined = profile.createdAt || profile.admissionDate || user.createdAt
                                                    return (
                                                        <TableRow key={profile.id || profile.userId || index} className={`hover:bg-muted/30 ${index % 2 === 0 ? 'bg-muted dark:bg-background/50' : ''}`}>
                                                            <TableCell>
                                                                <Avatar className="w-8 h-8">
                                                                    <AvatarImage src={avatar} alt={name} />
                                                                    <AvatarFallback className="text-xs">
                                                                        {name.slice(0, 2).toUpperCase()}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            </TableCell>
                                                            <TableCell className="font-medium">{name}</TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">{email}</TableCell>
                                                            <TableCell className="text-sm">{phone}</TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {joined ? formatDate(joined) : '—'}
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {/* Profile summary */}
                                <div className="flex justify-between items-center mt-3 text-sm text-muted-foreground">
                                    <p>Showing {profileList.length} {label.toLowerCase()}</p>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                title={`Delete "${school.name || 'School'}"?`}
                description={
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-red-600 font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            This action is irreversible!
                        </div>
                        <p>Deleting this school will permanently remove:</p>
                        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                            <li>All students, teachers, and staff profiles</li>
                            <li>All parents and their linked data</li>
                            <li>All fee records and payments</li>
                            <li>All attendance records</li>
                            <li>All classes, sections, and timetables</li>
                            <li>All transport, library, and inventory data</li>
                            <li>All associated Supabase auth accounts</li>
                        </ul>
                    </div>
                }
                confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Yes, delete permanently'}
                onConfirm={() => deleteMutation.mutate()}
                loading={deleteMutation.isPending}
            />
            <SchoolAccountActionDialog
                key={`${actionDialog.action || 'none'}-${actionDialog.open ? 'open' : 'closed'}`}
                open={actionDialog.open}
                onOpenChange={(open) => setActionDialog((state) => ({ ...state, open }))}
                schoolName={school.name || ''}
                action={actionDialog.action}
                loading={schoolActionMutation.isPending}
                onConfirm={({ reason }) => schoolActionMutation.mutate({ action: actionDialog.action, reason })}
            />
        </div>
    )
}
