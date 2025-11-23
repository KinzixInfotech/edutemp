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
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-20" />
                    </div>
                    <Skeleton className="h-32 w-full rounded-lg" />
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

    const renderStatRow = (title, stats, iconComponent, bgColorClass) => (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`p-2 ${bgColorClass}/10 rounded-lg`}>
                        {iconComponent}
                    </div>
                    <span className="font-medium text-sm">{title}</span>
                </div>
                <span className="text-xs text-muted-foreground">Total: {stats.total}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center p-2 bg-green-500/5 rounded-lg border border-green-500/10">
                    <span className="text-lg font-bold text-green-600">{stats.present}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Present</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-red-500/5 rounded-lg border border-red-500/10">
                    <span className="text-lg font-bold text-red-600">{stats.absent}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Absent</span>
                </div>
                <div className="flex flex-col items-center p-2 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                    <span className="text-lg font-bold text-yellow-600">{stats.late}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Late</span>
                </div>
            </div>
        </div>
    );

    return (
        <WidgetContainer title="Today's Attendance" onRemove={onRemove} className="h-full">
            <div className="grid grid-cols-1 gap-5">
                {renderStatRow("Students", studentStats, <Users className="h-4 w-4 text-blue-600" />, "bg-blue-500")}
                <div className="h-px bg-border/40" />
                {renderStatRow("Teachers", teacherStats, <UserCheck className="h-4 w-4 text-purple-600" />, "bg-purple-500")}
            </div>
        </WidgetContainer>
    );
}
