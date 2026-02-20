"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    Users, FileText, CheckCircle, TrendingUp, Clock,
    Download, RefreshCw, Plus, Calendar, Filter,
    MoreHorizontal, Eye, Search, ArrowUpRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import Link from 'next/link';

export default function AdmissionOverviewPage() {
    const { fullUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [academicYear, setAcademicYear] = useState("all");
    const [formId, setFormId] = useState("all");
    const [recentSearch, setRecentSearch] = useState("");

    // Debounce stats fetching slightly if needed, but direct effect is fine for selects
    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchStats();
        }
    }, [fullUser?.schoolId, academicYear, formId]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (academicYear && academicYear !== 'all') params.append('academicYearId', academicYear);
            if (formId && formId !== 'all') params.append('formId', formId);

            const response = await axios.get(
                `/api/schools/${fullUser.schoolId}/admissions/stats?${params.toString()}`
            );
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
            toast.error("Failed to fetch admission statistics");
        } finally {
            setLoading(false);
        }
    };

    // Filter recent applications client-side
    const filteredRecentApps = stats?.recentApplications?.filter(app =>
        app.applicantName?.toLowerCase().includes(recentSearch.toLowerCase()) ||
        app.applicantEmail?.toLowerCase().includes(recentSearch.toLowerCase())
    ) || [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Users className="w-6 h-6 text-primary" />
                        Admission Dashboard
                    </h1>
                    <p className="text-muted-foreground">
                        Manage applications, track enrollment, and analyze admission trends.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchStats}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Link href="/dashboard/schools/admissions/applications/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Applicant
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Academic Year</label>
                            <Select value={academicYear} onValueChange={setAcademicYear}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Years" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    <SelectItem value="2026-2027">2026-2027</SelectItem>
                                    <SelectItem value="2025-2026">2025-2026</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Admission Form</label>
                            <Select value={formId} onValueChange={setFormId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Forms" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Forms</SelectItem>
                                    {stats?.formStats?.map(f => (
                                        <SelectItem key={f.formId} value={f.formId}>{f.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2 flex items-end">
                            {/* Disabled global search placeholder to avoid confusion with local search */}
                            <div className="relative w-full opacity-50 cursor-not-allowed hidden md:block">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input disabled placeholder="Global search..." className="pl-8" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalApplications || 0}</div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {stats?.totalApplications > 0 ? (
                                <span className="text-green-500 font-medium flex items-center">
                                    <ArrowUpRight className="w-3 h-3 mr-1" /> Active
                                </span>
                            ) : (
                                <span className="text-muted-foreground">No activity</span>
                            )}
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Enrolled Students</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats?.enrolledCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.conversionRate || 0}% conversion rate
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">
                            {stats?.stageStats?.find(s => s.name === 'Review' || s.name === 'Submitted')?.count || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">Requires immediate attention</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Form Views</CardTitle>
                        <Eye className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats?.totalFormViews || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.totalFormViews > 0 ? (
                                <span>Across {stats?.formStats?.length || 0} forms</span>
                            ) : (
                                <span>No views yet</span>
                            )}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Stage Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats?.stageStats?.map((stage) => (
                    <Card key={stage.name}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3">
                            <CardTitle className="text-xs font-medium text-muted-foreground truncate" title={stage.name}>
                                {stage.name}
                            </CardTitle>
                            <div className="h-2 w-2 rounded-full bg-primary/20" />
                        </CardHeader>
                        <CardContent className="px-4 pb-3">
                            <div className="text-xl font-bold">{stage.count}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="forms" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="forms">Forms Performance</TabsTrigger>
                    <TabsTrigger value="recent">Recent Applications</TabsTrigger>
                    <TabsTrigger value="pipeline">Pipeline View</TabsTrigger>
                </TabsList>

                {/* Forms Tab */}
                <TabsContent value="forms">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Admission Forms Overview</CardTitle>
                                    <CardDescription>Performance metrics by admission form</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Form Title</TableHead>
                                        <TableHead className="text-center">Views</TableHead>
                                        <TableHead className="text-center">Applications</TableHead>
                                        <TableHead className="text-center">Enrolled</TableHead>
                                        <TableHead className="w-[200px]">Conversion</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats?.formStats?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                No forms data found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        stats?.formStats?.map((form) => (
                                            <TableRow key={form.formId}>
                                                <TableCell className="font-medium">{form.title}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-blue-600 font-medium flex items-center justify-center gap-1">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        {form.viewCount || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant="outline">{form.totalApplications}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <span className="text-green-600 font-semibold">{form.enrolledCount}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 transition-all"
                                                                style={{ width: `${form.conversionRate}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-medium w-12 text-right">
                                                            {form.conversionRate}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/dashboard/schools/admissions/applications?formId=${form.formId}`}>
                                                            View Apps
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recent Activity Tab */}
                <TabsContent value="recent">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Recent Applications</CardTitle>
                                    <CardDescription>Latest submissions received across all forms</CardDescription>
                                </div>
                                <div className="relative w-72">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or email..."
                                        className="pl-8 h-9"
                                        value={recentSearch}
                                        onChange={(e) => setRecentSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Applicant</TableHead>
                                        <TableHead>Form</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredRecentApps.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                No recent applications match your search
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredRecentApps.map((app) => (
                                            <TableRow key={app.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                                                            {app.applicantName?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{app.applicantName}</p>
                                                            <p className="text-xs text-muted-foreground">{app.applicantEmail || "No email"}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">{app.form?.title}</TableCell>
                                                <TableCell className="text-sm">{format(new Date(app.submittedAt), "MMM d, h:mm a")}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">{app.currentStage?.name}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" asChild>
                                                        <Link href={`/dashboard/schools/admissions/applications/${app.id}`}>
                                                            View
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Pipeline View */}
                <TabsContent value="pipeline">
                    <Card>
                        <CardHeader>
                            <CardTitle>Application Pipeline</CardTitle>
                            <CardDescription>Visual breakdown of application stages</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {stats?.stageStats?.map((stage, idx) => (
                                    <div key={stage.name} className="relative">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium flex items-center gap-2">
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs">
                                                    {idx + 1}
                                                </span>
                                                {stage.name}
                                            </div>
                                            <div className="text-sm font-medium">
                                                {stage.count} <span className="text-muted-foreground text-xs font-normal">applicants</span>
                                            </div>
                                        </div>
                                        <div className="h-3 bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary"
                                                style={{ width: `${stats.totalApplications > 0 ? (stage.count / stats.totalApplications) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}