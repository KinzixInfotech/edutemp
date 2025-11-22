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
    const { data, isLoading } = useQuery({
        queryKey: ['feeStats', fullUser?.schoolId, fullUser?.academicYearId],
        queryFn: () => fetchFeeStats({
            schoolId: fullUser?.schoolId,
            academicYearId: fullUser?.academicYear?.id
        }),
        enabled: !!fullUser?.schoolId && !!fullUser?.academicYear?.id,
    });

    if (isLoading) {
        return (
            <WidgetContainer title="Fee Collection" onRemove={onRemove}>
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-lg" />
                    <Skeleton className="h-4 w-full" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-16 w-full rounded-lg" />
                        <Skeleton className="h-16 w-full rounded-lg" />
                    </div>
                </div>
            </WidgetContainer>
        );
    }

    const stats = data?.summary || { totalExpected: 0, totalCollected: 0, totalBalance: 0, collectionPercentage: 0 };
    const percentage = parseFloat(stats.collectionPercentage) || 0;

    return (
        <WidgetContainer title="Fee Collection" onRemove={onRemove}>
            <div className="space-y-6">
                {/* Main Stat */}
                <div className="flex items-end justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Total Collected</p>
                        <div className="flex items-center gap-1">
                            <IndianRupee className="h-6 w-6 text-primary" />
                            <span className="text-3xl font-bold tracking-tight">
                                {stats.totalCollected.toLocaleString('en-IN')}
                            </span>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full ${percentage >= 50 ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'
                        }`}>
                        {percentage >= 50 ? <TrendingUp className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                        {percentage}%
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Progress</span>
                        <span>Target: ₹{stats.totalExpected.toLocaleString('en-IN')}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs text-muted-foreground font-medium">Outstanding</p>
                        <p className="text-lg font-semibold text-destructive mt-1">
                            ₹{stats.totalBalance.toLocaleString('en-IN')}
                        </p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                        <p className="text-xs text-muted-foreground font-medium">Discount Given</p>
                        <p className="text-lg font-semibold text-blue-600 mt-1">
                            ₹{stats.totalDiscount?.toLocaleString('en-IN') || 0}
                        </p>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
}
