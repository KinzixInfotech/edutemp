"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Calendar, CheckCircle2, XCircle, AlertTriangle,
    Clock, MapPin, Smartphone, Monitor, Globe, ChevronDown, ChevronUp,
    Download, Filter, TrendingUp
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Link from "next/link";

export default function AttendanceReportPage() {
    const { fullUser } = useAuth();
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [expandedRow, setExpandedRow] = useState(null);

    // Fetch full attendance history
    const { data, isLoading, error } = useQuery({
        queryKey: ['attendanceReport', fullUser?.id, fullUser?.schoolId, selectedMonth, selectedYear],
        queryFn: async () => {
            const res = await fetch(
                `/api/schools/${fullUser.schoolId}/attendance/user/${fullUser.id}?month=${selectedMonth}&year=${selectedYear}&limit=100`
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
            year: "numeric"
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

    const months = [
        { value: 1, label: "January" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" },
    ];

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= currentYear - 2; y--) {
        years.push(y);
    }

    // Calculate summary stats
    const stats = data?.records?.reduce((acc, record) => {
        acc.total++;
        if (record.status === 'PRESENT') acc.present++;
        if (record.status === 'LATE') acc.late++;
        if (record.status === 'ABSENT') acc.absent++;
        if (record.status === 'HALF_DAY') acc.halfDay++;
        if (record.status === 'ON_LEAVE') acc.onLeave++;
        if (record.workingHours) acc.totalHours += record.workingHours;
        return acc;
    }, { total: 0, present: 0, late: 0, absent: 0, halfDay: 0, onLeave: 0, totalHours: 0 }) || {};

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid gap-4 md:grid-cols-5">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
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
                {/* Header with Back Button */}
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
                                Full Attendance Report
                            </h1>
                            <p className="text-muted-foreground">
                                Detailed attendance records including device info and location
                            </p>
                        </div>
                    </div>

                    {/* Month/Year Filter */}
                    <div className="flex items-center gap-2">
                        <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((month) => (
                                    <SelectItem key={month.value} value={month.value.toString()}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                            <SelectTrigger className="w-[100px]">
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
                </div>

                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Present</CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{stats.present || 0}</div>
                            <p className="text-xs text-muted-foreground">days</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Late</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{stats.late || 0}</div>
                            <p className="text-xs text-muted-foreground">days</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Absent</CardTitle>
                            <XCircle className="h-4 w-4 text-rose-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-rose-600">{stats.absent || 0}</div>
                            <p className="text-xs text-muted-foreground">days</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Half Day</CardTitle>
                            <Clock className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600">{stats.halfDay || 0}</div>
                            <p className="text-xs text-muted-foreground">days</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                            <TrendingUp className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.totalHours?.toFixed(1) || 0}</div>
                            <p className="text-xs text-muted-foreground">hours worked</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Records Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-muted-foreground" />
                            Attendance Records
                        </CardTitle>
                        <CardDescription>
                            Click on any row to expand and view device info, location, and IP address
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.records?.length > 0 ? (
                            <div className="space-y-2">
                                {data.records.map((record) => {
                                    const deviceInfo = parseDeviceInfo(record.deviceInfo);
                                    const checkInLocation = parseLocation(record.checkInLocation);
                                    const checkOutLocation = parseLocation(record.checkOutLocation);
                                    const statusStyle = getStatusBadge(record.status);
                                    const StatusIcon = statusStyle.icon;
                                    const isExpanded = expandedRow === record.id;

                                    return (
                                        <Collapsible
                                            key={record.id}
                                            open={isExpanded}
                                            onOpenChange={() => setExpandedRow(isExpanded ? null : record.id)}
                                        >
                                            <div className={cn(
                                                "border rounded-lg transition-colors",
                                                isExpanded ? "border-primary/50 bg-muted/30" : "hover:bg-muted/20"
                                            )}>
                                                <CollapsibleTrigger asChild>
                                                    <div className="flex items-center justify-between p-4 cursor-pointer">
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold">{formatDate(record.date)}</span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {record.workingHours?.toFixed(2) || 0} hrs
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="hidden md:flex items-center gap-4 text-sm">
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>In: {formatTime(record.checkInTime)}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <Clock className="h-3 w-3" />
                                                                    <span>Out: {formatTime(record.checkOutTime)}</span>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className={cn("flex items-center gap-1", statusStyle.class)}>
                                                                <StatusIcon className="h-3 w-3" />
                                                                {record.status}
                                                            </Badge>
                                                            {isExpanded ? (
                                                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </CollapsibleTrigger>

                                                <CollapsibleContent>
                                                    <div className="px-4 pb-4 pt-2 border-t space-y-4">
                                                        {/* Time Details */}
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

                                                            {/* Location Info */}
                                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-100 dark:border-emerald-900">
                                                                <h4 className="font-semibold text-sm flex items-center gap-2 mb-3">
                                                                    <MapPin className="h-4 w-4 text-emerald-600" />
                                                                    Location Information
                                                                </h4>
                                                                <div className="space-y-3 text-sm">
                                                                    {/* Check-in Location */}
                                                                    <div>
                                                                        <span className="font-medium text-emerald-700 dark:text-emerald-300">Check-In Location:</span>
                                                                        {checkInLocation ? (
                                                                            <div className="mt-1 flex items-center gap-2">
                                                                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                                                    {checkInLocation.latitude?.toFixed(6)}, {checkInLocation.longitude?.toFixed(6)}
                                                                                </span>
                                                                                <a
                                                                                    href={`https://www.google.com/maps?q=${checkInLocation.latitude},${checkInLocation.longitude}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-600 hover:underline text-xs"
                                                                                >
                                                                                    View on Map
                                                                                </a>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-muted-foreground ml-2">Not captured</span>
                                                                        )}
                                                                    </div>
                                                                    {/* Check-out Location */}
                                                                    <div>
                                                                        <span className="font-medium text-rose-700 dark:text-rose-300">Check-Out Location:</span>
                                                                        {checkOutLocation ? (
                                                                            <div className="mt-1 flex items-center gap-2">
                                                                                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                                                                    {checkOutLocation.latitude?.toFixed(6)}, {checkOutLocation.longitude?.toFixed(6)}
                                                                                </span>
                                                                                <a
                                                                                    href={`https://www.google.com/maps?q=${checkOutLocation.latitude},${checkOutLocation.longitude}`}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-blue-600 hover:underline text-xs"
                                                                                >
                                                                                    View on Map
                                                                                </a>
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
                                                </CollapsibleContent>
                                            </div>
                                        </Collapsible>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                <h3 className="text-lg font-medium">No Records Found</h3>
                                <p>No attendance records for {months.find(m => m.value === selectedMonth)?.label} {selectedYear}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </TooltipProvider>
    );
}
