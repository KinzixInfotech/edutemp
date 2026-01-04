'use client';

/**
 * AI Insights Section Component
 * Displays AI-generated insights in a 3-column card layout
 * 
 * Features:
 * - PRO badge in section header
 * - Category badges (PREDICTIVE, FINANCIAL, ACADEMIC)
 * - AI DERIVED label with sparkle icon
 * - View Detail links
 * - Loading skeleton matching design
 */

import { Sparkles, Calendar, Loader2, MoreHorizontal, Bot, TrendingUp, TrendingDown, Users, IndianRupee, RefreshCw } from 'lucide-react';
import { useDashboardContext } from '@/hooks/useDashboardContext';
import { useAiInsights } from '@/hooks/useAiInsights';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

// Category badge styles
const CATEGORY_STYLES = {
    ATTENDANCE: {
        bg: 'bg-purple-100 dark:bg-purple-900/40',
        text: 'text-purple-700 dark:text-purple-300',
    },
    FINANCIAL: {
        bg: 'bg-orange-100 dark:bg-orange-900/40',
        text: 'text-orange-700 dark:text-orange-300',
    },
    ACADEMIC: {
        bg: 'bg-green-100 dark:bg-green-900/40',
        text: 'text-green-700 dark:text-green-300',
    },
    EXAM: {
        bg: 'bg-red-100 dark:bg-red-900/40',
        text: 'text-red-700 dark:text-red-300',
    },
    EVENT: {
        bg: 'bg-blue-100 dark:bg-blue-900/40',
        text: 'text-blue-700 dark:text-blue-300',
    },
    GENERAL: {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-700 dark:text-gray-300',
    },
};

// Default insights when AI/data is unavailable
const DEFAULT_INSIGHTS = [
    {
        category: 'ATTENDANCE',
        title: 'Attendance Update',
        description: 'Loading attendance data...',
        type: 'loading',
    },
    {
        category: 'FINANCIAL',
        title: 'Fee Collection',
        description: 'Loading fee data...',
        type: 'loading',
    },
    {
        category: 'EVENT',
        title: 'School Calendar',
        description: 'Loading upcoming events...',
        type: 'loading',
    },
];

function InsightCardSkeleton() {
    return (
        <div className="p-5 rounded-xl border bg-white dark:bg-[#1a1a1d] border-gray-100 dark:border-gray-800 animate-pulse">
            <div className="flex items-start justify-between mb-4">
                <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-5 w-5 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
            <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        </div>
    );
}

function InsightCard({ insight, index }) {
    const categoryStyle = CATEGORY_STYLES[insight.category] || CATEGORY_STYLES.GENERAL;

    return (
        <div className="group p-5 rounded-xl border bg-white dark:bg-[#1a1a1d] border dark:border-gray-800 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200">
            {/* Header: Badge + Menu */}
            <div className="flex items-start justify-between mb-4">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${categoryStyle.bg} ${categoryStyle.text}`}>
                    {insight.category}
                </span>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                </button>
            </div>

            {/* Title */}
            <h4 className="text-base font-semibold text-foreground mb-2">
                {insight.title}
            </h4>

            {/* Description */}
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                {insight.description}
            </p>

            {/* Footer: AI Derived + View Detail */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">AI DERIVED</span>
                </div>
                <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                    View Detail
                </button>
            </div>
        </div>
    );
}

// Mock data for charts
const REVENUE_DATA = [
    { date: 'Mon', revenue: 45000 },
    { date: 'Tue', revenue: 52000 },
    { date: 'Wed', revenue: 49000 },
    { date: 'Thu', revenue: 63000 },
    { date: 'Fri', revenue: 58000 },
    { date: 'Sat', revenue: 35000 },
    { date: 'Sun', revenue: 0 },
];

const ATTENDANCE_DATA = [
    { date: 'Mon', present: 95, absent: 5 },
    { date: 'Tue', present: 92, absent: 8 },
    { date: 'Wed', present: 96, absent: 4 },
    { date: 'Thu', present: 94, absent: 6 },
    { date: 'Fri', present: 88, absent: 12 },
    { date: 'Sat', present: 85, absent: 15 },
];

const chartConfig = {
    revenue: {
        label: "Revenue",
        color: "hsl(var(--chart-1))",
    },
    present: {
        label: "Present",
        color: "hsl(var(--chart-2))",
    },
};

function NonAiDayCard({ context }) {
    const dayType = context?.dayType || 'SUNDAY';
    const isHoliday = dayType === 'HOLIDAY';
    const isSunday = dayType === 'SUNDAY';
    const isVacation = dayType === 'VACATION';

    const getTitle = () => {
        if (isSunday) return 'Sunday';
        if (isHoliday) return context?.holidayName || 'Holiday';
        if (isVacation) return 'Vacation';
        return dayType.replace('_', ' ');
    };

    const getMessage = () => {
        if (context?.messages?.general) return context.messages.general;
        if (isSunday) return 'School is closed today. Take time to rest and prepare for the week ahead.';
        if (isHoliday) return 'School is closed for the holiday. We hope you have a great day!';
        if (isVacation) return 'School is on vacation. Use this time to recharge.';
        return 'School is closed today.';
    };

    return (
        <div className="col-span-full p-6 rounded-xl border bg-white dark:bg-[#1a1a1d] border-gray-200 dark:border-gray-800">
            <div className="flex flex-col items-center justify-center text-center py-4">
                {/* Icon */}
                <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 mb-3">
                    <Calendar className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>

                {/* Title + Badge */}
                <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-lg font-semibold text-foreground">
                        {getTitle()}
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded uppercase">
                        {isSunday ? 'Weekend' : isHoliday ? 'Holiday' : isVacation ? 'Break' : 'Closed'}
                    </span>
                </div>

                {/* Message */}
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                    {getMessage()}
                </p>

                {/* Next Working Day */}
                {context?.nextWorkingDay && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span className="text-xs text-muted-foreground">
                            Next: <span className="font-medium text-foreground">{new Date(context.nextWorkingDay).toLocaleDateString('en-IN', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                            })}</span>
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export function AiInsightsCard({ schoolId }) {
    const {
        data: context,
        isLoading: contextLoading,
    } = useDashboardContext(schoolId);

    const {
        data: insightsData,
        isLoading: insightsLoading,
        refetch,
        isFetching,
    } = useAiInsights(schoolId, context?.aiAllowed);

    // Parse insights into card format (works with both AI and live hints)
    const parseInsights = (rawInsights) => {
        if (!rawInsights || rawInsights.length === 0) return DEFAULT_INSIGHTS;

        return rawInsights.map((insight, index) => {
            // Handle object format (from combined hook) or string format
            const text = typeof insight === 'object' ? (insight.text || insight.hint) : insight;
            const sourceCategory = typeof insight === 'object' ? insight.category : null;

            // Determine category based on content keywords or source category
            let category = sourceCategory || 'GENERAL';
            if (!sourceCategory && text) {
                const lowerInsight = text.toLowerCase();
                if (lowerInsight.includes('attendance') || lowerInsight.includes('present')) {
                    category = 'ATTENDANCE';
                } else if (lowerInsight.includes('fee') || lowerInsight.includes('payment') || lowerInsight.includes('₹') || lowerInsight.includes('collected')) {
                    category = 'FINANCIAL';
                } else if (lowerInsight.includes('exam') || lowerInsight.includes('grade') || lowerInsight.includes('performance')) {
                    category = 'ACADEMIC';
                } else if (lowerInsight.includes('event') || lowerInsight.includes('calendar')) {
                    category = 'EVENT';
                }
            }

            // Generate title
            const title = typeof insight === 'object' && insight.title
                ? insight.title
                : category === 'ATTENDANCE' ? 'Attendance Update'
                    : category === 'FINANCIAL' ? 'Fee Collection'
                        : category === 'ACADEMIC' ? 'Academic Insight'
                            : category === 'EVENT' ? 'Upcoming Event'
                                : `Insight ${index + 1}`;

            return {
                category,
                title,
                description: text,
                source: typeof insight === 'object' ? insight.source : 'AI',
            };
        });
    };

    const insights = context?.aiAllowed && insightsData?.insights
        ? parseInsights(insightsData.insights).slice(0, 3)
        : DEFAULT_INSIGHTS;

    const isLoading = contextLoading || insightsLoading;

    // Handle refresh - only refetch, don't force regenerate (cost-controlled)
    const handleRefresh = () => {
        if (!isFetching) {
            refetch();
        }
    };

    return (
        <div className="mb-6">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        AI-POWERED INSIGHTS
                    </h3>
                    {insightsData?.cached && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                            CACHED
                        </span>
                    )}
                </div>

                {/* Refresh Button */}
                {context?.aiAllowed && (
                    <button
                        onClick={handleRefresh}
                        disabled={isFetching || isLoading}
                        className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-purple-500 dark:hover:text-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refresh insights"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                )}
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {isLoading ? (
                    <>
                        <InsightCardSkeleton />
                        <InsightCardSkeleton />
                        <InsightCardSkeleton />
                    </>
                ) : !context?.aiAllowed ? (
                    <NonAiDayCard context={context} />
                ) : (
                    insights.map((insight, index) => (
                        <InsightCard key={index} insight={insight} index={index} />
                    ))
                )}
            </div>
        </div>
    );
}

export default AiInsightsCard;
