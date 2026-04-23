"use client"

import { TrendingUp } from "lucide-react"
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartConfig,
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

export const description = "A radar chart"

const chartData = [
    { month: "January", desktop: 186 },
    { month: "February", desktop: 305 },
    { month: "March", desktop: 237 },
    { month: "April", desktop: 273 },
    { month: "May", desktop: 209 },
    { month: "June", desktop: 214 },
]

const chartConfig = {
    desktop: {
        label: "Desktop",
        color: "var(--chart-1)",
    },
}

export function ChartRadarDefault() {
    return (

        <RadarChart data={chartData}>
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="month" />
            <PolarGrid />
            <Radar
                dataKey="desktop"
                fill="var(--color-desktop)"
                fillOpacity={0.6}
            />
        </RadarChart>
    )
}
