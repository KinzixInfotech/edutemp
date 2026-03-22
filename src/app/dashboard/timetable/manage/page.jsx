"use client";

import React, { useState, useMemo, useCallback, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
    PieChart, Pie, Legend, LabelList,
} from "recharts";
import {
    Loader2, Plus, Eye, Clock, Calendar, Users, BookOpen, GraduationCap,
    Search, RefreshCw, ChevronRight, ChevronDown, ChevronLeft,
    ChevronsLeft, ChevronsRight, LayoutGrid, TrendingUp, BarChart3,
} from "lucide-react";
import Link from "next/link";

const PIE_COLORS = [
    "hsl(220, 70%, 55%)", "hsl(142, 71%, 45%)", "hsl(25, 95%, 53%)",
    "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)", "hsl(190, 80%, 42%)",
    "hsl(45, 93%, 47%)", "hsl(330, 80%, 55%)", "hsl(160, 60%, 45%)",
    "hsl(200, 70%, 50%)", "hsl(80, 60%, 45%)", "hsl(350, 65%, 55%)",
];

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-lg border bg-background p-2.5 shadow-xl text-xs">
            <p className="font-medium mb-1">{label}</p>
            {payload.map((p, i) => (
                <p key={i} className="text-muted-foreground">
                    {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
                </p>
            ))}
        </div>
    );
};

const PieTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0];
    return (
        <div className="rounded-lg border bg-background p-2.5 shadow-xl text-xs">
            <p className="font-medium mb-1">{d.name}</p>
            <p className="text-muted-foreground">
                Periods: <span className="font-semibold text-foreground">{d.value}</span>
            </p>
        </div>
    );
};

function displayClassName(name) {
    if (!name) return name;
    const n = name.replace(/^CLASS[_\s]*/i, "").trim();
    const map = {
        NURSERY: "Nursery", LKG: "LKG", UKG: "UKG",
        PREP: "Prep", "PRE-NURSERY": "Pre-Nursery",
    };
    if (map[n.toUpperCase()]) return map[n.toUpperCase()];
    const num = parseInt(n);
    if (!isNaN(num)) return `Class ${num}`;
    return n;
}

export default function TimetableManagePage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const { selectedYear } = useAcademicYear();
    const academicYearId = selectedYear?.id;
    const [searchQuery, setSearchQuery] = useState("");
    const [classPage, setClassPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
    const [expandedClasses, setExpandedClasses] = useState(new Set());
    const ITEMS_PER_PAGE = 15;

    // ─── Queries ───────────────────────────────────────────────────
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ["timetable-stats", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/timetable/stats`);
            if (!res.ok) throw new Error("Failed to fetch stats");
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 30000,
    });

    const { data: classes = [], isLoading: classesLoading } = useQuery({
        queryKey: ["classes-with-sections", schoolId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ includeSections: 'true' });
            if (academicYearId) params.append('academicYearId', academicYearId);
            const res = await fetch(`/api/schools/${schoolId}/classes?${params}`);
            if (!res.ok) throw new Error("Failed to fetch classes");
            return res.json();
        },
        enabled: !!schoolId,
    });

    const { data: timeSlots } = useQuery({
        queryKey: ["time-slots", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/timetable/slots`);
            if (!res.ok) throw new Error("Failed to fetch time slots");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // ─── Derived data ─────────────────────────────────────────────
    const allClasses = useMemo(() => {
        const arr = Array.isArray(classes) ? classes : (classes?.data || []);
        return arr;
    }, [classes]);

    // Filter classes by search
    const filteredClasses = useMemo(() => {
        if (!searchQuery) return allClasses;
        const q = searchQuery.toLowerCase();
        return allClasses.filter(cls =>
            cls.className?.toLowerCase().includes(q) ||
            cls.sections?.some(s => s.name?.toLowerCase().includes(q))
        );
    }, [allClasses, searchQuery]);

    // Paginate classes
    const classTotalPages = Math.max(1, Math.ceil(filteredClasses.length / ITEMS_PER_PAGE));
    const paginatedClasses = useMemo(() => {
        const start = (classPage - 1) * ITEMS_PER_PAGE;
        return filteredClasses.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredClasses, classPage]);

    // Filter + paginate teachers
    const filteredTeachers = useMemo(() => {
        if (!stats?.teacherwiseStats) return [];
        if (!searchQuery) return stats.teacherwiseStats;
        const q = searchQuery.toLowerCase();
        return stats.teacherwiseStats.filter(t =>
            t.teacherName?.toLowerCase().includes(q)
        );
    }, [stats?.teacherwiseStats, searchQuery]);

    const teacherTotalPages = Math.max(1, Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE));
    const paginatedTeachers = useMemo(() => {
        const start = (teacherPage - 1) * ITEMS_PER_PAGE;
        return filteredTeachers.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredTeachers, teacherPage]);

    // ─── Chart Data ────────────────────────────────────────────────
    const teacherWorkloadChart = useMemo(() => {
        if (!stats?.teacherwiseStats?.length) return [];
        return stats.teacherwiseStats
            .map(t => ({ name: t.teacherName, periods: t.periodCount }))
            .sort((a, b) => b.periods - a.periods)
            .slice(0, 10);
    }, [stats]);

    const subjectPieData = useMemo(() => {
        if (!stats?.subjectwiseStats?.length) return [];
        return stats.subjectwiseStats.map(s => ({
            name: s.subjectName,
            value: s.periodCount,
        }));
    }, [stats]);

    const classPeriodChart = useMemo(() => {
        if (!stats?.classwiseStats?.length) return [];
        return stats.classwiseStats
            .map(c => ({ name: displayClassName(c.className), periods: c.periodCount }))
            .sort((a, b) => b.periods - a.periods)
            .slice(0, 10);
    }, [stats]);

    // Avg periods per class
    const avgPeriodsPerClass = useMemo(() => {
        if (!stats?.totalClasses || stats.totalClasses === 0) return 0;
        return Math.round(stats.totalPeriods / stats.totalClasses);
    }, [stats]);

    // ─── Pagination helpers ────────────────────────────────────────
    const getPageNumbers = (current, total) => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, current - Math.floor(maxVisible / 2));
        let end = Math.min(total, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    const PaginationBar = ({ page, setPage, totalPages, totalItems, label }) => {
        if (totalPages <= 1) return null;
        const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
        const endItem = Math.min(page * ITEMS_PER_PAGE, totalItems);
        return (
            <div className="border-t p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                        Showing {startItem} – {endItem} of {totalItems} {label}
                    </p>
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(1)} disabled={page === 1}>
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        {getPageNumbers(page, totalPages).map(num => (
                            <Button
                                key={num}
                                variant={page === num ? "default" : "outline"}
                                size="icon"
                                className="h-8 w-8 text-xs"
                                onClick={() => setPage(num)}
                            >
                                {num}
                            </Button>
                        ))}
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const isLoading = statsLoading || classesLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">
            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 text-blue-600 lg:h-8 flex-shrink-0" />
                        <span>Timetable Management</span>
                    </h1>
                    <p className="text-xs sm:text-sm mt-2 text-muted-foreground">
                        Manage timetables, view analytics, and track teacher workload
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetchStats()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Link href="/dashboard/timetable/slots">
                        <Button variant="outline" size="sm">
                            <Clock className="mr-2 h-4 w-4" />
                            Time Slots
                        </Button>
                    </Link>
                    <Link href="/dashboard/timetable/create">
                        <Button className="dark:text-white" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Timetable
                        </Button>
                    </Link>
                </div>
            </div>

            <Separator />

            {/* ─── Stats Cards ────────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Periods</p>
                                <p className="text-2xl font-bold mt-1">{stats?.totalPeriods || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Scheduled across classes</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <LayoutGrid className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Classes</p>
                                <p className="text-2xl font-bold mt-1">{stats?.totalClasses || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">With timetables</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Teachers</p>
                                <p className="text-2xl font-bold mt-1">{stats?.totalTeachers || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Assigned to periods</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Time Slots</p>
                                <p className="text-2xl font-bold mt-1">{timeSlots?.length || 0}</p>
                                <p className="text-xs text-muted-foreground mt-1">Period slots defined</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Periods/Class</p>
                                <p className="text-2xl font-bold mt-1">{avgPeriodsPerClass}</p>
                                <p className="text-xs text-muted-foreground mt-1">Per class weekly</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Charts ─────────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Analytics Overview
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Workload, subject distribution & class insights</p>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {/* Teacher Workload Bar Chart */}
                        <Card className="border shadow-none">
                            <CardHeader className="pb-1 pt-4 px-4">
                                <CardTitle className="text-sm">Teacher Workload</CardTitle>
                                <p className="text-[11px] text-muted-foreground">Periods per week · Green ≤10 · Orange 11-20 · Red 21+</p>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                {teacherWorkloadChart.length === 0 ? (
                                    <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                                        No timetable data yet — assign periods in timetable
                                    </div>
                                ) : (
                                    <div className="h-[220px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={teacherWorkloadChart} layout="vertical" margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                                <XAxis type="number" tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                                                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={90} className="text-muted-foreground" />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="periods" name="Periods" radius={[0, 4, 4, 0]}>
                                                    {teacherWorkloadChart.map((entry, idx) => (
                                                        <Cell key={idx} fill={entry.periods >= 21 ? 'hsl(0, 72%, 51%)' : entry.periods >= 11 ? 'hsl(25, 95%, 53%)' : 'hsl(142, 71%, 45%)'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Subject Distribution Pie Chart */}
                        <Card className="border shadow-none">
                            <CardHeader className="pb-1 pt-4 px-4">
                                <CardTitle className="text-sm">Subject Distribution</CardTitle>
                                <p className="text-[11px] text-muted-foreground">Period allocation per subject</p>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                {subjectPieData.length === 0 ? (
                                    <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                                        No subject data available
                                    </div>
                                ) : (
                                    <div className="h-[220px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={subjectPieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={70}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {subjectPieData.map((_, idx) => (
                                                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<PieTooltip />} />
                                                <Legend
                                                    layout="vertical"
                                                    verticalAlign="middle"
                                                    align="right"
                                                    iconSize={8}
                                                    iconType="circle"
                                                    wrapperStyle={{ fontSize: 10, lineHeight: '18px' }}
                                                    formatter={(value) => value.length > 12 ? value.slice(0, 12) + '…' : value}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Class Periods Bar Chart */}
                        <Card className="border shadow-none">
                            <CardHeader className="pb-1 pt-4 px-4">
                                <CardTitle className="text-sm">Periods by Class</CardTitle>
                                <p className="text-[11px] text-muted-foreground">Total periods assigned per class</p>
                            </CardHeader>
                            <CardContent className="px-4 pb-4">
                                {classPeriodChart.length === 0 ? (
                                    <div className="h-[220px] flex items-center justify-center text-xs text-muted-foreground">
                                        No class data available
                                    </div>
                                ) : (
                                    <div className="h-[220px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={classPeriodChart} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                                <XAxis dataKey="name" tick={{ fontSize: 9 }} className="text-muted-foreground" />
                                                <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" allowDecimals={false} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="periods" name="Periods" radius={[4, 4, 0, 0]}>
                                                    {classPeriodChart.map((_, idx) => (
                                                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Search ─────────────────────────────────────────── */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search classes or teachers..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setClassPage(1); setTeacherPage(1); }}
                    className="pl-10 bg-muted text-sm"
                />
            </div>

            {/* ─── Tabs ───────────────────────────────────────────── */}
            <Tabs defaultValue="classes" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="classes">Class Timetables</TabsTrigger>
                    <TabsTrigger value="teachers">Teacher Workload</TabsTrigger>
                </TabsList>

                {/* ─── Class Timetables Tab ────────────────────────── */}
                <TabsContent value="classes">
                    <div className="border rounded-2xl bg-white dark:bg-muted/30">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Section</TableHead>
                                        <TableHead className="text-center">Periods</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedClasses.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12">
                                                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                                <h3 className="text-lg font-semibold mb-2">
                                                    {searchQuery ? "No classes match your search" : "No classes found"}
                                                </h3>
                                                <p className="text-sm text-muted-foreground mb-4">
                                                    {searchQuery ? "Try adjusting your search" : "Create classes first, then assign timetables"}
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedClasses.map(cls => {
                                            const isExpanded = expandedClasses.has(cls.id);
                                            const sectionCount = cls.sections?.length || 0;
                                            // Get period count for this class from stats
                                            const classStat = stats?.classwiseStats?.find(c => c.classId === cls.id);
                                            const periodCount = classStat?.periodCount || 0;

                                            const toggleExpand = () => {
                                                setExpandedClasses(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(cls.id)) next.delete(cls.id);
                                                    else next.add(cls.id);
                                                    return next;
                                                });
                                            };

                                            return (
                                                <Fragment key={cls.id}>
                                                    {/* Class Group Header */}
                                                    <TableRow
                                                        className="bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors"
                                                        onClick={toggleExpand}
                                                    >
                                                        <TableCell colSpan={4}>
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2.5">
                                                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                                    <Badge variant="outline" className="font-semibold text-sm">
                                                                        {displayClassName(cls.className)}
                                                                    </Badge>
                                                                    <span className="text-xs text-muted-foreground">
                                                                        {sectionCount} {sectionCount === 1 ? 'section' : 'sections'} · {periodCount} periods
                                                                    </span>
                                                                </div>
                                                                <Link href={`/dashboard/timetable/view/class/${cls.id}`} onClick={(e) => e.stopPropagation()}>
                                                                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                                        <Eye className="h-3.5 w-3.5 mr-1" /> View All
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>

                                                    {/* Sections (expanded) */}
                                                    {isExpanded && (
                                                        <>
                                                            {!cls.sections?.length ? (
                                                                <TableRow>
                                                                    <TableCell colSpan={4} className="py-4 text-center text-sm text-muted-foreground">
                                                                        No sections available
                                                                    </TableCell>
                                                                </TableRow>
                                                            ) : (
                                                                cls.sections.map(sec => (
                                                                    <TableRow key={sec.id} className="hover:bg-muted/50 transition-colors">
                                                                        <TableCell className="pl-10" />
                                                                        <TableCell>
                                                                            <Badge variant="secondary" className="text-xs">{sec.name}</Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-center">
                                                                            <Badge variant="outline" className="text-xs">
                                                                                {sec._count?.students || 0} students
                                                                            </Badge>
                                                                        </TableCell>
                                                                        <TableCell className="text-right">
                                                                            <div className="flex gap-2 justify-end">
                                                                                <Link href={`/dashboard/timetable/view/class/${cls.id}?sectionId=${sec.id}`}>
                                                                                    <Button variant="outline" size="sm">
                                                                                        <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                                                                                    </Button>
                                                                                </Link>
                                                                                <Link href={`/dashboard/timetable/create?classId=${cls.id}&sectionId=${sec.id}`}>
                                                                                    <Button size="sm">
                                                                                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Create
                                                                                    </Button>
                                                                                </Link>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))
                                                            )}
                                                        </>
                                                    )}
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationBar
                            page={classPage}
                            setPage={setClassPage}
                            totalPages={classTotalPages}
                            totalItems={filteredClasses.length}
                            label="classes"
                        />
                    </div>
                </TabsContent>

                {/* ─── Teacher Workload Tab ────────────────────────── */}
                <TabsContent value="teachers">
                    <div className="border rounded-2xl bg-white dark:bg-muted/30">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted sticky top-0 z-10">
                                    <TableRow>
                                        <TableHead>Teacher</TableHead>
                                        <TableHead className="text-center">Periods/Week</TableHead>
                                        <TableHead>Workload</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedTeachers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-12">
                                                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                                <h3 className="text-lg font-semibold mb-2">
                                                    {searchQuery ? "No teachers match your search" : "No teachers with assigned periods"}
                                                </h3>
                                                <p className="text-sm text-muted-foreground">
                                                    {searchQuery ? "Try adjusting your search" : "Create timetable entries to see teacher workload"}
                                                </p>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        paginatedTeachers.map(teacher => {
                                            const workloadPercent = Math.min((teacher.periodCount / 30) * 100, 100);
                                            return (
                                                <TableRow key={teacher.teacherId} className="hover:bg-muted/50 transition-colors">
                                                    <TableCell className="font-medium">{teacher.teacherName}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary">{teacher.periodCount}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[200px]">
                                                                <div
                                                                    className={`h-full rounded-full ${workloadPercent > 80 ? 'bg-red-500' : workloadPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                                    style={{ width: `${workloadPercent}%`, minWidth: "8px" }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground w-10">
                                                                {Math.round(workloadPercent)}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link href={`/dashboard/timetable/view/teacher/${teacher.teacherId}`}>
                                                            <Button variant="outline" size="sm">
                                                                <Eye className="mr-1.5 h-3.5 w-3.5" /> View
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <PaginationBar
                            page={teacherPage}
                            setPage={setTeacherPage}
                            totalPages={teacherTotalPages}
                            totalItems={filteredTeachers.length}
                            label="teachers"
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
