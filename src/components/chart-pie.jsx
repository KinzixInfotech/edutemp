"use client"

import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"

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

export function ChartPieLabel({ chartData, title, date }) {
    return (
        <Card className="flex flex-col ">
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

        </Card>
    )
}
