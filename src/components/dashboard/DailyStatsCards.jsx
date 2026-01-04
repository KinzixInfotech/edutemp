'use client';

import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, IndianRupee, TrendingUp, MoreVertical } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const fetchDailyStats = async ({ schoolId, academicYearId }) => {
    if (!schoolId) return null;
    const params = new URLSearchParams({ schoolId });
    if (academicYearId) params.append('academicYearId', academicYearId);

    const res = await fetch(`/api/dashboard/daily-stats?${params}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
};

// Progress bar component
function ProgressBar({ value, max, color }) {
    const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${percentage}%` }}
            />
        </div>
    );
}

export default function DailyStatsCards({ schoolId, academicYearId }) {
    const { data, isLoading } = useQuery({
        queryKey: ['daily-stats', schoolId, academicYearId],
        queryFn: () => fetchDailyStats({ schoolId, academicYearId }),
        enabled: !!schoolId,
        refetchInterval: 60000,
    });

    const stats = [
        {
            title: 'Students Present',
            value: data?.studentsPresent ?? 0,
            total: data?.totalStudents ?? 0,
            subtitle: `out of ${data?.totalStudents ?? 0} enrolled`,
            icon: Users,
            iconBg: 'bg-blue-100 dark:bg-blue-900/40',
            iconColor: 'text-blue-600 dark:text-blue-400',
            progressColor: 'bg-blue-500',
        },
        {
            title: 'Staff Attendance',
            value: `${(data?.teachingStaffPresent ?? 0) + (data?.nonTeachingStaffPresent ?? 0)}/${(data?.totalTeachingStaff ?? 0) + (data?.totalNonTeachingStaff ?? 0)}`,
            rawValue: (data?.teachingStaffPresent ?? 0) + (data?.nonTeachingStaffPresent ?? 0),
            total: (data?.totalTeachingStaff ?? 0) + (data?.totalNonTeachingStaff ?? 0),
            subtitle: data?.teachingStaffPresent === data?.totalTeachingStaff && data?.nonTeachingStaffPresent === data?.totalNonTeachingStaff
                ? 'All teaching staff present'
                : 'Teaching & Non-teaching',
            icon: UserCheck,
            iconBg: 'bg-green-100 dark:bg-green-900/40',
            iconColor: 'text-green-600 dark:text-green-400',
            progressColor: 'bg-green-500',
        },
        {
            title: 'Collections Today',
            value: `₹${(data?.paymentsToday?.amount || 0).toLocaleString('en-IN')}`,
            rawValue: data?.paymentsToday?.amount || 0,
            total: data?.dailyTarget || 50000, // Use actual target if available
            subtitle: `${data?.paymentsToday?.count || 0} transactions processed`,
            icon: IndianRupee,
            iconBg: 'bg-purple-100 dark:bg-purple-900/40',
            iconColor: 'text-purple-600 dark:text-purple-400',
            progressColor: 'bg-purple-500',
        },
        {
            title: 'Outstanding Fees',
            value: `₹${(data?.outstandingFees || 0).toLocaleString('en-IN')}`,
            rawValue: data?.outstandingFees || 0,
            total: data?.totalFees || 100000,
            subtitle: `Across ${data?.studentsWithDues || 0} students`,
            icon: TrendingUp,
            iconBg: 'bg-orange-100 dark:bg-orange-900/40',
            iconColor: 'text-orange-600 dark:text-orange-400',
            progressColor: 'bg-orange-500',
        }
    ];

    if (isLoading) {
        return (
            <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                    KEY METRICS
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-5 rounded-xl border bg-white dark:bg-[#1a1a1d] border-gray-100 dark:border-gray-800">
                            <div className="flex items-start justify-between mb-4">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <Skeleton className="h-5 w-5 rounded" />
                            </div>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-8 w-16 mb-2" />
                            <Skeleton className="h-1.5 w-full rounded-full" />
                            <Skeleton className="h-3 w-32 mt-3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                KEY METRICS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    const progressValue = stat.rawValue !== undefined ? stat.rawValue : stat.value;

                    return (
                        <div
                            key={index}
                            className="group border relative p-5 rounded-xl border bg-white dark:bg-[#1a1a1d]  hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-200"
                        >
                            {/* Header: Icon + Menu */}
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                                </div>
                                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                    <MoreVertical className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>

                            {/* Title */}
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1">
                                {stat.title}
                            </p>

                            {/* Value */}
                            <h3 className="text-2xl font-bold text-foreground tracking-tight">
                                {typeof stat.value === 'number' ? stat.value : stat.value}
                            </h3>

                            {/* Progress Bar */}
                            <ProgressBar
                                value={typeof progressValue === 'number' ? progressValue : stat.value}
                                max={stat.total}
                                color={stat.progressColor}
                            />

                            {/* Subtitle */}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                                {stat.subtitle}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
