'use client';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WidgetContainer from "./WidgetContainer";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";

const fetchAttendanceSummary = async ({ schoolId }) => {
    if (!schoolId) return null;
    const date = new Date().toISOString().split('T')[0];
    const params = new URLSearchParams({
        date,
        classId: 'all'
    });
    // Use the detailed dashboard API for consistency
    const res = await fetch(`/api/schools/${schoolId}/attendance/admin/dashboard?${params}`);
    if (!res.ok) return null;
    return res.json();
};

export default function AttendanceWidget({ fullUser, onRemove }) {
    const { data, isLoading } = useQuery({
        queryKey: ['attendanceSummary', fullUser?.schoolId],
        queryFn: () => fetchAttendanceSummary({ schoolId: fullUser?.schoolId }),
        enabled: !!fullUser?.schoolId,
    });

    if (isLoading) {
        return (
            <WidgetContainer title="Today's Attendance" onRemove={onRemove} className="h-full">
                <div className="flex flex-col h-full min-h-[380px] gap-4">
                    {/* Student Section Skeleton */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-14 w-full rounded-lg" />
                            <Skeleton className="h-14 w-full rounded-lg" />
                            <Skeleton className="h-14 w-full rounded-lg" />
                        </div>
                    </div>

                    {/* Ratio Section Skeleton */}
                    <div className="flex-1 flex items-center justify-center">
                        <Skeleton className="h-24 w-full rounded-xl" />
                    </div>

                    {/* Teacher Section Skeleton */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-14 w-full rounded-lg" />
                            <Skeleton className="h-14 w-full rounded-lg" />
                            <Skeleton className="h-14 w-full rounded-lg" />
                        </div>
                    </div>
                </div>
            </WidgetContainer>
        );
    }

    // Map the detailed API response to widget format
    // API returns { roleWiseStats: [{ roleName: 'STUDENT', present: ..., absent: ... }, ...] }
    const roleStats = data?.roleWiseStats || [];

    // Helper to find stats by role name (handling potential naming differences)
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

    const chartData = [
        { name: 'Present', count: studentStats.present, fill: 'hsl(var(--blue-500))' },
        { name: 'Absent', count: studentStats.absent, fill: 'hsl(var(--red-500))' },
        { name: 'Late', count: studentStats.late, fill: 'hsl(var(--yellow-500))' },
    ];

    return (
        <WidgetContainer title="Today's Attendance" onRemove={onRemove} className="h-full">
            <div className="flex flex-col h-full gap-4">

                {/* Students Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-blue-600" />
                            <span>Students</span>
                        </div>
                        <span>Total: {studentStats.total}</span>
                    </div>
                    {/* Inline Grid for manual control or use helper */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center p-1.5 bg-blue-500/5 rounded-lg border border-blue-500/10">
                            <span className="text-lg font-bold text-blue-600">{studentStats.present}</span>
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Present</span>
                        </div>
                        <div className="flex flex-col items-center p-1.5 bg-red-500/5 rounded-lg border border-red-500/10">
                            <span className="text-lg font-bold text-red-600">{studentStats.absent}</span>
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Absent</span>
                        </div>
                        <div className="flex flex-col items-center p-1.5 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                            <span className="text-lg font-bold text-yellow-600">{studentStats.late}</span>
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Late</span>
                        </div>
                    </div>
                </div>

                {/* Center: Attendance Chart or Fallback */}
                <div className="flex-1 relative overflow-hidden rounded-xl border border-indigo-100 dark:border-indigo-800/20 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-gray-900/50 p-2 flex items-center justify-center">
                    {studentStats.present === 0 && studentStats.absent === 0 && studentStats.late === 0 ? (
                        // Fallback when no data
                        <div className="flex flex-col items-center justify-center text-center p-4">
                            <Users className="h-10 w-10 text-indigo-300 dark:text-indigo-600 mb-2" />
                            <p className="text-sm font-medium text-muted-foreground">No Attendance Recorded</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Attendance data will appear here once recorded</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-800" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#6B7280' }}
                                    dy={5}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#6B7280' }}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={28}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index === 0 ? '#3b82f6' : index === 1 ? '#ef4444' : '#eab308'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Teachers Section */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-purple-600" />
                            <span>Teachers</span>
                        </div>
                        <span>Total: {teacherStats.total}</span>
                    </div>
                    {/* Inline Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="flex flex-col items-center p-1.5 bg-purple-500/5 rounded-lg border border-purple-500/10">
                            <span className="text-lg font-bold text-purple-600">{teacherStats.present}</span>
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Present</span>
                        </div>
                        <div className="flex flex-col items-center p-1.5 bg-red-500/5 rounded-lg border border-red-500/10">
                            <span className="text-lg font-bold text-red-600">{teacherStats.absent}</span>
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Absent</span>
                        </div>
                        <div className="flex flex-col items-center p-1.5 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                            <span className="text-lg font-bold text-yellow-600">{teacherStats.late}</span>
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Late</span>
                        </div>
                    </div>
                </div>
            </div>
        </WidgetContainer>
    );
}
