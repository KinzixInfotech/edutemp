"use client";

import React, { useState, useMemo, Fragment } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Calendar, CheckCircle2, XCircle, AlertTriangle,
    Clock, MapPin, Smartphone, Monitor, Globe, ChevronDown, ChevronUp,
    TrendingUp, BarChart3, UsersRound, ChevronLeft, ChevronRight,
    ChevronsLeft, ChevronsRight
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import Link from "next/link";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";

const CHART_COLORS = {
    present: 'hsl(142, 71%, 45%)',
    absent: 'hsl(0, 84%, 60%)',
    late: 'hsl(38, 92%, 50%)',
};

const RANGE_OPTIONS = [
    { value: '30d', label: 'Last 30 Days' },
    { value: '3m', label: 'Last 3 Months' },
    { value: '6m', label: 'Last 6 Months' },
    { value: '1y', label: 'Last 1 Year' },
];

function ChartTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
            <p className="font-medium text-foreground mb-1">{label}</p>
            {payload.map((p) => (
                <p key={p.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    {p.name}: <span className="font-semibold">{p.value}</span>
                </p>
            ))}
        </div>
    );
}

export default function AttendanceReportPage() {
    const { fullUser } = useAuth();
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [expandedRow, setExpandedRow] = useState(null);
    const [chartRange, setChartRange] = useState('3m');
    const [tablePage, setTablePage] = useState(1);
    const tableItemsPerPage = 10;

    // Fetch full-year attendance data
    const { data, isLoading, error } = useQuery({
        queryKey: ['attendanceReport', fullUser?.id, fullUser?.schoolId, selectedYear],
        queryFn: async () => {
            const res = await fetch(
                `/api/schools/${fullUser.schoolId}/attendance/user/${fullUser.id}?year=${selectedYear}&limit=500`
            );
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to fetch attendance report");
            }
            return res.json();
        },
        enabled: !!fullUser?.id && !!fullUser?.schoolId,
        staleTime: 1000 * 60 * 5,
    });

    const formatTime = (isoString) => {
        if (!isoString) return "--:--";
        return new Date(isoString).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            PRESENT: { class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", icon: CheckCircle2 },
            LATE: { class: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", icon: AlertTriangle },
            ABSENT: { class: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300", icon: XCircle },
            HALF_DAY: { class: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300", icon: Clock },
            ON_LEAVE: { class: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", icon: Calendar },
        };
        return styles[status] || { class: "bg-gray-100 text-gray-700", icon: Clock };
    };

    const parseDeviceInfo = (deviceInfo) => {
        if (!deviceInfo) return null;
        try {
            return typeof deviceInfo === 'string' ? JSON.parse(deviceInfo) : deviceInfo;
        } catch {
            return null;
        }
    };

    const parseLocation = (location) => {
        if (!location) return null;
        try {
            return typeof location === 'string' ? JSON.parse(location) : location;
        } catch {
            return null;
        }
    };

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 2; y--) {
        years.push(y);
    }

    // Calculate summary stats from yearly data
    const stats = useMemo(() => {
        return data?.records?.reduce((acc, record) => {
            acc.total++;
            if (record.status === 'PRESENT') acc.present++;
            if (record.status === 'LATE') acc.late++;
            if (record.status === 'ABSENT') acc.absent++;
            if (record.status === 'HALF_DAY') acc.halfDay++;
            if (record.status === 'ON_LEAVE') acc.onLeave++;
            if (record.workingHours) acc.totalHours += record.workingHours;
            return acc;
        }, { total: 0, present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, totalHours: 0 }) || { total: 0, present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, totalHours: 0 };
    }, [data?.records]);

    // Build chart data based on selected range
    const chartData = useMemo(() => {
        if (!data?.records?.length) return [];

        const now = new Date();
        let cutoffDate;
        let useMonthly = false;

        switch (chartRange) {
            case '30d':
                cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
                break;
            case '3m':
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                break;
            case '6m':
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                useMonthly = true;
                break;
            case '1y':
                cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                useMonthly = true;
                break;
            default:
                cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        }

        const filtered = data.records.filter(r => new Date(r.date) >= cutoffDate);

        if (useMonthly) {
            // Group by month
            const grouped = {};
            filtered.forEach((record) => {
                const d = new Date(record.date);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                if (!grouped[key]) grouped[key] = { date: label, _sort: key, present: 0, absent: 0, late: 0 };
                if (record.status === 'PRESENT') grouped[key].present++;
                else if (record.status === 'LATE') grouped[key].late++;
                else if (record.status === 'ABSENT') grouped[key].absent++;
            });
            return Object.values(grouped).sort((a, b) => a._sort.localeCompare(b._sort));
        } else {
            // Group by day
            const grouped = {};
            filtered.forEach((record) => {
                const d = new Date(record.date);
                const key = d.toISOString().slice(0, 10);
                const label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
                if (!grouped[key]) grouped[key] = { date: label, _sort: key, present: 0, absent: 0, late: 0 };
                if (record.status === 'PRESENT') grouped[key].present++;
                else if (record.status === 'LATE') grouped[key].late++;
                else if (record.status === 'ABSENT') grouped[key].absent++;
            });
            return Object.values(grouped).sort((a, b) => a._sort.localeCompare(b._sort));
        }
    }, [data?.records, chartRange]);

    // Attendance rate for display
    const attendanceRate = stats.total > 0
        ? (((stats.present + stats.late) / stats.total) * 100).toFixed(1)
        : 0;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid gap-4 md:grid-cols-5">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <Skeleton className="h-72 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Report</AlertTitle>
                    <AlertDescription>{error.message}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <TooltipProvider>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/dashboard/markattendance">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                                <Calendar className="w-6 h-6 text-primary" />
                                Yearly Attendance Report
                            </h1>
                            <p className="text-muted-foreground">
                                Full attendance records with charts, device info, and location
                            </p>
                        </div>
                    </div>

                    {/* Year Picker */}
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Present</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{stats.present}</div>
                            <p className="text-xs text-muted-foreground">days in {selectedYear}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Late</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{stats.late}</div>
                            <p className="text-xs text-muted-foreground">days in {selectedYear}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Absent</CardTitle>
                            <XCircle className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600">{stats.absent}</div>
                            <p className="text-xs text-muted-foreground">days in {selectedYear}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Half Day</CardTitle>
                            <Clock className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.halfDay}</div>
                            <p className="text-xs text-muted-foreground">days in {selectedYear}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Rate</CardTitle>
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{attendanceRate}%</div>
                            <p className="text-xs text-muted-foreground">{stats.totalHours.toFixed(1)} hrs total</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Attendance Trend Chart */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                                    Attendance Trend
                                </CardTitle>
                                <CardDescription>
                                    {RANGE_OPTIONS.find(r => r.value === chartRange)?.label}
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-3">
                                <Select value={chartRange} onValueChange={setChartRange}>
                                    <SelectTrigger className="w-[150px] h-8 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RANGE_OPTIONS.map(o => (
                                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <div className="hidden sm:flex items-center gap-3 text-xs">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.present }} /> Present</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.absent }} /> Absent</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.late }} /> Late</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[280px] w-full">
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={CHART_COLORS.present} stopOpacity={0.3} />
                                                <stop offset="95%" stopColor={CHART_COLORS.present} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={CHART_COLORS.absent} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={CHART_COLORS.absent} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" className="text-muted-foreground" />
                                        <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                                        <RechartsTooltip content={<ChartTooltip />} />
                                        <Area type="monotone" dataKey="present" name="Present" stroke={CHART_COLORS.present} fill="url(#gradPresent)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="absent" name="Absent" stroke={CHART_COLORS.absent} fill="url(#gradAbsent)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="late" name="Late" stroke={CHART_COLORS.late} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-2">
                                    <UsersRound className="h-10 w-10 text-muted-foreground/40" />
                                    <p className="text-sm font-medium text-muted-foreground">No Data for Range</p>
                                    <p className="text-xs text-muted-foreground/60">Try a different time range</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Detailed Records Table */}
                {(() => {
                    const records = data?.records || [];
                    const totalRecords = records.length;
                    const totalTablePages = Math.max(1, Math.ceil(totalRecords / tableItemsPerPage));
                    const paginatedRecords = records.slice((tablePage - 1) * tableItemsPerPage, tablePage * tableItemsPerPage);
                    const startItem = totalRecords === 0 ? 0 : (tablePage - 1) * tableItemsPerPage + 1;
                    const endItem = Math.min(tablePage * tableItemsPerPage, totalRecords);

                    const getPageNumbers = () => {
                        const pages = [];
                        const maxVisible = 5;
                        let start = Math.max(1, tablePage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalTablePages, start + maxVisible - 1);
                        if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                        for (let i = start; i <= end; i++) pages.push(i);
                        return pages;
                    };

                    return (
                        <div className="border rounded-2xl bg-white dark:bg-muted/30">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Check In</TableHead>
                                            <TableHead>Check Out</TableHead>
                                            <TableHead>Working Hours</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right w-[40px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            Array.from({ length: 6 }).map((_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                                                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                                    <TableCell><Skeleton className="h-4 w-4 ml-auto" /></TableCell>
                                                </TableRow>
                                            ))
                                        ) : paginatedRecords.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={6} className="text-center py-12">
                                                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
                                                    <h3 className="text-lg font-medium mb-1">No Records Found</h3>
                                                    <p className="text-sm text-muted-foreground">No attendance records for {selectedYear}</p>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedRecords.map((record) => {
                                                const deviceInfo = parseDeviceInfo(record.deviceInfo);
                                                const checkInLocation = parseLocation(record.checkInLocation);
                                                const checkOutLocation = parseLocation(record.checkOutLocation);
                                                const statusStyle = getStatusBadge(record.status);
                                                const StatusIcon = statusStyle.icon;
                                                const isExpanded = expandedRow === record.id;

                                                return (
                                                    <Fragment key={record.id}>
                                                        <TableRow
                                                            className={cn(
                                                                "cursor-pointer transition-colors",
                                                                isExpanded ? "bg-muted/50" : "hover:bg-muted/30"
                                                            )}
                                                            onClick={() => setExpandedRow(isExpanded ? null : record.id)}
                                                        >
                                                            <TableCell>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{formatDate(record.date)}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-emerald-600 font-medium text-sm">{formatTime(record.checkInTime)}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-rose-600 font-medium text-sm">{formatTime(record.checkOutTime)}</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <span className="text-sm font-medium">{record.workingHours?.toFixed(2) || '--'} hrs</span>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline" className={cn("flex items-center gap-1 w-fit", statusStyle.class)}>
                                                                    <StatusIcon className="h-3 w-3" />
                                                                    {record.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {isExpanded ? (
                                                                    <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />
                                                                )}
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* Expanded Detail Row */}
                                                        {isExpanded && (
                                                            <TableRow className="bg-muted/20 hover:bg-muted/20">
                                                                <TableCell colSpan={6} className="p-0">
                                                                    <div className="px-6 py-4 space-y-4">
                                                                        {/* Time Details */}
                                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                                                            <div className="p-3 bg-background rounded-lg border">
                                                                                <p className="text-xs text-muted-foreground uppercase font-medium">Check In</p>
                                                                                <p className="text-lg font-semibold text-emerald-600">{formatTime(record.checkInTime)}</p>
                                                                            </div>
                                                                            <div className="p-3 bg-background rounded-lg border">
                                                                                <p className="text-xs text-muted-foreground uppercase font-medium">Check Out</p>
                                                                                <p className="text-lg font-semibold text-rose-600">{formatTime(record.checkOutTime)}</p>
                                                                            </div>
                                                                            <div className="p-3 bg-background rounded-lg border">
                                                                                <p className="text-xs text-muted-foreground uppercase font-medium">Working Hours</p>
                                                                                <p className="text-lg font-semibold">{record.workingHours?.toFixed(2) || '--'} hrs</p>
                                                                            </div>
                                                                            <div className="p-3 bg-background rounded-lg border">
                                                                                <p className="text-xs text-muted-foreground uppercase font-medium">Late By</p>
                                                                                <p className={cn("text-lg font-semibold", record.lateByMinutes ? "text-amber-600" : "text-emerald-600")}>
                                                                                    {record.lateByMinutes ? `${record.lateByMinutes} mins` : 'On Time'}
                                                                                </p>
                                                                            </div>
                                                                        </div>

                                                                        {/* Device & Location Info */}
                                                                        <div className="grid md:grid-cols-2 gap-4">
                                                                            {/* Device Info */}
                                                                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-100 dark:border-blue-900">
                                                                                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                                                                                    <Smartphone className="h-4 w-4 text-blue-600" />
                                                                                    Device Information
                                                                                </h4>
                                                                                {deviceInfo ? (
                                                                                    <div className="space-y-2 text-sm">
                                                                                        {deviceInfo.ipAddress && (
                                                                                            <div className="flex items-start gap-2">
                                                                                                <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                                                                <div>
                                                                                                    <span className="font-medium">IP Address:</span>
                                                                                                    <span className="ml-2 font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{deviceInfo.ipAddress}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        {deviceInfo.platform && (
                                                                                            <div className="flex items-start gap-2">
                                                                                                <Monitor className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                                                                <div>
                                                                                                    <span className="font-medium">Platform:</span>
                                                                                                    <span className="ml-2">{deviceInfo.platform}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                        {deviceInfo.userAgent && (
                                                                                            <div className="flex items-start gap-2">
                                                                                                <Smartphone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                                                                                <div>
                                                                                                    <span className="font-medium">User Agent:</span>
                                                                                                    <p className="text-xs text-muted-foreground break-all mt-1">{deviceInfo.userAgent}</p>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-sm text-muted-foreground">No device info captured</p>
                                                                                )}
                                                                            </div>

                                                                            {/* Location Info with Google Maps */}
                                                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                                                                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                                                                                    <MapPin className="h-4 w-4 text-emerald-600" />
                                                                                    Location Information
                                                                                </h4>
                                                                                <div className="space-y-4 text-sm">
                                                                                    <div>
                                                                                        <span className="font-medium text-emerald-700 dark:text-emerald-300">Check-In:</span>
                                                                                        {checkInLocation ? (
                                                                                            <div className="mt-2">
                                                                                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                                                                    {checkInLocation.latitude?.toFixed(6)}, {checkInLocation.longitude?.toFixed(6)}
                                                                                                </span>
                                                                                                <div className="mt-2 rounded-lg overflow-hidden border">
                                                                                                    <iframe
                                                                                                        title="Check-in location"
                                                                                                        width="100%"
                                                                                                        height="150"
                                                                                                        style={{ border: 0 }}
                                                                                                        loading="lazy"
                                                                                                        referrerPolicy="no-referrer-when-downgrade"
                                                                                                        src={`https://maps.google.com/maps?q=${checkInLocation.latitude},${checkInLocation.longitude}&z=15&output=embed`}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-muted-foreground ml-2">Not captured</span>
                                                                                        )}
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-medium text-rose-700 dark:text-rose-300">Check-Out:</span>
                                                                                        {checkOutLocation ? (
                                                                                            <div className="mt-2">
                                                                                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                                                                    {checkOutLocation.latitude?.toFixed(6)}, {checkOutLocation.longitude?.toFixed(6)}
                                                                                                </span>
                                                                                                <div className="mt-2 rounded-lg overflow-hidden border">
                                                                                                    <iframe
                                                                                                        title="Check-out location"
                                                                                                        width="100%"
                                                                                                        height="150"
                                                                                                        style={{ border: 0 }}
                                                                                                        loading="lazy"
                                                                                                        referrerPolicy="no-referrer-when-downgrade"
                                                                                                        src={`https://maps.google.com/maps?q=${checkOutLocation.latitude},${checkOutLocation.longitude}&z=15&output=embed`}
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <span className="text-muted-foreground ml-2">Not captured</span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Remarks */}
                                                                        {record.remarks && (
                                                                            <div className="p-3 bg-muted/50 rounded-lg border">
                                                                                <span className="font-medium text-sm">Remarks:</span>
                                                                                <p className="text-sm text-muted-foreground mt-1">{record.remarks}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </Fragment>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalTablePages > 1 && (
                                <div className="border-t p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {startItem} – {endItem} of {totalRecords} records
                                        </p>
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTablePage(1)} disabled={tablePage === 1}>
                                                <ChevronsLeft className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTablePage(p => Math.max(p - 1, 1))} disabled={tablePage === 1}>
                                                <ChevronLeft className="h-4 w-4" />
                                            </Button>
                                            {getPageNumbers().map(num => (
                                                <Button
                                                    key={num}
                                                    variant={tablePage === num ? "default" : "outline"}
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setTablePage(num)}
                                                >
                                                    {num}
                                                </Button>
                                            ))}
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTablePage(p => Math.min(p + 1, totalTablePages))} disabled={tablePage === totalTablePages}>
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setTablePage(totalTablePages)} disabled={tablePage === totalTablePages}>
                                                <ChevronsRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>
        </TooltipProvider>
    );
}
