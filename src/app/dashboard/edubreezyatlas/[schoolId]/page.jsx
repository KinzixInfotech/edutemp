'use client'

import { use } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import {
    ArrowLeft, Globe, Eye, EyeOff, Edit, Trash2, Star, ExternalLink,
    Building2, MapPin, Phone, Mail, Link2, BadgeCheck, Sparkles,
    BarChart3, Users, GraduationCap, Calendar, MessageSquare,
    Loader2, DollarSign, Clock, UserCheck, TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase } from '@/lib/supabase'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { ...options?.headers };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return fetch(url, { ...options, headers });
};

export default function AtlasSchoolDetailPage(props) {
    const queryClient = useQueryClient()
    const { schoolId } = use(props.params)

    // ─── Fetch school detail with analytics ───
    const { data: profile, isLoading, error } = useQuery({
        queryKey: ['atlas-school-detail', schoolId],
        queryFn: async () => {
            const res = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`)
            if (!res.ok) {
                if (res.status === 404) throw new Error('School not found on Atlas')
                throw new Error('Failed to fetch school detail')
            }
            return res.json()
        },
        enabled: !!schoolId,
    })

    // Toggle visibility mutation
    const toggleVisibility = useMutation({
        mutationFn: async (isPubliclyVisible) => {
            const res = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPubliclyVisible }),
            })
            if (!res.ok) throw new Error('Failed to toggle visibility')
            return res.json()
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['atlas-school-detail', schoolId] })
            queryClient.invalidateQueries({ queryKey: ['atlas-profiles'] })
            toast.success('Visibility updated')
        },
        onError: (err) => toast.error(err.message),
    })

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-40 w-full rounded-xl" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        )
    }

    // Error state
    if (error || !profile) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Globe className="w-16 h-16 text-muted-foreground/30" />
                <h2 className="text-xl font-semibold">School Not Found</h2>
                <p className="text-muted-foreground">{error?.message || 'This school has no Atlas profile'}</p>
                <Link href="/dashboard/edubreezyatlas">
                    <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Atlas</Button>
                </Link>
            </div>
        )
    }

    const school = profile.school || {}
    const counts = profile._count || {}
    const ratings = profile.avgRatings
    const inquiries = profile.recentInquiries || []
    const averageViews = profile.averageViews || 0
    const deltaPercent = averageViews > 0
        ? Math.round((((profile.profileViews || 0) - averageViews) / averageViews) * 100)
        : 0
    const isViewsUp = deltaPercent > 0
    const isViewsDown = deltaPercent < 0
    const viewsTrendColor = isViewsUp ? '#16a34a' : isViewsDown ? '#dc2626' : '#64748b'
    const viewsTrendData = [
        { point: 0, value: averageViews || 0 },
        { point: 1, value: profile.profileViews || 0 },
    ]

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            {/* ─── Back + Actions ──────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Link href="/dashboard/edubreezyatlas">
                    <Button variant="ghost" size="sm" className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to Atlas
                    </Button>
                </Link>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleVisibility.mutate(!profile.isPubliclyVisible)}
                        disabled={toggleVisibility.isPending}
                    >
                        {profile.isPubliclyVisible ? <><EyeOff className="w-4 h-4 mr-1" /> Hide</> : <><Eye className="w-4 h-4 mr-1" /> Make Visible</>}
                    </Button>
                    {profile.slug && (
                        <a href={`https://atlas.edubreezy.com/explore/schools/${profile.slug || schoolId}`} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="gap-1">
                                <ExternalLink className="w-4 h-4" /> View on Atlas
                            </Button>
                        </a>
                    )}
                </div>
            </div>

            {/* ─── School Header Card ────────────── */}
            <Card className="overflow-hidden">
                {/* Cover Image */}
                {profile.coverImage && (
                    <div className="relative h-40 sm:h-52 bg-muted">
                        <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                )}
                <CardContent className="pt-4 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Logo */}
                        <div className="relative -mt-12 sm:-mt-16 z-10 shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-4 border-background overflow-hidden bg-muted shadow-lg flex items-center justify-center">
                                {(profile.logoImage || school.profilePicture) ? (
                                    <img src={profile.logoImage || school.profilePicture} alt={school.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Building2 className="w-8 h-8 text-muted-foreground" />
                                )}
                            </div>
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl font-bold">{school.name}</h1>
                                {profile.isVerified && <BadgeCheck className="w-5 h-5 text-blue-500" />}
                            </div>
                            {profile.tagline && <p className="text-muted-foreground mt-1">{profile.tagline}</p>}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {profile.isPubliclyVisible ? (
                                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><Eye className="w-3 h-3 mr-1" /> Visible</Badge>
                                ) : (
                                    <Badge variant="secondary"><EyeOff className="w-3 h-3 mr-1" /> Hidden</Badge>
                                )}
                                {profile.isFeatured && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Sparkles className="w-3 h-3 mr-1" /> Featured</Badge>}
                                {school.location && <Badge variant="outline"><MapPin className="w-3 h-3 mr-1" /> {school.location}</Badge>}
                                {school.schoolCode && <Badge variant="outline">{school.schoolCode}</Badge>}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Analytics Cards ────────────────── */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Profile Views</CardTitle>
                        <BarChart3 className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{profile.profileViews?.toLocaleString() || 0}</div>
                        <div className="mt-3 flex items-center gap-3">
                            <div className="h-12 w-24">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={viewsTrendData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                                        <defs>
                                            <linearGradient id="detail-views-trend" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor={viewsTrendColor} stopOpacity={0.35} />
                                                <stop offset="100%" stopColor={viewsTrendColor} stopOpacity={0.05} />
                                            </linearGradient>
                                        </defs>
                                        <Area
                                            type="monotone"
                                            dataKey="value"
                                            stroke={viewsTrendColor}
                                            strokeWidth={2}
                                            fill="url(#detail-views-trend)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-1 text-xs font-medium">
                                    {isViewsUp ? (
                                        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                                    ) : isViewsDown ? (
                                        <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                                    ) : (
                                        <Minus className="w-3.5 h-3.5 text-slate-500" />
                                    )}
                                    <span className={isViewsUp ? 'text-green-600' : isViewsDown ? 'text-red-600' : 'text-slate-500'}>
                                        {averageViews > 0 ? `${Math.abs(deltaPercent)}%` : '0%'}
                                    </span>
                                    <span className="text-muted-foreground">vs avg</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Marketplace avg: {averageViews.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
                        <MessageSquare className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{counts.inquiries || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Reviews</CardTitle>
                        <Star className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{counts.ratings || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
                        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{ratings ? ratings.overall.toFixed(1) : '—'}</div>
                        {ratings && (
                            <div className="flex gap-1 mt-1">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <Star key={star} className={`w-3 h-3 ${star <= Math.round(ratings.overall) ? 'fill-amber-500 text-amber-500' : 'text-muted-foreground/30'}`} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ─── Profile Details Grid ───────────── */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: Profile Info */}
                <div className="space-y-6">
                    {/* Description */}
                    {(profile.description || profile.vision || profile.mission) && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">About</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                {profile.description && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Description</p>
                                        <p className="text-sm">{profile.description}</p>
                                    </div>
                                )}
                                {profile.vision && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Vision</p>
                                        <p className="text-sm">{profile.vision}</p>
                                    </div>
                                )}
                                {profile.mission && (
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Mission</p>
                                        <p className="text-sm">{profile.mission}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Contact Info */}
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Contact</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {profile.publicEmail && (
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{profile.publicEmail}</span>
                                </div>
                            )}
                            {profile.publicPhone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{profile.publicPhone}</span>
                                </div>
                            )}
                            {profile.website && (
                                <div className="flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-muted-foreground" />
                                    <a href={profile.website} target="_blank" className="text-sm text-blue-600 hover:underline">{profile.website}</a>
                                </div>
                            )}
                            {school.contactNumber && (
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground/50" />
                                    <span className="text-sm text-muted-foreground">{school.contactNumber} (system)</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Fees */}
                    {(profile.minFee || profile.maxFee) && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Fee Structure</CardTitle></CardHeader>
                            <CardContent>
                                <div className="flex items-baseline gap-1 text-lg font-semibold">
                                    <DollarSign className="w-4 h-4" />
                                    ₹{profile.minFee?.toLocaleString() || '—'} — ₹{profile.maxFee?.toLocaleString() || '—'}
                                    <span className="text-sm font-normal text-muted-foreground">/ year</span>
                                </div>
                                {profile.feeStructureUrl && (
                                    <a href={profile.feeStructureUrl} target="_blank" className="text-sm text-blue-600 hover:underline mt-2 inline-block">
                                        View Full Fee Structure →
                                    </a>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: Statistics & People */}
                <div className="space-y-6">
                    {/* School Stats */}
                    <Card>
                        <CardHeader><CardTitle className="text-lg">School Statistics</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                        <GraduationCap className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Students</p>
                                        <p className="font-semibold">{profile.totalStudents || school._count?.Student || 0}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                        <Users className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Teachers</p>
                                        <p className="font-semibold">{profile.totalTeachers || school._count?.TeachingStaff || 0}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                        <BarChart3 className="w-4 h-4 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Student-Teacher Ratio</p>
                                        <p className="font-semibold">{profile.studentTeacherRatio ? `1:${profile.studentTeacherRatio}` : '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                        <Calendar className="w-4 h-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Established</p>
                                        <p className="font-semibold">{profile.establishedYear || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Ratings Breakdown */}
                    {ratings && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Rating Breakdown</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {[
                                    { label: 'Academic', value: ratings.academic },
                                    { label: 'Infrastructure', value: ratings.infrastructure },
                                    { label: 'Sports', value: ratings.sports },
                                ].map(r => (
                                    <div key={r.label} className="space-y-1">
                                        <div className="flex justify-between text-sm">
                                            <span>{r.label}</span>
                                            <span className="font-medium">{r.value.toFixed(1)}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${(r.value / 5) * 100}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* People */}
                    {(school.principals?.length > 0 || school.directors?.length > 0) && (
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Leadership</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                {school.principals?.map(p => (
                                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <UserCheck className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{p.user?.name || 'Principal'}</p>
                                            <p className="text-xs text-muted-foreground">Principal</p>
                                        </div>
                                    </div>
                                ))}
                                {school.directors?.map(d => (
                                    <div key={d.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                        <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                            <UserCheck className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{d.user?.name || 'Director'}</p>
                                            <p className="text-xs text-muted-foreground">Director</p>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {/* Atlas Counts */}
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Atlas Content</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3 text-center">
                                {[
                                    { label: 'Gallery', count: counts.gallery },
                                    { label: 'Achievements', count: counts.achievements },
                                    { label: 'Facilities', count: counts.facilities },
                                    { label: 'Badges', count: counts.badges },
                                ].map(item => (
                                    <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                                        <p className="text-xl font-bold">{item.count || 0}</p>
                                        <p className="text-xs text-muted-foreground">{item.label}</p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ─── Recent Inquiries ───────────────── */}
            {inquiries.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Admission Inquiries</CardTitle>
                        <CardDescription>Latest {inquiries.length} inquiries from the Atlas marketplace</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Student</TableHead>
                                        <TableHead>Parent</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Grade</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Date</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inquiries.map((inq) => (
                                        <TableRow key={inq.id}>
                                            <TableCell className="font-medium">{inq.studentName}</TableCell>
                                            <TableCell>{inq.parentName}</TableCell>
                                            <TableCell className="text-sm">{inq.parentPhone}</TableCell>
                                            <TableCell><Badge variant="outline">{inq.preferredGrade}</Badge></TableCell>
                                            <TableCell>
                                                <Badge variant={inq.status === 'New' ? 'default' : 'secondary'} className={inq.status === 'New' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : ''}>
                                                    {inq.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">
                                                {new Date(inq.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
