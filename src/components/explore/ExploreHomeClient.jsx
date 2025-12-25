'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
    Search, MapPin, School as SchoolIcon, GraduationCap, Award, ArrowRight, Trophy,
    Pencil, BookMarked, Ruler, BookOpen, Users, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DotPattern } from '@/components/ui/dot-pattern';

// Animation variants
const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
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
        status: 'idle',
        city: null,
        error: null
    });

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

    const { data: featuredSchoolsData } = useQuery({
        queryKey: ['featured-schools', locationState.city],
        queryFn: async () => {
            if (locationState.city) {
                const res = await fetch(`/api/public/schools?featured=true&location=${encodeURIComponent(locationState.city)}&limit=4`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.schools.length > 0) return { ...data, source: 'local' };
                }
            }
            const res = await fetch(`/api/public/schools?featured=true&limit=4`);
            if (!res.ok) throw new Error('Failed to fetch featured schools');
            return { ...(await res.json()), source: 'global' };
        },
    });

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
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    const city = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state_district;
                    if (city) {
                        setLocationState({ status: 'success', city, error: null });
                    } else {
                        setLocationState({ status: 'error', error: 'City not found', city: null });
                    }
                } catch (err) {
                    setLocationState({ status: 'error', error: 'Location lookup failed', city: null });
                }
            },
            (error) => {
                let errorMessage = 'Location permission denied';
                if (error.code === 2) errorMessage = 'Location unavailable';
                if (error.code === 3) errorMessage = 'Location request timed out';
                setLocationState({ status: 'error', error: errorMessage, city: null });
            }
        );
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* ===== HERO SECTION - Gradient Background ===== */}
            <section className="relative bg-[linear-gradient(120deg,#f8fafc_0%,#fff9f0_50%,#f0f7ff_100%)] pt-8 pb-16 md:pt-12 md:pb-24">
                {/* Mesh Gradient Glows */}
                <div className="absolute top-[10%] -left-[10%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(5,105,255,0.2)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute top-[20%] -right-[10%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(255,150,50,0.15)_0%,transparent_70%)] blur-[100px] rounded-full pointer-events-none" />

                {/* Dot Pattern */}
                <DotPattern width={24} height={24} cr={1} className="absolute inset-0 w-full h-full opacity-15" />

                {/* Floating Icons - Hidden on mobile for cleaner look */}
                <div className="hidden md:block absolute top-[8%] left-[10%] opacity-[0.08] pointer-events-none animate-[float_6s_ease-in-out_infinite]">
                    <GraduationCap size={70} className="text-black rotate-[-15deg]" />
                </div>
                <div className="hidden md:block absolute top-[18%] left-[18%] opacity-[0.06] pointer-events-none animate-[float_8s_ease-in-out_infinite_1s]">
                    <Pencil size={50} className="text-black rotate-[25deg]" />
                </div>
                <div className="hidden md:block absolute top-[6%] right-[10%] opacity-[0.07] pointer-events-none animate-[float_7s_ease-in-out_infinite_2s]">
                    <SchoolIcon size={75} className="text-black rotate-[10deg]" />
                </div>
                <div className="hidden md:block absolute top-[20%] right-[8%] opacity-[0.06] pointer-events-none animate-[float_8s_ease-in-out_infinite_0.5s]">
                    <BookOpen size={55} className="text-black rotate-[-15deg]" />
                </div>

                <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                    <motion.div
                        className="text-center max-w-4xl mx-auto space-y-6"
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeInUp}>
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0569ff]/10 text-[#0569ff] text-sm font-medium border border-[#0569ff]/20 mb-4">
                                <Trophy className="h-3.5 w-3.5" />
                                <span>Trusted by 500+ Top Schools</span>
                            </div>
                        </motion.div>

                        <motion.h1
                            className="text-3xl md:text-5xl lg:text-6xl font-bold text-[#1a1a2e] leading-[1.15] px-4"
                            variants={fadeInUp}
                        >
                            Find the{' '}
                            <span className="relative inline-block">
                                <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-[#0569ff] to-[#0450d4]">Perfect School</span>
                                <span className="absolute bottom-1 left-0 w-full h-2 md:h-3 bg-[#FF9800]/30 -rotate-1 rounded"></span>
                            </span>
                            <br className="hidden sm:block" />
                            <span className="sm:hidden"> </span>for Your Child
                        </motion.h1>

                        <motion.p
                            className="text-base md:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed px-4"
                            variants={fadeInUp}
                        >
                            Browse verified schools, compare facilities, and view transparent fee structures—all in one modern platform.
                        </motion.p>

                        <motion.div variants={fadeInUp} className="pt-4 px-4">
                            <Link href="/explore/schools" className="block max-w-[500px] mx-auto w-full">
                                <div className="relative group cursor-pointer">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-[#0569ff] to-[#0450d4] rounded-full opacity-20 group-hover:opacity-40 blur transition duration-500" />
                                    <div className="relative flex items-center bg-white rounded-full p-2 pr-2 pl-4 md:pl-6 shadow-xl border border-gray-200/50">
                                        <Search className="h-5 w-5 text-gray-400 mr-2 md:mr-3" />
                                        <span className="flex-1 text-left text-gray-500 text-sm md:text-lg truncate">Search for schools...</span>
                                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 border-l border-gray-200 mx-2 text-sm font-medium text-[#1a1a2e]">
                                            <MapPin className="h-4 w-4 text-[#0569ff]" />
                                            <span className="truncate max-w-[100px]">{locationState.city || "Nearby"}</span>
                                        </div>
                                        <div className="h-9 w-9 md:h-10 md:w-auto md:px-5 rounded-full bg-[#0569ff] text-white flex items-center justify-center font-medium transition-transform group-hover:scale-105 active:scale-95 shadow-lg">
                                            <span className="hidden md:inline text-sm">Search</span>
                                            <ArrowRight className="h-4 w-4 md:hidden" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        </motion.div>

                        {/* Stats Row */}
                        <motion.div variants={fadeInUp} className="flex flex-wrap justify-center gap-4 md:gap-8 pt-6">
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#0569ff]/10 flex items-center justify-center">
                                    <SchoolIcon className="w-4 h-4 md:w-5 md:h-5 text-[#0569ff]" />
                                </div>
                                <div className="text-left">
                                    <div className="text-lg md:text-xl font-bold text-[#1a1a2e]">500+</div>
                                    <div className="text-[10px] md:text-xs text-gray-500">Schools Listed</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-[#FF9800]/10 flex items-center justify-center">
                                    <Users className="w-4 h-4 md:w-5 md:h-5 text-[#FF9800]" />
                                </div>
                                <div className="text-left">
                                    <div className="text-lg md:text-xl font-bold text-[#1a1a2e]">10K+</div>
                                    <div className="text-[10px] md:text-xs text-gray-500">Parents Trust Us</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Star className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                                </div>
                                <div className="text-left">
                                    <div className="text-lg md:text-xl font-bold text-[#1a1a2e]">4.8★</div>
                                    <div className="text-[10px] md:text-xs text-gray-500">Avg Rating</div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ===== FEATURED SCHOOLS SECTION - White Background ===== */}
            {featuredSchoolsData?.schools?.length > 0 && (
                <section className="bg-white py-12 md:py-16">
                    <div className="max-w-7xl mx-auto px-4 md:px-6">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={staggerContainer}
                        >
                            <div className="flex items-center gap-2 mb-6 md:mb-8">
                                <div className="h-6 md:h-8 w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full" />
                                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-[#1a1a2e]">Featured Schools</h2>
                                {featuredSchoolsData.source === 'local' && locationState.city && (
                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                                        in {locationState.city}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {featuredSchoolsData.schools.map((profile) => (
                                    <motion.div key={profile.id} variants={fadeInUp}>
                                        <Link href={`/explore/schools/${profile.slug || profile.schoolId}`} className="group block h-full">
                                            <div className="relative h-full rounded-2xl overflow-hidden border border-gray-200 bg-white hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-300">
                                                <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                    Featured
                                                </div>
                                                <div className="h-32 md:h-40 w-full bg-gray-100 relative overflow-hidden">
                                                    {profile.coverImage ? (
                                                        <img src={profile.coverImage} alt={profile.school?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                            <SchoolIcon className="w-8 h-8 text-gray-300" />
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                                    <div className="absolute bottom-3 left-3 flex items-center gap-2 md:gap-3">
                                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white p-0.5 shadow-lg">
                                                            <img src={profile.school?.profilePicture || '/placeholder-logo.png'} alt="Logo" className="w-full h-full object-cover rounded-md" />
                                                        </div>
                                                        <div className="text-white">
                                                            <h3 className="font-bold text-xs md:text-sm leading-tight drop-shadow-md line-clamp-1">{profile.school?.name}</h3>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <p className="text-[10px] text-white/80 flex items-center gap-1">
                                                                    <MapPin className="w-2.5 h-2.5" /> {profile.school?.location?.split(',')[0]}
                                                                </p>
                                                                {profile.overallRating > 0 && (
                                                                    <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-md">
                                                                        <span className="text-yellow-400 text-[8px]">★</span>
                                                                        <span className="text-[10px] font-bold text-white">{profile.overallRating.toFixed(1)}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-white">
                                                    <p className="text-xs text-gray-500 line-clamp-1">
                                                        {profile.tagline || "Excellence in education"}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </section>
            )}

            {/* ===== SCHOOLS NEAR YOU SECTION - Light Gray Background ===== */}
            <section className="bg-gray-50 py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <motion.div
                        className="space-y-6 md:space-y-8"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggerContainer}
                    >
                        <motion.div className="flex flex-col md:flex-row md:items-end justify-between gap-4" variants={fadeInUp}>
                            <div>
                                <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight text-[#1a1a2e]">
                                    {locationState.status === 'success' ? (
                                        <>
                                            Schools in{' '}
                                            <span className="inline-flex items-center justify-center px-3 py-1 rounded-md bg-white border border-gray-200 text-[#0569ff] text-lg md:text-xl ml-1 shadow-sm">
                                                {locationState.city}
                                            </span>
                                        </>
                                    ) : 'Schools Near You'}
                                </h2>
                                <p className="text-gray-500 mt-2 text-sm md:text-lg">
                                    {locationState.status === 'success' ? 'Curated top picks in your area' : 'Enable location access to discover local schools'}
                                </p>
                            </div>
                        </motion.div>

                        {locationState.status === 'loading' || isSchoolsLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
                                {[...Array(3)].map((_, i) => (
                                    <Card key={i} className="p-0 border-0 shadow-none bg-white overflow-hidden h-[280px] md:h-[320px] flex flex-col rounded-2xl">
                                        <Skeleton className="h-28 md:h-32 w-full" />
                                        <div className="p-4 md:p-6 space-y-3 md:space-y-4 flex-1">
                                            <Skeleton className="h-12 md:h-16 w-12 md:w-16 rounded-xl" />
                                            <Skeleton className="h-5 md:h-6 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : locationState.status === 'error' ? (
                            <Card className="p-8 md:p-12 text-center border-dashed border-2 bg-white rounded-2xl">
                                <MapPin className="h-10 md:h-12 w-10 md:w-12 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-base md:text-lg font-medium mb-2 text-[#1a1a2e]">Location Access Needed</h3>
                                <p className="text-gray-500 mb-6 text-sm md:text-base">
                                    We need your permission to find schools in your neighborhood.
                                </p>
                                <Button onClick={detectLocation} className="gap-2 bg-[#0569ff] hover:bg-[#0450d4]">
                                    <MapPin className="h-4 w-4" />
                                    Use Current Location
                                </Button>
                            </Card>
                        ) : nearbySchoolsData?.schools?.length > 0 ? (
                            <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8" initial="hidden" animate="visible" variants={staggerContainer}>
                                {nearbySchoolsData.schools.map((profile) => (
                                    <motion.div key={profile.id} variants={scaleIn} whileHover={{ y: -8 }} className="h-full">
                                        <Link href={`/explore/schools/${profile.slug || profile.schoolId}`} className="block h-full">
                                            <Card className="h-full border border-gray-200 bg-white hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 rounded-2xl md:rounded-3xl group overflow-hidden relative flex flex-col">
                                                {profile.coverImage && (
                                                    <div className="h-28 md:h-32 w-full bg-gray-100 relative overflow-hidden">
                                                        <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                    </div>
                                                )}
                                                <div className={`p-4 md:p-6 flex-1 flex flex-col ${profile.coverImage ? 'pt-0' : 'pt-4 md:pt-6'}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div className={`${profile.coverImage ? '-mt-6 md:-mt-8' : ''} relative z-10`}>
                                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white p-1 shadow-lg ring-1 ring-gray-100">
                                                                {profile.school?.profilePicture ? (
                                                                    <img src={profile.school.profilePicture} alt={profile.school.name} className="w-full h-full object-cover rounded-lg md:rounded-xl" />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gray-50 rounded-lg md:rounded-xl flex items-center justify-center">
                                                                        <SchoolIcon className="w-6 h-6 md:w-8 md:h-8 text-[#0569ff]" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {profile.overallRating > 0 && (
                                                            <div className={`flex items-center gap-1 bg-[#0569ff]/5 px-2 py-1 rounded-lg border border-[#0569ff]/10 ${profile.coverImage ? 'mt-2 md:mt-4' : ''}`}>
                                                                <span className="font-bold text-[#0569ff] text-sm">{profile.overallRating.toFixed(1)}</span>
                                                                <span className="text-yellow-500 text-xs">★</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-3 md:mt-4 space-y-1 md:space-y-2 flex-1">
                                                        <h3 className="font-bold text-base md:text-xl text-[#1a1a2e] line-clamp-1 group-hover:text-[#0569ff] transition-colors">
                                                            {profile.school?.name}
                                                        </h3>
                                                        <div className="flex items-center gap-1.5 text-xs md:text-sm text-gray-500">
                                                            <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                                                            <span className="truncate">{profile.school?.location}</span>
                                                        </div>
                                                        <p className="text-xs md:text-sm text-gray-500 line-clamp-2 mt-2 md:mt-3 leading-relaxed">
                                                            {profile.tagline || profile.description || "A premier educational institution."}
                                                        </p>
                                                    </div>
                                                    <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-100 flex items-center justify-between">
                                                        <div className="text-[10px] md:text-xs text-gray-400 font-medium uppercase tracking-wider">View Details</div>
                                                        <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-[#0569ff] group-hover:text-white transition-all duration-300">
                                                            <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Card>
                                        </Link>
                                    </motion.div>
                                ))}
                            </motion.div>
                        ) : (
                            <div className="text-center py-12 md:py-20 bg-white rounded-2xl md:rounded-3xl border border-dashed border-gray-200">
                                <SchoolIcon className="h-8 w-8 md:h-10 md:w-10 mx-auto mb-4 text-gray-300" />
                                <p className="text-base md:text-lg text-gray-500">No schools found in {locationState.city}.</p>
                                <Link href="/explore/schools">
                                    <Button variant="link" className="mt-2 text-[#0569ff]">View All Available Schools</Button>
                                </Link>
                            </div>
                        )}
                    </motion.div>
                </div>
            </section>

            {/* ===== FEATURES SECTION - White Background ===== */}
            <section className="bg-white py-12 md:py-16">
                <div className="max-w-7xl mx-auto px-4 md:px-6">
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={staggerContainer}
                    >
                        <motion.div variants={fadeInUp} className="p-6 md:p-10 rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-[#0569ff] to-[#0450d4] text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 md:p-12 opacity-10 group-hover:scale-110 transition-transform duration-700">
                                <Search className="w-32 md:w-64 h-32 md:h-64" />
                            </div>
                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xl md:text-3xl font-bold mb-3 md:mb-4">Smart Filters</h3>
                                    <p className="text-blue-100 text-sm md:text-lg max-w-sm">
                                        Find exactly what you need. Filter by board, fees, facilities, and more.
                                    </p>
                                </div>
                                <Link href="/explore/schools">
                                    <Button className="w-fit mt-6 md:mt-8 bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md rounded-full px-5 md:px-6 text-sm">
                                        Try Filters <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>

                        <motion.div variants={fadeInUp} className="p-6 md:p-10 rounded-2xl md:rounded-[2rem] bg-gray-50 border border-gray-200 relative overflow-hidden group hover:shadow-lg transition-all">
                            <div className="h-full flex flex-col justify-center text-center items-center space-y-4 md:space-y-6">
                                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-[#0569ff]/10 shadow-lg flex items-center justify-center">
                                    <Award className="w-6 h-6 md:w-8 md:h-8 text-[#0569ff]" />
                                </div>
                                <div>
                                    <h3 className="text-lg md:text-2xl font-bold mb-2 text-[#1a1a2e]">Verified Excellence</h3>
                                    <p className="text-gray-500 max-w-md mx-auto text-sm md:text-base">
                                        We verify every single data point so you can trust what you see.
                                    </p>
                                </div>
                                <Link href="/explore/about">
                                    <Button variant="outline" className="rounded-full px-5 md:px-6 border-[#0569ff] text-[#0569ff] hover:bg-[#0569ff] hover:text-white text-sm">Learn More</Button>
                                </Link>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <section className="bg-gray-50 py-8">
                <div className="text-center text-sm text-gray-500">
                    © 2024 EduBreezy Explorer. <Link href="/explore/about" className="underline underline-offset-4 hover:text-[#0569ff]">About Us</Link>
                </div>
            </section>
        </div>
    );
}
