"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
    Loader2, MapPin, Clock, CalendarDays, CheckCircle2, XCircle,
    AlertTriangle, Coffee, Lock, LogOut, History, Timer, TrendingUp,
    Info, CalendarClock, FileText
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from 'next/link';
import { cn } from "@/lib/utils";

export default function SelfAttendancePage() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Geofencing state
    const [userLocation, setUserLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [distanceToSchool, setDistanceToSchool] = useState(null);
    const [isWithinRadius, setIsWithinRadius] = useState(true);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Haversine distance calculation
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    };

    // Format distance for display
    const formatDistance = (meters) => {
        if (meters < 1000) return `${Math.round(meters)}m`;
        return `${(meters / 1000).toFixed(1)}km`;
    };

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

    // Get user location when geofencing is enabled
    useEffect(() => {
        const getLocation = async () => {
            if (!data?.config?.enableGeoFencing) {
                setIsWithinRadius(true);
                return;
            }

            setIsGettingLocation(true);
            setLocationError(null);

            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                });

                const location = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                };
                setUserLocation(location);

                // Calculate distance if school coordinates exist
                if (data.config.schoolLatitude && data.config.schoolLongitude) {
                    const distance = calculateDistance(
                        location.latitude,
                        location.longitude,
                        data.config.schoolLatitude,
                        data.config.schoolLongitude
                    );
                    setDistanceToSchool(Math.round(distance));

                    const allowedRadius = data.config.allowedRadius || 500;
                    setIsWithinRadius(distance <= allowedRadius);
                } else {
                    // No school coordinates configured - allow attendance
                    setIsWithinRadius(true);
                }
            } catch (error) {
                console.error('Location error:', error);
                setLocationError(error.message || 'Failed to get location');
                setIsWithinRadius(false);
            } finally {
                setIsGettingLocation(false);
            }
        };

        if (data?.config?.enableGeoFencing) {
            getLocation();
        }
    }, [data?.config?.enableGeoFencing, data?.config?.schoolLatitude, data?.config?.schoolLongitude, data?.config?.allowedRadius]);

    const handleMarkAttendance = async (type) => {
        let location = null;

        // If geofencing is enabled, validate location first
        if (data?.config?.enableGeoFencing) {
            if (locationError) {
                toast.error("Location access is required to mark attendance.");
                return;
            }

            if (!isWithinRadius) {
                const radius = data?.config?.allowedRadius || 500;
                toast.error(`You are too far from school. Please be within ${radius}m to mark attendance.`);
                return;
            }

            if (userLocation) {
                location = userLocation;
            }
        }

        // If no location yet, try to get it
        if (!location) {
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
                console.warn("Location tracking failed:", locError);
                // Only block if geofencing is strictly enabled
                if (data?.config?.enableGeoFencing) {
                    toast.error("Location access is required to mark attendance.");
                    return;
                }
            }
        }

        markMutation.mutate({ type, location });
    };

    const { attendance, windows, monthlyStats, config, isWorkingDay, dayType, holidayName } = data || {};
    const isCheckedIn = !!attendance?.checkInTime;
    const isCheckedOut = !!attendance?.checkOutTime;

    // Include geofencing check in canCheckIn/canCheckOut
    const geofenceBlocking = config?.enableGeoFencing && (!isWithinRadius || locationError);
    const canCheckIn = isWorkingDay && windows?.checkIn?.isOpen && !isCheckedIn && !geofenceBlocking;
    const canCheckOut = isWorkingDay && windows?.checkOut?.isOpen && isCheckedIn && !isCheckedOut && !geofenceBlocking;

    // Helper to calculate time status and progress
    const timeStatus = useMemo(() => {
        if (!data || !isWorkingDay || !windows?.checkIn) {
            return { status: 'CLOSED', color: 'text-rose-500', ringColor: 'stroke-rose-500', progress: 0, message: 'No attendance required' };
        }

        const now = currentTime.getTime();
        const start = new Date(windows.checkIn.start).getTime();
        const end = new Date(windows.checkIn.end).getTime();
        const shiftStart = config?.startTime ? new Date(`${currentTime.toDateString()} ${config.startTime}`).getTime() : start;
        const graceEnd = shiftStart + (config?.gracePeriod || 0) * 60 * 1000;

        if (isCheckedIn && !isCheckedOut) {
            // Working state
            return {
                status: 'WORKING',
                color: 'text-blue-500',
                ringColor: 'stroke-blue-500',
                progress: 100,
                message: 'Currently checked in'
            };
        }
        if (isCheckedOut) {
            return {
                status: 'COMPLETED',
                color: 'text-emerald-500',
                ringColor: 'stroke-emerald-500',
                progress: 100,
                message: 'Attendance completed'
            };
        }

        if (now < start) {
            const opensAt = formatTime(windows.checkIn.start);
            return {
                status: 'UPCOMING',
                color: 'text-blue-500',
                ringColor: 'stroke-blue-200',
                progress: 0,
                message: `Check-in opens at ${opensAt}`
            };
        }

        if (now > end) {
            const closedAt = formatTime(windows.checkIn.end);
            return {
                status: 'CLOSED',
                color: 'text-rose-500',
                ringColor: 'stroke-rose-200',
                progress: 100,
                message: `Check-in closed at ${closedAt}`
            };
        }

        // Active Window Calculations
        const totalDuration = end - start;
        const elapsed = now - start;
        const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

        if (now <= graceEnd) {
            return {
                status: 'ON_TIME',
                color: 'text-emerald-500',
                ringColor: 'stroke-emerald-500',
                progress,
                message: 'You are on time',
                isGrace: now > shiftStart // Technically late but within grace
            };
        } else if (now <= end) {
            return {
                status: 'LATE',
                color: 'text-amber-500',
                ringColor: 'stroke-amber-500',
                progress,
                message: 'Late check-in',
                isGrace: false
            };
        }

        return { status: 'UNKNOWN', color: 'gray-500', progress: 0 };
    }, [currentTime, data, isWorkingDay, windows, config, isCheckedIn, isCheckedOut]);


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

    function formatTime(isoString) {
        if (!isoString) return "--:--";
        return new Date(isoString).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    }

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

    // Circular Progress Component
    const size = 320;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = size / 2 - strokeWidth * 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (timeStatus.progress / 100) * circumference;

    return (
        <TooltipProvider>
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Clock className="w-6 h-6 text-primary" />
                            Self Attendance
                        </h1>
                        <p className="text-muted-foreground">Mark your daily attendance and view your statistics.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Location Status Badge */}
                        {config?.enableGeoFencing && (
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                                isGettingLocation && "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
                                !isGettingLocation && isWithinRadius && !locationError && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
                                !isGettingLocation && (!isWithinRadius || locationError) && "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
                            )}>
                                {isGettingLocation ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Getting location...
                                    </>
                                ) : locationError ? (
                                    <>
                                        <XCircle className="w-4 h-4" />
                                        Location unavailable
                                    </>
                                ) : isWithinRadius ? (
                                    <>
                                        <MapPin className="w-4 h-4" />
                                        GPS Ready {distanceToSchool && `(${formatDistance(distanceToSchool)})`}
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4" />
                                        Too far {distanceToSchool && `(${formatDistance(distanceToSchool)})`}
                                    </>
                                )}
                            </div>
                        )}
                        <Button variant="outline" asChild>
                            <Link href="/dashboard/markattendance/report">
                                <FileText className="mr-2 h-4 w-4" />
                                View Full Report
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Geofencing Alert */}
                {config?.enableGeoFencing && !isWithinRadius && !isGettingLocation && (
                    <Alert variant="destructive" className="bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50">
                        <MapPin className="h-4 w-4" />
                        <AlertTitle className="text-rose-800 dark:text-rose-200">Location Restriction</AlertTitle>
                        <AlertDescription className="text-rose-700 dark:text-rose-300">
                            {locationError
                                ? "Unable to access your location. Please enable location services and refresh the page."
                                : `You are ${distanceToSchool ? formatDistance(distanceToSchool) : 'too far'} from school. You need to be within ${config?.allowedRadius || 500}m to mark attendance.`
                            }
                        </AlertDescription>
                    </Alert>
                )}

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
                    <Card className="overflow-hidden">
                        <CardHeader className="pb-4 border-b bg-muted/40">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Today's Status</CardTitle>
                                    <CardDescription>
                                        {currentTime.toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </CardDescription>
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "capitalize px-3 py-1",
                                        isCheckedOut
                                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                            : isCheckedIn
                                                ? "bg-blue-100 text-blue-700 border-blue-200"
                                                : "bg-gray-100 text-gray-700"
                                    )}
                                >
                                    {isCheckedOut ? "✓ Completed" : isCheckedIn ? "● Working" : "○ Not Marked"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8 pt-8">
                            {/* Live Clock with Ring */}
                            <div className="flex flex-col items-center justify-center relative">
                                {/* SVG Ring */}
                                <div className="relative flex items-center justify-center">
                                    <svg
                                        width={size}
                                        height={size}
                                        viewBox={`0 0 ${size} ${size}`}
                                        className="transform -rotate-90"
                                    >
                                        {/* Background Circle */}
                                        <circle
                                            cx={center}
                                            cy={center}
                                            r={radius}
                                            className="stroke-muted fill-none"
                                            strokeWidth={strokeWidth}
                                        />
                                        {/* Progress Circle (Only show if window is active or tracking) */}
                                        {['ON_TIME', 'LATE', 'WORKING'].includes(timeStatus.status) && (
                                            <circle
                                                cx={center}
                                                cy={center}
                                                r={radius}
                                                className={cn("fill-none transition-all duration-1000 ease-out", timeStatus.ringColor)}
                                                strokeWidth={strokeWidth}
                                                strokeDasharray={circumference}
                                                strokeDashoffset={strokeDashoffset}
                                                strokeLinecap="round"
                                            />
                                        )}
                                    </svg>

                                    {/* Clock Content Inside Ring */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                        <div className={cn("text-5xl font-bold tabular-nums tracking-tighter transition-colors", timeStatus.color)}>
                                            {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                        <div className="text-lg text-muted-foreground font-medium">
                                            {currentTime.toLocaleTimeString("en-US", { second: "2-digit" })} sec
                                        </div>
                                        {/* Dynamic Status Message */}
                                        <div className="mt-6 px-4">
                                            <Badge variant="secondary" className={cn("font-medium",
                                                timeStatus.status === 'CLOSED' ? 'bg-rose-100 text-rose-700' :
                                                    timeStatus.status === 'LATE' ? 'bg-amber-100 text-amber-700' :
                                                        timeStatus.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-700' :
                                                            ''
                                            )}>
                                                {timeStatus.message}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Context Message */}
                                <div className="mt-2 text-center h-8">
                                    {timeStatus.status === 'CLOSED' && timeStatus.message.includes('closed') && isWorkingDay && (
                                        <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                                            <CalendarClock className="w-4 h-4" />
                                            {config?.startTime
                                                ? `You can check in tomorrow at ${formatTime(new Date().setHours(...config.startTime.split(':'), 0, 0))}` // Basic approximation for next day
                                                : "Check-in window closed for today"
                                            }
                                        </p>
                                    )}
                                    {timeStatus.status === 'LATE' && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <p className="text-sm text-amber-600 flex items-center justify-center gap-1 cursor-help underline underline-offset-4 decoration-dotted">
                                                    <Info className="w-4 h-4" />
                                                    Grace period ended at {windows?.checkIn?.start && config?.gracePeriod && formatTime(new Date(new Date(windows.checkIn.start).getTime() + config.gracePeriod * 60000))}
                                                </p>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>You are checking in after the allowed grace period of {config?.gracePeriod} minutes.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    )}
                                    {timeStatus.status === 'ON_TIME' && (
                                        <p className="text-sm text-emerald-600 flex items-center justify-center gap-1">
                                            <CheckCircle2 className="w-4 h-4" />
                                            You are within the allowed check-in window.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="max-w-md mx-auto space-y-3">
                                {!isCheckedIn && (
                                    <Button
                                        size="lg"
                                        className={cn(
                                            "w-full h-14 text-lg font-semibold shadow-md transition-all",
                                            canCheckIn ? "hover:scale-[1.02]" : "opacity-80"
                                        )}
                                        onClick={() => handleMarkAttendance("CHECK_IN")}
                                        disabled={!canCheckIn || markMutation.isPending}
                                    >
                                        {markMutation.isPending ? (
                                            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                        ) : canCheckIn ? (
                                            <CheckCircle2 className="mr-2 h-6 w-6" />
                                        ) : (
                                            <Lock className="mr-2 h-6 w-6" />
                                        )}
                                        {!isWorkingDay ? "Holiday / Weekend" : canCheckIn ? "Check In Now" : "Check-in Closed"}
                                    </Button>
                                )}

                                {isCheckedIn && !isCheckedOut && (
                                    <>
                                        <Button
                                            size="lg"
                                            className="w-full h-14 text-lg font-semibold shadow-md hover:scale-[1.02] transition-all"
                                            variant={canCheckOut ? "destructive" : "secondary"}
                                            onClick={() => handleMarkAttendance("CHECK_OUT")}
                                            disabled={!canCheckOut || markMutation.isPending}
                                        >
                                            {markMutation.isPending ? (
                                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                            ) : (
                                                <LogOut className="mr-2 h-6 w-6" />
                                            )}
                                            Check Out
                                        </Button>
                                        <div className="grid grid-cols-2 gap-4 pt-2">
                                            <div className="bg-muted/50 p-3 rounded-lg text-center border">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Checked In</p>
                                                <p className="text-xl font-bold text-primary mt-1">{formatTime(attendance.checkInTime)}</p>
                                            </div>
                                            <div className="bg-muted/50 p-3 rounded-lg text-center border">
                                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Duration</p>
                                                <p className="text-xl font-mono font-bold text-blue-600 mt-1 flex items-center justify-center gap-1">
                                                    <Timer className="w-4 h-4" />
                                                    {attendance?.liveWorkingHours?.toFixed(2) || '0.00'}<span className="text-sm">hr</span>
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {isCheckedOut && (
                                    <div className="flex flex-col items-center gap-2 p-6 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border-2 border-emerald-100 dark:border-emerald-900 border-dashed">
                                        <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mb-2">
                                            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div className="text-center">
                                            <h3 className="tex-lg font-bold text-emerald-900 dark:text-emerald-100">You're all done!</h3>
                                            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                                                Checked out at {formatTime(attendance.checkOutTime)}
                                            </p>
                                            <Badge variant="outline" className="mt-3 bg-white/50 border-emerald-200 text-emerald-800">
                                                Total Duration: {attendance.workingHours?.toFixed(2)} hrs
                                            </Badge>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Info className="h-4 w-4 text-muted-foreground" />
                                Shift Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Shift Start</p>
                                    <p className="text-lg font-semibold mt-1">{config?.startTime || '--:--'}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Shift End</p>
                                    <p className="text-lg font-semibold mt-1">{config?.endTime || '--:--'}</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Grace Period</p>
                                    <p className="text-lg font-semibold mt-1 flex items-center justify-center gap-1">
                                        {config?.gracePeriod || 0}
                                        <span className="text-xs font-normal text-muted-foreground">mins</span>
                                    </p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <p className="text-xs text-muted-foreground uppercase font-medium">Min Hours</p>
                                    <p className="text-lg font-semibold mt-1 flex items-center justify-center gap-1">
                                        {config?.minWorkingHours || 0}
                                        <span className="text-xs font-normal text-muted-foreground">hrs</span>
                                    </p>
                                </div>
                            </div>

                            {/* Geofencing Info - Only show if enabled */}
                            {config?.enableGeoFencing && (
                                <div className="mt-4 flex items-start gap-3 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-100 dark:border-blue-900">
                                    <MapPin className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                                    <p>
                                        <span className="font-semibold text-blue-700 dark:text-blue-300">Geofencing Active: </span>
                                        You must be within <strong>{config.allowedRadius}m</strong> of school premises to mark attendance.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
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
        </TooltipProvider>
    );
}
