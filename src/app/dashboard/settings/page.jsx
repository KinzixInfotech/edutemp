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
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Settings as SettingsIcon, Calendar, Clock, Globe, Check, AlertTriangle, ExternalLink, RefreshCw, Unlink, MapPin, Navigation, Info, PanelLeft, MousePointer } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import GoogleMapsLocationPicker from "@/components/maps/GoogleMapsLocationPicker";
import { useSidebar } from "@/components/ui/sidebar";

// Sidebar Preferences sub-component that uses the sidebar context
function SidebarPreferencesSection() {
    const { hoverExpand, setHoverExpand } = useSidebar();

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <MousePointer className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Expand sidebar on hover</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        When the sidebar is collapsed, hovering over it will temporarily expand it to show full menu labels.
                    </p>
                </div>
                <Switch
                    checked={hoverExpand}
                    onCheckedChange={setHoverExpand}
                    aria-label="Toggle sidebar hover expand"
                />
            </div>
            <p className="text-xs text-muted-foreground">
                Tip: You can collapse the sidebar using the toggle button in the header or by pressing <kbd className="px-1.5 py-0.5 rounded bg-muted border text-[10px] font-mono">⌘ B</kbd>
            </p>
        </div>
    );
}

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

    // Location form data
    const [locationData, setLocationData] = useState({
        schoolLatitude: null,
        schoolLongitude: null,
        geofenceRadius: 200,
        attendanceRadius: 500,
    });
    const [isDetectingLocation, setIsDetectingLocation] = useState(false);

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
            // Load location data
            setLocationData({
                schoolLatitude: settings.schoolLatitude ?? null,
                schoolLongitude: settings.schoolLongitude ?? null,
                geofenceRadius: settings.geofenceRadius ?? 200,
                attendanceRadius: settings.attendanceRadius ?? 500,
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

    // Save location settings mutation
    const saveLocationMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/settings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to save location settings");
            return res.json();
        },
        onSuccess: () => {
            toast.success("School location saved successfully");
            queryClient.invalidateQueries(["schoolSettings", schoolId]);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    // Detect current location using browser geolocation
    const detectCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setIsDetectingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocationData(prev => ({
                    ...prev,
                    schoolLatitude: parseFloat(position.coords.latitude.toFixed(6)),
                    schoolLongitude: parseFloat(position.coords.longitude.toFixed(6)),
                }));
                toast.success("Location detected successfully!");
                setIsDetectingLocation(false);
            },
            (error) => {
                console.error("Geolocation error:", error);
                toast.error("Failed to detect location. Please enter coordinates manually.");
                setIsDetectingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
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

            {/* Sidebar Preferences Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PanelLeft className="h-5 w-5" />
                        Sidebar Preferences
                    </CardTitle>
                    <CardDescription>
                        Customize how the sidebar behaves
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <SidebarPreferencesSection />
                </CardContent>
            </Card>

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

            {/* School Location Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        School Location
                    </CardTitle>
                    <CardDescription>
                        Set your school's coordinates for geofencing and proximity-based features.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Info Banner */}
                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <div className="flex gap-3">
                            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div className="space-y-1 text-sm">
                                <p className="font-medium text-blue-900 dark:text-blue-200">This location is used for:</p>
                                <ul className="text-blue-700 dark:text-blue-300 list-disc list-inside space-y-0.5">
                                    <li><strong>Transport Geofencing:</strong> Auto-detect when drivers reach school to start/end trips</li>
                                    <li><strong>Teacher Attendance:</strong> Allow teachers to mark attendance only when within school radius</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Interactive Map Picker */}
                    <GoogleMapsLocationPicker
                        latitude={locationData.schoolLatitude}
                        longitude={locationData.schoolLongitude}
                        onLocationChange={(lat, lng, address) => {
                            setLocationData(prev => ({
                                ...prev,
                                schoolLatitude: lat,
                                schoolLongitude: lng,
                            }));
                        }}
                        placeholder="Search for your school location..."
                    />

                    {/* Manual Input Option */}
                    <details className="group">
                        <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-2">
                            <span>Can't find your school? Enter coordinates manually</span>
                        </summary>
                        <div className="mt-3 grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border">
                            <div className="space-y-1">
                                <Label className="text-xs">Latitude</Label>
                                <Input
                                    type="number"
                                    step="0.000001"
                                    placeholder="e.g. 23.794857"
                                    value={locationData.schoolLatitude ?? ""}
                                    onChange={(e) => setLocationData(prev => ({
                                        ...prev,
                                        schoolLatitude: e.target.value ? parseFloat(e.target.value) : null
                                    }))}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Longitude</Label>
                                <Input
                                    type="number"
                                    step="0.000001"
                                    placeholder="e.g. 85.345678"
                                    value={locationData.schoolLongitude ?? ""}
                                    onChange={(e) => setLocationData(prev => ({
                                        ...prev,
                                        schoolLongitude: e.target.value ? parseFloat(e.target.value) : null
                                    }))}
                                />
                            </div>
                            <p className="col-span-2 text-xs text-muted-foreground">
                                Tip: You can find coordinates on <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Maps</a> by right-clicking any location.
                            </p>
                        </div>
                    </details>

                    <div className="flex justify-end pt-4 border-t">
                        <Button
                            onClick={() => saveLocationMutation.mutate(locationData)}
                            disabled={saveLocationMutation.isPending || !locationData.schoolLatitude || !locationData.schoolLongitude}
                        >
                            {saveLocationMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <MapPin className="mr-2 h-4 w-4" />
                                    Save Location Settings
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
