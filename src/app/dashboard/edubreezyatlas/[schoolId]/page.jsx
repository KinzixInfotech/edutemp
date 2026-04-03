'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import Link from 'next/link'
import {
    ArrowLeft, Globe, Eye, EyeOff, Edit, Trash2, Star, ExternalLink,
    Building2, MapPin, Phone, Mail, Link2, BadgeCheck, Sparkles,
    BarChart3, Users, GraduationCap, Calendar, MessageSquare,
    Loader2, DollarSign, Clock, UserCheck, TrendingUp, TrendingDown, Minus,
    Play, Image as ImageIcon, Trophy, Shield, CheckCircle, XCircle,
    Facebook, Instagram, Linkedin, Twitter, Youtube, X,
    ChevronLeft, ChevronRight, BookOpen, Dumbbell, Landmark, Bus,
    FlaskConical, Award, Monitor, Plus, Upload,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase } from '@/lib/supabase'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import AtlasGalleryUploadDialog from '@/components/gallery/AtlasGalleryUploadDialog'
import AtlasFacilityDialog from '@/components/AtlasFacilityDialog'
import AtlasAchievementDialog from '@/components/AtlasAchievementDialog'
import AtlasFeeDialog from '@/components/AtlasFeeDialog'

const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { ...options?.headers };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return fetch(url, { ...options, headers });
};

// ─── Facility category icons ───
const facilityIcons = {
    Infrastructure: Landmark,
    Lab: FlaskConical,
    Sports: Dumbbell,
    Transport: Bus,
}

// ─── Social media icons ───
const socialIcons = {
    facebook: Facebook,
    instagram: Instagram,
    linkedin: Linkedin,
    twitter: Twitter,
    youtube: Youtube,
}

// ─── Gallery Lightbox ───
function GalleryLightbox({ images, initialIndex, onClose }) {
    const [idx, setIdx] = useState(initialIndex)
    const img = images[idx]
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="relative max-w-5xl w-full mx-4" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors">
                    <X className="w-6 h-6" />
                </button>
                <div className="relative rounded-xl overflow-hidden bg-black">
                    <img src={img.imageUrl} alt={img.caption || ''} className="w-full max-h-[80vh] object-contain" />
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={() => setIdx(i => (i - 1 + images.length) % images.length)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIdx(i => (i + 1) % images.length)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>
                {img.caption && (
                    <p className="text-white text-center mt-3 text-sm">{img.caption}</p>
                )}
                <p className="text-white/50 text-center text-xs mt-1">{idx + 1} / {images.length}</p>
            </div>
        </div>
    )
}

export default function AtlasSchoolDetailPage(props) {
    const queryClient = useQueryClient()
    const { schoolId } = use(props.params)
    const [lightboxIndex, setLightboxIndex] = useState(null)
    const [galleryFilter, setGalleryFilter] = useState('All')
    const [galleryUploadOpen, setGalleryUploadOpen] = useState(false)
    const [facilityDialogOpen, setFacilityDialogOpen] = useState(false)
    const [achievementDialogOpen, setAchievementDialogOpen] = useState(false)
    const [feeDialogOpen, setFeeDialogOpen] = useState(false)

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
    const galleryImages = profile.gallery || []
    const facilities = profile.facilities || []
    const achievements = profile.achievements || []
    const badges = profile.badges || []
    const socials = profile.socials || {}
    const leadership = profile.leadership || []
    const boards = profile.boards || []
    const detailedFees = profile.detailedFeeStructure

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

    // Gallery filtering
    const galleryCategories = ['All', ...new Set(galleryImages.map(g => g.category).filter(Boolean))]
    const filteredGallery = galleryFilter === 'All'
        ? galleryImages
        : galleryImages.filter(g => g.category === galleryFilter)

    // Group facilities by category
    const facilitiesByCategory = facilities.reduce((acc, f) => {
        const cat = f.category || 'Other'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(f)
        return acc
    }, {})

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
            <Card className="overflow-hidden pt-0 pr-0 px-0! pl-0">
                {/* Cover Image */}
                {profile.coverImage && (
                    <div className="relative h-40 sm:h-60 md:h-[340px] bg-muted">
                        <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
                    </div>
                )}
                <CardContent className="pt-4 pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        {/* Logo */}
                        <div className="relative z-10 shrink-0">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-muted shadow-lg flex items-center justify-center">
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
                                {profile.genderType && <Badge variant="outline">{profile.genderType}</Badge>}
                                {profile.religiousAffiliation && <Badge variant="outline">{profile.religiousAffiliation}</Badge>}
                                {boards.map(b => (
                                    <Badge key={b} className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                                        <BookOpen className="w-3 h-3 mr-1" /> {b}
                                    </Badge>
                                ))}
                            </div>
                            {/* Social Links */}
                            {Object.keys(socials).some(k => socials[k]) && (
                                <div className="flex items-center gap-2 mt-3">
                                    {Object.entries(socials).map(([key, url]) => {
                                        if (!url) return null
                                        const Icon = socialIcons[key]
                                        if (!Icon) return null
                                        return (
                                            <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                                                className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                                                <Icon className="w-4 h-4 text-muted-foreground" />
                                            </a>
                                        )
                                    })}
                                </div>
                            )}
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

            {/* ─── Tabbed Content Area ───────────────── */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start bg-[#e8ebed] dark:bg-muted/50 rounded-xl p-1 h-auto flex-wrap">
                    <TabsTrigger value="overview" className="rounded-lg">Overview</TabsTrigger>
                    <TabsTrigger value="gallery" className="rounded-lg">
                        Gallery {galleryImages.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{galleryImages.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="facilities" className="rounded-lg">
                        Facilities {facilities.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{facilities.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="achievements" className="rounded-lg">
                        Achievements {achievements.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{achievements.length}</Badge>}
                    </TabsTrigger>
                    <TabsTrigger value="fees" className="rounded-lg">Tuition & Fees</TabsTrigger>
                    <TabsTrigger value="inquiries" className="rounded-lg">
                        Inquiries {inquiries.length > 0 && <Badge variant="secondary" className="ml-1.5 text-xs px-1.5 py-0">{counts.inquiries || 0}</Badge>}
                    </TabsTrigger>
                </TabsList>

                {/* ═══════════ OVERVIEW TAB ═══════════ */}
                <TabsContent value="overview" className="mt-6">
                    <div className="grid gap-6 lg:grid-cols-2">
                        {/* Left: Profile Info */}
                        <div className="space-y-6">
                            {/* About */}
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

                            {/* Video */}
                            {profile.videoUrl && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Play className="w-4 h-4" /> School Video</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
                                            {profile.videoUrl.includes('youtube.com') || profile.videoUrl.includes('youtu.be') ? (
                                                <iframe
                                                    src={profile.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/')}
                                                    className="absolute inset-0 w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : profile.videoUrl.includes('vimeo.com') ? (
                                                <iframe
                                                    src={profile.videoUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                                                    className="absolute inset-0 w-full h-full"
                                                    allow="autoplay; fullscreen; picture-in-picture"
                                                    allowFullScreen
                                                />
                                            ) : (
                                                <video src={profile.videoUrl} controls className="absolute inset-0 w-full h-full object-contain" />
                                            )}
                                        </div>
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

                            {/* Map */}
                            {profile.latitude && profile.longitude && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="rounded-lg overflow-hidden border" style={{ aspectRatio: '16/9' }}>
                                            <iframe
                                                src={`https://www.google.com/maps?q=${profile.latitude},${profile.longitude}&z=15&output=embed`}
                                                className="w-full h-full"
                                                loading="lazy"
                                                referrerPolicy="no-referrer-when-downgrade"
                                                title="School Location"
                                            />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Coordinates: {profile.latitude.toFixed(6)}, {profile.longitude.toFixed(6)}
                                        </p>
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

                            {/* Rating Breakdown */}
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

                            {/* Leadership */}
                            {(leadership.length > 0 || school.principals?.length > 0 || school.directors?.length > 0) && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg">Leadership</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        {/* From leadership JSON field */}
                                        {leadership.map((leader, i) => (
                                            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                                    {leader.photo ? (
                                                        <img src={leader.photo} alt={leader.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <UserCheck className="w-4 h-4 text-indigo-600" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium">{leader.name}</p>
                                                    <p className="text-xs text-muted-foreground">{leader.role}</p>
                                                </div>
                                                {leader.linkedin && (
                                                    <a href={leader.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-blue-600">
                                                        <Linkedin className="w-4 h-4" />
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                        {/* From related principals/directors */}
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

                            {/* Badges */}
                            {badges.length > 0 && (
                                <Card>
                                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Shield className="w-4 h-4" /> Badges</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2">
                                            {badges.map(b => (
                                                <Badge key={b.id} className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 px-3 py-1.5">
                                                    <Award className="w-3.5 h-3.5 mr-1.5" />
                                                    {b.badgeType}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Atlas Content Counts */}
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
                </TabsContent>

                {/* ═══════════ GALLERY TAB ═══════════ */}
                <TabsContent value="gallery" className="mt-6">
                    {galleryImages.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
                                <h3 className="font-semibold text-lg">No Gallery Images</h3>
                                <p className="text-sm text-muted-foreground mt-1">This school hasn't added any gallery images yet.</p>
                                <Button className="mt-4" onClick={() => setGalleryUploadOpen(true)}>
                                    <Upload className="w-4 h-4 mr-2" /> Upload Images
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-4">
                                {galleryCategories.length > 2 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {galleryCategories.map(cat => (
                                            <Button
                                                key={cat}
                                                size="sm"
                                                variant={galleryFilter === cat ? 'default' : 'outline'}
                                                onClick={() => setGalleryFilter(cat)}
                                            >
                                                {cat}
                                            </Button>
                                        ))}
                                    </div>
                                ) : <div />}
                                <Button size="sm" onClick={() => setGalleryUploadOpen(true)}>
                                    <Upload className="w-4 h-4 mr-2" /> Upload Images
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {filteredGallery.map((img, idx) => (
                                    <div
                                        key={img.id}
                                        className="group relative rounded-xl overflow-hidden bg-muted cursor-pointer aspect-square"
                                        onClick={() => setLightboxIndex(idx)}
                                    >
                                        <img
                                            src={img.imageUrl}
                                            alt={img.caption || 'Gallery image'}
                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <div className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            {img.caption && <p className="text-white text-xs font-medium truncate">{img.caption}</p>}
                                            {img.category && <p className="text-white/70 text-[10px]">{img.category}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    {lightboxIndex !== null && (
                        <GalleryLightbox
                            images={filteredGallery}
                            initialIndex={lightboxIndex}
                            onClose={() => setLightboxIndex(null)}
                        />
                    )}

                    <AtlasGalleryUploadDialog
                        open={galleryUploadOpen}
                        onOpenChange={setGalleryUploadOpen}
                        schoolId={schoolId}
                        existingGallery={galleryImages}
                    />
                </TabsContent>

                {/* ═══════════ FACILITIES TAB ═══════════ */}
                <TabsContent value="facilities" className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Facilities Setup</h3>
                        <Button size="sm" onClick={() => setFacilityDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Add Facility
                        </Button>
                    </div>
                    {facilities.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <Landmark className="w-12 h-12 text-muted-foreground/30 mb-3" />
                                <h3 className="font-semibold text-lg">No Facilities Listed</h3>
                                <p className="text-sm text-muted-foreground mt-1">This school hasn't added any facilities yet.</p>
                                <Button className="mt-4" onClick={() => setFacilityDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Facility
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-6">
                            {Object.entries(facilitiesByCategory).map(([category, items]) => {
                                const CatIcon = facilityIcons[category] || Monitor
                                return (
                                    <div key={category}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <CatIcon className="w-5 h-5 text-muted-foreground" />
                                            <h3 className="font-semibold">{category}</h3>
                                            <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {items.map(f => (
                                                <Card key={f.id} className="py-0">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <p className="font-medium text-sm">{f.name}</p>
                                                                {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                                                            </div>
                                                            {f.isAvailable ? (
                                                                <CheckCircle className="w-4 h-4 text-green-500 shrink-0 ml-2" />
                                                            ) : (
                                                                <XCircle className="w-4 h-4 text-red-400 shrink-0 ml-2" />
                                                            )}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <AtlasFacilityDialog
                        open={facilityDialogOpen}
                        onOpenChange={setFacilityDialogOpen}
                        schoolId={schoolId}
                        existingFacilities={facilities}
                    />
                </TabsContent>

                {/* ═══════════ ACHIEVEMENTS TAB ═══════════ */}
                <TabsContent value="achievements" className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">School Achievements</h3>
                        <Button size="sm" onClick={() => setAchievementDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Add Achievement
                        </Button>
                    </div>
                    {achievements.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <Trophy className="w-12 h-12 text-muted-foreground/30 mb-3" />
                                <h3 className="font-semibold text-lg">No Achievements Yet</h3>
                                <p className="text-sm text-muted-foreground mt-1">This school hasn't added any achievements yet.</p>
                                <Button className="mt-4" onClick={() => setAchievementDialogOpen(true)}>
                                    <Plus className="w-4 h-4 mr-2" /> Add Achievement
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {achievements.map(a => (
                                <Card key={a.id} className="overflow-hidden pt-0 px-0!">
                                    {a.imageUrl && (
                                        <div className="h-36 bg-muted">
                                            <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <CardContent className={`${a.imageUrl ? 'pt-3' : 'pt-5'} pb-4 px-4`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <h4 className="font-semibold text-sm flex-1">{a.title}</h4>
                                            {a.rank && (
                                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 shrink-0">
                                                    #{a.rank}
                                                </Badge>
                                            )}
                                        </div>
                                        {a.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{a.description}</p>}
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            <Badge variant="outline" className="text-xs">{a.category}</Badge>
                                            <Badge variant="outline" className="text-xs">{a.year}</Badge>
                                            {a.level && <Badge variant="outline" className="text-xs">{a.level}</Badge>}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    <AtlasAchievementDialog
                        open={achievementDialogOpen}
                        onOpenChange={setAchievementDialogOpen}
                        schoolId={schoolId}
                        existingAchievements={achievements}
                    />
                </TabsContent>

                {/* ═══════════ FEES TAB ═══════════ */}
                <TabsContent value="fees" className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Fee Structure</h3>
                        <Button size="sm" onClick={() => setFeeDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" /> Edit Fees
                        </Button>
                    </div>
                    <div className="space-y-6">
                        {/* Fee Range */}
                        {(profile.minFee || profile.maxFee) ? (
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Fee Range</CardTitle></CardHeader>
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
                        ) : (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                    <DollarSign className="w-12 h-12 text-muted-foreground/30 mb-3" />
                                    <h3 className="font-semibold text-lg">No Fee Information</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Fee details haven't been added yet.</p>
                                    <Button className="mt-4" onClick={() => setFeeDialogOpen(true)}>
                                        <Plus className="w-4 h-4 mr-2" /> Setup Fees
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {/* Detailed Fee Structure (JSON) */}
                        {detailedFees && Array.isArray(detailedFees) && detailedFees.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Detailed Fee Structure</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="rounded-lg border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    {Object.keys(detailedFees[0]).map(key => (
                                                        <TableHead key={key} className="capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}</TableHead>
                                                    ))}
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {detailedFees.map((row, i) => (
                                                    <TableRow key={i}>
                                                        {Object.values(row).map((val, j) => (
                                                            <TableCell key={j} className="text-sm">
                                                                {typeof val === 'number' ? `₹${val.toLocaleString()}` : String(val ?? '—')}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>

                    <AtlasFeeDialog
                        open={feeDialogOpen}
                        onOpenChange={setFeeDialogOpen}
                        schoolId={schoolId}
                        existingProfile={profile}
                    />
                </TabsContent>

                {/* ═══════════ INQUIRIES TAB ═══════════ */}
                <TabsContent value="inquiries" className="mt-6">
                    {inquiries.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                                <h3 className="font-semibold text-lg">No Inquiries Yet</h3>
                                <p className="text-sm text-muted-foreground mt-1">No admission inquiries have been received from Atlas.</p>
                            </CardContent>
                        </Card>
                    ) : (
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
                </TabsContent>
            </Tabs>
        </div>
    )
}
