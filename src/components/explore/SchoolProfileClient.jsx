'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import ReviewSection from '@/components/explore/ReviewSection';
import ReviewGate from '@/components/explore/ReviewGate';

import {
    MapPin, Phone, Mail, Globe, DollarSign, Users, GraduationCap,
    Star, Award, Trophy, Image as ImageIcon, ArrowLeft, CheckCircle2,
    Calendar, BookOpen, Share2, Heart, ChevronRight, Home, Clock,
    Building2, Droplets, MonitorPlay, Microscope, Library, Dumbbell,
    Copy, Check, X, LayoutGrid, IndianRupee, MessageSquare,
    UserCheck, Linkedin, School, Facebook, Instagram, Twitter, Youtube
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Facility icon mapper
const facilityIcons = {
    'swimming': Droplets, 'pool': Droplets, 'library': Library,
    'lab': Microscope, 'science': Microscope, 'computer': MonitorPlay,
    'digital': MonitorPlay, 'sports': Dumbbell, 'gym': Dumbbell,
    'ground': Dumbbell, 'art': BookOpen, 'music': BookOpen,
    'cafeteria': Building2, 'boarding': Building2, 'innovation': Microscope,
};

function getFacilityIcon(name) {
    const lower = (name || '').toLowerCase();
    for (const [key, Icon] of Object.entries(facilityIcons)) {
        if (lower.includes(key)) return Icon;
    }
    return CheckCircle2;
}

// Facility color mapper
const facilityColors = [
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-100' },
];

function getEmbeddedVideoUrl(url) {
    if (!url) return null;

    try {
        const parsed = new URL(url);

        if (parsed.hostname.includes('youtube.com')) {
            const videoId = parsed.searchParams.get('v');
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;

            const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
            if (shortsMatch?.[1]) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

            const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
            if (embedMatch?.[1]) return `https://www.youtube.com/embed/${embedMatch[1]}`;
        }

        if (parsed.hostname.includes('youtu.be')) {
            const videoId = parsed.pathname.replace(/^\/+/, '').split('/')[0];
            if (videoId) return `https://www.youtube.com/embed/${videoId}`;
        }

        return url;
    } catch {
        return null;
    }
}

const CLASS_ORDER = [
    'Playgroup', 'Pre-Nursery', 'Nursery', 'LKG', 'UKG',
    'Class - 1', 'Class - 2', 'Class - 3', 'Class - 4', 'Class - 5',
    'Class - 6', 'Class - 7', 'Class - 8', 'Class - 9', 'Class - 10',
    'Class - 11', 'Class - 12',
];

function normalizeClassLabel(value) {
    if (!value) return '';
    const trimmed = String(value).trim();
    const lower = trimmed.toLowerCase();

    if (lower === 'pre nursery' || lower === 'pre-nursery') return 'Pre-Nursery';
    if (lower === 'nursery') return 'Nursery';
    if (lower === 'lkg') return 'LKG';
    if (lower === 'ukg') return 'UKG';
    if (lower === 'playgroup' || lower === 'play group') return 'Playgroup';

    const match = trimmed.match(/(\d{1,2})/);
    if (match) return `Class - ${parseInt(match[1], 10)}`;

    return trimmed;
}

function buildClassOfferings(classes = [], classFrom, classTo) {
    const normalizedFrom = normalizeClassLabel(classFrom);
    const normalizedTo = normalizeClassLabel(classTo);

    if (normalizedFrom && normalizedTo) {
        const start = CLASS_ORDER.indexOf(normalizedFrom);
        const end = CLASS_ORDER.indexOf(normalizedTo);
        if (start !== -1 && end !== -1 && start <= end) {
            return CLASS_ORDER.slice(start, end + 1);
        }
    }

    const manualRange = [normalizedFrom, normalizedTo].filter(Boolean);
    if (manualRange.length > 0) {
        return manualRange;
    }

    if (Array.isArray(classes) && classes.length > 0) {
        return classes.map((item) => item.className).filter(Boolean);
    }

    return [];
}

const publicSocialIcons = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    linkedin: Linkedin,
    youtube: Youtube,
};

export default function SchoolProfileClient({ schoolId, initialData }) {
    const router = useRouter();
    const [reviewPage, setReviewPage] = useState(1);
    const [showAllFees, setShowAllFees] = useState(false);
    const [showGalleryModal, setShowGalleryModal] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [copied, setCopied] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const { data: school, isLoading, isError, refetch: schoolRefetch } = useQuery({
        queryKey: ['school-profile', schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/public/schools/${schoolId}`);
            if (!response.ok) throw new Error('School not found');
            return response.json();
        },
        initialData,
        staleTime: 0,
        refetchOnMount: 'always',
    });

    const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery({
        queryKey: ['school-reviews', schoolId, reviewPage],
        queryFn: async () => {
            const response = await fetch(`/api/public/schools/${schoolId}/reviews?page=${reviewPage}`);
            if (!response.ok) throw new Error('Failed to fetch reviews');
            return response.json();
        },
        enabled: !!schoolId,
    });

    // ── Share handler ──
    const handleShare = async () => {
        const url = window.location.href;
        const title = `${school?.school?.name} | EduBreezy`;
        const text = `Check out ${school?.school?.name} on EduBreezy`;

        if (navigator.share) {
            try {
                await navigator.share({ title, text, url });
            } catch (err) {
                if (err.name !== 'AbortError') {
                    copyToClipboard(url);
                }
            }
        } else {
            copyToClipboard(url);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // ── Save handler (requires auth) ──
    const handleSave = async () => {

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/explore/login');
            return;
        }
        setIsSaved(!isSaved);
    };

    // ── Grade range calculation ──
    const getGradeRange = () => {
        const manualFrom = normalizeClassLabel(school?.school?.atlas_classFrom);
        const manualTo = normalizeClassLabel(school?.school?.atlas_classTo);
        if (manualFrom && manualTo) {
            return `${manualFrom} to ${manualTo}`;
        }
        if (manualFrom || manualTo) {
            return manualFrom || manualTo;
        }

        const classes = school?.school?.classes || [];
        if (!classes.length) return null;
        const gradeNumbers = classes
            .map(c => { const m = c.className.match(/(\d+)/); return m ? parseInt(m[1]) : null; })
            .filter(n => n !== null)
            .sort((a, b) => a - b);
        if (gradeNumbers.length === 0) {
            const hasPre = classes.some(c => /nursery|lkg|ukg|kg|pre/i.test(c.className));
            if (hasPre && classes.length <= 3) return 'Pre-School';
            return `${classes.length} Classes`;
        }
        const min = gradeNumbers[0], max = gradeNumbers[gradeNumbers.length - 1];
        const hasPre = classes.some(c => /nursery|lkg|ukg|kg|pre/i.test(c.className));
        if (hasPre) return `Pre-K – Grade ${max}`;
        return min === max ? `Grade ${min}` : `Grades ${min}–${max}`;
    };

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-10 w-96" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Skeleton className="h-64 md:col-span-2 rounded-xl" />
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-[122px] rounded-xl" />
                        <Skeleton className="h-[122px] rounded-xl" />
                        <Skeleton className="h-[122px] rounded-xl" />
                        <Skeleton className="h-[122px] rounded-xl" />
                    </div>
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
                    <Skeleton className="h-72 rounded-xl" />
                </div>
            </div>
        );
    }

    // ── Error ──
    if (isError || !school) {
        return (
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12">
                <Card className="p-12 text-center rounded-xl">
                    <h2 className="text-2xl font-bold mb-4 text-[#0f172a]">School Not Found</h2>
                    <p className="text-gray-400 mb-6">The school you're looking for doesn't exist or is not publicly visible.</p>
                    <Link href="/explore/schools">
                        <Button className="rounded-full px-6 bg-[#2563eb] hover:bg-[#1d4ed8]">
                            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Directory
                        </Button>
                    </Link>
                </Card>
            </div>
        );
    }

    const galleryImages = school.gallery || [];
    const gradeRange = getGradeRange();
    const embeddedVideoUrl = getEmbeddedVideoUrl(school.videoUrl);
    const reviewSummary = school.reviewSummary || {};
    const reviewCount = reviewSummary.totalReviews || school._count?.ratings || 0;
    const teacherRating = reviewSummary.teacherRating || 0;
    const classOfferings = buildClassOfferings(
        school.school?.classes || [],
        school.school?.atlas_classFrom,
        school.school?.atlas_classTo
    );
    const visibleClassOfferings = classOfferings.slice(0, 4);
    const remainingClassCount = Math.max(classOfferings.length - visibleClassOfferings.length, 0);
    const socials = school.socials || {};
    const socialEntries = Object.entries(socials).filter(([, url]) => Boolean(url));

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-5">

                {/* ── Breadcrumb ── */}
                <nav className="flex items-center gap-1.5 text-sm">
                    <Link href="/explore" className="text-gray-400 hover:text-[#2563eb] transition-colors flex items-center gap-1">
                        <Home className="w-3.5 h-3.5" /> Home
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    <Link href="/explore/schools" className="text-gray-400 hover:text-[#2563eb] transition-colors">Schools</Link>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    <span className="text-[#0f172a] font-medium truncate">{school.school?.name}</span>
                </nav>

                {/* ── Header Bar ── */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-4">
                        {(school.logoImage || school.school?.profilePicture) && (
                            <img
                                src={school.logoImage || school.school?.profilePicture}
                                alt={`${school.school?.name} logo`}
                                className="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover border border-gray-200 shrink-0 bg-white"
                            />
                        )}
                        <div>
                            <h1 className="text-2xl md:text-[32px] font-extrabold text-[#0f172a] tracking-tight leading-tight flex items-center gap-2">
                                {school.school?.name}
                                {school.isVerified && (
                                    <img src="/bluetick.png" alt="Verified" className="w-6 h-6 md:w-7 md:h-7 shrink-0" />
                                )}
                            </h1>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                <span className="text-sm text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" /> {school.school?.location}
                                </span>
                                {school.establishedYear && (
                                    <span className="text-sm text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-gray-400" /> Est. {school.establishedYear}
                                    </span>
                                )}
                                {school.religiousAffiliation && (
                                    <Badge variant="secondary" className="gap-1 text-[11px] bg-gray-100 text-gray-600 border-gray-200 uppercase tracking-wider font-semibold">
                                        {school.religiousAffiliation}
                                    </Badge>
                                )}
                                {reviewCount > 0 && (
                                    <Badge variant="secondary" className="gap-1 text-[11px] bg-amber-50 text-amber-700 border-amber-200 font-semibold">
                                        <MessageSquare className="h-3 w-3" /> {reviewCount} reviews
                                    </Badge>
                                )}
                                {school.isVerified && (
                                    <Badge className="gap-1 bg-green-50 text-green-700 border-green-200 text-[11px]">
                                        <CheckCircle2 className="h-3 w-3" /> Accredited
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full gap-1.5 text-xs h-9 border-gray-200"
                            onClick={handleShare}
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
                            {copied ? 'Copied!' : 'Share'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`rounded-full gap-1.5 text-xs h-9 border-gray-200 ${isSaved ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                            onClick={handleSave}
                        >
                            <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} /> {isSaved ? 'Saved' : 'Save'}
                        </Button>
                    </div>
                </motion.div>

                {/* ── Photo Gallery Grid ── */}
                {/* Fallback no images */}
                {(!school?.coverImage || String(school?.coverImage).trim() === '' || String(school?.coverImage) === 'null') && (!galleryImages || galleryImages.length === 0) && (
                    <div className="rounded-2xl overflow-hidden h-40 md:h-[240px] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center border border-gray-200 shadow-inner w-full mt-2 mb-2">
                        <div className="text-center text-gray-400">
                            <School className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 opacity-50" />
                            <p className="font-medium text-sm">Visuals coming soon</p>
                        </div>
                    </div>
                )}

                {school.coverImage && galleryImages.length === 0 && (
                    /* Cover image only — full width */
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="rounded-2xl overflow-hidden h-60 md:h-[340px]">
                        <img
                            src={school.coverImage}
                            alt={school.school?.name}
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                )}
                {galleryImages.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-3 h-auto md:h-[400px] rounded-2xl overflow-hidden">
                        {/* Main large image */}
                        <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gray-100 h-60 md:h-full cursor-pointer"
                        >
                            <img
                                src={school.coverImage || galleryImages[0]?.imageUrl}
                                alt={school.school?.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                            />
                        </div>
                        {/* Small 2x2 grid — only actual images */}
                        <div className="grid grid-cols-2 grid-rows-2 gap-3 h-full min-h-0">
                            {galleryImages.slice(0, 4).map((img, i) => {
                                const isLast = i === 3 && galleryImages.length > 4;
                                return (
                                    <div key={i} className="relative overflow-hidden rounded-xl bg-gray-100 h-full cursor-pointer min-h-0"
                                        onClick={() => { setGalleryIndex(i); setShowGalleryModal(true); }}>
                                        <img src={img.imageUrl} alt={img.caption || 'Gallery'} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                                        {isLast && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold text-center p-2">
                                                <ImageIcon className="w-3.5 h-3.5 mb-1 mx-auto block" />
                                                <span>+{galleryImages.length - 3} More</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}

                {/* Gallery Lightbox Modal */}
                <Dialog open={showGalleryModal} onOpenChange={setShowGalleryModal}>
                    <DialogContent showCloseButton={false} className="max-w-4xl p-0 bg-black/95 border-0">
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-3 right-3 z-10 text-white hover:bg-white/20 rounded-full"
                                onClick={() => setShowGalleryModal(false)}
                            >
                                <X className="w-5 h-5" />
                            </Button>
                            {galleryImages[galleryIndex] && (
                                <img
                                    src={galleryImages[galleryIndex]?.imageUrl}
                                    alt={galleryImages[galleryIndex]?.caption || 'Gallery'}
                                    className="w-full max-h-[80vh] object-contain"
                                />
                            )}
                            <div className="flex justify-center gap-2 py-4">
                                {galleryImages.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setGalleryIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-colors ${idx === galleryIndex ? 'bg-white' : 'bg-white/40'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── Tabs ── */}
                <Tabs defaultValue="overview" className="space-y-6">
                    <TabsList className="w-full justify-start bg-gray-100/80 rounded-xl h-auto p-1.5 gap-1 overflow-x-auto flex-nowrap">
                        {[
                            { value: 'overview', label: 'Overview', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                            { value: 'curriculum', label: 'Curriculum', icon: <BookOpen className="w-3.5 h-3.5" /> },
                            { value: 'facilities', label: 'Facilities', icon: <Building2 className="w-3.5 h-3.5" /> },
                            { value: 'gallery', label: 'Gallery', icon: <ImageIcon className="w-3.5 h-3.5" /> },
                            { value: 'fees', label: 'Tuition & Fees', icon: <IndianRupee className="w-3.5 h-3.5" /> },
                            { value: 'reviews', label: 'Reviews', icon: <MessageSquare className="w-3.5 h-3.5" /> },
                        ].map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="text-sm font-medium px-4 py-2.5 rounded-lg whitespace-nowrap gap-1.5 bg-transparent shadow-none border-0 data-[state=active]:bg-white data-[state=active]:text-[#2563eb] data-[state=active]:shadow-sm data-[state=active]:border-0 text-gray-500 hover:text-gray-700 transition-all"
                            >
                                {tab.icon}
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {/* ═══ Overview ═══ */}
                    <TabsContent value="overview" className="space-y-6  mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left — Main Content */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* About Section — inside a Card like the reference */}
                                <Card className="p-6 md:p-8 rounded-2xl border-gray-200">
                                    <h2 className="text-xl font-bold text-[#0f172a] mb-5 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                            <svg className="w-4 h-4 text-[#2563eb]" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                        </div>
                                        About {school.school?.name}
                                    </h2>
                                    {school.description ? (
                                        <div className="text-[15px] text-gray-600 whitespace-pre-line leading-[1.85] mb-8">
                                            {school.description}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-400 italic mb-8 border border-dashed border-gray-200 rounded-xl p-6 text-center bg-gray-50/50">
                                            <p>A detailed description for {school.school?.name} has not been provided yet.</p>
                                        </div>
                                    )}

                                    {/* Stats Row — inside the card, at the bottom */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                                        {[
                                            { label: 'ESTABLISHED', value: school.establishedYear || '—', color: 'text-[#2563eb]' },
                                            { label: 'STUDENT:FACULTY', value: school.studentTeacherRatio ? `${school.studentTeacherRatio}:1` : '—', color: 'text-[#2563eb]' },
                                            { label: 'TOTAL TEACHERS', value: school.totalTeachers ? `${school.totalTeachers}+` : '—', color: 'text-[#2563eb]' },
                                            { label: 'TOTAL STUDENTS', value: school.totalStudents || '—', color: 'text-[#2563eb]' },
                                        ].map((stat) => (
                                            <div key={stat.label}>
                                                <div className={`text-3xl md:text-4xl font-extrabold ${stat.color} tracking-tight`}>{stat.value}</div>
                                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </Card>

                                {/* Vision & Mission */}
                                {(school.vision || school.mission) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {school.vision && (
                                            <Card className="p-5 rounded-xl border-gray-200">
                                                <h3 className="font-bold text-[#0f172a] mb-2 text-sm">Vision</h3>
                                                <p className="text-sm text-gray-500 leading-relaxed">{school.vision}</p>
                                            </Card>
                                        )}
                                        {school.mission && (
                                            <Card className="p-5 rounded-xl border-gray-200">
                                                <h3 className="font-bold text-[#0f172a] mb-2 text-sm">Mission</h3>
                                                <p className="text-sm text-gray-500 leading-relaxed">{school.mission}</p>
                                            </Card>
                                        )}
                                    </div>
                                )}

                                {/* Academics */}
                                <div className='bg-white py-6 px-6 rounded-2xl border border-gray-200'>
                                    <h2 className="text-xl font-bold text-[#0f172a] mb-4 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-[#2563eb] rounded-full" />
                                        Academics
                                    </h2>
                                    {classOfferings.length > 0 ? (
                                        <Card className="rounded-2xl  pt-0 border-gray-200 overflow-hidden">
                                            {/* Gradient header */}
                                            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 p-5 text-white">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                                            <GraduationCap className="w-6 h-6 text-white" />
                                                        </div>
                                                        <div>
                                                            <h3 className="font-bold text-lg">{classOfferings.length} Classes</h3>
                                                            {(gradeRange || (school.school?.atlas_classFrom && school.school?.atlas_classTo)) && (
                                                                <p className="text-blue-100 text-sm">
                                                                    {gradeRange || `${school.school?.atlas_classFrom} to ${school.school?.atlas_classTo}`}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {school.overallRating > 0 && (
                                                        <div className="text-right">
                                                            <div className="text-3xl font-black">{school.overallRating.toFixed(1)}</div>
                                                            <div className="flex items-center gap-0.5 justify-end">
                                                                {[1, 2, 3, 4, 5].map(s => (
                                                                    <Star key={s} className={`w-3 h-3 ${s <= Math.round(school.overallRating) ? 'text-amber-300 fill-amber-300' : 'text-white/30'}`} />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Classes grid */}
                                            <div className="p-5">
                                                <div className="flex items-center justify-between gap-3 mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="w-4 h-4 text-[#2563eb]" />
                                                        <p className="text-sm font-semibold text-[#0f172a]">Classes Offered</p>
                                                    </div>
                                                    <p className="text-sm text-gray-400">{classOfferings.length} classes</p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {visibleClassOfferings.map((className) => (
                                                        <div
                                                            key={className}
                                                            className="flex items-center justify-center px-4 py-2 rounded-xl border border-blue-100 bg-blue-50 text-sm font-semibold text-blue-700"
                                                        >
                                                            {className}
                                                        </div>
                                                    ))}
                                                    {remainingClassCount > 0 && (
                                                        <div className="flex items-center justify-center px-4 py-2 rounded-xl border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-700">
                                                            +{remainingClassCount} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Ratings breakdown */}
                                            {school.overallRating > 0 && (
                                                <div className="border-t border-gray-100 p-5">
                                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Rating Breakdown</p>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        {[
                                                            { label: 'Academic', value: school.academicRating, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
                                                            { label: 'Infrastructure', value: school.infrastructureRating, color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
                                                            { label: 'Teachers', value: teacherRating, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50' },
                                                            { label: 'Sports', value: school.sportsRating, color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
                                                        ].map((r) => (
                                                            <div key={r.label} className="text-center">
                                                                <div className={`w-12 h-12 mx-auto rounded-full ${r.bg} flex items-center justify-center mb-2`}>
                                                                    <span className="text-sm font-bold bg-gradient-to-b ${r.color} bg-clip-text text-transparent">{r.value?.toFixed(1)}</span>
                                                                </div>
                                                                <p className="text-[11px] text-gray-500 font-medium">{r.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </Card>
                                    ) : (
                                        <Card className="p-8 border border-dashed border-gray-200 text-center bg-gray-50/50 rounded-2xl">
                                            <GraduationCap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-gray-500">Classes information not provided</p>
                                        </Card>
                                    )}
                                </div>

                                {/* Campus Facilities */}
                                <div className='bg-white py-6 px-6 rounded-2xl border border-gray-200'>
                                    <h2 className="text-xl font-bold text-[#0f172a] mb-4 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-[#2563eb] rounded-full" />
                                        Campus Facilities
                                    </h2>
                                    {school.facilities && school.facilities.length > 0 ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {school.facilities.slice(0, 8).map((facility, idx) => {
                                                const FIcon = getFacilityIcon(facility.name);
                                                const color = facilityColors[idx % facilityColors.length];
                                                return (
                                                    <div key={facility.id} className={`flex flex-col items-center text-center p-4 rounded-xl ${color.bg} border ${color.border} hover:shadow-sm transition-shadow`}>
                                                        <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center mb-2 shadow-sm`}>
                                                            <FIcon className={`w-5 h-5 ${color.text}`} />
                                                        </div>
                                                        <span className="text-xs font-semibold text-[#0f172a] leading-tight">{facility.name}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <Card className="p-8 border border-dashed border-gray-200 text-center bg-white rounded-2xl">
                                            <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                                            <p className="text-sm font-medium text-gray-500">Facility details are updating</p>
                                        </Card>
                                    )}
                                </div>

                                {/* Fee Table Preview */}
                                {school.detailedFeeStructure && school.detailedFeeStructure.length > 0 && (
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h2 className="text-xl font-bold text-[#0f172a] flex items-center gap-2">
                                                <span className="w-1 h-6 bg-[#2563eb] rounded-full" />
                                                Annual Tuition & Fees
                                            </h2>
                                            <span className="text-xs text-gray-400 font-medium">Academic Year 2024-2025</span>
                                        </div>
                                        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-50/80">
                                                        <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-gray-500">Grade Level</th>
                                                        <th className="px-4 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-gray-500 hidden sm:table-cell">Admission</th>
                                                        <th className="px-4 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-gray-500 hidden sm:table-cell">Tuition</th>
                                                        <th className="px-4 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-gray-500">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {(showAllFees ? school.detailedFeeStructure : school.detailedFeeStructure.slice(0, 4)).map((fee, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-[#0f172a]">{fee.className}</td>
                                                            <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">₹{fee.admissionFee?.toLocaleString() || '—'}</td>
                                                            <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell">₹{fee.tuitionFee?.toLocaleString() || '—'}</td>
                                                            <td className="px-4 py-3 text-right font-bold text-[#2563eb]">₹{fee.total?.toLocaleString() || '—'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {school.detailedFeeStructure.length > 4 && (
                                            <Button variant="ghost" size="sm" className="w-full text-xs mt-2 text-[#2563eb]" onClick={() => setShowAllFees(!showAllFees)}>
                                                {showAllFees ? 'Show Less' : `View All ${school.detailedFeeStructure.length} Grades`}
                                            </Button>
                                        )}
                                        <p className="text-[11px] text-gray-400 mt-2">* Fees include technology levy, lunch, and most extracurricular activities. Textbooks and uniforms billed separately.</p>
                                    </div>
                                )}
                            </div>

                            {/* Right — Sidebar */}
                            <div className="space-y-5 lg:sticky lg:top-20 self-start">
                                {/* Enquiry Form */}
                                <Card className="p-6 rounded-2xl border-gray-200">
                                    <div className="bg-[#2563eb] text-white text-center p-4 -mx-6 -mt-6 rounded-t-2xl mb-5">
                                        <h3 className="text-base font-bold">Interested in {school.school?.name?.split(' ')[0]}?</h3>
                                        <p className="text-xs text-blue-100 mt-0.5">Get in touch with Admissions Directly</p>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Parent's Name</label>
                                            <input type="text" placeholder="John Doe" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] bg-gray-50/50" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Email Address</label>
                                            <input type="email" placeholder="john@example.com" className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] bg-gray-50/50" />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Grade of Interest</label>
                                            <select className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm text-gray-500 outline-none focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb] appearance-none bg-gray-50/50">
                                                <option value="">Select Class</option>
                                                <option>Nursery</option>
                                                <option>LKG</option>
                                                <option>UKG</option>
                                                <option>Class 1-5</option>
                                                <option>Class 6-8</option>
                                                <option>Class 9-10</option>
                                                <option>Class 11-12</option>
                                            </select>
                                        </div>
                                        <Link href={`/explore/schools/${school.slug || schoolId}/apply`}>
                                            <Button className="w-full h-11 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] font-bold text-sm mt-1">
                                                Send Enquiry
                                            </Button>
                                        </Link>
                                    </div>
                                </Card>

                                {/* Admissions Office */}
                                <Card className="p-5 rounded-2xl border-gray-200">
                                    <h3 className="text-sm font-bold text-[#0f172a] mb-4 uppercase tracking-wider">Admissions Office</h3>
                                    <div className="space-y-3">
                                        {(school.publicPhone || school.school?.contactNumber) && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Phone className="h-4 w-4 text-[#2563eb]" />
                                                </div>
                                                <span className="text-gray-600">{school.publicPhone || school.school?.contactNumber}</span>
                                            </div>
                                        )}
                                        {school.publicEmail && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Mail className="h-4 w-4 text-[#2563eb]" />
                                                </div>
                                                <span className="text-gray-600 break-all text-xs">{school.publicEmail}</span>
                                            </div>
                                        )}
                                        {school.website && (
                                            <div className="flex items-center gap-3 text-sm">
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                    <Globe className="h-4 w-4 text-[#2563eb]" />
                                                </div>
                                                <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-[#2563eb] hover:underline text-xs">
                                                    Visit Website
                                                </a>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-3 text-sm">
                                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                                                <Clock className="h-4 w-4 text-[#2563eb]" />
                                            </div>
                                            <span className="text-gray-600 text-xs">Mon-Fri, 9:00 AM – 6:00 PM</span>
                                        </div>
                                    </div>
                                </Card>

                                {socialEntries.length > 0 && (
                                    <Card className="p-5 rounded-2xl border-gray-200">
                                        <h3 className="text-sm font-bold text-[#0f172a] mb-4 uppercase tracking-wider">Connect Online</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {socialEntries.map(([platform, url]) => {
                                                const Icon = publicSocialIcons[platform];
                                                if (!Icon) return null;

                                                return (
                                                    <a
                                                        key={platform}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-[#2563eb]"
                                                    >
                                                        <Icon className="w-4 h-4" />
                                                        <span className="capitalize">{platform}</span>
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </Card>
                                )}

                                {/* Leadership Team */}
                                <Card className="p-5 rounded-2xl border-gray-200">
                                    <h3 className="text-sm font-bold text-[#0f172a] mb-4 uppercase tracking-wider">Leadership Team</h3>
                                    {school.leadership && Array.isArray(school.leadership) && school.leadership.length > 0 ? (
                                        <div className="space-y-3">
                                            {school.leadership.map((leader, i) => (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-50 flex items-center justify-center shrink-0">
                                                        {leader.photo ? (
                                                            <img src={leader.photo} alt={leader.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <UserCheck className="w-4 h-4 text-indigo-600" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-[#0f172a]">{leader.name}</p>
                                                        <p className="text-xs text-gray-500">{leader.role}</p>
                                                    </div>
                                                    {leader.linkedin && (
                                                        <a href={leader.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#2563eb] transition-colors">
                                                            <Linkedin className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 border border-dashed border-gray-200 rounded-lg text-center bg-gray-50/50">
                                            <p className="text-xs text-gray-400 italic">No leadership profiles added</p>
                                        </div>
                                    )}
                                </Card>

                                {embeddedVideoUrl && (
                                    <Card className="rounded-2xl pt-0 border-gray-200 overflow-hidden">
                                        <div className="p-5 pb-3">
                                            <h3 className="text-sm font-bold text-[#0f172a] uppercase tracking-wider">School Video</h3>
                                        </div>
                                        <div className="px-5 pb-5">
                                            <div className="overflow-hidden rounded-xl bg-black aspect-video">
                                                <iframe
                                                    title={`${school.school?.name} video`}
                                                    src={embeddedVideoUrl}
                                                    className="w-full h-full"
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                    referrerPolicy="strict-origin-when-cross-origin"
                                                    allowFullScreen
                                                />
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                {/* Google Maps Embed */}
                                {school.latitude && school.longitude && (
                                    <Card className="rounded-2xl pt-0 border-gray-200 overflow-hidden">
                                        <iframe
                                            title="School Location"
                                            width="100%"
                                            height="220"
                                            style={{ border: 0 }}
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            src={`https://maps.google.com/maps?q=${school.latitude},${school.longitude}&z=15&output=embed`}
                                        />
                                        <div className="p-3 flex items-center gap-2 text-xs text-gray-500">
                                            <MapPin className="w-3.5 h-3.5 text-[#2563eb]" />
                                            <a
                                                href={`https://www.google.com/maps?q=${school.latitude},${school.longitude}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="text-[#2563eb] hover:underline font-medium"
                                            >
                                                View on Map →
                                            </a>
                                        </div>
                                    </Card>
                                )}

                                {/* Fee Range */}
                                <Card className="p-5 rounded-2xl border-gray-200">
                                    <h3 className="text-sm font-bold text-[#0f172a] mb-3 uppercase tracking-wider">Annual Fee Range</h3>
                                    {(school.minFee || school.maxFee) ? (
                                        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                            <DollarSign className="h-5 w-5 text-[#2563eb]" />
                                            <span className="text-lg font-bold text-[#2563eb]">
                                                {school.minFee && school.maxFee ? `₹${school.minFee.toLocaleString()} — ₹${school.maxFee.toLocaleString()}` : `${school.minFee ? `From ₹${school.minFee.toLocaleString()}` : `Up to ₹${school.maxFee.toLocaleString()}`}`}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-center">
                                            <p className="text-xs text-gray-500 font-medium italic">Contact school for fee details</p>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ═══ Curriculum ═══ */}
                    <TabsContent value="curriculum">
                        <div className="space-y-6">
                            {gradeRange ? (
                                <Card className="p-6 rounded-xl border-gray-200">
                                    <h2 className="text-lg font-bold text-[#0f172a] mb-4">Academic Overview</h2>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
                                            <GraduationCap className="w-6 h-6 text-[#2563eb] mb-2" />
                                            <div className="text-sm font-bold text-[#0f172a]">{gradeRange}</div>
                                            <div className="text-xs text-gray-500">Grade Levels</div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                                            <BookOpen className="w-6 h-6 text-purple-600 mb-2" />
                                            <div className="text-sm font-bold text-[#0f172a]">{school.school?.classes?.length || 0} Classes</div>
                                            <div className="text-xs text-gray-500">Total Available</div>
                                        </div>
                                        {school.studentTeacherRatio && (
                                            <div className="p-4 rounded-xl bg-green-50 border border-green-100">
                                                <Users className="w-6 h-6 text-green-600 mb-2" />
                                                <div className="text-sm font-bold text-[#0f172a]">{school.studentTeacherRatio}:1</div>
                                                <div className="text-xs text-gray-500">Student:Teacher Ratio</div>
                                            </div>
                                        )}
                                    </div>
                                    {school.description && (
                                        <p className="text-sm text-gray-500 mt-4 leading-relaxed">{school.description}</p>
                                    )}
                                </Card>
                            ) : (
                                <Card className="p-12 text-center rounded-xl border-gray-200">
                                    <BookOpen className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                    <p className="text-gray-400 text-sm">Curriculum details not available yet.</p>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    {/* ═══ Facilities ═══ */}
                    <TabsContent value="facilities">
                        {school.facilities && school.facilities.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {school.facilities.map((facility, idx) => {
                                    const FIcon = getFacilityIcon(facility.name);
                                    const color = facilityColors[idx % facilityColors.length];
                                    return (
                                        <Card key={facility.id} className="p-4 rounded-xl border-gray-200 flex items-center gap-3 hover:shadow-md transition-shadow">
                                            <div className={`w-10 h-10 rounded-xl ${color.bg} flex items-center justify-center shrink-0`}>
                                                <FIcon className={`w-5 h-5 ${color.text}`} />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-sm text-[#0f172a]">{facility.name}</span>
                                                {facility.description && (
                                                    <p className="text-xs text-gray-400 mt-0.5">{facility.description}</p>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <Card className="p-12 text-center rounded-xl border-gray-200">
                                <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-400 text-sm">No facilities listed yet.</p>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ═══ Gallery ═══ */}
                    <TabsContent value="gallery">
                        {school.gallery && school.gallery.length > 0 ? (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                {school.gallery.map((img) => (
                                    <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden group border border-gray-100 shadow-sm">
                                        <img
                                            src={img.imageUrl}
                                            alt={img.caption || 'School gallery image'}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                        {img.caption && (
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                                                <p className="text-white text-sm font-medium line-clamp-1">{img.caption}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <Card className="p-12 text-center rounded-xl border-gray-200">
                                <ImageIcon className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-400 text-sm">No gallery images available yet.</p>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ═══ Tuition & Fees ═══ */}
                    <TabsContent value="fees">
                        {school.detailedFeeStructure && school.detailedFeeStructure.length > 0 ? (
                            <Card className="rounded-xl border-gray-200 overflow-hidden">
                                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-[#0f172a]">Annual Tuition & Fees</h2>
                                    {(school.minFee || school.maxFee) && (
                                        <Badge className="bg-blue-50 text-[#2563eb] border-blue-200 text-xs">
                                            Range: ₹{school.minFee?.toLocaleString()} – ₹{school.maxFee?.toLocaleString()}
                                        </Badge>
                                    )}
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-gray-500">Grade Level</th>
                                            <th className="px-6 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-gray-500 hidden sm:table-cell">Admission Fee</th>
                                            <th className="px-6 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-gray-500 hidden sm:table-cell">Tuition Fee</th>
                                            <th className="px-6 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-gray-500">Total Annual</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {school.detailedFeeStructure.map((fee, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3.5 font-medium text-[#0f172a]">{fee.className}</td>
                                                <td className="px-6 py-3.5 text-right text-gray-500 hidden sm:table-cell">₹{fee.admissionFee?.toLocaleString() || '—'}</td>
                                                <td className="px-6 py-3.5 text-right text-gray-500 hidden sm:table-cell">₹{fee.tuitionFee?.toLocaleString() || '—'}</td>
                                                <td className="px-6 py-3.5 text-right font-bold text-[#2563eb]">₹{fee.total?.toLocaleString() || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-4 bg-gray-50 border-t border-gray-100">
                                    <p className="text-[11px] text-gray-400">* All fees are per academic year. Additional charges (transport, uniform, etc.) may apply.</p>
                                </div>
                                {school.feeStructureUrl && (
                                    <div className="p-4 border-t border-gray-100">
                                        <a href={school.feeStructureUrl} target="_blank" rel="noopener noreferrer">
                                            <Button variant="outline" size="sm" className="w-full rounded-lg">View Complete Fee PDF</Button>
                                        </a>
                                    </div>
                                )}
                            </Card>
                        ) : (
                            <Card className="p-12 text-center rounded-xl border-gray-200">
                                <DollarSign className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                <p className="text-gray-400 text-sm">Fee structure not available yet. Contact the school for details.</p>
                            </Card>
                        )}
                    </TabsContent>

                    {/* ═══ Reviews ═══ */}
                    <TabsContent value="reviews">
                        <div className="space-y-6">
                            <Card className="p-6 rounded-xl border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-[#0f172a] mb-1">Parent Reviews</h3>
                                        <p className="text-sm text-gray-400">
                                            {reviewsData?.total || 0} verified parent {reviewsData?.total === 1 ? 'review' : 'reviews'}
                                        </p>
                                    </div>
                                    <ReviewGate
                                        profileId={schoolId}
                                        schoolId={school?.school?.id}
                                        onReviewSubmit={() => { refetchReviews(); schoolRefetch(); }}
                                    />
                                </div>
                            </Card>

                            {reviewsLoading ? (
                                <div className="space-y-4">
                                    {[...Array(3)].map((_, i) => (
                                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : (
                                <ReviewSection
                                    reviews={reviewsData?.reviews}
                                    totalPages={reviewsData?.totalPages}
                                    currentPage={reviewPage}
                                    onPageChange={setReviewPage}
                                />
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
