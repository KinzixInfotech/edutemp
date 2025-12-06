'use client';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, UserX, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import WidgetContainer from "./WidgetContainer";

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
            <WidgetContainer title="Today's Attendance" onRemove={onRemove}>
                <div className="space-y-6">
                    {/* Student Skeleton */}
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                        </div>
                    </div>
                    {/* Teacher Skeleton */}
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-5 w-24" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                            <Skeleton className="h-16 w-full rounded-lg" />
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

    // Calculate Ratio check for zeros
    const ratio = teacherStats.total > 0 ? Math.round(studentStats.total / teacherStats.total) : 0;



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

                {/* Center: Ratio Highlight */}
                <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50/50 border border-indigo-100 dark:from-indigo-900/10 dark:to-purple-900/10 dark:border-indigo-800/20">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600/80 dark:text-indigo-400">Student-Teacher Ratio</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Users className="h-6 w-6 text-indigo-600 dark:text-indigo-400 opacity-60" />
                        <span className="text-3xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
                            {ratio}<span className="text-xl text-indigo-400 dark:text-indigo-600">:1</span>
                        </span>
                    </div>
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
