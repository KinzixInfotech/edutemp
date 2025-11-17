'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Settings, Clock, MapPin, Bell, CheckCircle, AlertCircle, Save, Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

export default function AttendanceSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [settings, setSettings] = useState(null);
    const [testLocation, setTestLocation] = useState({ latitude: '', longitude: '' });

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['attendance-settings', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/settings`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to fetch settings');
            }
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Initialize settings when data is loaded
    useEffect(() => {
        if (data?.config) {
            setSettings(data.config);
        }
    }, [data]);

    const updateMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update settings');
            }

            return res.json();
        },
        onSuccess: (response) => {
            toast.success(response.message || 'Settings updated successfully');
            queryClient.invalidateQueries({ queryKey: ['attendance-settings', schoolId] });
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update settings');
        }
    });

    const testGeofencing = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testLocation)
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to test location');
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message, {
                description: `Distance: ${data.distance}m, Allowed: ${data.allowedRadius}m`
            });
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to test geofencing');
        }
    });

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    if (!schoolId) return <LoaderPage />;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Card className="max-w-md">
                    <CardContent className="pt-6">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <AlertCircle className="h-12 w-12 text-red-500" />
                            <h3 className="font-semibold text-lg">Failed to Load Settings</h3>
                            <p className="text-sm text-muted-foreground">{error?.message}</p>
                            <Button onClick={() => window.location.reload()} variant="outline">
                                Retry
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Settings className="w-8 h-8 text-blue-600" />
                        Attendance Settings
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure attendance rules and working hours
                    </p>
                </div>
                <Button
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                >
                    {updateMutation.isPending ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Settings
                        </>
                    )}
                </Button>
            </div>

            <Tabs defaultValue="working-hours" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="working-hours">Working Hours</TabsTrigger>
                    <TabsTrigger value="geofencing">Geofencing</TabsTrigger>
                    <TabsTrigger value="auto-marking">Auto-marking</TabsTrigger>
                    <TabsTrigger value="notifications">Notifications</TabsTrigger>
                    <TabsTrigger value="approvals">Approvals</TabsTrigger>
                </TabsList>

                {/* Working Hours */}
                <TabsContent value="working-hours">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Working Hours Configuration
                            </CardTitle>
                            <CardDescription>Set default check-in/check-out times and working hour thresholds</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label>Check-in Start Time</Label>
                                    <Input
                                        type="time"
                                        value={settings.defaultStartTime || '09:00'}
                                        onChange={(e) => handleChange('defaultStartTime', e.target.value)}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Teachers can check-in starting from this time
                                    </p>
                                </div>

                                <div>
                                    <Label>Check-out End Time</Label>
                                    <Input
                                        type="time"
                                        value={settings.defaultEndTime || '17:00'}
                                        onChange={(e) => handleChange('defaultEndTime', e.target.value)}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Check-out window closes after this time
                                    </p>
                                </div>

                                <div>
                                    <Label>Grace Period (minutes)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="60"
                                        value={settings.gracePeriodMinutes || 15}
                                        onChange={(e) => handleChange('gracePeriodMinutes', parseInt(e.target.value))}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Late if check-in after start time + grace period
                                    </p>
                                </div>

                                <div>
                                    <Label>Full Day Hours</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="24"
                                        step="0.5"
                                        value={settings.fullDayHours || 8}
                                        onChange={(e) => handleChange('fullDayHours', parseFloat(e.target.value))}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Minimum hours for full day attendance
                                    </p>
                                </div>

                                <div>
                                    <Label>Half Day Hours</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="12"
                                        step="0.5"
                                        value={settings.halfDayHours || 4}
                                        onChange={(e) => handleChange('halfDayHours', parseFloat(e.target.value))}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Minimum hours for half day attendance
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Geofencing */}
                <TabsContent value="geofencing">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="w-5 h-5" />
                                Geofencing Configuration
                            </CardTitle>
                            <CardDescription>Restrict check-in/out to school premises using GPS</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="text-base">Enable Geofencing</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Require users to be within specified radius of school
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.enableGeoFencing || false}
                                    onCheckedChange={(checked) => handleChange('enableGeoFencing', checked)}
                                />
                            </div>

                            {settings.enableGeoFencing && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label>School Latitude</Label>
                                            <Input
                                                type="number"
                                                step="0.000001"
                                                value={settings.schoolLatitude || ''}
                                                onChange={(e) => handleChange('schoolLatitude', parseFloat(e.target.value))}
                                                placeholder="e.g., 23.5204"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div>
                                            <Label>School Longitude</Label>
                                            <Input
                                                type="number"
                                                step="0.000001"
                                                value={settings.schoolLongitude || ''}
                                                onChange={(e) => handleChange('schoolLongitude', parseFloat(e.target.value))}
                                                placeholder="e.g., 87.3119"
                                                className="mt-1"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <Label>Allowed Radius (meters)</Label>
                                            <Input
                                                type="number"
                                                min="10"
                                                max="5000"
                                                value={settings.allowedRadiusMeters || 500}
                                                onChange={(e) => handleChange('allowedRadiusMeters', parseInt(e.target.value))}
                                                className="mt-1"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Users must be within this radius to check-in/out
                                            </p>
                                        </div>
                                    </div>

                                    {/* Test Geofencing */}
                                    <div className="border-t pt-6">
                                        <h4 className="font-semibold mb-4">Test Geofencing</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <Input
                                                placeholder="Test Latitude"
                                                type="number"
                                                step="0.000001"
                                                value={testLocation.latitude}
                                                onChange={(e) => setTestLocation(prev => ({ ...prev, latitude: e.target.value }))}
                                            />
                                            <Input
                                                placeholder="Test Longitude"
                                                type="number"
                                                step="0.000001"
                                                value={testLocation.longitude}
                                                onChange={(e) => setTestLocation(prev => ({ ...prev, longitude: e.target.value }))}
                                            />
                                            <Button
                                                variant="outline"
                                                onClick={() => testGeofencing.mutate()}
                                                disabled={!testLocation.latitude || !testLocation.longitude || testGeofencing.isPending}
                                            >
                                                {testGeofencing.isPending ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Testing...
                                                    </>
                                                ) : (
                                                    'Test Location'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Auto-marking */}
                <TabsContent value="auto-marking">
                    <Card>
                        <CardHeader>
                            <CardTitle>Auto-marking Rules</CardTitle>
                            <CardDescription>Automatically mark attendance based on rules</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="text-base">Auto-mark Absent</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically mark users as absent if not checked-in by specified time
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.autoMarkAbsent || false}
                                    onCheckedChange={(checked) => handleChange('autoMarkAbsent', checked)}
                                />
                            </div>

                            {/* {settings.autoMarkAbsent && (
                                <div>
                                    <Label>Auto-mark Time</Label>
                                    <Input
                                        type="time"
                                        value={settings.autoMarkTime || '10:00'}
                                        onChange={(e) => handleChange('autoMarkTime', e.target.value)}
                                        className="mt-1"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Mark as absent if not checked-in by this time
                                    </p>
                                </div>
                            )} */}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notifications">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-5 h-5" />
                                Notification Preferences
                            </CardTitle>
                            <CardDescription>Configure attendance notifications</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="text-base">Daily Reminders</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Send daily attendance reminders to teachers
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.sendDailyReminders || false}
                                    onCheckedChange={(checked) => handleChange('sendDailyReminders', checked)}
                                />
                            </div>

                            {settings.sendDailyReminders && (
                                <div>
                                    <Label>Reminder Time</Label>
                                    <Input
                                        type="time"
                                        value={settings.reminderTime || '08:30'}
                                        onChange={(e) => handleChange('reminderTime', e.target.value)}
                                        className="mt-1"
                                    />
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="text-base">Notify Parents</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Send attendance notifications to parents
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.notifyParents || false}
                                    onCheckedChange={(checked) => handleChange('notifyParents', checked)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Approvals */}
                <TabsContent value="approvals">
                    <Card>
                        <CardHeader>
                            <CardTitle>Approval Rules</CardTitle>
                            <CardDescription>Configure when attendance requires admin approval</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <Label>Past Date Threshold (days)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="30"
                                    value={settings.requireApprovalDays || 3}
                                    onChange={(e) => handleChange('requireApprovalDays', parseInt(e.target.value))}
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Require admin approval for attendance marked after this many days
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <Label className="text-base">Auto-approve Leaves</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Automatically approve leave requests
                                    </p>
                                </div>
                                <Switch
                                    checked={settings.autoApproveLeaves || false}
                                    onCheckedChange={(checked) => handleChange('autoApproveLeaves', checked)}
                                />
                            </div>

                            <div>
                                <Label>Minimum Attendance Percentage</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={settings.minAttendancePercent || 75}
                                    onChange={(e) => handleChange('minAttendancePercent', parseFloat(e.target.value))}
                                    className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Alert when attendance falls below this percentage
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}