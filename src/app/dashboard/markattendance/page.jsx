"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, MapPin, Clock, CalendarDays, CheckCircle2, XCircle, AlertTriangle, Coffee, Lock, LogOut } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SelfAttendancePage() {
    const { fullUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [data, setData] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchAttendanceData = async () => {
        if (!fullUser?.id || !fullUser?.schoolId) return;

        try {
            setLoading(true);
            const res = await fetch(`/api/schools/${fullUser.schoolId}/attendance/mark?userId=${fullUser.id}`);
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Failed to fetch attendance data");
            }

            setData(result);
        } catch (error) {
            console.error("Fetch error:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendanceData();
    }, [fullUser]);

    const handleMarkAttendance = async (type) => {
        if (!fullUser?.id || !fullUser?.schoolId) return;

        try {
            setActionLoading(true);

            // Get location
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
                    if (data.config.enableGeoFencing) {
                        throw new Error("Location access required for attendance");
                    }
                }
            }

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

            if (!res.ok) {
                throw new Error(result.message || result.error || "Failed to mark attendance");
            }

            toast.success(result.message);
            fetchAttendanceData(); // Refresh data
        } catch (error) {
            console.error("Marking error:", error);
            toast.error(error.message);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const { attendance, windows, monthlyStats, config, isWorkingDay, dayType, holidayName } = data || {};
    const isCheckedIn = !!attendance?.checkInTime;
    const isCheckedOut = !!attendance?.checkOutTime;

    // Determine button states
    const canCheckIn = isWorkingDay && windows?.checkIn?.isOpen && !isCheckedIn;
    const canCheckOut = isWorkingDay && windows?.checkOut?.isOpen && isCheckedIn && !isCheckedOut;

    // Helper to format time
    const formatTime = (isoString) => {
        if (!isoString) return "--:--";
        return new Date(isoString).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Self Attendance</h1>
                <p className="text-muted-foreground">
                    Mark your daily attendance and view your monthly statistics.
                </p>
            </div>

            {/* Holiday / Non-Working Day Alert */}
            {!isWorkingDay && (
                <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50">
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

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Main Action Card */}
                <Card className="lg:col-span-2 border-primary/20 shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Today's Status</span>
                            <Badge variant={isCheckedOut ? "secondary" : isCheckedIn ? "success" : "outline"} className="text-sm px-3 py-1">
                                {isCheckedOut ? "Present (Completed)" : isCheckedIn ? "Checked In" : "Not Marked"}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            {currentTime.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                        <div className="flex flex-col items-center justify-center py-6 space-y-6">
                            <div className="text-5xl font-bold tabular-nums tracking-tight text-primary">
                                {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </div>

                            {/* Dynamic Action Button Section */}
                            <div className="w-full max-w-md flex flex-col items-center gap-2">
                                {/* Case 1: Not Checked In */}
                                {!isCheckedIn && (
                                    <>
                                        {isWorkingDay && windows?.checkIn?.isOpen ? (
                                            <Button
                                                size="lg"
                                                className="w-full text-lg h-14"
                                                onClick={() => handleMarkAttendance("CHECK_IN")}
                                                disabled={actionLoading}
                                            >
                                                {actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                                Check In Now
                                            </Button>
                                        ) : (
                                            <Button size="lg" className="w-full text-lg h-14" disabled variant="outline">
                                                <Lock className="mr-2 h-5 w-5" />
                                                {!isWorkingDay ? "Holiday / Weekend" : "Check-in Closed"}
                                            </Button>
                                        )}

                                        {/* Window Info */}
                                        {isWorkingDay && !windows?.checkIn?.isOpen && (
                                            <p className="text-sm text-muted-foreground">
                                                Check-in window: <span className="font-medium">{formatTime(windows?.checkIn?.start)} - {formatTime(windows?.checkIn?.end)}</span>
                                            </p>
                                        )}
                                        {isWorkingDay && windows?.checkIn?.isOpen && (
                                            <p className="text-sm text-emerald-600 font-medium">
                                                Window open until {formatTime(windows.checkIn.end)}
                                            </p>
                                        )}
                                    </>
                                )}

                                {/* Case 2: Checked In, Not Checked Out */}
                                {isCheckedIn && !isCheckedOut && (
                                    <>
                                        <Button
                                            size="lg"
                                            className="w-full text-lg h-14"
                                            onClick={() => handleMarkAttendance("CHECK_OUT")}
                                            disabled={!canCheckOut || actionLoading}
                                            variant="destructive"
                                        >
                                            {actionLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <LogOut className="mr-2 h-5 w-5" />}
                                            Check Out
                                        </Button>

                                        <div className="text-center space-y-1">
                                            <p className="text-sm">
                                                Checked in at: <span className="font-medium">{formatTime(attendance.checkInTime)}</span>
                                            </p>
                                            <p className="text-sm">
                                                Working Hours: <span className="font-mono font-bold text-primary">{attendance?.liveWorkingHours} hrs</span>
                                            </p>

                                            {windows?.checkOut?.minTime && new Date() < new Date(windows.checkOut.minTime) && (
                                                <p className="text-xs text-amber-600 font-medium mt-1">
                                                    Minimum hours not met. Check out after {formatTime(windows.checkOut.minTime)}
                                                </p>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* Case 3: Completed */}
                                {isCheckedOut && (
                                    <div className="flex flex-col items-center gap-2 p-4 bg-muted/30 rounded-lg border w-full">
                                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                        <div className="text-center">
                                            <p className="font-semibold text-lg">Attendance Completed</p>
                                            <p className="text-sm text-muted-foreground">
                                                {formatTime(attendance.checkInTime)} - {formatTime(attendance.checkOutTime)}
                                            </p>
                                            <p className="text-sm font-medium mt-1">
                                                Total: {attendance.workingHours} hrs
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Shift Start</p>
                                <p className="text-lg font-semibold">{formatTime(windows?.checkIn?.start)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Shift End</p>
                                <p className="text-lg font-semibold">{formatTime(windows?.checkOut?.start)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Late Threshold</p>
                                <p className="text-lg font-semibold">{config?.gracePeriod} mins</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-medium">Min Hours</p>
                                <p className="text-lg font-semibold">{config?.minWorkingHours} hrs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Card */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Overview</CardTitle>
                            <CardDescription>Statistics for {currentTime.toLocaleDateString("en-US", { month: 'long' })}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Attendance Score</span>
                                    <span className="font-bold">{monthlyStats?.attendancePercentage}%</span>
                                </div>
                                <Progress value={monthlyStats?.attendancePercentage || 0} className="h-2" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-100 dark:border-emerald-900/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">Present</span>
                                    </div>
                                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-100">{monthlyStats?.presentDays || 0}</p>
                                </div>
                                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <XCircle className="h-4 w-4 text-rose-600" />
                                        <span className="text-sm font-medium text-rose-900 dark:text-rose-200">Absent</span>
                                    </div>
                                    <p className="text-2xl font-bold text-rose-700 dark:text-rose-100">{monthlyStats?.absentDays || 0}</p>
                                </div>
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-100 dark:border-amber-900/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Clock className="h-4 w-4 text-amber-600" />
                                        <span className="text-sm font-medium text-amber-900 dark:text-amber-200">Late</span>
                                    </div>
                                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-100">{monthlyStats?.lateDays || 0}</p>
                                </div>
                                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CalendarDays className="h-4 w-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-900 dark:text-blue-200">Leaves</span>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-100">{monthlyStats?.leaveDays || 0}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {config?.enableGeoFencing && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    Location Restriction
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start gap-3 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                    <p>
                                        You must be within <strong>{config.allowedRadius}m</strong> of the school to mark attendance.
                                        Please ensure location services are enabled.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
