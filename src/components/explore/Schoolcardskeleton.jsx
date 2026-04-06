import { Skeleton } from '@/components/ui/skeleton';

export default function SchoolCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex flex-col">
            {/* Cover Skeleton */}
            <Skeleton className="h-[190px] w-full rounded-none" />

            {/* Body Skeleton */}
            <div className="p-4 flex flex-col flex-1 gap-3">
                {/* Title */}
                <div className="space-y-2 mt-1">
                    <Skeleton className="h-4 w-[85%]" />
                    <Skeleton className="h-4 w-[60%]" />
                </div>

                {/* Location */}
                <Skeleton className="h-3 w-[45%]" />

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                    <Skeleton className="h-5 w-[70px] rounded-full" />
                </div>

                {/* Description lines */}
                <div className="space-y-1.5 mt-1">
                    <Skeleton className="h-2.5 w-full" />
                    <Skeleton className="h-2.5 w-[90%]" />
                </div>

                {/* Bottom line: Fees and students */}
                <div className="flex items-center justify-between mt-auto pt-2">
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-3 w-[85px]" />
                </div>

                {/* Facilities bottom row */}
                <div className="flex gap-1 mt-1">
                    <Skeleton className="h-5 w-[65px] rounded-full" />
                    <Skeleton className="h-5 w-[60px] rounded-full" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                </div>
            </div>
        </div>
    );
}