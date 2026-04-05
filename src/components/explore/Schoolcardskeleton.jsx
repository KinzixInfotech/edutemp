export default function SchoolCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col animate-pulse">
            {/* Cover image area */}
            <div className="relative h-[190px] bg-gray-100">
                {/* Heart button placeholder */}
                <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-gray-200" />
                {/* Rating badge placeholder */}
                <div className="absolute top-3 right-3 w-14 h-6 rounded-lg bg-gray-200" />
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col gap-2.5">
                {/* School name */}
                <div className="h-4 w-3/4 rounded-md bg-gray-200" />
                <div className="h-4 w-1/2 rounded-md bg-gray-200" />

                {/* Location */}
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-gray-200 shrink-0" />
                    <div className="h-3 w-2/5 rounded-md bg-gray-200" />
                </div>

                {/* Tags */}
                <div className="flex gap-1.5">
                    <div className="h-5 w-14 rounded-full bg-gray-100 border border-gray-200" />
                    <div className="h-5 w-16 rounded-full bg-gray-100 border border-gray-200" />
                    <div className="h-5 w-12 rounded-full bg-gray-100 border border-gray-200" />
                </div>

                {/* Description lines */}
                <div className="space-y-1.5 pt-0.5">
                    <div className="h-3 w-full rounded-md bg-gray-100" />
                    <div className="h-3 w-4/5 rounded-md bg-gray-100" />
                </div>

                {/* Fee + students row */}
                <div className="flex items-center gap-2 pt-1">
                    <div className="h-5 w-24 rounded-md bg-gray-100" />
                    <div className="h-3 w-20 rounded-md bg-gray-100 ml-auto" />
                </div>

                {/* Facility pills */}
                <div className="flex gap-1">
                    <div className="h-4 w-16 rounded-full bg-gray-100" />
                    <div className="h-4 w-14 rounded-full bg-gray-100" />
                    <div className="h-4 w-10 rounded-full bg-gray-100" />
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                    <div className="flex-1 h-9 rounded-lg bg-gray-100 border border-gray-200" />
                    <div className="flex-1 h-9 rounded-lg bg-blue-100" />
                </div>
            </div>
        </div>
    );
}