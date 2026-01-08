"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Loader2, MapPin, Clock, CalendarDays, CheckCircle2, XCircle,
    AlertTriangle, Coffee, Lock, LogOut, History, Timer, TrendingUp
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function SelfAttendancePage() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch attendance data using React Query
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['selfAttendance', fullUser?.id, fullUser?.schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/mark?userId=${fullUser.id}`);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to fetch attendance data");
            }
            return res.json();
        },
        enabled: !!fullUser?.id && !!fullUser?.schoolId,
        staleTime: 1000 * 30,
        refetchInterval: 1000 * 60,
    });

    // Fetch attendance history
    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['attendanceHistory', fullUser?.id, fullUser?.schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/user/${fullUser.id}?limit=10`);
            if (!res.ok) return { records: [] };
            return res.json();
        },
        enabled: !!fullUser?.id && !!fullUser?.schoolId,
        staleTime: 1000 * 60 * 5,
    });

    // Mark attendance mutation
    const markMutation = useMutation({
        mutationFn: async ({ type, location }) => {
            const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/mark`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: fullUser.id,
                    type,
                    location,
                    deviceInfo: {
                        userAgent: navigator.userAgent,
                        platform: navigator.platform
                    }
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.message || result.error || "Failed to mark attendance");
            return result;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries(['selfAttendance']);
            queryClient.invalidateQueries(['attendanceHistory']);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleMarkAttendance = async (type) => {
        let location = null;

        if (data?.config?.enableGeoFencing) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 5000,
                        maximumAge: 0
                    });
                });
                location = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                };
            } catch (locError) {
                toast.error("Location access required for attendance");
                return;
            }
        }

        markMutation.mutate({ type, location });
    };

    // Loading state
    if (isLoading && !data) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                    <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
                    <Skeleton className="h-96 rounded-xl" />
                </div>
            </div>
        );
    }

    // Error state
    if (error || data?.needsSetup) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Attendance Not Configured</AlertTitle>
                    <AlertDescription>
                        {error?.message || "Attendance settings have not been configured for your school. Please contact your administrator."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const { attendance, windows, monthlyStats, config, isWorkingDay, dayType, holidayName } = data || {};
    const isCheckedIn = !!attendance?.checkInTime;
    const isCheckedOut = !!attendance?.checkOutTime;

    const canCheckIn = isWorkingDay && windows?.checkIn?.isOpen && !isCheckedIn;
    const canCheckOut = isWorkingDay && windows?.checkOut?.isOpen && isCheckedIn && !isCheckedOut;

    const formatTime = (isoString) => {
        if (!isoString) return "--:--";
        return new Date(isoString).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
    };

    const getStatusBadge = (status) => {
        const styles = {
            PRESENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
            LATE: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
            ABSENT: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
            HALF_DAY: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
            ON_LEAVE: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
        };
        return styles[status] || "bg-gray-100 text-gray-700";
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Clock className="w-6 h-6 text-primary" />
                    Self Attendance
                </h1>
                <p className="text-muted-foreground">Mark your daily attendance and view your statistics.</p>
            </div>

            {/* Stats Cards - Like Noticeboard */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Present Days</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyStats?.presentDays || 0}</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
                        <XCircle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyStats?.absentDays || 0}</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyStats?.lateDays || 0}</div>
                        <p className="text-xs text-muted-foreground">This month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Attendance</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{monthlyStats?.attendancePercentage || 0}%</div>
                        <p className="text-xs text-muted-foreground">Overall score</p>
                    </CardContent>
                </Card>
            </div>

            {/* Holiday Alert */}
            {!isWorkingDay && (
                <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50">
                    <Coffee className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
                        No Attendance Required
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                        Today is marked as <strong>{dayType?.replace('_', ' ') || 'HOLIDAY'}</strong>
                        {holidayName ? ` (${holidayName})` : ''}. Enjoy your day off!
                    </AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                {/* Main Action Card */}
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Today's Status</CardTitle>
                            <Badge
                                variant="outline"
                                className={
                                    isCheckedOut
                                        ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                                        : isCheckedIn
                                            ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800"
                                            : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300"
                                }
                            >
                                {isCheckedOut ? "✓ Completed" : isCheckedIn ? "● Working" : "○ Not Marked"}
                            </Badge>
                        </div>
                        <CardDescription>
                            {currentTime.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Live Clock */}
                        <div className="flex flex-col items-center justify-center py-4 space-y-4">
                            <div className="text-4xl md:text-5xl font-bold tabular-nums tracking-tight text-primary">
                                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </div>

                            {/* Action Buttons */}
                            <div className="w-full max-w-sm space-y-3">
                                {!isCheckedIn && (
                                    <>
                                        <Button
                                            size="lg"
                                            className="w-full h-12 text-base"
                                            onClick={() => handleMarkAttendance("CHECK_IN")}
                                            disabled={!canCheckIn || markMutation.isPending}
                                        >
                                            {markMutation.isPending ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : canCheckIn ? (
                                                <CheckCircle2 className="mr-2 h-5 w-5" />
                                            ) : (
                                                <Lock className="mr-2 h-5 w-5" />
                                            )}
                                            {!isWorkingDay ? "Holiday / Weekend" : canCheckIn ? "Check In Now" : "Check-in Closed"}
                                        </Button>
                                        {isWorkingDay && windows?.checkIn?.isOpen && (
                                            <p className="text-sm text-center text-emerald-600 dark:text-emerald-400">
                                                Window open until {formatTime(windows.checkIn.end)}
                                            </p>
                                        )}
                                        {isWorkingDay && !windows?.checkIn?.isOpen && (
                                            <p className="text-sm text-center text-muted-foreground">
                                                Check-in: {formatTime(windows?.checkIn?.start)} - {formatTime(windows?.checkIn?.end)}
                                            </p>
                                        )}
                                    </>
                                )}

                                {isCheckedIn && !isCheckedOut && (
                                    <>
                                        <Button
                                            size="lg"
                                            className="w-full h-12 text-base"
                                            variant={canCheckOut ? "destructive" : "secondary"}
                                            onClick={() => handleMarkAttendance("CHECK_OUT")}
                                            disabled={!canCheckOut || markMutation.isPending}
                                        >
                                            {markMutation.isPending ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : (
                                                <LogOut className="mr-2 h-5 w-5" />
                                            )}
                                            Check Out
                                        </Button>
                                        <div className="text-center space-y-1 text-sm">
                                            <p>In at <span className="font-semibold">{formatTime(attendance.checkInTime)}</span></p>
                                            <p className="flex items-center justify-center gap-1">
                                                <Timer className="h-4 w-4" />
                                                <span className="font-mono font-bold text-primary">{attendance?.liveWorkingHours?.toFixed(2) || '0.00'} hrs</span>
                                            </p>
                                        </div>
                                    </>
                                )}

                                {isCheckedOut && (
                                    <div className="flex flex-col items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                        <div className="text-center">
                                            <p className="font-semibold">Attendance Completed</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatTime(attendance.checkInTime)} - {formatTime(attendance.checkOutTime)}
                                            </p>
                                            <p className="text-sm font-medium mt-1 text-emerald-700 dark:text-emerald-300">
                                                Total: {attendance.workingHours?.toFixed(2)} hrs
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        {/* Shift Info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Shift Start</p>
                                <p className="text-lg font-semibold mt-1">{config?.startTime || '--:--'}</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Shift End</p>
                                <p className="text-lg font-semibold mt-1">{config?.endTime || '--:--'}</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Grace Period</p>
                                <p className="text-lg font-semibold mt-1">{config?.gracePeriod || 0} mins</p>
                            </div>
                            <div className="p-3 bg-muted/50 rounded-lg">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Min Hours</p>
                                <p className="text-lg font-semibold mt-1">{config?.minWorkingHours || 0} hrs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Geofencing Info - Only show if enabled */}
                {config?.enableGeoFencing && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                Location Required
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                <p>
                                    You must be within <strong>{config.allowedRadius}m</strong> of school to mark attendance.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Attendance History */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <History className="h-5 w-5 text-muted-foreground" />
                        Recent Attendance
                    </CardTitle>
                    <CardDescription>Your attendance records from the last 10 days</CardDescription>
                </CardHeader>
                <CardContent>
                    {historyLoading ? (
                        <div className="space-y-2">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : historyData?.records?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="hidden sm:table-cell">Check In</TableHead>
                                        <TableHead className="hidden sm:table-cell">Check Out</TableHead>
                                        <TableHead className="text-right">Hours</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {historyData.records.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell className="font-medium">{formatDate(record.date)}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusBadge(record.status)}>
                                                    {record.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="hidden sm:table-cell">{formatTime(record.checkInTime)}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{formatTime(record.checkOutTime)}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {record.workingHours?.toFixed(1) || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>No attendance records yet</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
