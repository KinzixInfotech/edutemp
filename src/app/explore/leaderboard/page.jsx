'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Medal, Award, TrendingUp, Flame, AlertCircle, Star, Users, GraduationCap } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
    { value: 'overall', label: 'Overall Excellence', icon: Trophy },
    { value: 'academic', label: 'Academic Performance', icon: GraduationCap },
    { value: 'sports', label: 'Sports Champions', icon: Medal },
    { value: 'infrastructure', label: 'Infrastructure', icon: Award },
];

const getRankIcon = (rank) => {
    switch (rank) {
        case 1:
            return <Trophy className="h-6 w-6 text-yellow-600" />;
        case 2:
            return <Medal className="h-6 w-6 text-gray-400" />;
        case 3:
            return <Medal className="h-6 w-6 text-amber-700" />;
        default:
            return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>;
    }
};

export default function LeaderboardPage() {
    const [category, setCategory] = useState('overall');

    const { data, isLoading, isError } = useQuery({
        queryKey: ['leaderboard', category],
        queryFn: async () => {
            const response = await fetch(`/api/public/schools/leaderboard?category=${category}&limit=10`);
            if (!response.ok) throw new Error('Failed to fetch leaderboard');
            return response.json();
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    return (
        <div className="flex flex-col gap-6 py-6 px-4 md:px-6">
            <div className="max-w-5xl mx-auto w-full">
                {/* Header */}
                <div className="mb-6 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Flame className="h-8 w-8 text-orange-500" />
                        <h1 className="text-3xl font-bold tracking-tight">School Rankings & Leaderboard</h1>
                    </div>
                    <p className="text-muted-foreground">
                        Discover top-performing schools across various categories
                    </p>
                </div>

                {/* Category Tabs */}
                <Tabs value={category} onValueChange={setCategory} className="mb-6">
                    <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                        {CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <TabsTrigger key={cat.value} value={cat.value} className="gap-2">
                                    <Icon className="h-4 w-4" />
                                    <span className="hidden sm:inline">{cat.label}</span>
                                    <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                                </TabsTrigger>
                            );
                        })}
                    </TabsList>
                </Tabs>

                {/* Loading State */}
                {isLoading && (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Card key={i} className="p-6">
                                <div className="flex items-center gap-4">
                                    <Skeleton className="w-12 h-12 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                    <Skeleton className="h-8 w-16" />
                                </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {isError && (
                    <Card className="p-12 text-center">
                        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Failed to Load Rankings</h3>
                        <Button onClick={() => window.location.reload()}>Try Again</Button>
                    </Card>
                )}

                {/* Leaderboard */}
                {!isLoading && !isError && data?.schools && (
                    <div className="space-y-3">
                        {data.schools.length === 0 ? (
                            <Card className="p-12 text-center">
                                <p className="text-xl text-muted-foreground mb-2">No rankings available yet</p>
                                <p className="text-sm text-muted-foreground">
                                    Schools will appear here once they have ratings
                                </p>
                            </Card>
                        ) : (
                            data.schools.map((school) => (
                                <Card
                                    key={school.id}
                                    className={`p-6 hover:shadow-lg transition-all ${school.rank <= 3 ? 'border-primary/50' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Rank */}
                                        <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                                            {getRankIcon(school.rank)}
                                        </div>

                                        {/* School Logo */}
                                        {school.school?.profilePicture && (
                                            <img
                                                src={school.school.profilePicture}
                                                alt={school.school.name}
                                                className="w-12 h-12 rounded-lg object-cover border"
                                            />
                                        )}

                                        {/* School Info */}
                                        <div className="flex-1 min-w-0">
                                            <Link href={`/explore/schools/${school.id}`}>
                                                <h3 className="font-semibold text-lg hover:text-primary transition-colors line-clamp-1">
                                                    {school.school?.name}
                                                </h3>
                                            </Link>
                                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {school.totalStudents} students
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Star className="h-3 w-3" />
                                                    {school._count?.achievements || 0} achievements
                                                </span>
                                            </div>
                                        </div>

                                        {/* Score */}
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-primary">
                                                {school.score.toFixed(1)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">Score</div>
                                        </div>

                                        {/* Badges */}
                                        {school.badges && school.badges.length > 0 && (
                                            <div className="hidden md:flex flex-col gap-1">
                                                {school.badges.slice(0, 2).map((badge, idx) => (
                                                    <Badge key={idx} variant="secondary" className="text-xs">
                                                        {badge.badgeType}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Top 3 Highlight Bar */}
                                    {school.rank <= 3 && (
                                        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">
                                                🎉 Top {school.rank} in {data.category}
                                            </span>
                                            <Link href={`/explore/schools/${school.id}`}>
                                                <Button size="sm" variant="outline">
                                                    View Profile
                                                </Button>
                                            </Link>
                                        </div>
                                    )}
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {/* View All Schools CTA */}
                <div className="mt-8 text-center">
                    <Link href="/explore/schools">
                        <Button variant="outline" size="lg">
                            View All Schools
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
