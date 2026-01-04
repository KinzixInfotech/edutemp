'use client';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import WidgetContainer from "./WidgetContainer";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,

} from "@/components/ui/chart"
const fetchFeeStats = async ({ schoolId, academicYearId }) => {
    if (!schoolId || !academicYearId) return null;
    const params = new URLSearchParams({ schoolId, academicYearId });
    const res = await fetch(`/api/schools/fee/admin/dashboard?${params}`);
    if (!res.ok) throw new Error('Failed to fetch fee stats');
    return res.json();
};

export default function FeeStatsWidget({ fullUser, onRemove }) {
    // 1. Fetch active academic year first (like the detailed page does)
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', fullUser?.schoolId],
        queryFn: async () => {
            if (!fullUser?.schoolId) return [];
            const res = await fetch(`/api/schools/academic-years?schoolId=${fullUser.schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch academic years');
            return res.json();
        },
        enabled: !!fullUser?.schoolId,
    });

    const activeAcademicYearId = academicYears?.find(y => y.isActive)?.id;

    // 2. Fetch stats using the active academic year
    const { data, isLoading } = useQuery({
        queryKey: ['feeStats', fullUser?.schoolId, activeAcademicYearId],
        queryFn: () => fetchFeeStats({
            schoolId: fullUser?.schoolId,
            academicYearId: activeAcademicYearId
        }),
        enabled: !!fullUser?.schoolId && !!activeAcademicYearId,
    });

    if (isLoading) {
        return (
            <WidgetContainer title="Fee Collection" onRemove={onRemove} className="h-full">
                <div className="flex flex-col h-full min-h-[380px] gap-4">
                    {/* Progress Section Skeleton */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-28" />
                        </div>
                        <Skeleton className="h-2.5 w-full rounded-full" />
                    </div>

                    {/* Revenue Section Skeleton */}
                    <div className="flex-1 flex items-center justify-center">
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </div>

                    {/* Bottom Stats Skeleton */}
                    <div className="grid grid-cols-2 gap-3">
                        <Skeleton className="h-20 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                    </div>
                </div>
            </WidgetContainer>
        );
    }
    const chartConfig = {
        desktop: {
            label: "Desktop",
            color: "var(--chart-1)",
        },
    }
    const stats = data?.summary || { totalExpected: 0, totalCollected: 0, totalBalance: 0, collectionPercentage: 0 };
    const percentage = parseFloat(stats.collectionPercentage) || 0;

    // Generate last 6 months for chart (current month + 5 past months)
    const generateLast6Months = () => {
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key: date.toLocaleDateString('en-US', { month: 'short' }),
                month: date.toISOString(),
            });
        }
        return months;
    };

    // Map API data to month keys
    const apiDataMap = {};
    data?.monthlyCollection?.forEach(item => {
        const monthKey = new Date(item.month).toLocaleDateString('en-US', { month: 'short' });
        apiDataMap[monthKey] = Number(item.total) || 0;
    });

    // Create chart data with all 6 months, filling 0 for missing
    const chartData = generateLast6Months().map(m => ({
        date: m.key,
        revenue: apiDataMap[m.key] || 0
    }));

    // Calculate trend (current month vs last month)
    const currentMonthRevenue = chartData[chartData.length - 1]?.revenue || 0;
    const lastMonthRevenue = chartData[chartData.length - 2]?.revenue || 0;
    const trendPercentage = lastMonthRevenue > 0
        ? Math.round(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : currentMonthRevenue > 0 ? 100 : 0;
    const isTrendUp = trendPercentage >= 0;

    return (
        <WidgetContainer title="Fee Collection" onRemove={onRemove} className="h-full">
            <div className="flex flex-col h-full gap-4">
                {/* Header: Revenue + Trend */}
                <div className="flex items-start justify-between">
                    {/* Left: Revenue */}
                    <div>
                        <div className="flex gap-2 mb-1">
                            <span className="text-xs items-center font-semibold uppercase tracking-wider text-green-600/80 dark:text-green-400">Total Revenue</span>
                            <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${percentage >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-700'}`}>
                                {percentage >= 50 ? <TrendingUp className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                                {percentage}%
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <IndianRupee className="h-7 w-7 text-green-600 dark:text-green-400" />
                            <span className="text-3xl font-extrabold tracking-tight text-green-600 dark:text-green-400">
                                {stats.totalCollected.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>

                    {/* Right: Trend Summary */}
                    <div className="text-right">
                        <div className={`flex items-center gap-1 text-xs font-semibold ${isTrendUp ? 'text-green-600' : 'text-red-500'}`}>
                            {isTrendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                            {isTrendUp ? '+' : ''}{trendPercentage}%
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">vs last month</p>
                    </div>
                </div>
                {/* Top: Progress and Target */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                        <span>Collection Progress</span>
                        <span>Target: ₹{stats.totalExpected.toLocaleString('en-IN')}</span>
                    </div>
                    <Progress value={percentage} className="h-2.5 bg-muted" />
                </div>

                {/* Center: Revenue Chart Card */}
                <div className="flex-1 relative overflow-hidden rounded-xl bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-100 dark:from-green-900/10 dark:to-emerald-900/10 dark:border-green-800/20 p-4 flex flex-col items-center justify-between">

                    {/* Key Metric Overlay */}


                    {/* Pro Chart */}
                    <div className="w-full h-full flex-1">
                        <ChartContainer config={chartConfig} className="h-full w-full">
                            <AreaChart data={chartData} margin={{
                                left: 0,
                                right: 0,
                                top: 10,
                                bottom: 0,
                            }} accessibilityLayer>
                                <CartesianGrid vertical={false} />

                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                />
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                {/* <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: 'var(--foreground)' }}
                                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                                    labelStyle={{ display: 'none' }}
                                /> */}
                                <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent indicator="line" />}
                                />
                                <Area
                                    // type="monotone"
                                    dataKey="revenue"
                                    type="natural"

                                    fill="green"
                                    fillOpacity={0.4}
                                    stroke="green"
                                />
                            </AreaChart>
                        </ChartContainer>
                        {/* </ResponsiveContainer> */}
                    </div>
                </div>

                {/* Bottom: Secondary Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Outstanding</p>
                        <p className="text-lg font-bold text-destructive mt-0.5">
                            ₹{stats.totalBalance.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex flex-col items-center justify-center text-center">
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Discount</p>
                        <p className="text-lg font-bold text-blue-600 mt-0.5">
                            ₹{stats.totalDiscount?.toLocaleString('en-IN') || 0}
                        </p>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
}
