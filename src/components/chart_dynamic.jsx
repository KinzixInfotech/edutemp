// components/charts/DynamicAreaChart.tsx
'use client';

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState } from "react";


export function DynamicAreaChart({
    data,
    config,
    title = "Area Chart",
    description = "Showing trends over time",
    dateKey = "date",
    timeRangeOptions = ["7d", "30d", "90d", "all"],
    defaultTimeRange = "90d",
    height = 300,
    className,
}) {
    const [timeRange, setTimeRange] = useState(defaultTimeRange);

    const filteredData =useMemo(() => {
        if (timeRange === "all") return data;

        const now = new Date();
        const daysToSubtract = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - daysToSubtract);

        return data.filter((item) => {
            const date = new Date(item[dateKey]);
            return date >= cutoff;
        });
    }, [data, timeRange, dateKey]);

    const formatDate = (value) => {
        const date = new Date(value);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    const keys = Object.keys(config).filter((key) => key !== "visitors");

    return (
        <Card className={className}>
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1">
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>

                <Select value={timeRange} onValueChange={(v) => setTimeRange(v)}>
                    <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Select time range">
                        <SelectValue placeholder="Last 3 months" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        {timeRangeOptions.includes("7d") && (
                            <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                        )}
                        {timeRangeOptions.includes("30d") && (
                            <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                        )}
                        {timeRangeOptions.includes("90d") && (
                            <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                        )}
                        {timeRangeOptions.includes("all") && (
                            <SelectItem value="all" className="rounded-lg">All time</SelectItem>
                        )}
                    </SelectContent>
                </Select>
            </CardHeader>

            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={config} className={`aspect-auto w-full`} style={{ height }}>
                    <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            {keys.map((key) => (
                                <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={`var(--color-${key})`} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={`var(--color-${key})`} stopOpacity={0.1} />
                                </linearGradient>
                            ))}
                        </defs>

                        <CartesianGrid vertical={false} strokeDasharray="3 3" />

                        <XAxis
                            dataKey={dateKey}
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={formatDate}
                        />

                        <YAxis tickLine={false} axisLine={false} />

                        <ChartTooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => formatDate(value)}
                                    indicator="dot"
                                />
                            }
                        />

                        {keys.map((key) => (
                            <Area
                                key={key}
                                type="natural"
                                dataKey={key}
                                stroke={`var(--color-${key})`}
                                fill={`url(#fill${key})`}
                                stackId="a"
                                strokeWidth={2}
                            />
                        ))}

                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}