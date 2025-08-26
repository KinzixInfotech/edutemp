"use client"

import { TrendingUp } from "lucide-react"
import {
    Label,
    PolarGrid,
    PolarRadiusAxis,
    RadialBar,
    RadialBarChart,
} from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { ChartContainer } from "@/components/ui/chart"

const chartData = [
    { browser: "safari", visitors: 1260, fill: "var(--color-safari)" },
]

const chartConfig = {
    visitors: { label: "Visitors" },
    safari: { label: "Safari", color: "var(--chart-2)" },
}

export function ChartRadialShape() {
    return (
        <>
            <ChartContainer
                config={chartConfig}
                className="mx-auto aspect-square max-h-[150px]" // ⬅️ smaller size
            >
                <RadialBarChart
                    data={chartData}
                    endAngle={100}
                    innerRadius={50} // ⬅️ reduced
                    outerRadius={70} // ⬅️ reduced
                >
                    <PolarGrid
                        gridType="circle"
                        radialLines={false}
                        stroke="none"
                        className="first:fill-muted last:fill-background"
                        polarRadius={[56, 44]} // ⬅️ tighter grid
                    />
                    <RadialBar dataKey="visitors" background />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                        <Label
                            content={({ viewBox }) => {
                                if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                    return (
                                        <text
                                            x={viewBox.cx}
                                            y={viewBox.cy}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                        >
                                            <tspan
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                className="fill-foreground text-xl font-bold" // ⬅️ smaller font
                                            >
                                                {chartData[0].visitors.toLocaleString()}
                                            </tspan>
                                            <tspan
                                                x={viewBox.cx}
                                                y={(viewBox.cy || 0) + 18}
                                                className="fill-muted-foreground text-xs"
                                            >
                                                Visitors
                                            </tspan>
                                        </text>
                                    )
                                }
                            }}
                        />
                    </PolarRadiusAxis>
                </RadialBarChart>
            </ChartContainer>
        </>
    )
}
