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

const DEFAULT_FILTERS = {
    search: '',
    minFee: undefined,
    maxFee: undefined,
    minRating: undefined,
    sort: 'name',
    page: 1,
    limit: 12,
    board: undefined,
    genderType: undefined,
    religiousAffiliation: undefined,
    facilities: undefined,
    extracurriculars: undefined,
};

export default function SchoolsPage() {
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [filtersOpen, setFiltersOpen] = useState(false);

    const { data, isLoading, isFetching, isError, error } = useQuery({
        queryKey: ['schools', filters],
        queryFn: async () => {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '' && value !== null) {
                    params.append(key, String(value));
                }
            });

            const response = await fetch(`/api/public/schools?${params}`);
            if (!response.ok) throw new Error('Failed to fetch schools');
            return response.json();
        },
        staleTime: 5 * 60 * 1000,
        placeholderData: keepPreviousData,
    });

    const handleFilterChange = (newFilters) => {
        startTransition(() => {
            setFilters((prev) => ({
                ...prev,
                ...newFilters,
                page: 1, // Reset page on filter change
            }));
        });
    };

    const handlePageChange = (newPage) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#f8fafc]">
            {/* Header */}
            <div className="relative border-b border-gray-100 bg-white">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-[13px] mb-4">
                        <Link href="/explore" className="text-gray-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                            <Home className="w-3.5 h-3.5" />
                            Home
                        </Link>
                        <ChevronRight className="w-3 h-3 text-gray-300" />
                        <span className="text-[#0f172a] font-semibold">Schools</span>
                    </nav>

                    <div className="flex items-end justify-between gap-4">
                        <div>
                            <h1 className="text-2xl md:text-4xl font-extrabold text-[#0f172a] tracking-tight">
                                Top Private Schools
                            </h1>
                            <p className="text-[14px] text-gray-500 mt-1.5">
                                {data?.pagination?.total !== undefined ? (
                                    <>
                                        Showing{' '}
                                        <span className="font-bold text-blue-600">
                                            {data.pagination.total.toLocaleString()}
                                        </span>{' '}
                                        schools
                                    </>
                                ) : (
                                    'Discover the best schools for your child'
                                )}
                            </p>
                        </div>

                        {/* Sort dropdown — desktop */}
                        <div className="hidden md:flex items-center gap-2 shrink-0">
                            <div className="relative flex items-center">
                                <SlidersHorizontal className="absolute left-3.5 h-3.5 w-3.5 text-blue-500 pointer-events-none" />
                                <select
                                    value={filters.sort}
                                    onChange={(e) => handleFilterChange({ sort: e.target.value })}
                                    className="h-10 pl-10 pr-9 text-[13px] rounded-xl border border-gray-200 bg-white text-[#0f172a] font-semibold appearance-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer"
                                >
                                    <option value="name">Recommended</option>
                                    <option value="rating">Highest Rated</option>
                                    <option value="fees_asc">Lowest Fee</option>
                                    <option value="fees_desc">Highest Fee</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                {/* Mobile Filters trigger */}
                <div className="lg:hidden mb-4">
                    <SchoolFilters
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        isOpen={filtersOpen}
                        setIsOpen={setFiltersOpen}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Desktop Sidebar */}
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

                    {/* Results */}
                    <div className="lg:col-span-3">
                        {/* Updating indicator */}
                        {isFetching && !isLoading && (
                            <div className="mb-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-[13px] font-medium text-blue-700">
                                Updating results...
                            </div>
                        )}

                        {/* Loading skeletons */}
                        {isLoading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                        <Skeleton className="h-[190px] w-full" />
                                        <div className="p-4 space-y-2.5">
                                            <Skeleton className="h-4 w-3/4" />
                                            <Skeleton className="h-3 w-1/2" />
                                            <div className="flex gap-1">
                                                <Skeleton className="h-5 w-14 rounded-full" />
                                                <Skeleton className="h-5 w-12 rounded-full" />
                                            </div>
                                            <Skeleton className="h-3 w-full" />
                                            <Skeleton className="h-3 w-4/5" />
                                            <div className="flex gap-2 pt-1">
                                                <Skeleton className="h-9 flex-1 rounded-lg" />
                                                <Skeleton className="h-9 flex-1 rounded-lg" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error */}
                        {isError && (
                            <Card className="p-12 text-center bg-white rounded-xl border-0 shadow-sm">
                                <AlertCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
                                <h3 className="text-base font-bold mb-1 text-[#0f172a]">Failed to Load Schools</h3>
                                <p className="text-[13px] text-gray-400 mb-4">{error?.message}</p>
                                <Button onClick={() => window.location.reload()} className="bg-blue-600 hover:bg-blue-700 rounded-full px-6 text-[13px]">
                                    Try Again
                                </Button>
                            </Card>
                        )}

                        {/* Grid */}
                        {!isLoading && !isError && data?.schools && (
                            <>
                                {data.schools.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                        {data.schools.map((school) => (
                                            <SchoolCard key={school.id} school={school} />
                                        ))}
                                    </div>
                                ) : (
                                    <Card className="p-12 text-center bg-white rounded-xl border-0 shadow-sm">
                                        <School className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                                        <h3 className="text-base font-bold mb-1 text-[#0f172a]">No Schools Found</h3>
                                        <p className="text-[13px] text-gray-400 mb-4">
                                            Try adjusting your filters to see more results
                                        </p>
                                        <Button
                                            variant="outline"
                                            onClick={() => setFilters(DEFAULT_FILTERS)}
                                            className="text-[13px] rounded-full px-6"
                                        >
                                            Clear All Filters
                                        </Button>
                                    </Card>
                                )}

                                {/* Pagination */}
                                {data?.pagination?.totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-1.5 mt-10">
                                        <button
                                            disabled={filters.page === 1}
                                            onClick={() => handlePageChange(filters.page - 1)}
                                            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </button>

                                        {(() => {
                                            const total = data.pagination.totalPages;
                                            const current = filters.page;
                                            const pages = [];

                                            // Always show: 1, ..., current-1, current, current+1, ..., last
                                            const visible = new Set([1, total, current, current - 1, current + 1].filter(p => p >= 1 && p <= total));
                                            const sorted = [...visible].sort((a, b) => a - b);

                                            return sorted.map((page, idx) => {
                                                const prev = sorted[idx - 1];
                                                return (
                                                    <span key={page} className="flex items-center gap-1.5">
                                                        {prev && page - prev > 1 && (
                                                            <span className="text-gray-300 text-sm px-0.5">…</span>
                                                        )}
                                                        <button
                                                            onClick={() => handlePageChange(page)}
                                                            className={`w-9 h-9 rounded-full text-[13px] font-semibold transition-all ${current === page
                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 shadow-sm'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    </span>
                                                );
                                            });
                                        })()}

                                        <button
                                            disabled={filters.page === data.pagination.totalPages}
                                            onClick={() => handlePageChange(filters.page + 1)}
                                            className="w-9 h-9 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
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