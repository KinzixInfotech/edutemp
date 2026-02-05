'use client';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, TrendingUp, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WidgetContainer from "./WidgetContainer";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const fetchAttendanceSummary = async ({ schoolId }) => {
    if (!schoolId) return null;
    const date = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({
        date,
        classId: 'all'
    });
    const res = await fetch(`/api/schools/${schoolId}/attendance/admin/dashboard?${params}`);
    if (!res.ok) return null;
    return res.json();
};

// Radial Progress Ring Component
const RadialProgress = ({ percentage, size = 120, strokeWidth = 10, color = "#3b82f6" }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-muted/20"
                />
                {/* Progress circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{Math.round(percentage)}%</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Present</span>
            </div>
        </div>
    );
};

export default function AttendanceWidget({ fullUser, onRemove, data: propData }) {
    // Use prop data if provided (from consolidated API), otherwise fetch independently
    const { data: fetchedData, isLoading: fetchLoading } = useQuery({
        queryKey: ['attendanceSummary', fullUser?.schoolId],
        queryFn: () => fetchAttendanceSummary({ schoolId: fullUser?.schoolId }),
        enabled: !!fullUser?.schoolId && !propData,
    });

    const data = propData || fetchedData;
    const isLoading = !propData && fetchLoading;

    if (isLoading) {
        return (
            <WidgetContainer title="Today's Attendance" onRemove={onRemove} className="h-full">
                <div className="flex flex-col h-full min-h-[380px] gap-4">
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                        </div>
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                        <Skeleton className="h-32 w-32 rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                            <Skeleton className="h-14 w-full rounded-xl" />
                        </div>
                    </div>
                </div>
            </WidgetContainer>
        );
    }

    const roleStats = data?.roleWiseStats || [];

    const getStats = (roleName) => {
        const stat = roleStats.find(s => s.roleName === roleName || s.roleId === roleName) || { present: 0, absent: 0, late: 0, totalUsers: 0 };
        return {
            present: stat.present,
            absent: stat.absent,
            late: stat.late,
            total: stat.totalUsers
        };
    };

    const studentStats = getStats('STUDENT');
    const teacherStats = getStats('TEACHING_STAFF');

    // Calculate attendance percentage
    const studentPercentage = studentStats.total > 0
        ? ((studentStats.present + studentStats.late) / studentStats.total) * 100
        : 0;

    const teacherPercentage = teacherStats.total > 0
        ? ((teacherStats.present + teacherStats.late) / teacherStats.total) * 100
        : 0;

    // Data for mini donut charts
    const studentDonutData = [
        { name: 'Present', value: studentStats.present, color: '#22c55e' },
        { name: 'Late', value: studentStats.late, color: '#eab308' },
        { name: 'Absent', value: studentStats.absent, color: '#ef4444' },
    ].filter(d => d.value > 0);

    const hasStudentData = studentStats.present > 0 || studentStats.absent > 0 || studentStats.late > 0;

    return (
        <WidgetContainer title="Today's Attendance" onRemove={onRemove} className="h-full">
            <div className="flex flex-col h-full gap-4">

                {/* Students Section */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-blue-500/10">
                                <Users className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <span className="font-semibold text-foreground">Students</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
                            {studentStats.total} Total
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="group flex flex-col items-center p-2.5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-500/10 dark:to-emerald-500/5 rounded-xl border border-emerald-200/50 dark:border-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/10 transition-all">
                            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{studentStats.present}</span>
                            <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider font-medium">Present</span>
                        </div>
                        <div className="group flex flex-col items-center p-2.5 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-500/10 dark:to-red-500/5 rounded-xl border border-red-200/50 dark:border-red-500/20 hover:shadow-md hover:shadow-red-500/10 transition-all">
                            <span className="text-xl font-bold text-red-600 dark:text-red-400">{studentStats.absent}</span>
                            <span className="text-[9px] text-red-600/70 dark:text-red-400/70 uppercase tracking-wider font-medium">Absent</span>
                        </div>
                        <div className="group flex flex-col items-center p-2.5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5 rounded-xl border border-amber-200/50 dark:border-amber-500/20 hover:shadow-md hover:shadow-amber-500/10 transition-all">
                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{studentStats.late}</span>
                            <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider font-medium">Late</span>
                        </div>
                    </div>
                </div>

                {/* Center: Radial Progress Chart */}
                <div className="flex-1 relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-slate-50/80 via-white to-blue-50/30 dark:from-slate-900/50 dark:via-slate-900/30 dark:to-blue-900/10 p-4 flex items-center justify-center">
                    {!hasStudentData ? (
                        <div className="flex flex-col items-center justify-center text-center p-4">
                            <div className="p-3 rounded-full bg-muted/50 mb-3">
                                <Users className="h-8 w-8 text-muted-foreground/50" />
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">No Attendance Yet</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Data appears once recorded</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <RadialProgress
                                percentage={studentPercentage}
                                size={130}
                                strokeWidth={12}
                                color={studentPercentage >= 80 ? "#22c55e" : studentPercentage >= 60 ? "#eab308" : "#ef4444"}
                            />
                            <div className="flex items-center gap-4 text-xs">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                    <span className="text-muted-foreground">Present</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                    <span className="text-muted-foreground">Late</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                    <span className="text-muted-foreground">Absent</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Teachers Section */}
                <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <div className="p-1 rounded-md bg-purple-500/10">
                                <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                            </div>
                            <span className="font-semibold text-foreground">Teachers</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
                            {teacherStats.total} Total
                        </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <div className="group flex flex-col items-center p-2.5 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-500/10 dark:to-violet-500/5 rounded-xl border border-violet-200/50 dark:border-violet-500/20 hover:shadow-md hover:shadow-violet-500/10 transition-all">
                            <span className="text-xl font-bold text-violet-600 dark:text-violet-400">{teacherStats.present}</span>
                            <span className="text-[9px] text-violet-600/70 dark:text-violet-400/70 uppercase tracking-wider font-medium">Present</span>
                        </div>
                        <div className="group flex flex-col items-center p-2.5 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-500/10 dark:to-red-500/5 rounded-xl border border-red-200/50 dark:border-red-500/20 hover:shadow-md hover:shadow-red-500/10 transition-all">
                            <span className="text-xl font-bold text-red-600 dark:text-red-400">{teacherStats.absent}</span>
                            <span className="text-[9px] text-red-600/70 dark:text-red-400/70 uppercase tracking-wider font-medium">Absent</span>
                        </div>
                        <div className="group flex flex-col items-center p-2.5 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-500/10 dark:to-amber-500/5 rounded-xl border border-amber-200/50 dark:border-amber-500/20 hover:shadow-md hover:shadow-amber-500/10 transition-all">
                            <span className="text-xl font-bold text-amber-600 dark:text-amber-400">{teacherStats.late}</span>
                            <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70 uppercase tracking-wider font-medium">Late</span>
                        </div>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
}
