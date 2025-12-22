"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Settings as SettingsIcon, Calendar, Clock, Globe, Check, AlertTriangle, ExternalLink, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function GeneralSettingsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const userId = fullUser?.id;
    const queryClient = useQueryClient();

    // ID Generation form data
    const [formData, setFormData] = useState({
        admissionNoPrefix: "",
        employeeIdPrefix: "",
    });

    // School Configuration form data
    const [configData, setConfigData] = useState({
        workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
        startTime: '09:00',
        endTime: '17:00',
    });

    const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);
    const [isCheckingGoogle, setIsCheckingGoogle] = useState(false);

    // Fetch settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ["schoolSettings", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/settings`);
            if (!res.ok) throw new Error("Failed to fetch settings");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch attendance config for working hours
    const { data: attendanceConfig, isLoading: isLoadingConfig } = useQuery({
        queryKey: ["attendanceConfig", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/settings`);
            if (!res.ok) throw new Error("Failed to fetch attendance config");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Check Google Calendar connection
    const checkGoogleCalendar = async () => {
        if (!schoolId) return;
        setIsCheckingGoogle(true);
        try {
            const res = await fetch(`/api/schools/${schoolId}/calendar/events?startDate=2025-01-01&endDate=2025-12-31`);
            const data = await res.json();
            setHasGoogleCalendar(data.hasGoogleCalendar || false);
        } catch (error) {
            console.error('Failed to check Google Calendar:', error);
            setHasGoogleCalendar(false);
        } finally {
            setIsCheckingGoogle(false);
        }
    };

    useEffect(() => {
        if (settings) {
            setFormData({
                admissionNoPrefix: settings.admissionNoPrefix || "",
                employeeIdPrefix: settings.employeeIdPrefix || "",
            });
        }
    }, [settings]);

    useEffect(() => {
        if (attendanceConfig?.config) {
            setConfigData(prev => ({
                ...prev,
                startTime: attendanceConfig.config.defaultStartTime || prev.startTime,
                endTime: attendanceConfig.config.defaultEndTime || prev.endTime,
            }));
        }
    }, [attendanceConfig]);

    useEffect(() => {
        if (schoolId) {
            checkGoogleCalendar();
        }
    }, [schoolId]);

    // Save ID settings
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save settings");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Settings saved successfully");
            queryClient.invalidateQueries(["schoolSettings", schoolId]);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // Save attendance config
    const saveConfigMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    defaultStartTime: data.startTime,
                    defaultEndTime: data.endTime,
                }),
            });
            if (!res.ok) throw new Error("Failed to save school configuration");
            return res.json();
        },
        onSuccess: () => {
            toast.success("School configuration saved");
            queryClient.invalidateQueries(["attendanceConfig", schoolId]);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // Disconnect Google Calendar
    const disconnectGoogleMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch('/api/auth/google-calendar/disconnect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to disconnect');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Google Calendar disconnected');
            setHasGoogleCalendar(false);
            queryClient.invalidateQueries(['calendar-events', schoolId]);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const handleGoogleCalendarConnect = () => {
        window.location.href = `/api/auth/google-calendar?userId=${userId}&schoolId=${schoolId}`;
    };

    const toggleWorkingDay = (day) => {
        setConfigData(prev => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter(d => d !== day)
                : [...prev.workingDays, day].sort((a, b) => a - b),
        }));
    };

    const days = [
        { value: 0, label: 'Sunday', short: 'Sun', abbr: 'S' },
        { value: 1, label: 'Monday', short: 'Mon', abbr: 'M' },
        { value: 2, label: 'Tuesday', short: 'Tue', abbr: 'T' },
        { value: 3, label: 'Wednesday', short: 'Wed', abbr: 'W' },
        { value: 4, label: 'Thursday', short: 'Thu', abbr: 'T' },
        { value: 5, label: 'Friday', short: 'Fri', abbr: 'F' },
        { value: 6, label: 'Saturday', short: 'Sat', abbr: 'S' },
    ];

    if (!schoolId) return <div className="p-8">Loading...</div>;

    if (isLoading || isLoadingConfig) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-full mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <SettingsIcon className="h-6 w-6" />
                    General Settings
                </h1>
                <p className="text-muted-foreground">
                    Manage general configuration for your school
                </p>
            </div>

            <Separator />

            {/* School Configuration Section */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                School Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure working days, school hours, and calendar integration.
                            </CardDescription>
                        </div>
                        {hasGoogleCalendar ? (
                            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border-green-200">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs">Google Synced</span>
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-yellow-50 text-yellow-700 border-yellow-200">
                                <AlertTriangle className="h-3 w-3" />
                                <span className="text-xs">Not Connected</span>
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Google Calendar Connection */}
                    <div className="p-4 rounded-lg border bg-muted/30">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">Google Calendar Integration</span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {hasGoogleCalendar
                                        ? "Connected. Indian holidays will be synced automatically."
                                        : "Connect to sync Indian national holidays automatically."
                                    }
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={checkGoogleCalendar}
                                    disabled={isCheckingGoogle}
                                >
                                    <RefreshCw className={cn("h-4 w-4", isCheckingGoogle && "animate-spin")} />
                                </Button>
                                {hasGoogleCalendar ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => disconnectGoogleMutation.mutate()}
                                        disabled={disconnectGoogleMutation.isPending}
                                        className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        {disconnectGoogleMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Unlink className="h-4 w-4" />
                                        )}
                                        {disconnectGoogleMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleGoogleCalendarConnect}
                                        className="gap-2 hover:border-primary hover:text-primary"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Connect Google
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Working Days Selection */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Working Days</Label>
                            <span className="text-xs text-muted-foreground">
                                {configData.workingDays.length} days selected
                            </span>
                        </div>
                        {configData.workingDays.length === 0 && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
                                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                                    <strong>Warning:</strong> No working days selected!
                                </p>
                            </div>
                        )}
                        <div className="flex gap-2">
                            {days.map((day) => {
                                const isSelected = configData.workingDays.includes(day.value);
                                return (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleWorkingDay(day.value)}
                                        className={cn(
                                            'relative flex-1 min-w-0 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200',
                                            'border-2 hover:scale-[1.03] active:scale-95',
                                            isSelected
                                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20'
                                                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute -top-1.5 -right-1.5 bg-white text-blue-600 rounded-full p-0.5 shadow-md ring-2 ring-blue-600">
                                                <Check className="h-3 w-3" />
                                            </div>
                                        )}
                                        <span className="hidden md:block">{day.short}</span>
                                        <span className="md:hidden">{day.abbr}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Click to select/deselect working days. This affects attendance calculations.
                        </p>
                    </div>

                    {/* School Hours */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                School Start Time
                            </Label>
                            <Input
                                type="time"
                                value={configData.startTime}
                                onChange={(e) => setConfigData(prev => ({ ...prev, startTime: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                School End Time
                            </Label>
                            <Input
                                type="time"
                                value={configData.endTime}
                                onChange={(e) => setConfigData(prev => ({ ...prev, endTime: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={() => saveConfigMutation.mutate(configData)}
                            disabled={saveConfigMutation.isPending}
                        >
                            {saveConfigMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Configuration
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ID Generation Section */}
            <Card>
                <CardHeader>
                    <CardTitle>ID Generation</CardTitle>
                    <CardDescription>
                        Configure prefixes for automatic ID generation.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Student Admission Number Prefix</Label>
                            <Input
                                value={formData.admissionNoPrefix}
                                onChange={(e) => setFormData(prev => ({ ...prev, admissionNoPrefix: e.target.value }))}
                                placeholder="e.g. ADM"
                            />
                            <p className="text-xs text-muted-foreground">
                                IDs will be generated like ADM-001, ADM-002, etc.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Employee ID Prefix</Label>
                            <Input
                                value={formData.employeeIdPrefix}
                                onChange={(e) => setFormData(prev => ({ ...prev, employeeIdPrefix: e.target.value }))}
                                placeholder="e.g. EMP"
                            />
                            <p className="text-xs text-muted-foreground">
                                IDs will be generated like EMP-001, EMP-002, etc.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button
                            onClick={() => saveMutation.mutate(formData)}
                            disabled={saveMutation.isPending}
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
