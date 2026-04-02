'use client';

import { startTransition, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import SchoolCard from '@/components/explore/SchoolCard';
import SchoolFilters from '@/components/explore/SchoolFilters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ChevronLeft, ChevronRight, ChevronDown, School, Home, SlidersHorizontal } from 'lucide-react';

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
    const [filtersOpen, setFiltersOpen] = useState(false);

    const { data, isLoading, isFetching, isError, error } = useQuery({
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
        placeholderData: keepPreviousData,
    });

    const handleFilterChange = (newFilters) => {
        startTransition(() => {
            setFilters((prev) => ({
                ...prev,
                ...newFilters,
                page: 1,
            }));
        });
    };

    const handlePageChange = (newPage) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Breadcrumb + Header */}
            <div className="relative border-b border-gray-100 overflow-hidden">
                {/* Glow effects */}

                {/* <div className="absolute top-0 -left-24 w-[500px] h-[300px] bg-blue-400/10 rounded-full blur-[100px] pointer-events-none" /> */}
                {/* <div className="absolute -top-10 left-10 w-[400px] h-[250px] bg-indigo-400/8 rounded-full blur-[80px] pointer-events-none" /> */}
                {/* <div className="absolute bottom-0 -left-32 w-[600px] h-[200px] bg-sky-300/6 rounded-full blur-[90px] pointer-events-none" /> */}


                <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-6">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm mb-5">
                        <Link href="/explore" className="text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                            <Home className="w-3.5 h-3.5" />
                            Home
                        </Link>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-[#0f172a] font-semibold">Schools</span>
                    </nav>

                    {/* Title + Sort */}
                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-[40px] font-extrabold text-[#0f172a] tracking-tight leading-[1.1]">
                                Top Private Schools
                            </h1>
                            <p className="text-[15px] text-gray-500 mt-2">
                                {data?.pagination?.total ? (
                                    <>Showing <span className="font-bold text-blue-600">{data.pagination.total}</span> results based on your preferences</>
                                ) : (
                                    'Discover the best schools for your child'
                                )}
                            </p>
                        </div>

                        {/* Sort dropdown */}
                        <div className="hidden md:flex items-center gap-2 shrink-0">
                            <div className="relative flex items-center">
                                <SlidersHorizontal className="absolute left-3.5 h-4 w-4 text-blue-600 pointer-events-none" />
                                <select
                                    value={filters.sort}
                                    onChange={(e) => handleFilterChange({ sort: e.target.value })}
                                    className="h-11 pl-10 pr-11 text-sm rounded-xl border border-gray-200 bg-white text-[#0f172a] font-semibold appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    <option value="name">Recommended</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="fees_asc">Lowest Fee</option>
                                    <option value="fees_desc">Highest Fee</option>
                                </select>
                                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                {/* Mobile Filters */}
                <div className="lg:hidden mb-6">
                    <SchoolFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        isOpen={filtersOpen}
                        setIsOpen={setFiltersOpen}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Desktop Filters Sidebar */}
                    <div className="hidden lg:block lg:col-span-1">
                        <div className="sticky top-20">
                            <SchoolFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                                isOpen={filtersOpen}
                                setIsOpen={setFiltersOpen}
                            />
                        </div>
                    </div>

                    {/* Schools Grid */}
                    <div className="lg:col-span-3">
                        {isFetching && !isLoading && (
                            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700">
                                Updating results...
                            </div>
                        )}

                        {/* Loading State */}
                        {isLoading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                        <Skeleton className="h-[200px] w-full" />
                                        <div className="p-4 space-y-3">
                                            <Skeleton className="h-5 w-3/4" />
                                            <Skeleton className="h-4 w-1/2" />
                                            <div className="flex gap-1.5">
                                                <Skeleton className="h-6 w-16 rounded-full" />
                                                <Skeleton className="h-6 w-14 rounded-full" />
                                            </div>
                                            <Skeleton className="h-4 w-full" />
                                            <Skeleton className="h-4 w-4/5" />
                                            <div className="flex gap-2.5 pt-2">
                                                <Skeleton className="h-10 flex-1 rounded-lg" />
                                                <Skeleton className="h-10 flex-1 rounded-lg" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {isError && (
                            <Card className="p-12 text-center bg-white rounded-xl">
                                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
                                <h3 className="text-lg font-bold mb-2 text-[#0f172a]">Failed to Load Schools</h3>
                                <p className="text-sm text-gray-400 mb-4">{error?.message || 'An error occurred'}</p>
                                <Button onClick={() => window.location.reload()} className="bg-[#2563eb] hover:bg-[#1d4ed8] rounded-full px-6">
                                    Try Again
                                </Button>
                            </Card>
                        )}

                        {/* Schools Grid */}
                        {!isLoading && !isError && data?.schools && (
                            <>
                                {data.schools.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {data.schools.map((school) => (
                                            <SchoolCard key={school.id} school={school} />
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="p-12 text-center bg-white rounded-xl">
                                        <School className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                        <h3 className="text-lg font-bold mb-2 text-[#0f172a]">No Schools Found</h3>
                                        <p className="text-sm text-gray-400">
                                            Try adjusting your filters to see more results
                                        </p>
                                    </Card>
                                )}

                                {data?.pagination && data.pagination.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-10">
                                        <button
                                            disabled={filters.page === 1}
                                            onClick={() => handlePageChange(filters.page - 1)}
                                            className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>
                                        <div className="flex items-center gap-1.5">
                                            {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    const distance = Math.abs(page - filters.page);
                                                    return distance === 0 || distance === 1 || page === 1 || page === data.pagination.totalPages;
                                                })
                                                .map((page, idx, arr) => (
                                                    <div key={page} className="flex items-center">
                                                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                            <span className="px-1.5 text-gray-400 text-sm">…</span>
                                                        )}
                                                        <button
                                                            onClick={() => handlePageChange(page)}
                                                            className={`w-10 h-10 rounded-full text-sm font-semibold transition-all duration-200 ${filters.page === page
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                        <button
                                            disabled={filters.page === data.pagination.totalPages}
                                            onClick={() => handlePageChange(filters.page + 1)}
                                            className="w-10 h-10 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
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
