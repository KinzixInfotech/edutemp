'use client';
import { useQuery } from '@tanstack/react-query';
import { IndianRupee, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import WidgetContainer from "./WidgetContainer";

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
            <WidgetContainer title="Fee Collection" onRemove={onRemove}>
                <div className="space-y-6">
                    <div className="flex justify-between items-end">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-2 w-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-24 w-full rounded-lg" />
                        <Skeleton className="h-24 w-full rounded-lg" />
                    </div>
                </div>
            </WidgetContainer>
        );
    }

    const stats = data?.summary || { totalExpected: 0, totalCollected: 0, totalBalance: 0, collectionPercentage: 0 };
    const percentage = parseFloat(stats.collectionPercentage) || 0;

    return (
        <WidgetContainer title="Fee Collection" onRemove={onRemove} className="h-full">
            <div className="flex flex-col h-full gap-4">

                {/* Top: Progress and Target */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                        <span>Collection Progress</span>
                        <span>Target: ₹{stats.totalExpected.toLocaleString('en-IN')}</span>
                    </div>
                    <Progress value={percentage} className="h-2.5 bg-muted" />
                </div>

                {/* Center: "Profit"/Revenue Highlight */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50/50 border border-green-100 dark:from-green-900/10 dark:to-emerald-900/10 dark:border-green-800/20">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-green-600/80 dark:text-green-400">Total Revenue</span>
                        <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${percentage >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-yellow-100 text-yellow-700'}`}>
                            {percentage >= 50 ? <TrendingUp className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                            {percentage}%
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <IndianRupee className="h-8 w-8 text-green-600 dark:text-green-400" />
                        <span className="text-4xl font-extrabold tracking-tight text-green-600 dark:text-green-400">
                            {stats.totalCollected.toLocaleString('en-IN')}
                        </span>
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
