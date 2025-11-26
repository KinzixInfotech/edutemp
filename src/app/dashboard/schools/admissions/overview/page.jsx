"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Users, FileText, CheckCircle, XCircle, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdmissionOverviewPage() {
    const { fullUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchStats();
        }
    }, [fullUser?.schoolId]);

    const fetchStats = async () => {
        try {
            const response = await axios.get(
                `/api/schools/${fullUser.schoolId}/admissions/stats`
            );
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
            toast.error("Failed to fetch admission statistics");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admission Overview</h1>
                <p className="text-muted-foreground">Real-time insights into your admission process.</p>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
                        <p className="text-xs text-muted-foreground">All time submissions</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.enrolledCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Successfully admitted</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
                        <p className="text-xs text-muted-foreground">Applications to Enrollments</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.stageStats?.find(s => s.name === 'Review')?.count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Awaiting initial review</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Stage Breakdown */}
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Application Pipeline</CardTitle>
                        <CardDescription>Current status of all active applications</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {stats?.stageStats?.map((stage) => (
                                <div key={stage.name} className="flex items-center">
                                    <div className="w-[150px] font-medium text-sm">{stage.name}</div>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary"
                                            style={{ width: `${stats.totalApplications > 0 ? (stage.count / stats.totalApplications) * 100 : 0}%` }}
                                        />
                                    </div>
                                    <div className="w-[50px] text-right text-sm text-muted-foreground">{stage.count}</div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Applications</CardTitle>
                        <CardDescription>Latest submissions received</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {stats?.recentApplications?.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No recent applications</p>
                            )}
                            {stats?.recentApplications?.map((app) => (
                                <div key={app.id} className="flex items-center">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">{app.applicantName}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {app.form.title} • {format(new Date(app.submittedAt), "MMM d")}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium">
                                        <Badge variant="outline">{app.currentStage?.name || "Unknown"}</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}