import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
    return (
        <div className="h-[calc(100vh-120px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-9 rounded-md" />
                    <Skeleton className="h-6 w-24" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <div className="flex items-center gap-1">
                        <Skeleton className="h-9 w-9 rounded-md" />
                        <Skeleton className="h-9 w-9 rounded-md" />
                    </div>
                    <Skeleton className="h-6 w-40" />
                </div>
                <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-24 rounded-md" />
                    <Skeleton className="h-9 w-20 rounded-md" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 border-r bg-card p-4 space-y-6 shrink-0 hidden lg:block">
                    <Skeleton className="h-10 w-full rounded-md" />

                    {/* Mini Calendar Skeleton */}
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-full" />
                        <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: 35 }).map((_, i) => (
                                <Skeleton key={i} className="h-7 w-7 rounded-full" />
                            ))}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <div className="grid grid-cols-2 gap-2">
                            <Skeleton className="h-20 rounded-lg" />
                            <Skeleton className="h-20 rounded-lg" />
                        </div>
                    </div>

                    {/* Upcoming */}
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full rounded-md" />
                        ))}
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 overflow-hidden bg-card">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <div key={i} className="text-center py-3 border-r">
                                <Skeleton className="h-4 w-8 mx-auto" />
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="grid grid-cols-7" style={{ gridTemplateRows: 'repeat(5, minmax(120px, 1fr))' }}>
                        {Array.from({ length: 35 }).map((_, i) => (
                            <div key={i} className="border-b border-r p-2">
                                <Skeleton className="h-6 w-6 rounded-full mb-2" />
                                <Skeleton className="h-5 w-3/4 rounded mb-1" />
                                <Skeleton className="h-5 w-1/2 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
