// app/admissions/dashboard.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchDashboardStats(schoolId) {
    const response = await fetch(`/api/schools/admissions/applications?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch stats");
    const { applications } = await response.json();
    const stats = {
        total: applications.length,
        shortlisted: applications.filter(app => app.currentStage.name === "Shortlisted").length,
        offers: applications.filter(app => app.currentStage.name === "Offer Sent").length,
        enrolled: applications.filter(app => app.currentStage.name === "Enrolled").length,
        rejected: applications.filter(app => app.currentStage.name === "Rejected").length,
    };
    return stats;
}

export default function Dashboard() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const { data: stats, isLoading } = useQuery({
        queryKey: ["dashboardStats", schoolId],
        queryFn: () => fetchDashboardStats(schoolId),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) return <div className="flex justify-center h-full items-center p-6"><Loader2 className="animate-spin" size={45} /></div>;

    return (
        <div className="p-6 grid grid-cols-1 md:grid-cols-5 gap-4">
            {stats && (
                <>
                    <Card>
                        <CardHeader><CardTitle>Total Applications</CardTitle></CardHeader>
                        <CardContent><Badge variant="secondary">{stats.total}</Badge></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Shortlisted</CardTitle></CardHeader>
                        <CardContent><Badge variant="secondary">{stats.shortlisted}</Badge></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Offers Sent</CardTitle></CardHeader>
                        <CardContent><Badge variant="secondary">{stats.offers}</Badge></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Enrolled</CardTitle></CardHeader>
                        <CardContent><Badge variant="secondary">{stats.enrolled}</Badge></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Rejected</CardTitle></CardHeader>
                        <CardContent><Badge variant="secondary">{stats.rejected}</Badge></CardContent>
                    </Card>
                </>
            )}

        </div>
    );
}