'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SchoolCard from '@/components/explore/SchoolCard';
import SchoolFilters from '@/components/explore/SchoolFilters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronLeft, ChevronRight, MapPin, GraduationCap } from 'lucide-react';

export default function SchoolsPage() {
    const [filters, setFilters] = useState({
        search: '',
        location: '',
        minFee: undefined,
        maxFee: undefined,
        minRating: undefined,
        sort: 'name',
        page: 1,
        limit: 12,
    });

    // Fetch schools using TanStack Query with client-side caching
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['schools', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.append(key, value.toString());
                }
            });

            const response = await fetch(`/api/public/schools?${params}`);
            if (!response.ok) throw new Error('Failed to fetch schools');
            return response.json();
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    });

    const { data: featuredSchoolsData } = useQuery({
        queryKey: ['featured-schools-listing', filters.location],
        queryFn: async () => {
            if (filters.location) {
                const res = await fetch(`/api/public/schools?featured=true&location=${encodeURIComponent(filters.location)}&limit=4`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.schools.length > 0) return { ...data, source: 'local' };
                }
            }
            const res = await fetch(`/api/public/schools?featured=true&limit=4`);
            if (!res.ok) throw new Error('Failed to fetch featured schools');
            return { ...(await res.json()), source: 'global' };
        },
        staleTime: 5 * 60 * 1000,
    });

    const handleFilterChange = (newFilters) => {
        setFilters((prev) => ({
            ...prev,
            ...newFilters,
            page: 1, // Reset to first page on filter change
        }));
    };

    const handlePageChange = (newPage) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="flex flex-col gap-6 py-6 px-4 md:px-6">
            <div className="max-w-7xl mx-auto w-full">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">School Directory</h1>
                    <p className="text-muted-foreground">
                        Discover and compare {data?.pagination?.total || ''} schools
                    </p>
                </div>

                {/* Featured Schools Section (New) */}
                {featuredSchoolsData?.schools?.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-6 w-1 bg-yellow-500 rounded-full" />
                            <h2 className="text-2xl font-bold tracking-tight">Featured Schools</h2>
                            {featuredSchoolsData.source === 'local' && filters.location && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                                    in {filters.location}
                                </span>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {featuredSchoolsData.schools.map((profile) => (
                                <Link key={profile.schoolId} href={`/explore/schools/${profile.schoolId}`} className="group block h-full">
                                    <div className="relative h-full rounded-xl overflow-hidden border border-border/50 bg-card hover:shadow-lg transition-all duration-300">
                                        <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                            Featured
                                        </div>
                                        <div className="h-32 w-full bg-muted relative overflow-hidden">
                                            {profile.coverImage ? (
                                                <img src={profile.coverImage} alt={profile.school?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                                    <GraduationCap className="w-8 h-8 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                            <div className="absolute bottom-3 left-3 flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-md bg-white p-0.5 shadow-sm">
                                                    <img src={profile.school?.profilePicture || '/placeholder-logo.png'} alt="Logo" className="w-full h-full object-cover rounded-sm" />
                                                </div>
                                                <div className="text-white">
                                                    <h3 className="font-bold text-xs leading-tight drop-shadow-md line-clamp-1">{profile.school?.name}</h3>
                                                    <p className="text-[10px] text-white/90 flex items-center gap-1">
                                                        <MapPin className="w-2 h-2" /> {profile.school?.location?.split(',')[0]}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-xs text-muted-foreground line-clamp-1">
                                                {profile.tagline || "Excellence in education"}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters Sidebar */}
                    <div className="lg:col-span-1">
                        <Card className="p-4 sticky top-20">
                            <h2 className="font-semibold mb-4 hidden lg:block">Filters</h2>
                            <SchoolFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        </Card>
                    </div>

                    {/* Schools Grid */}
                    <div className="lg:col-span-3">
                        {/* Loading State */}
                        {isLoading && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {[...Array(6)].map((_, i) => (
                                    <Card key={i} className="p-6 space-y-4">
                                        <div className="flex gap-4">
                                            <Skeleton className="w-16 h-16 rounded-lg" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-5 w-3/4" />
                                                <Skeleton className="h-4 w-1/2" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-4 w-full" />
                                        <Skeleton className="h-20 w-full" />
                                        <div className="flex gap-2">
                                            <Skeleton className="h-10 flex-1" />
                                            <Skeleton className="h-10 flex-1" />
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {isError && (
                            <Card className="p-12 text-center">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                                <h3 className="text-lg font-semibold mb-2">Failed to Load Schools</h3>
                                <p className="text-muted-foreground mb-4">{error?.message || 'An error occurred'}</p>
                                <Button onClick={() => window.location.reload()}>Try Again</Button>
                            </Card>
                        )}

                        {/* Schools Grid - Changed to 2 columns for bigger cards */}
                        {!isLoading && !isError && data?.schools && (
                            <>
                                {data.schools.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {data.schools.map((school) => (
                                            <SchoolCard key={school.id} school={school} />
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="p-12 text-center">
                                        <h3 className="text-lg font-semibold mb-2">No Schools Found</h3>
                                        <p className="text-muted-foreground">
                                            Try adjusting your filters to see more results
                                        </p>
                                    </Card>
                                )}

                                {/* Pagination */}
                                {data?.pagination && data.pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-8">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={filters.page === 1}
                                            onClick={() => handlePageChange(filters.page - 1)}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    const distance = Math.abs(page - filters.page);
                                                    return distance === 0 || distance === 1 || page === 1 || page === data.pagination.totalPages;
                                                })
                                                .map((page, idx, arr) => (
                                                    <div key={page} className="flex items-center">
                                                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                            <span className="px-2 text-muted-foreground">...</span>
                                                        )}
                                                        <Button
                                                            variant={filters.page === page ? 'default' : 'outline'}
                                                            size="icon"
                                                            onClick={() => handlePageChange(page)}
                                                        >
                                                            {page}
                                                        </Button>
                                                    </div>
                                                ))}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            disabled={filters.page === data.pagination.totalPages}
                                            onClick={() => handlePageChange(filters.page + 1)}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
