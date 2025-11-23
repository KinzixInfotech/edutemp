'use client';
import { useQuery } from '@tanstack/react-query';
import { Users, GraduationCap, School } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const fetchStats = async ({ schoolId }) => {
    if (!schoolId) return null;

    // Fetch teacher count
    const teacherRes = await fetch(`/api/schools/teaching-staff/${schoolId}/count`);
    const teacherData = await teacherRes.json();

    // Fetch non-teaching staff count
    const staffRes = await fetch(`/api/schools/non-teaching-staff/${schoolId}/count`);
    const staffData = await staffRes.json();

    // Fetch student count (using gender count API as proxy for total)
    const studentRes = await fetch(`/api/schools/gender-count/${schoolId}`);
    const studentData = await studentRes.json();

    return {
        teachers: teacherData.count || 0,
        staff: staffData.count || 0,
        students: studentData.total || 0
    };
};

export default function StatsOverviewWidget({ fullUser, onRemove }) {
    const { data, isLoading } = useQuery({
        queryKey: ['statsOverview', fullUser?.schoolId],
        queryFn: () => fetchStats({ schoolId: fullUser?.schoolId }),
        enabled: !!fullUser?.schoolId,
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 col-span-1 md:col-span-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
            </div>
        );
    }

    const stats = [
        {
            label: "Total Students",
            value: data?.students,
            icon: GraduationCap,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
            border: "border-blue-500/20"
        },
        {
            label: "Teaching Staff",
            value: data?.teachers,
            icon: School,
            color: "text-purple-500",
            bg: "bg-purple-500/10",
            border: "border-purple-500/20"
        },
        {
            label: "Non-Teaching Staff",
            value: data?.staff,
            icon: Users,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
            border: "border-orange-500/20"
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 col-span-1 md:col-span-2">
            {stats.map((stat, index) => (
                <div
                    key={index}
                    className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/40 backdrop-blur-sm p-5 hover:shadow-md transition-all duration-300 group h-full flex flex-col justify-between"
                >
                    <div className={`absolute inset-0 opacity-[0.03] ${stat.bg.replace('bg-', 'bg-gradient-to-br from-')}`} />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <h4 className="text-2xl font-bold tracking-tight mt-2">{stat.value?.toLocaleString() || 0}</h4>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
