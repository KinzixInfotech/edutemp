import React, { useMemo } from 'react';
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
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const chartConfig = {
    present: {
        label: "Present",
        color: "hsl(142, 76%, 36%)",
    },
    absent: {
        label: "Absent",
        color: "hsl(0, 84%, 60%)",
    },
    late: {
        label: "Late",
        color: "hsl(45, 93%, 47%)",
    },
    halfDay: {
        label: "Half Day",
        color: "hsl(27, 96%, 61%)",
    },
    onLeave: {
        label: "On Leave",
        color: "hsl(217, 91%, 60%)",
    },
};

export function AttendanceTrendChart({ monthlyTrend }) {
    const [timeRange, setTimeRange] = React.useState("30d");

    const filteredData = useMemo(() => {
        if (!monthlyTrend || monthlyTrend.length === 0) return [];

        const now = new Date();
        const daysToSubtract = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - daysToSubtract);

        return monthlyTrend
            .filter((item) => {
                const date = new Date(item.date);
                return date >= cutoff;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .map((item) => ({
                date: item.date,
                present: item.present || 0,
                absent: item.absent || 0,
                late: item.late || 0,
                halfDay: item.halfDay || 0,
                onLeave: item.onLeave || 0,
            }));
    }, [monthlyTrend, timeRange]);

    const formatDate = (value) => {
        const date = new Date(value);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    };

    // Calculate trends
    const calculateTrend = (key) => {
        if (filteredData.length < 2) return { value: 0, direction: "stable" };

        const recentData = filteredData.slice(-7);
        const olderData = filteredData.slice(0, Math.min(7, filteredData.length - 7));

        if (olderData.length === 0) return { value: 0, direction: "stable" };

        const recentAvg = recentData.reduce((sum, item) => sum + item[key], 0) / recentData.length;
        const olderAvg = olderData.reduce((sum, item) => sum + item[key], 0) / olderData.length;

        const percentageChange = olderAvg === 0 ? 0 : ((recentAvg - olderAvg) / olderAvg) * 100;

        return {
            value: Math.abs(percentageChange).toFixed(1),
            direction: percentageChange > 5 ? "up" : percentageChange < -5 ? "down" : "stable"
        };
    };

    const presentTrend = calculateTrend("present");
    const absentTrend = calculateTrend("absent");

    const TrendIcon = ({ direction }) => {
        if (direction === "up") return <TrendingUp className="w-4 h-4" />;
        if (direction === "down") return <TrendingDown className="w-4 h-4" />;
        return <Minus className="w-4 h-4" />;
    };

    if (!monthlyTrend || monthlyTrend.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Attendance Trends</CardTitle>
                    <CardDescription>No data available</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        No attendance data to display
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 border-b pb-4">
                <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                        Attendance Trends
                    </CardTitle>
                    <CardDescription className="mt-1.5">
                        Daily attendance patterns over time
                    </CardDescription>
                    
                    {/* Trend Indicators */}
                    <div className="flex flex-wrap gap-4 mt-3">
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-green-600">
                                <TrendIcon direction={presentTrend.direction} />
                                <span className="text-sm font-medium">
                                    {presentTrend.value}%
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">Present</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 text-red-600">
                                <TrendIcon direction={absentTrend.direction} />
                                <span className="text-sm font-medium">
                                    {absentTrend.value}%
                                </span>
                            </div>
                            <span className="text-xs text-muted-foreground">Absent</span>
                        </div>
                    </div>
                </div>

                <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-[160px] rounded-lg">
                        <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                        <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                        <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>

            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer config={chartConfig} className="aspect-auto w-full h-[300px]">
                    <AreaChart 
                        data={filteredData} 
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-present)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-present)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillAbsent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-absent)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-absent)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillLate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-late)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-late)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillHalfDay" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-halfDay)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-halfDay)" stopOpacity={0.1} />
                            </linearGradient>
                            <linearGradient id="fillOnLeave" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--color-onLeave)" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="var(--color-onLeave)" stopOpacity={0.1} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid vertical={false} strokeDasharray="3 3" />

                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={formatDate}
                        />

                        <YAxis 
                            tickLine={false} 
                            axisLine={false}
                            tickMargin={8}
                        />

                        <ChartTooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => formatDate(value)}
                                    indicator="dot"
                                />
                            }
                        />

                        <Area
                            type="monotone"
                            dataKey="present"
                            stroke="var(--color-present)"
                            fill="url(#fillPresent)"
                            stackId="a"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="absent"
                            stroke="var(--color-absent)"
                            fill="url(#fillAbsent)"
                            stackId="a"
                            strokeWidth={2}
                        />
                        <Area
                            type="monotone"
                            dataKey="late"
                            stroke="var(--color-late)"
                            fill="url(#fillLate)"
                            stackId="a"
                            strokeWidth={2}
                        />

                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}