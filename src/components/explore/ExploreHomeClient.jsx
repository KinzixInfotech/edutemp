'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, MapPin, TrendingUp, School as SchoolIcon, GraduationCap, Award, ArrowRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: "spring", stiffness: 100 }
    }
};

export default function ExploreHomeClient() {
    const [locationState, setLocationState] = useState({
        status: 'idle', // idle, loading, success, error
        city: null,
        error: null
    });

    // Fetch schools based on location
    const { data: nearbySchoolsData, isLoading: isSchoolsLoading } = useQuery({
        queryKey: ['nearby-schools', locationState.city],
        queryFn: async () => {
            if (!locationState.city) return null;
            const res = await fetch(`/api/public/schools?location=${encodeURIComponent(locationState.city)}&limit=3`);
            if (!res.ok) throw new Error('Failed to fetch schools');
            return res.json();
        },
        enabled: !!locationState.city,
    });

    // Fetch featured schools (Location prioritized, fallback to global)
    const { data: featuredSchoolsData, isLoading: isFeaturedLoading } = useQuery({
        queryKey: ['featured-schools', locationState.city],
        queryFn: async () => {
            // 1. Try fetching featured schools in the user's city
            if (locationState.city) {
                const res = await fetch(`/api/public/schools?featured=true&location=${encodeURIComponent(locationState.city)}&limit=4`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.schools.length > 0) return { ...data, source: 'local' };
                }
            }

            // 2. Fallback: Fetch globally featured schools
            const res = await fetch(`/api/public/schools?featured=true&limit=4`);
            if (!res.ok) throw new Error('Failed to fetch featured schools');
            return { ...(await res.json()), source: 'global' };
        },
    });
    console.log(featuredSchoolsData);

    // Auto-detect location on mount
    useEffect(() => {
        detectLocation();
    }, []);

    const detectLocation = () => {
        if (!navigator.geolocation) {
            setLocationState({ status: 'error', error: 'Geolocation not supported', city: null });
            return;
        }

        setLocationState(prev => ({ ...prev, status: 'loading' }));

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    // Reverse geocode to get city
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();

                    const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state_district;

                    if (city) {
                        setLocationState({ status: 'success', city, error: null });
                    } else {
                        setLocationState({ status: 'error', error: 'City not found', city: null });
                    }
                } catch (err) {
                    console.error('Reverse geocoding failed:', err);
                    setLocationState({ status: 'error', error: 'Location lookup failed', city: null });
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                let errorMessage = 'Location permission denied';
                if (error.code === 2) errorMessage = 'Location unavailable';
                if (error.code === 3) errorMessage = 'Location request timed out';
                setLocationState({ status: 'error', error: errorMessage, city: null });
            }
        );
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Ambient Background - Antigravity Style */}
            <div className="fixed inset-0 -z-10 bg-background overflow-hidden pointer-events-none">
                {/* Dot Grid Pattern */}
                <div className="absolute inset-0 h-full w-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] opacity-70" />

                {/* Orbs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-24 space-y-32">

                {/* Hero Section */}
                <motion.div
                    className="text-center max-w-4xl mx-auto space-y-8"
                    initial="hidden"
                    animate="visible"
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeInUp}>
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 text-primary text-sm font-medium border border-primary/10 mb-6 backdrop-blur-sm">
                            <Trophy className="h-3.5 w-3.5" />
                            <span>Trusted by 500+ Top Schools</span>
                        </div>
                    </motion.div>

                    <motion.h1
                        className="text-5xl md:text-7xl font-bold tracking-tight leading-tight"
                        variants={fadeInUp}
                    >
                        Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Perfect School</span>
                        <br /> for Your Child
                    </motion.h1>

                    <motion.p
                        className="text-xl text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed"
                        variants={fadeInUp}
                    >
                        Browse verified schools, compare facilities, and view transparent fee structures—all in one modern platform.
                    </motion.p>

                    <motion.div variants={fadeInUp} className="pt-4">
                        <Link href="/explore/schools" className="block max-w-[500px] mx-auto w-full">
                            <div className="relative group cursor-pointer">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full opacity-20 group-hover:opacity-40 blur transition duration-500" />
                                <div className="relative flex items-center bg-background rounded-full p-2 pr-2 pl-6 shadow-xl border border-border/50">
                                    <Search className="h-5 w-5 text-muted-foreground mr-3" />
                                    <span className="flex-1 text-left text-muted-foreground text-lg">Search for schools...</span>
                                    <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 border-l border-border/50 mx-2 text-sm font-medium text-foreground">
                                        <MapPin className="h-4 w-4 text-blue-500" />
                                        <span>{locationState.city || "Nearby"}</span>
                                    </div>
                                    <div className="h-10 w-10 sm:w-auto sm:px-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium transition-transform group-hover:scale-105 active:scale-95">
                                        <span className="hidden sm:inline">Search</span>
                                        <ArrowRight className="h-4 w-4 sm:hidden" />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </motion.div>
                </motion.div>

                {/* Schools Near You Section */}
                <motion.div
                    className="space-y-8"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                >
                    {/* Featured Schools Section */}
                    {featuredSchoolsData?.schools?.length > 0 && (
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                            className="mb-20"
                        >
                            <div className="flex items-center gap-2 mb-8">
                                <div className="h-8 w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full" />
                                <h2 className="text-3xl font-bold tracking-tight">Featured Schools</h2>
                                {featuredSchoolsData.source === 'local' && locationState.city && (
                                    <span className="text-sm font-medium px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                                        in {locationState.city}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {featuredSchoolsData.schools.map((profile) => (
                                    <motion.div key={profile.id} variants={fadeInUp}>
                                        <Link href={`/explore/schools/${profile.id}`} className="group block h-full">
                                            <div className="relative h-full rounded-2xl overflow-hidden border border-border bg-white dark:bg-gray-900  hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300">
                                                {/* Badge */}
                                                <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md bg-yellow-400/90 text-black text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-sm">
                                                    Featured
                                                </div>

                                                {/* Image */}
                                                <div className="h-40 w-full bg-muted relative overflow-hidden">
                                                    {profile.coverImage ? (
                                                        <img src={profile.coverImage} alt={profile.school?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                                                            <SchoolIcon className="w-8 h-8 text-muted-foreground/30" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                                                    {/* Logo Overlay */}
                                                    <div className="absolute bottom-3 left-3 flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-lg bg-white p-0.5 shadow-lg">
                                                            <img src={profile.school?.profilePicture || '/placeholder-logo.png'} alt="Logo" className="w-full h-full object-cover rounded-md" />
                                                        </div>
                                                        <div className="text-white">
                                                            <h3 className="font-bold text-sm leading-tight text-white drop-shadow-md line-clamp-1">{profile.school?.name}</h3>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-[10px] text-white/80 flex items-center gap-1">
                                                                    <MapPin className="w-2.5 h-2.5" /> {profile.school?.location?.split(',')[0]}
                                                                </p>
                                                                {profile.overallRating > 0 && (
                                                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
                                                                        <span className="text-yellow-400 text-[8px]">★</span>
                                                                        <span className="text-[10px] font-bold text-white">{profile.overallRating.toFixed(1)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Tagline footer */}
                                                <div className="p-3 bg-card/50 backdrop-blur-sm border-t border-border/50">
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {profile.tagline || "Excellence in education"}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    <motion.div
                        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
                        variants={fadeInUp}
                    >
                        <div>
                            <h2 className="text-3xl font-bold tracking-tight text-foreground">
                                {locationState.status === 'success' ? (
                                    <>
                                        Schools in{' '}
                                        <span className="inline-flex items-center justify-center px-4 py-1 rounded-md bg-white dark:bg-gray-800 border border-border text-primary text-2xl ml-1">
                                            {locationState.city}
                                        </span>
                                    </>
                                ) : (
                                    'Schools Near You'
                                )}
                            </h2>
                            <p className="text-muted-foreground mt-2 text-lg">
                                {locationState.status === 'success'
                                    ? `Curated top picks in your area`
                                    : 'Enable location access to discover local schools'}
                            </p>
                        </div>
                    </motion.div>

                    {locationState.status === 'loading' || isSchoolsLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[...Array(3)].map((_, i) => (
                                <Card key={i} className="p-0 border-0 shadow-none bg-card overflow-hidden h-[320px] flex flex-col">
                                    <Skeleton className="h-32 w-full" />
                                    <div className="p-6 space-y-4 flex-1">
                                        <div className="-mt-12 mb-4">
                                            <Skeleton className="h-16 w-16 rounded-xl ring-4 ring-background" />
                                        </div>
                                        <Skeleton className="h-6 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : locationState.status === 'error' ? (
                        <Card className="p-12 text-center border-dashed border-2 bg-transparent">
                            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                            <h3 className="text-lg font-medium mb-2">Location Access Needed</h3>
                            <p className="text-muted-foreground mb-6">
                                We need your permission to find schools in your neighborhood with high accuracy.
                            </p>
                            <Button onClick={detectLocation} variant="outline" className="gap-2">
                                <MapPin className="h-4 w-4" />
                                Use Current Location
                            </Button>
                        </Card>
                    ) : nearbySchoolsData?.schools?.length > 0 ? (
                        <motion.div
                            className="grid grid-cols-1 md:grid-cols-3 gap-8"
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer}
                        >
                            {nearbySchoolsData.schools.map((profile, idx) => (
                                <motion.div
                                    key={profile.id}
                                    variants={scaleIn}
                                    whileHover={{ y: -8 }}
                                    className="h-full"
                                >
                                    <Link href={`/explore/schools/${profile.id}`} className="block h-full">
                                        <Card className="h-full border border-border bg-card  hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 rounded-3xl group overflow-hidden relative flex flex-col">

                                            {/* Cover Image - Condition Check */}
                                            {profile.coverImage && (
                                                <div className="h-32 w-full bg-gray-100 dark:bg-gray-800 relative overflow-hidden">
                                                    <img
                                                        src={profile.coverImage}
                                                        alt="Cover"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                </div>
                                            )}

                                            {/* Content */}
                                            <div className={`p-6 flex-1 flex flex-col ${profile.coverImage ? 'pt-0' : 'pt-6'}`}>
                                                <div className="flex justify-between items-start">
                                                    {/* Logo */}
                                                    <div className={`${profile.coverImage ? '-mt-8' : ''} relative z-10`}>
                                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-gray-900 p-1 shadow-lg ring-1 ring-border/50">
                                                            {profile.school?.profilePicture ? (
                                                                <img
                                                                    src={profile.school.profilePicture}
                                                                    alt={profile.school.name}
                                                                    className="w-full h-full object-cover rounded-xl"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                                                                    <SchoolIcon className="w-8 h-8 text-primary" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Rating Badge */}
                                                    {profile.overallRating > 0 && (
                                                        <div className={`flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg border border-primary/10 ${profile.coverImage ? 'mt-4' : ''}`}>
                                                            <span className="font-bold text-primary">{profile.overallRating.toFixed(1)}</span>
                                                            <span className="text-yellow-500 text-xs">★</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-4 space-y-2 flex-1">
                                                    <h3 className="font-bold text-xl line-clamp-1 group-hover:text-primary transition-colors">
                                                        {profile.school?.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate">{profile.school?.location}</span>
                                                    </div>

                                                    {/* Description/Tagline */}
                                                    <p className="text-sm text-muted-foreground line-clamp-2 mt-3 leading-relaxed">
                                                        {profile.tagline || profile.description || "A premier educational institution dedicated to excellence in learning and character building."}
                                                    </p>
                                                </div>

                                                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                                                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                                        View Details
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-secondary/50 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                </motion.div>
                            ))}
                        </motion.div>
                    ) : (
                        <div className="text-center py-20 bg-muted/30 rounded-3xl border border-dashed">
                            <SchoolIcon className="h-10 w-10 mx-auto mb-4 text-muted-foreground/50" />
                            <p className="text-lg text-muted-foreground">No schools found in {locationState.city}.</p>
                            <Link href="/explore/schools">
                                <Button variant="link" className="mt-2 text-primary">View All Available Schools</Button>
                            </Link>
                        </div>
                    )}
                </motion.div>

                {/* Simplified Features Section */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                >
                    <motion.div variants={fadeInUp} className="p-10 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                            <Search className="w-64 h-64" />
                        </div>
                        <div className="relative z-10 h-full flex flex-col justify-between">
                            <div>
                                <h3 className="text-3xl font-bold mb-4">Smart Filters</h3>
                                <p className="text-blue-100 text-lg max-w-sm">
                                    Find exactly what you need. Filter by board, fees, facilities, and more.
                                </p>
                            </div>
                            <Link href="/explore/schools">
                                <Button className="w-fit mt-8 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md rounded-full px-6">
                                    Try Filters <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="p-10 rounded-[2.5rem] bg-muted/50 border border-border/50 relative overflow-hidden group hover:bg-muted/80 transition-colors">
                        <div className="h-full flex flex-col justify-center text-center items-center space-y-6">
                            <div className="w-16 h-16 rounded-full bg-background shadow-lg flex items-center justify-center">
                                <Award className="w-8 h-8 text-foreground" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold mb-2">Verified Excellence</h3>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    We verify every single data point so you can trust what you see.
                                </p>
                            </div>
                            <Link href="/explore/about">
                                <Button variant="outline" className="rounded-full px-6">Learn More</Button>
                            </Link>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Footer simple mark */}
                <div className="text-center text-sm text-muted-foreground pb-8">
                    © 2024 EduBreezy Explorer. <Link href="/explore/about" className="underline underline-offset-4 hover:text-foreground">About Us</Link>
                </div>
            </div>
        </div>
    );
}
