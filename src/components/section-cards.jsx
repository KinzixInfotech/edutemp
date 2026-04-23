import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
    CardAction,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SectionCards({ data, isloading }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {isloading ? (
                // Skeleton Loading State
                Array(3).fill(0).map((_, index) => (
                    <div
                        key={index}
                        className="relative rounded-xl p-5 min-h-[120px] flex flex-col justify-between text-sm border border-border/60 bg-muted/40"
                    >
                        {/* Top Left Date Skeleton */}
                        <Skeleton className="absolute top-3 left-3 h-5 w-16 rounded-full" />

                        {/* Top Right Dots Skeleton */}
                        <Skeleton className="absolute top-3 right-3 h-4 w-4 rounded-full" />

                        {/* Value Skeleton */}
                        <Skeleton className="mt-6 h-7 w-20" />

                        {/* Label Skeleton */}
                        <Skeleton className="mt-1 h-4 w-32" />

                        {/* Trend Skeleton */}
                        <Skeleton className="mt-2 h-5 w-16 rounded-full" />
                    </div>
                ))
            ) : (
                // Original Data Rendering
                data.map((metric, index) => {
                    const Icon = metric.direction === "down" ? IconTrendingDown : IconTrendingUp;

                    return (
                        <div
                            key={index}
                            className="relative rounded-xl p-5 min-h-[120px] flex flex-col justify-between text-sm border border-border/60 bg-muted/40 backdrop-blur-sm hover:shadow-md transition-all duration-300 group"
                        >
                            {/* Top Left Date */}
                            {metric.date && (
                                <span className="absolute top-3 left-3 bg-white dark:bg-muted text-green-700 dark:text-green-400 text-[10px] font-semibold rounded-full px-2 py-0.5 shadow">
                                    {metric.date}
                                </span>
                            )}



                            {/* Value */}
                            <CardTitle className="text-2xl font-semibold mt-6">
                                {metric.value}
                            </CardTitle>

                            {/* Label */}
                            <CardDescription className="mt-1 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                                {metric.label}
                            </CardDescription>

                            {/* Trend */}
                            {metric.trend && (
                                <CardAction className="mt-2">
                                    <Badge
                                        variant="outline"
                                        className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full
                                            ${metric.direction === "up"
                                                ? "text-green-600 border-green-600"
                                                : metric.direction === "down"
                                                    ? "text-red-600 border-red-600"
                                                    : "text-gray-500 border-gray-400"}
                                            dark:border-muted-foreground/40
                                        `}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {metric.trend}
                                    </Badge>
                                </CardAction>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}