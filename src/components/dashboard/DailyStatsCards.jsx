'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, IndianRupee, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const fetchDailyStats = async ({ schoolId, academicYearId }) => {
    if (!schoolId) return null;
    const params = new URLSearchParams({ schoolId });
    if (academicYearId) params.append('academicYearId', academicYearId);

    const res = await fetch(`/api/dashboard/daily-stats?${params}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
};

export default function DailyStatsCards({ schoolId, academicYearId }) {
    const { data, isLoading } = useQuery({
        queryKey: ['daily-stats', schoolId, academicYearId],
        queryFn: () => fetchDailyStats({ schoolId, academicYearId }),
        enabled: !!schoolId,
        refetchInterval: 60000, // Refetch every minute
    });

    const stats = [
        {
            title: 'Students Present',
            value: `${data?.studentsPresent ?? 0}`,
            subtitle: `out of ${data?.totalStudents ?? 0} students`,
            icon: Users,
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-500/10',
            description: 'Today\'s attendance'
        },
        {
            title: 'Staff Present',
            value: data?.teachersPresent ?? 0,
            icon: UserCheck,
            color: 'text-green-600 dark:text-green-400',
            bgColor: 'bg-green-500/10',
            description: 'Teaching & Non-Teaching',
            indicators: [
                { label: 'Teaching', value: data?.teachingStaffPresent ?? 0, total: data?.totalTeachingStaff ?? 0, color: 'text-emerald-600' },
                { label: 'Non-Teaching', value: data?.nonTeachingStaffPresent ?? 0, total: data?.totalNonTeachingStaff ?? 0, color: 'text-teal-600' }
            ]
        },
        {
            title: 'Collected Today',
            value: `₹${(data?.paymentsToday?.amount || 0).toLocaleString('en-IN')}`,
            subtitle: `${data?.paymentsToday?.count || 0} payments`,
            icon: IndianRupee,
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-500/10',
            description: 'Fee collection'
        },
        {
            title: 'Total Collected',
            value: `₹${(data?.totalCollected || 0).toLocaleString('en-IN')}`,
            icon: TrendingUp,
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-500/10',
            description: 'This academic year'
        }
    ];

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 rounded-lg border bg-card">
                        <Skeleton className="h-4 w-24 mb-3" />
                        <Skeleton className="h-8 w-16" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="group relative p-4 rounded-lg border bg-card hover:shadow-md transition-all duration-200"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-muted-foreground mb-2">
                                    {stat.title}
                                </p>
                                <h3 className="text-2xl font-bold tracking-tight">
                                    {stat.value}
                                </h3>
                                {stat.subtitle && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stat.subtitle}
                                    </p>
                                )}
                                {stat.indicators && (
                                    <div className="flex gap-3 mt-2">
                                        {stat.indicators.map((ind, i) => (
                                            <div key={i} className="flex items-center gap-1">
                                                <span className={`w-2 h-2 rounded-full ${ind.color === 'text-emerald-600' ? 'bg-emerald-500' : 'bg-teal-500'}`}></span>
                                                <span className="text-xs text-muted-foreground">
                                                    {ind.label}: <span className="font-medium text-foreground">{ind.value}/{ind.total}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className={`p-2.5 rounded-lg ${stat.bgColor}`}>
                                <Icon className={`h-5 w-5 ${stat.color}`} />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/40">
                            {stat.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
