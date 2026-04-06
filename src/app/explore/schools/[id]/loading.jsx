import { Skeleton } from '@/components/ui/skeleton';

export default function SchoolProfileLoading() {
    return (
        <div className="min-h-screen bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
                
                {/* Breadcrumb Skeleton */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                </div>

                {/* Header Profile Title section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <Skeleton className="w-14 h-14 md:w-16 md:h-16 rounded-xl shrink-0" />
                        <div className="space-y-2.5 mt-1">
                            <Skeleton className="h-8 md:h-10 w-[200px] md:w-[320px] rounded-lg" />
                            <div className="flex gap-2">
                                <Skeleton className="h-5 w-24 rounded-md" />
                                <Skeleton className="h-5 w-20 rounded-md" />
                                <Skeleton className="h-5 w-16 rounded-md" />
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2.5">
                        <Skeleton className="h-9 w-[80px] rounded-full" />
                        <Skeleton className="h-9 w-[80px] rounded-full" />
                    </div>
                </div>

                {/* Gallery Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 h-auto md:h-[400px]">
                    <Skeleton className="h-60 md:h-full md:col-span-2 rounded-2xl" />
                    <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-3 h-full">
                        <Skeleton className="rounded-xl h-full" />
                        <Skeleton className="rounded-xl h-full" />
                        <Skeleton className="rounded-xl h-full" />
                        <Skeleton className="rounded-xl h-full" />
                    </div>
                </div>

                {/* Tabs Link Skeleton */}
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-28 rounded-lg" />
                    <Skeleton className="h-10 w-24 rounded-lg" />
                    <Skeleton className="h-10 w-20 rounded-lg" />
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* Two-Column Body Content Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Main column */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200">
                            <Skeleton className="h-6 w-48 mb-6" />
                            <div className="space-y-3 mb-8">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-[95%]" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-[90%]" />
                                <Skeleton className="h-4 w-[85%]" />
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
                                <div>
                                    <Skeleton className="h-8 w-16 mb-2" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <div>
                                    <Skeleton className="h-8 w-12 mb-2" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <div>
                                    <Skeleton className="h-8 w-16 mb-2" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                                <div>
                                    <Skeleton className="h-8 w-20 mb-2" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                        </div>
                        
                        <div className="bg-white p-6 rounded-2xl border border-gray-200">
                            <Skeleton className="h-6 w-48 mb-6" />
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {[1,2,3,4,5,6,7,8].map(i => (
                                    <div key={i} className="flex flex-col items-center p-4">
                                        <Skeleton className="h-10 w-10 mb-2 rounded-xl" />
                                        <Skeleton className="h-3 w-16" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar column */}
                    <div className="space-y-5">
                        <div className="bg-white p-6 rounded-2xl border border-gray-200">
                            <Skeleton className="h-20 w-full mb-5 -mt-6 -mx-6 rounded-t-2xl" />
                            <div className="space-y-4 pt-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-11 w-full mt-2" />
                            </div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-gray-200">
                            <Skeleton className="h-4 w-32 mb-4" />
                            <div className="space-y-4">
                                <div className="flex gap-3"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-4 w-32 mt-2" /></div>
                                <div className="flex gap-3"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-4 w-40 mt-2" /></div>
                                <div className="flex gap-3"><Skeleton className="h-9 w-9 rounded-lg" /><Skeleton className="h-4 w-28 mt-2" /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
