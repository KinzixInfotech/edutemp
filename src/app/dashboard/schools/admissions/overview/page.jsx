"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import {
    Users, FileText, CheckCircle, TrendingUp, Clock,
    Download, RefreshCw, Plus, Eye, Search, ArrowUpRight,
    ArrowUpDown, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import Link from "next/link";

// Simple donut/pie chart component
function StageDonutChart({ stages, total }) {
    if (!stages || stages.length === 0 || total === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No stage data available
            </div>
        );
    }

    const colors = [
        '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
        '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1'
    ];

    let cumulativePercent = 0;
    const slices = stages.map((stage, i) => {
        const percent = (stage.count / total) * 100;
        const startAngle = (cumulativePercent / 100) * 360;
        const endAngle = ((cumulativePercent + percent) / 100) * 360;
        cumulativePercent += percent;

        const startRad = ((startAngle - 90) * Math.PI) / 180;
        const endRad = ((endAngle - 90) * Math.PI) / 180;
        const largeArc = percent > 50 ? 1 : 0;

        const x1 = 50 + 40 * Math.cos(startRad);
        const y1 = 50 + 40 * Math.sin(startRad);
        const x2 = 50 + 40 * Math.cos(endRad);
        const y2 = 50 + 40 * Math.sin(endRad);

        return (
            <path
                key={i}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[i % colors.length]}
                stroke="white"
                strokeWidth="1"
                className="transition-opacity hover:opacity-80"
            />
        );
    });

    return (
        <div className="flex items-center gap-6">
            <svg viewBox="0 0 100 100" className="w-40 h-40 shrink-0">
                {slices}
                <circle cx="50" cy="50" r="22" fill="white" className="dark:fill-[hsl(var(--card))]" />
                <text x="50" y="47" textAnchor="middle" className="text-[9px] font-bold fill-foreground">{total}</text>
                <text x="50" y="57" textAnchor="middle" className="text-[5px] fill-muted-foreground">Total</text>
            </svg>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                {stages.map((stage, i) => (
                    <div key={stage.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                        <span className="truncate flex-1 text-muted-foreground">{stage.name}</span>
                        <span className="font-medium tabular-nums">{stage.count}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Horizontal bar chart
function StageBarChart({ stages, total }) {
    if (!stages || stages.length === 0) {
        return (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                No stage data available
            </div>
        );
    }

    const colors = [
        'bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-red-500', 'bg-violet-500',
        'bg-cyan-500', 'bg-pink-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500'
    ];

    const maxCount = Math.max(...stages.map(s => s.count), 1);

    return (
        <div className="space-y-3">
            {stages.map((stage, i) => (
                <div key={stage.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium truncate">{stage.name}</span>
                        <span className="text-muted-foreground tabular-nums ml-2">
                            {stage.count} ({total > 0 ? Math.round((stage.count / total) * 100) : 0}%)
                        </span>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-500`}
                            style={{ width: `${(stage.count / maxCount) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Sortable header component
function SortableHeader({ column, children, sortColumn, sortDirection, onSort }) {
    return (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => onSort(column)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-3.5 h-3.5 ${sortColumn === column ? "text-primary" : "text-muted-foreground/40"}`} />
            </div>
        </TableHead>
    );
}

export default function AdmissionOverviewPage() {
    const { fullUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    // Recent apps pagination
    const [recentSearch, setRecentSearch] = useState("");
    const [recentPage, setRecentPage] = useState(1);
    const [recentPageSize, setRecentPageSize] = useState(10);
    const [recentSort, setRecentSort] = useState("submittedAt");
    const [recentSortDir, setRecentSortDir] = useState("desc");

    useEffect(() => {
        if (fullUser?.schoolId) fetchStats();
    }, [fullUser?.schoolId]);

    const fetchStats = async () => {
        setLoading(true);
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

    // Process recent applications: search → sort → paginate
    const processedRecentApps = useMemo(() => {
        let apps = stats?.recentApplications || [];

        // Search filter
        if (recentSearch.trim()) {
            const q = recentSearch.toLowerCase();
            apps = apps.filter(app =>
                app.applicantName?.toLowerCase().includes(q) ||
                app.applicantEmail?.toLowerCase().includes(q) ||
                app.form?.title?.toLowerCase().includes(q)
            );
        }

        // Sort
        apps = [...apps].sort((a, b) => {
            let aVal, bVal;
            switch (recentSort) {
                case "applicantName":
                    aVal = a.applicantName || "";
                    bVal = b.applicantName || "";
                    return recentSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                case "form":
                    aVal = a.form?.title || "";
                    bVal = b.form?.title || "";
                    return recentSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                case "status":
                    aVal = a.currentStage?.name || "";
                    bVal = b.currentStage?.name || "";
                    return recentSortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                case "submittedAt":
                default:
                    aVal = new Date(a.submittedAt).getTime();
                    bVal = new Date(b.submittedAt).getTime();
                    return recentSortDir === "asc" ? aVal - bVal : bVal - aVal;
            }
        });

        return apps;
    }, [stats, recentSearch, recentSort, recentSortDir]);

    const recentTotalPages = Math.ceil(processedRecentApps.length / recentPageSize);
    const paginatedRecentApps = processedRecentApps.slice(
        (recentPage - 1) * recentPageSize,
        recentPage * recentPageSize
    );

    // Reset page when search changes
    useEffect(() => {
        setRecentPage(1);
    }, [recentSearch]);

    const handleRecentSort = (column) => {
        if (recentSort === column) {
            setRecentSortDir(d => d === "asc" ? "desc" : "asc");
        } else {
            setRecentSort(column);
            setRecentSortDir("asc");
        }
    };

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96 mt-2" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2"><Skeleton className="h-4 w-32" /></CardHeader>
                            <CardContent><Skeleton className="h-8 w-20" /></CardContent>
                        </Card>
                    ))}
                </div>
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
                    <Link href="/dashboard/schools/admissions/applications/new">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            New Applicant
                        </Button>
                    </Link>
                </div>
            </div>

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
                            Across {stats?.formStats?.length || 0} forms
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Application Pipeline</CardTitle>
                        <CardDescription>Stage-wise distribution of applications</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StageDonutChart
                            stages={stats?.stageStats}
                            total={stats?.totalApplications || 0}
                        />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Stage Progress</CardTitle>
                        <CardDescription>Applications at each stage</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <StageBarChart
                            stages={stats?.stageStats}
                            total={stats?.totalApplications || 0}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="forms" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="forms">Forms Performance</TabsTrigger>
                    <TabsTrigger value="recent">Recent Applications</TabsTrigger>
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
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 dark:bg-background/50">
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
                                            stats?.formStats?.map((form, index) => (
                                                <TableRow key={form.formId} className={`hover:bg-muted/30 ${index % 2 === 0 ? "bg-muted/30 dark:bg-background/50" : ""}`}>
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
                                                                View Form
                                                            </Link>
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recent Activity Tab - with consistent table design & pagination */}
                <TabsContent value="recent">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle>Recent Applications ({processedRecentApps.length})</CardTitle>
                                    <CardDescription>Latest submissions received across all forms</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="relative w-72">
                                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name, email, form..."
                                            className="pl-8 h-9 pr-8"
                                            value={recentSearch}
                                            onChange={(e) => setRecentSearch(e.target.value)}
                                        />
                                        {recentSearch && (
                                            <button
                                                onClick={() => setRecentSearch("")}
                                                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    <Select value={recentPageSize.toString()} onValueChange={(v) => { setRecentPageSize(Number(v)); setRecentPage(1); }}>
                                        <SelectTrigger className="w-20">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="10">10</SelectItem>
                                            <SelectItem value="25">25</SelectItem>
                                            <SelectItem value="50">50</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 dark:bg-background/50">
                                            <SortableHeader column="applicantName" sortColumn={recentSort} sortDirection={recentSortDir} onSort={handleRecentSort}>
                                                Applicant
                                            </SortableHeader>
                                            <SortableHeader column="form" sortColumn={recentSort} sortDirection={recentSortDir} onSort={handleRecentSort}>
                                                Form
                                            </SortableHeader>
                                            <SortableHeader column="submittedAt" sortColumn={recentSort} sortDirection={recentSortDir} onSort={handleRecentSort}>
                                                Submitted
                                            </SortableHeader>
                                            <SortableHeader column="status" sortColumn={recentSort} sortDirection={recentSortDir} onSort={handleRecentSort}>
                                                Status
                                            </SortableHeader>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedRecentApps.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FileText className="w-10 h-10 text-muted-foreground/50" />
                                                        <p className="text-muted-foreground">
                                                            {recentSearch ? "No applications match your search" : "No recent applications"}
                                                        </p>
                                                        {recentSearch && (
                                                            <Button size="sm" variant="outline" onClick={() => setRecentSearch("")}>
                                                                <X className="w-4 h-4 mr-1" /> Clear Search
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRecentApps.map((app, index) => (
                                                <TableRow key={app.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted/30 dark:bg-background/50" : ""}`}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium text-sm shrink-0">
                                                                {app.applicantName?.charAt(0)?.toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-medium truncate">{app.applicantName}</p>
                                                                <p className="text-xs text-muted-foreground truncate">{app.applicantEmail || "No email"}</p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">{app.form?.title}</TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{format(new Date(app.submittedAt), "MMM d, h:mm a")}</TableCell>
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
                            </div>

                            {/* Pagination */}
                            {recentTotalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((recentPage - 1) * recentPageSize) + 1} to {Math.min(recentPage * recentPageSize, processedRecentApps.length)} of {processedRecentApps.length}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setRecentPage(p => Math.max(1, p - 1))}
                                            disabled={recentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, recentTotalPages) }, (_, i) => {
                                                let pageNum;
                                                if (recentTotalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (recentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (recentPage >= recentTotalPages - 2) {
                                                    pageNum = recentTotalPages - 4 + i;
                                                } else {
                                                    pageNum = recentPage - 2 + i;
                                                }
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={recentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setRecentPage(pageNum)}
                                                        className="w-8 h-8 p-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setRecentPage(p => Math.min(recentTotalPages, p + 1))}
                                            disabled={recentPage === recentTotalPages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}