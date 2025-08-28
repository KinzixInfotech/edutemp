import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    CardAction,
    CardDescription,
    CardTitle,
} from "@/components/ui/card";

export function SectionCards({ data }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
            {data.map((metric, index) => {
                const Icon = metric.direction === "down" ? IconTrendingDown : IconTrendingUp;

                return (
                    <div
                        key={index}
                        className="relative rounded-sm p-4 min-h-[120px] flex flex-col justify-between text-sm border border-border  text-gray-800 dark:text-white bg-gradient-to-t from-[color-mix(in_oklab,var(--primary)_5%,transparent)] to-white dark:bg-[#18181b] dark:from-transparent dark:to-transparent  dark:border-muted/40 dark:shadow-lg"
                    >
                        {/* Top Left Date */}
                        {metric.date && (
                            <span className="absolute top-3 left-3 bg-white dark:bg-muted text-green-700 dark:text-green-400 text-[10px] font-semibold rounded-full px-2 py-0.5 shadow">
                                {metric.date}
                            </span>
                        )}

                        {/* Top Right Dots */}
                        <span className="absolute top-3 right-3 text-gray-400 dark:text-gray-500">
                            <MoreHorizontal className="w-4 h-4" />
                        </span>

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
            })}
        </div>
    );
}
