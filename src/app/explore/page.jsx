'use client';

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

export default function SchoolExplorerHome() {
    // Fetch top schools for the hero section
    const { data: topSchools, isLoading, isError } = useQuery({
        queryKey: ['top-schools'],
        queryFn: async () => {
            try {
                const response = await fetch('/api/public/schools/leaderboard?category=overall&limit=3');
                if (!response.ok) {
                    console.error('Leaderboard fetch failed:', response.status);
                    throw new Error('Failed to fetch');
                }
                const data = await response.json();
                console.log('Leaderboard data:', data);
                return data;
            } catch (error) {
                console.error('Leaderboard query error:', error);
                throw error;
            }
        },
        staleTime: 5 * 60 * 1000,
        retry: 2,
    });

    return (
        <div className="relative flex flex-col gap-16 py-8 px-4 md:px-6">
            {/* Optimized Background */}
            <div className="fixed inset-0 -z-10">
                {/* Simplified Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950/10" />

                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
            </div>

            {/* Hero Section */}
            <motion.div
                className="max-w-6xl mx-auto w-full text-center"
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
            >
                <motion.div variants={fadeInUp}>
                    <Badge variant="secondary" className="mb-4 bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700">
                        <Trophy className="h-3 w-3 mr-1" />
                        Trusted by 500+ Schools
                    </Badge>
                </motion.div>

                <motion.h1
                    className="text-4xl md:text-6xl font-bold tracking-tight mb-4"
                    variants={fadeInUp}
                    style={{
                        background: 'linear-gradient(to right, #0f172a, #0766fe, #1e293b)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}
                >
                    Find the Perfect School
                    <br />
                    <span style={{
                        background: '#0766fe',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                    }}>for Your Child</span>
                </motion.h1>

                <motion.p
                    className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
                    variants={fadeInUp}
                >
                    Browse verified schools, compare facilities, read parent reviews, and make an informed decision for your child's future.
                </motion.p>

                {/* Search Bar - Optimized */}
                <motion.div
                    className="max-w-2xl mx-auto mb-12"
                    variants={fadeInUp}
                >
                    <Link href="/explore/schools">
                        <motion.div
                            className="flex gap-2 p-3 bg-white/90 dark:bg-gray-900/90 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg cursor-pointer group"
                            whileHover={{ scale: 1.01, boxShadow: "0 20px 25px -5px rgba(7, 102, 254, 0.15)" }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        >
                            <div className="flex-1 flex items-center gap-3 px-3">
                                <Search className="h-5 w-5 text-muted-foreground group-hover:text-[#0766fe] transition-colors" />
                                <span className="text-left text-muted-foreground group-hover:text-foreground transition-colors">
                                    Search schools by name, location, or board...
                                </span>
                            </div>
                            <Button size="lg" className="gap-2" style={{ backgroundColor: '#0766fe' }}>
                                Search
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </motion.div>
                    </Link>
                </motion.div>

                {/* Quick Stats - Optimized */}
                <motion.div
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
                    variants={staggerContainer}
                >
                    {[
                        { value: '500+', label: 'Verified Schools' },
                        { value: '10K+', label: 'Parent Reviews' },
                        { value: '95%', label: 'Satisfaction' },
                        { value: '24/7', label: 'Support' }
                    ].map((stat, idx) => (
                        <motion.div key={idx} variants={scaleIn}>
                            <Card className="p-4 text-center hover:shadow-lg transition-shadow bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700">
                                <div className="text-3xl font-bold mb-1" style={{ color: '#0766fe' }}>{stat.value}</div>
                                <div className="text-sm text-muted-foreground">{stat.label}</div>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* Top Ranked Schools */}
            <motion.div
                className="max-w-6xl mx-auto w-full"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
            >
                <motion.div
                    className="flex items-center justify-between mb-6"
                    variants={fadeInUp}
                >
                    <div>
                        <h2 className="text-3xl font-bold mb-2">🏆 Top Ranked Schools</h2>
                        <p className="text-muted-foreground">Leading institutions in overall excellence</p>
                    </div>
                    <Link href="/explore/leaderboard">
                        <Button variant="outline" className="bg-white/50 dark:bg-gray-800/50">
                            View All Rankings
                            <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                    </Link>
                </motion.div>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[...Array(3)].map((_, i) => (
                            <Card key={i} className="p-6 space-y-4 bg-white/80 dark:bg-gray-900/80">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <Skeleton className="h-6 w-3/4" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </Card>
                        ))}
                    </div>
                ) : isError ? (
                    <Card className="p-12 text-center bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900">
                        <p className="text-red-600 dark:text-red-400 font-semibold mb-2">Unable to load rankings</p>
                        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                            Retry
                        </Button>
                    </Card>
                ) : topSchools?.schools && topSchools.schools.length > 0 ? (
                    <motion.div
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                        initial="hidden"
                        animate="visible"
                        variants={staggerContainer}
                    >
                        {topSchools.schools.map((school, idx) => (
                            <motion.div
                                key={school.id}
                                variants={scaleIn}
                                whileHover={{ y: -8, transition: { type: "spring", stiffness: 300 } }}
                            >
                                <Card className="p-6 transition-all relative overflow-hidden group cursor-pointer h-full bg-white/90 dark:bg-gray-900/90 hover:shadow-xl">
                                    {/* Rank Badge */}
                                    <motion.div
                                        className="absolute top-4 right-4"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ delay: idx * 0.1 + 0.3, type: "spring" }}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                            }`}>
                                            #{idx + 1}
                                        </div>
                                    </motion.div>

                                    <div className="space-y-4">
                                        {school.school?.profilePicture && (
                                            <motion.img
                                                src={school.school.profilePicture}
                                                alt={school.school.name}
                                                className="w-16 h-16 rounded-lg object-cover border"
                                                whileHover={{ scale: 1.1 }}
                                                transition={{ type: "spring" }}
                                            />
                                        )}

                                        <div>
                                            <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-[#0766fe] transition-colors">
                                                {school.school?.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                                <MapPin className="h-3 w-3" />
                                                {school.school?.location}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t">
                                            <div className="text-sm">
                                                <div className="text-2xl font-bold" style={{ color: '#0766fe' }}>{school.score.toFixed(1)}</div>
                                                <div className="text-xs text-muted-foreground">Overall Score</div>
                                            </div>
                                            <Link href={`/explore/schools/${school.id}`}>
                                                <Button size="sm" style={{ backgroundColor: '#0766fe' }}>
                                                    View Profile
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <Card className="p-12 text-center bg-white/80 dark:bg-gray-900/80">
                        <p className="text-muted-foreground">No schools have been ranked yet.</p>
                        <p className="text-xs text-muted-foreground mt-2">(API returned 0 schools)</p>
                    </Card>
                )}
            </motion.div>

            {/* Features Section */}
            <motion.div
                className="max-w-6xl mx-auto w-full"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
            >
                <motion.h2
                    className="text-3xl font-bold text-center mb-8"
                    variants={fadeInUp}
                >
                    Why Choose EduBreezy Explorer?
                </motion.h2>
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    variants={staggerContainer}
                >
                    {[
                        {
                            icon: Search,
                            title: 'Smart Search & Filters',
                            desc: 'Find schools based on location, fees, facilities, board, ratings, and more with our advanced filters.',
                        },
                        {
                            icon: TrendingUp,
                            title: 'Real Rankings & Reviews',
                            desc: 'View verified rankings based on academic performance, sports, infrastructure, and parent reviews.',
                        },
                        {
                            icon: Award,
                            title: 'Detailed Profiles',
                            desc: 'Access comprehensive information including achievements, facilities, fee structures, and admission process.',
                        }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            variants={scaleIn}
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                        >
                            <Card className="p-6 hover:shadow-xl transition-shadow h-full bg-white/90 dark:bg-gray-900/90 group">
                                <div className="h-12 w-12 rounded-lg flex items-center justify-center mb-4 shadow-md group-hover:shadow-lg transition-shadow" style={{ backgroundColor: '#0766fe' }}>
                                    <feature.icon className="h-6 w-6 text-white" />
                                </div>
                                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground">{feature.desc}</p>
                            </Card>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>

            {/* CTA Section with Gradient */}
            <motion.div
                className="max-w-4xl mx-auto w-full"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeInUp}
            >
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                    <Card className="p-12 text-white border-0 shadow-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0766fe 0%, #0550d4 100%)' }}>
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#fff1_1px,transparent_1px),linear-gradient(to_bottom,#fff1_1px,transparent_1px)] bg-[size:2rem_2rem]" />

                        <div className="text-center space-y-4 relative z-10">
                            <h2 className="text-3xl font-bold">Ready to Find Your Perfect School?</h2>
                            <p className="text-lg text-blue-50">
                                Browse hundreds of verified schools, compare features side-by-side, and make an informed decision for your child's education.
                            </p>
                            <div className="flex gap-3 justify-center flex-wrap">
                                <Link href="/explore/schools">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button size="lg" variant="secondary" className="gap-2 shadow-lg">
                                            <SchoolIcon className="h-5 w-5" />
                                            Browse Schools
                                        </Button>
                                    </motion.div>
                                </Link>
                                <Link href="/explore/leaderboard">
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button size="lg" variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30 gap-2 shadow-lg">
                                            <Trophy className="h-5 w-5" />
                                            View Rankings
                                        </Button>
                                    </motion.div>
                                </Link>
                            </div>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}
