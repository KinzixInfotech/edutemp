"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function NoticeboardLoading() {
    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Skeleton className="h-10 flex-1 max-w-sm" />
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Notice Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i}>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <div className="flex items-center justify-between pt-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-8 w-20" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
