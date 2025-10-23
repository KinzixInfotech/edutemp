"use client"

import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

export const description = "A pie chart with a label"

const chartConfig = {
    visitors: {
        label: "Visitors",
    },
    chrome: {
        label: "Chrome",
        color: "var(--chart-1)",
    },
    safari: {
        label: "Safari",
        color: "var(--chart-2)",
    },
    firefox: {
        label: "Firefox",
        color: "var(--chart-3)",
    },
    edge: {
        label: "Edge",
        color: "var(--chart-4)",
    },
    other: {
        label: "Other",
        color: "var(--chart-5)",
    },
}

export function ChartPieLabel({ chartData, title, date, isLoading }) {
    return (
        <Card className="flex flex-col rounded-sm border-none bg-muted dark:bg-[#18181b]">
            {isLoading ? (
                <>
                    <CardHeader className="items-center pb-0">
                        {/* Title Skeleton */}
                        <Skeleton className="h-6 w-32" />
                        {/* Description Skeleton */}
                        <Skeleton className="mt-2 h-4 w-24" />
                    </CardHeader>
                    <CardContent className="flex-1 pb-0">
                        {/* Pie Chart Skeleton */}
                        <Skeleton className="mx-auto aspect-square max-h-[250px] rounded-full" />
                    </CardContent>
                </>
            ) : (
                <>
                    <CardHeader className="items-center pb-0">
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{date}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-0">
                        <ChartContainer
                            config={chartConfig}
                            className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[250px] pb-0"
                        >
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie data={chartData} dataKey="visitors" label nameKey="browser" />
                            </PieChart>
                        </ChartContainer>
                    </CardContent>
                </>
            )}
        </Card>
    )
}