'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SchoolCard from '@/components/explore/SchoolCard';
import SchoolFilters from '@/components/explore/SchoolFilters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronLeft, ChevronRight, MapPin, GraduationCap, School } from 'lucide-react';
import { DotPattern } from '@/components/ui/dot-pattern';

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
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
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
            page: 1,
        }));
    };

    const handlePageChange = (newPage) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(120deg,#f8fafc_0%,#fff9f0_50%,#f0f7ff_100%)] relative overflow-x-hidden">
            {/* Background Elements */}
            <div className="absolute top-0 -right-[20%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(5,105,255,0.1)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 -left-[10%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(255,150,50,0.1)_0%,transparent_70%)] blur-[80px] rounded-full pointer-events-none" />
            <DotPattern width={24} height={24} cr={1} className="absolute inset-0 w-full h-full opacity-10" />

            <div className="relative z-10 flex flex-col gap-6 py-6 px-4 md:px-6">
                <div className="max-w-7xl mx-auto w-full">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-[#1a1a2e]">School Directory</h1>
                        <p className="text-gray-500 text-lg">
                            Discover and compare {data?.pagination?.total ? <span className="font-semibold text-[#0569ff]">{data.pagination.total}</span> : ''} schools
                        </p>
                    </div>

                    {/* Mobile Filters - Show at top on mobile */}
                    <div className="lg:hidden mb-6">
                        <SchoolFilters filters={filters} onFilterChange={handleFilterChange} />
                    </div>

                    {/* Featured Schools Section */}
                    {featuredSchoolsData?.schools?.length > 0 && (
                        <div className="mb-12">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="h-6 w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-full" />
                                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#1a1a2e]">Featured Schools</h2>
                                {featuredSchoolsData.source === 'local' && filters.location && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 border border-yellow-500/20">
                                        in {filters.location}
                                    </span>
                                )}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                {featuredSchoolsData.schools.map((profile) => (
                                    <Link key={profile.schoolId} href={`/explore/schools/${profile.slug || profile.schoolId}`} className="group block h-full">
                                        <div className="relative h-full rounded-xl overflow-hidden border border-gray-200/50 bg-white hover:shadow-lg transition-all duration-300">
                                            <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded bg-yellow-400 text-black text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                                Featured
                                            </div>
                                            <div className="h-28 md:h-32 w-full bg-gray-100 relative overflow-hidden">
                                                {profile.coverImage ? (
                                                    <img src={profile.coverImage} alt={profile.school?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                                                        <School className="w-8 h-8 text-gray-300" />
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
                                                <p className="text-xs text-gray-500 line-clamp-1">
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
                        {/* Filters Sidebar - Hidden on mobile (shown above) */}
                        <div className="hidden lg:block lg:col-span-1">
                            <Card className="p-4 sticky top-20 bg-white/80 backdrop-blur-sm border-gray-200/50">
                                <h2 className="font-semibold mb-4 text-[#1a1a2e]">Filters</h2>
                                <SchoolFilters filters={filters} onFilterChange={handleFilterChange} />
                            </Card>
                        </div>

                        {/* Schools Grid */}
                        <div className="lg:col-span-3">
                            {/* Loading State */}
                            {isLoading && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {[...Array(6)].map((_, i) => (
                                        <Card key={i} className="p-6 space-y-4 bg-white">
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
                                <Card className="p-12 text-center bg-white">
                                    <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                                    <h3 className="text-lg font-semibold mb-2 text-[#1a1a2e]">Failed to Load Schools</h3>
                                    <p className="text-gray-500 mb-4">{error?.message || 'An error occurred'}</p>
                                    <Button onClick={() => window.location.reload()} className="bg-[#0569ff] hover:bg-[#0450d4]">Try Again</Button>
                                </Card>
                            )}

                            {/* Schools Grid */}
                            {!isLoading && !isError && data?.schools && (
                                <>
                                    {data.schools.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {data.schools.map((school) => (
                                                <SchoolCard key={school.id} school={school} />
                                            ))}
                                        </div>
                                    ) : (
                                        <Card className="p-12 text-center bg-white">
                                            <School className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                            <h3 className="text-lg font-semibold mb-2 text-[#1a1a2e]">No Schools Found</h3>
                                            <p className="text-gray-500">
                                                Try adjusting your filters to see more results
                                            </p>
                                        </Card>
                                    )}

                                    {/* Pagination */}
                                    {data?.pagination && data.pagination.totalPages > 1 && (
                                        <div className="flex items-center justify-center gap-1 md:gap-2 mt-8 flex-wrap">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                disabled={filters.page === 1}
                                                onClick={() => handlePageChange(filters.page - 1)}
                                                className="h-9 w-9 bg-white"
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
                                                                <span className="px-1 md:px-2 text-gray-400">...</span>
                                                            )}
                                                            <Button
                                                                variant={filters.page === page ? 'default' : 'outline'}
                                                                size="icon"
                                                                onClick={() => handlePageChange(page)}
                                                                className={`h-9 w-9 ${filters.page === page ? 'bg-[#0569ff] hover:bg-[#0450d4]' : 'bg-white'}`}
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
                                                className="h-9 w-9 bg-white"
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
        </div>
    );
}
