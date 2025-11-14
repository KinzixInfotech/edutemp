'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Calendar,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Loader2,
    Trash2,
    Download,
    Clock,
    Globe,
    Sun,
    Moon,
    Info,
    AlertTriangle,
    Settings,
    ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CalendarSetup() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const userId = fullUser?.id;

    const [status, setStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);
    const [populating, setPopulating] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);

    const [config, setConfig] = useState({
        workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
        startTime: '09:00',
        endTime: '17:00',
        fetchGoogleHolidays: true,
        forceRefresh: false,
    });

    useEffect(() => {
        if (schoolId) {
            fetchStatus();
            checkGoogleCalendar();
        }
    }, [schoolId]);

    const checkGoogleCalendar = async () => {
        try {
            const res = await fetch(
                `/api/schools/${schoolId}/calendar/events?startDate=${new Date().toISOString()}&endDate=${new Date().toISOString()}`
            );
            const data = await res.json();
            setHasGoogleCalendar(data.hasGoogleCalendar || false);
        } catch (error) {
            console.error('Failed to check Google Calendar:', error);
        }
    };

    const handleGoogleCalendarConnect = () => {
        window.location.href = `/api/auth/google-calendar?userId=${userId}&schoolId=${schoolId}`;
    };

    const fetchStatus = async () => {
        try {
            setIsFetching(true);
            const res = await fetch(`/api/schools/${schoolId}/calendar/populate`);
            const data = await res.json();
            setStatus(data);
        } catch (error) {
            console.error('Failed to fetch status:', error);
            toast.error('Something Went Wrong While Fetching')
        } finally {
            setIsLoading(false);
            setIsFetching(false);
        }
    };

    const handlePopulate = async () => {
        if (status?.isPopulated && !config.forceRefresh) {
            if (!confirm('⚠️ Calendar already populated\n\nDo you want to regenerate it? This will delete existing entries and create new ones.\n\nClick OK to proceed, or enable "Force Refresh" checkbox below.')) {
                return;
            }
            // User confirmed via dialog, enable force refresh
            setConfig(prev => ({ ...prev, forceRefresh: true }));
        }

        try {
            setPopulating(true);
            const res = await fetch(`/api/schools/${schoolId}/calendar/populate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...config,
                    forceRefresh: status?.isPopulated ? true : config.forceRefresh, // Always force refresh if already populated
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                // alert('❌ Error: ' + (data.error || 'Failed to populate calendar'));
                toast.error(`Error:${data.error || 'Failed To Populate Calendar'}`)
                return;
            }

            // alert(`✅ Calendar populated successfully!\n\nTotal Days: ${data.stats.totalDays}\nWorking Days: ${data.stats.workingDays}\nWeekends: ${data.stats.weekends}\nHolidays: ${data.stats.holidays}\n\nGoogle Holidays: ${data.stats.holidaysFromGoogle}`);
            toast.success(`Calendar populated successfully!\n\nTotal Days: ${data.stats.totalDays}\nWorking Days: ${data.stats.workingDays}\nWeekends: ${data.stats.weekends}\nHolidays: ${data.stats.holidays}\n\nGoogle Holidays: ${data.stats.holidaysFromGoogle}`);
            
            fetchStatus();
            checkGoogleCalendar();
        } catch (error) {
            // alert('❌ Error: ' + error.message);
            toast.error(`Error ${error.message}`)
        } finally {
            setPopulating(false);
        }
    };

    const handleClear = async () => {
        if (!confirm('⚠️ Are you sure you want to clear the entire calendar?\n\nThis will delete all calendar entries and cannot be undone.')) {
            return;
        }

        try {
            setClearing(true);
            const res = await fetch(`/api/schools/${schoolId}/calendar/populate`, {
                method: 'DELETE',
            });

            const data = await res.json();

            if (!res.ok) {
                // alert('❌ Error: ' + (data.error || 'Failed to clear calendar'));
                toast.error('❌ Error: ' + (data.error || 'Failed to clear calendar'));
                return;
            }

            toast.success(`✅ Calendar cleared successfully!\n\nDeleted ${data.deletedCount} entries`);
            fetchStatus();
        } catch (error) {
            toast.error('❌ Error: ' + error.message);
        } finally {
            setClearing(false);
        }
    };

    const toggleWorkingDay = (day) => {
        setConfig(prev => ({
            ...prev,
            workingDays: prev.workingDays.includes(day)
                ? prev.workingDays.filter(d => d !== day)
                : [...prev.workingDays, day].sort(),
        }));
    };

    const days = [
        { value: 0, label: 'Sun', short: 'S' },
        { value: 1, label: 'Mon', short: 'M' },
        { value: 2, label: 'Tue', short: 'T' },
        { value: 3, label: 'Wed', short: 'W' },
        { value: 4, label: 'Thu', short: 'T' },
        { value: 5, label: 'Fri', short: 'F' },
        { value: 6, label: 'Sat', short: 'S' },
    ];

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                        <span>School Calendar Setup</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Configure and populate your school calendar with working days and holidays
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!hasGoogleCalendar ? (
                        <Button
                            variant="outline"
                            onClick={handleGoogleCalendarConnect}
                            className="gap-2 hover:border-primary hover:text-primary transition-all"
                            size="sm"
                        >
                            <ExternalLink className="h-4 w-4" />
                            Connect Google Calendar
                        </Button>
                    ) : (
                        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs">Google Synced</span>
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchStatus}
                        disabled={isFetching}
                        className="bg-muted"
                    >
                        <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                    </Button>
                </div>
            </div>

            {/* Status Card */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-center space-y-3">
                                <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Loading calendar status...</p>
                            </div>
                        </div>
                    ) : status ? (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="space-y-2">
                                    <h2 className="text-lg sm:text-xl font-bold">Calendar Status</h2>
                                    {status.academicYear && (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                {status.academicYear.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(status.academicYear.startDate).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })} - {new Date(status.academicYear.endDate).toLocaleDateString('en-IN', {
                                                    day: 'numeric',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "text-xs",
                                        status.isPopulated
                                            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400"
                                            : "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400"
                                    )}
                                >
                                    {status.isPopulated ? (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Populated
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="mr-2 h-4 w-4" />
                                            Not Populated
                                        </>
                                    )}
                                </Badge>
                            </div>

                            {/* Stats */}
                            {status.calendarStats?.total > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-lg transition-all">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">Working Days</p>
                                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                        {status.calendarStats.breakdown?.WORKING_DAY || 0}
                                                    </p>
                                                </div>
                                                <Sun className="h-8 w-8 text-blue-500/40" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-lg transition-all">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">Weekends</p>
                                                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                        {status.calendarStats.breakdown?.WEEKEND || 0}
                                                    </p>
                                                </div>
                                                <Moon className="h-8 w-8 text-purple-500/40" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 hover:shadow-lg transition-all">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">Holidays</p>
                                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                                        {status.calendarStats.breakdown?.HOLIDAY || 0}
                                                    </p>
                                                </div>
                                                <Globe className="h-8 w-8 text-red-500/40" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                    ) : null}
                </CardContent>
            </Card>

            {/* Configuration Card */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Configuration
                            </h2>
                            <Badge variant="outline" className="text-xs">
                                <Info className="mr-1.5 h-3 w-3" />
                                Customize Settings
                            </Badge>
                        </div>

                        {/* Working Days */}
                        <div className="space-y-3">
                            <label className="text-sm  font-semibold">
                                Select Working Days
                            </label>
                            <div className="grid mt-2.5 grid-cols-7 gap-2">
                                {days.map(day => (
                                    <Button
                                        key={day.value}
                                        type="button"
                                        variant={config.workingDays.includes(day.value) ? "default" : "outline"}
                                        onClick={() => toggleWorkingDay(day.value)}
                                        className={cn(
                                            "h-12 sm:h-14 font-medium transition-all",
                                            !config.workingDays.includes(day.value) && "bg-muted"
                                        )}
                                    >
                                        <span className="hidden sm:block">{day.label}</span>
                                        <span className="sm:hidden">{day.short}</span>
                                    </Button>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Click to select/deselect working days for your school
                            </p>
                        </div>

                        {/* Working Hours */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    Start Time
                                </label>
                                <Input
                                    type="time"
                                    value={config.startTime}
                                    onChange={(e) => setConfig(prev => ({ ...prev, startTime: e.target.value }))}
                                    className="bg-muted"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    End Time
                                </label>
                                <Input
                                    type="time"
                                    value={config.endTime}
                                    onChange={(e) => setConfig(prev => ({ ...prev, endTime: e.target.value }))}
                                    className="bg-muted"
                                />
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            <label className="flex items-start gap-3 p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border">
                                <Checkbox
                                    id="googleHolidays"
                                    checked={config.fetchGoogleHolidays}
                                    onCheckedChange={(checked) => 
                                        setConfig(prev => ({ ...prev, fetchGoogleHolidays: checked }))
                                    }
                                    className="mt-1"
                                />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        <span className="font-medium text-sm">Fetch Indian Holidays</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Automatically import national holidays from Google Calendar API
                                    </p>
                                </div>
                            </label>

                            {status?.isPopulated && (
                                <label className="flex items-start gap-3 p-4 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors border-2 border-yellow-500/20 bg-yellow-500/5">
                                    <Checkbox
                                        id="forceRefresh"
                                        checked={config.forceRefresh}
                                        onCheckedChange={(checked) => 
                                            setConfig(prev => ({ ...prev, forceRefresh: checked }))
                                        }
                                        className="mt-1"
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                            <span className="font-medium text-sm">Force Refresh</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            ⚠️ Delete existing calendar entries and regenerate from scratch
                                        </p>
                                    </div>
                                </label>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    onClick={handlePopulate}
                    disabled={populating || (status?.isPopulated && !config.forceRefresh)}
                    className="flex-1 h-12 text-base font-semibold"
                    size="lg"
                >
                    {populating ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Populating Calendar...
                        </>
                    ) : (
                        <>
                            <Download className="mr-2 h-5 w-5" />
                            Populate Calendar
                        </>
                    )}
                </Button>

                {status?.isPopulated && (
                    <Button
                        variant="destructive"
                        onClick={handleClear}
                        disabled={clearing}
                        className="h-12 text-base font-semibold"
                        size="lg"
                    >
                        {clearing ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Clearing...
                            </>
                        ) : (
                            <>
                                <Trash2 className="mr-2 h-5 w-5" />
                                Clear Calendar
                            </>
                        )}
                    </Button>
                )}
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Automatic Population</h3>
                                <p className="text-xs text-muted-foreground">
                                    The attendance cron job will automatically populate the calendar if it's empty when marking attendance.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                                <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Google Calendar Integration</h3>
                                <p className="text-xs text-muted-foreground">
                                    Holidays are fetched from Indian national calendar. Additional holidays can be added manually later.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}