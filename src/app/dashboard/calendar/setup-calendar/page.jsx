'use client';
// import { useState, useEffect } from 'react';
// import { useAuth } from '@/context/AuthContext';
// import { Card, CardContent } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Input } from '@/components/ui/input';
// import { cn } from '@/lib/utils';
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
    Check,
} from 'lucide-react';
// import { toast } from 'sonner';

// export default function CalendarSetup() {
//     const { fullUser } = useAuth();
//     const schoolId = fullUser?.schoolId;
//     const userId = fullUser?.id;

//     const [status, setStatus] = useState(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [isFetching, setIsFetching] = useState(false);
//     const [populating, setPopulating] = useState(false);
//     const [clearing, setClearing] = useState(false);
//     const [hasGoogleCalendar, setHasGoogleCalendar] = useState(false);

//     const [config, setConfig] = useState({
//         workingDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
//         startTime: '09:00',
//         endTime: '17:00',
//         fetchGoogleHolidays: true,
//         forceRefresh: false,
//     });

//     useEffect(() => {
//         if (schoolId) {
//             fetchStatus();
//             checkGoogleCalendar();
//         }
//     }, [schoolId]);

//     const checkGoogleCalendar = async () => {
//         try {
//             const res = await fetch(
//                 `/api/schools/${schoolId}/calendar/events?startDate=${new Date().toISOString()}&endDate=${new Date().toISOString()}`
//             );
//             const data = await res.json();
//             setHasGoogleCalendar(data.hasGoogleCalendar || false);
//         } catch (error) {
//             console.error('Failed to check Google Calendar:', error);
//         }
//     };

//     const handleGoogleCalendarConnect = () => {
//         window.location.href = `/api/auth/google-calendar?userId=${userId}&schoolId=${schoolId}`;
//     };

//     const fetchStatus = async () => {
//         try {
//             setIsFetching(true);
//             const res = await fetch(`/api/schools/${schoolId}/calendar/populate`);
//             const data = await res.json();
//             setStatus(data);

//             // Sync config from backend
//             if (data.isPopulated && data.currentConfig) {
//                 setConfig(prev => ({
//                     ...prev,
//                     workingDays: data.currentConfig.workingDays?.length > 0
//                         ? data.currentConfig.workingDays
//                         : prev.workingDays,
//                     startTime: data.currentConfig.startTime || prev.startTime,
//                     endTime: data.currentConfig.endTime || prev.endTime,
//                     fetchGoogleHolidays: data.currentConfig.fetchGoogleHolidays ?? prev.fetchGoogleHolidays,
//                 }));
//             }
//         } catch (error) {
//             console.error('Failed to fetch status:', error);
//             toast.error('Failed to load calendar status');
//         } finally {
//             setIsLoading(false);
//             setIsFetching(false);
//         }
//     };

//     const handlePopulate = async () => {
//         if (status?.isPopulated && !config.forceRefresh) {
//             const confirmed = confirm(
//                 'Calendar already populated\n\n' +
//                 'Do you want to regenerate it?\n\n' +
//                 'This will delete all entries and recreate them.\n\n' +
//                 'Click OK to proceed, or enable "Force Refresh" below.'
//             );
//             if (!confirmed) return;
//             setConfig(prev => ({ ...prev, forceRefresh: true }));
//         }

//         try {
//             setPopulating(true);
//             const res = await fetch(`/api/schools/${schoolId}/calendar/populate`, {
//                 method: 'POST',
//                 headers: { 'Content-Type': 'application/json' },
//                 body: JSON.stringify({
//                     ...config,
//                     forceRefresh: status?.isPopulated ? true : config.forceRefresh,
//                 }),
//             });

//             const data = await res.json();

//             if (!res.ok) {
//                 toast.error(`Error: ${data.error || 'Failed to populate calendar'}`);
//                 return;
//             }

//             toast.success(
//                 `Calendar & Attendance Config Created!\n\n` +
//                 `Days: ${data.stats.totalDays} | ` +
//                 `Working: ${data.stats.workingDays} | ` +
//                 `Weekends: ${data.stats.weekends} | ` +
//                 `Holidays: ${data.stats.holidays}\n` +
//                 `Hours: ${data.workingHours.startTime} – ${data.workingHours.endTime}\n` +
//                 `Attendance config auto-created`
//             );

//             fetchStatus();
//             checkGoogleCalendar();
//         } catch (error) {
//             toast.error(`Error: ${error.message}`);
//         } finally {
//             setPopulating(false);
//         }
//     };

//     const handleClear = async () => {
//         if (!confirm('Are you sure?\n\nThis will delete ALL calendar entries.\nThis cannot be undone.')) {
//             return;
//         }

//         try {
//             setClearing(true);
//             const res = await fetch(`/api/schools/${schoolId}/calendar/populate`, { method: 'DELETE' });
//             const data = await res.json();

//             if (!res.ok) {
//                 toast.error(data.error || 'Failed to clear');
//                 return;
//             }

//             toast.success(`Calendar cleared! ${data.deletedCount} entries removed.`);
//             fetchStatus();
//         } catch (error) {
//             toast.error(error.message);
//         } finally {
//             setClearing(false);
//         }
//     };

//     const toggleWorkingDay = (day) => {
//         setConfig(prev => ({
//             ...prev,
//             workingDays: prev.workingDays.includes(day)
//                 ? prev.workingDays.filter(d => d !== day)
//                 : [...prev.workingDays, day].sort((a, b) => a - b),
//         }));
//     };

//     const days = [
//         { value: 0, label: 'Sunday', short: 'Sun', abbr: 'S' },
//         { value: 1, label: 'Monday', short: 'Mon', abbr: 'M' },
//         { value: 2, label: 'Tuesday', short: 'Tue', abbr: 'T' },
//         { value: 3, label: 'Wednesday', short: 'Wed', abbr: 'W' },
//         { value: 4, label: 'Thursday', short: 'Thu', abbr: 'T' },
//         { value: 5, label: 'Friday', short: 'Fri', abbr: 'F' },
//         { value: 6, label: 'Saturday', short: 'Sat', abbr: 'S' },
//     ];

//     if (!schoolId) {
//         return (
//             <div className="flex items-center justify-center min-h-screen">
//                 <Loader2 className="h-8 w-8 animate-spin" />
//             </div>
//         );
//     }

//     return (
//         <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-6">
//             {/* Header */}
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//                 <div className="space-y-1">
//                     <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
//                         <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
//                         <span>School Calendar Setup</span>
//                     </h1>
//                     <p className="text-xs sm:text-sm text-muted-foreground">
//                         Configure working days, hours, and auto-create attendance config
//                     </p>
//                 </div>
//                 <div className="flex items-center gap-2">
//                     {!hasGoogleCalendar ? (
//                         <Button
//                             variant="outline"
//                             onClick={handleGoogleCalendarConnect}
//                             className="gap-2 hover:border-primary hover:text-primary transition-all"
//                             size="sm"
//                         >
//                             <ExternalLink className="h-4 w-4" />
//                             Connect Google Calendar
//                         </Button>
//                     ) : (
//                         <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
//                             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
//                             <span className="text-xs">Google Synced</span>
//                         </Badge>
//                     )}
//                     <Button
//                         variant="outline"
//                         size="sm"
//                         onClick={fetchStatus}
//                         disabled={isFetching}
//                         className="bg-muted"
//                     >
//                         <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
//                     </Button>
//                 </div>
//             </div>

//             {/* Status Card */}
//             <Card>
//                 <CardContent className="pt-4 sm:pt-6">
//                     {isLoading ? (
//                         <div className="flex items-center justify-center py-12">
//                             <div className="text-center space-y-3">
//                                 <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
//                                 <p className="text-sm text-muted-foreground">Loading calendar status...</p>
//                             </div>
//                         </div>
//                     ) : status ? (
//                         <div className="space-y-6">
//                             <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
//                                 <div className="space-y-2">
//                                     <h2 className="text-lg sm:text-xl font-bold">Calendar Status</h2>
//                                     {status.academicYear && (
//                                         <div className="space-y-1">
//                                             <p className="text-sm font-medium text-muted-foreground">
//                                                 {status.academicYear.name}
//                                             </p>
//                                             <p className="text-xs text-muted-foreground">
//                                                 {new Date(status.academicYear.startDate).toLocaleDateString('en-IN', {
//                                                     day: 'numeric', month: 'short', year: 'numeric'
//                                                 })}{' '}
//                                                 -{' '}
//                                                 {new Date(status.academicYear.endDate).toLocaleDateString('en-IN', {
//                                                     day: 'numeric', month: 'short', year: 'numeric'
//                                                 })}
//                                             </p>
//                                         </div>
//                                     )}
//                                 </div>
//                                 <Badge
//                                     variant="outline"
//                                     className={cn(
//                                         'text-xs font-medium px-3 py-1.5',
//                                         status.isPopulated
//                                             ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400'
//                                             : 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400'
//                                     )}
//                                 >
//                                     {status.isPopulated ? (
//                                         <>
//                                             <CheckCircle className="mr-2 h-4 w-4" />
//                                             Populated
//                                         </>
//                                     ) : (
//                                         <>
//                                             <AlertCircle className="mr-2 h-4 w-4" />
//                                             Not Populated
//                                         </>
//                                     )}
//                                 </Badge>
//                             </div>

//                             {status.calendarStats?.total > 0 && (
//                                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
//                                     <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20 hover:shadow-lg transition-all">
//                                         <CardContent className="p-4">
//                                             <div className="flex items-center justify-between">
//                                                 <div>
//                                                     <p className="text-xs text-muted-foreground font-medium">Working Days</p>
//                                                     <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
//                                                         {status.calendarStats.breakdown?.WORKING_DAY || 0}
//                                                     </p>
//                                                 </div>
//                                                 <Sun className="h-8 w-8 text-blue-500/40" />
//                                             </div>
//                                         </CardContent>
//                                     </Card>
//                                     <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20 hover:shadow-lg transition-all">
//                                         <CardContent className="p-4">
//                                             <div className="flex items-center justify-between">
//                                                 <div>
//                                                     <p className="text-xs text-muted-foreground font-medium">Weekends</p>
//                                                     <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
//                                                         {status.calendarStats.breakdown?.WEEKEND || 0}
//                                                     </p>
//                                                 </div>
//                                                 <Moon className="h-8 w-8 text-purple-500/40" />
//                                             </div>
//                                         </CardContent>
//                                     </Card>
//                                     <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 hover:shadow-lg transition-all">
//                                         <CardContent className="p-4">
//                                             <div className="flex items-center justify-between">
//                                                 <div>
//                                                     <p className="text-xs text-muted-foreground font-medium">Holidays</p>
//                                                     <p className="text-2xl font-bold text-red-600 dark:text-red-400">
//                                                         {status.calendarStats.breakdown?.HOLIDAY || 0}
//                                                     </p>
//                                                 </div>
//                                                 <Globe className="h-8 w-8 text-red-500/40" />
//                                             </div>
//                                         </CardContent>
//                                     </Card>
//                                 </div>
//                             )}
//                         </div>
//                     ) : null}
//                 </CardContent>
//             </Card>

//             {/* Configuration Card */}
//             <Card>
//                 <CardContent className="pt-4 sm:pt-6">
//                     <div className="space-y-6">
//                         <div className="space-y-3">
//                             <div className="flex items-center justify-between">
//                                 <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
//                                     <Settings className="h-5 w-5" />
//                                     Configuration
//                                 </h2>
//                                 <Badge variant="outline" className="text-xs">
//                                     <Info className="mr-1.5 h-3 w-3" />
//                                     {status?.isPopulated ? 'Current Settings' : 'Customize Settings'}
//                                 </Badge>
//                             </div>

//                             {/* Saved Calendar Config */}
//                             {status?.isPopulated && status?.currentConfig && (
//                                 <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
//                                     <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
//                                         Saved Calendar Config
//                                     </p>
//                                     <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
//                                         <p>
//                                             Working Days: {status.currentConfig.workingDays?.length > 0
//                                                 ? status.currentConfig.workingDays.map((d) => days[d]?.short).join(', ')
//                                                 : 'None'}
//                                         </p>
//                                         <p>Hours: {status.currentConfig.startTime} - {status.currentConfig.endTime}</p>
//                                         <p>Google Holidays: {status.currentConfig.fetchGoogleHolidays ? 'Enabled' : 'Disabled'}</p>
//                                     </div>
//                                 </div>
//                             )}

//                             {/* Attendance Config Status */}
//                             {status?.attendanceConfigCreated ? (
//                                 <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
//                                     <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
//                                     <div>
//                                         <p className="text-xs font-medium text-green-900 dark:text-green-100">
//                                             Attendance Config Created
//                                         </p>
//                                         <p className="text-xs text-green-700 dark:text-green-300">
//                                             Default: {status.attendanceConfig?.defaultStartTime} – {status.attendanceConfig?.defaultEndTime}
//                                         </p>
//                                     </div>
//                                 </div>
//                             ) : status?.isPopulated ? (
//                                 <div className="p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
//                                     <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
//                                     <p className="text-xs text-orange-700 dark:text-orange-300">
//                                         <strong>Warning:</strong> Attendance config missing. Will be created on next populate.
//                                     </p>
//                                 </div>
//                             ) : null}
//                         </div>

//                         {/* Working Days */}
//                         <div className="space-y-3">
//                             <label className="text-sm font-semibold">Select Working Days</label>
//                             {config.workingDays.length === 0 && (
//                                 <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
//                                     <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
//                                     <p className="text-xs text-yellow-700 dark:text-yellow-300">
//                                         <strong>Warning:</strong> No working days selected! All days will be weekends.
//                                     </p>
//                                 </div>
//                             )}
//                             <div className="grid grid-cols-7 gap-2 sm:gap-3">
//                                 {days.map((day) => {
//                                     const isSelected = config.workingDays.includes(day.value);
//                                     return (
//                                         <button
//                                             key={day.value}
//                                             type="button"
//                                             onClick={() => toggleWorkingDay(day.value)}
//                                             className={cn(
//                                                 'relative rounded-xl p-3 sm:p-4 transition-all duration-200 group',
//                                                 'border-2 hover:scale-105 active:scale-95',
//                                                 isSelected
//                                                     ? 'bg-primary border-primary text-primary-foreground shadow-md'
//                                                     : 'bg-muted/50 border-muted hover:border-muted-foreground/30 hover:bg-muted'
//                                             )}
//                                         >
//                                             {isSelected && (
//                                                 <div className="absolute -top-1 -right-1 bg-primary-foreground text-primary rounded-full p-0.5">
//                                                     <Check className="h-3 w-3 dark:text-white" />
//                                                 </div>
//                                             )}
//                                             <div className="flex flex-col items-center gap-1">
//                                                 <span className="hidden dark:text-white lg:block text-xs sm:text-sm font-semibold">
//                                                     {day.short}
//                                                 </span>
//                                                 <span className="hidden dark:text-white sm:block lg:hidden text-xs font-semibold">
//                                                     {day.abbr}
//                                                 </span>
//                                                 <span className="sm:hidden dark:text-white text-xs font-semibold">
//                                                     {day.abbr}
//                                                 </span>
//                                             </div>
//                                         </button>
//                                     );
//                                 })}
//                             </div>
//                             <p className="text-xs text-muted-foreground">
//                                 Click to select/deselect working days
//                             </p>
//                         </div>

//                         {/* Working Hours */}
//                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//                             <div className="space-y-2">
//                                 <label className="text-sm font-semibold flex items-center gap-2">
//                                     <Clock className="h-4 w-4 text-muted-foreground" />
//                                     Start Time
//                                 </label>
//                                 <Input
//                                     type="time"
//                                     value={config.startTime}
//                                     onChange={(e) => setConfig(prev => ({ ...prev, startTime: e.target.value }))}
//                                     className="bg-muted/50 border-2 hover:border-muted-foreground/30 focus:border-primary"
//                                 />
//                             </div>
//                             <div className="space-y-2">
//                                 <label className="text-sm font-semibold flex items-center gap-2">
//                                     <Clock className="h-4 w-4 text-muted-foreground" />
//                                     End Time
//                                 </label>
//                                 <Input
//                                     type="time"
//                                     value={config.endTime}
//                                     onChange={(e) => setConfig(prev => ({ ...prev, endTime: e.target.value }))}
//                                     className="bg-muted/50 border-2 hover:border-muted-foreground/30 focus:border-primary"
//                                 />
//                             </div>
//                         </div>

//                         {/* Options */}
//                         <div className="space-y-3">
//                             <label
//                                 className={cn(
//                                     'flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all',
//                                     'border-2 hover:shadow-md',
//                                     config.fetchGoogleHolidays
//                                         ? 'bg-primary/5 border-primary/20'
//                                         : 'bg-muted/30 border-muted'
//                                 )}
//                             >
//                                 <Checkbox
//                                     id="googleHolidays"
//                                     checked={config.fetchGoogleHolidays}
//                                     onCheckedChange={(checked) => setConfig(prev => ({ ...prev, fetchGoogleHolidays: !!checked }))}
//                                     className="mt-1"
//                                 />
//                                 <div className="flex-1 space-y-1">
//                                     <div className="flex items-center gap-2">
//                                         <Globe className="h-4 w-4" />
//                                         <span className="font-medium text-sm">Fetch Indian Holidays</span>
//                                     </div>
//                                     <p className="text-xs text-muted-foreground">
//                                         Auto-import national holidays from Google Calendar
//                                     </p>
//                                 </div>
//                             </label>

//                             {status?.isPopulated && (
//                                 <label
//                                     className={cn(
//                                         'flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all',
//                                         'border-2 hover:shadow-md',
//                                         config.forceRefresh
//                                             ? 'bg-yellow-500/10 border-yellow-500/30'
//                                             : 'bg-muted/30 border-muted'
//                                     )}
//                                 >
//                                     <Checkbox
//                                         id="forceRefresh"
//                                         checked={config.forceRefresh}
//                                         onCheckedChange={(checked) => setConfig(prev => ({ ...prev, forceRefresh: !!checked }))}
//                                         className="mt-1"
//                                     />
//                                     <div className="flex-1 space-y-1">
//                                         <div className="flex items-center gap-2">
//                                             <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
//                                             <span className="font-medium text-sm">Force Refresh</span>
//                                         </div>
//                                         <p className="text-xs text-muted-foreground">
//                                             Delete and regenerate calendar
//                                         </p>
//                                     </div>
//                                 </label>
//                             )}
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>

//             {/* Actions */}
//             <div className="flex flex-col sm:flex-row gap-3">
//                 <Button
//                     onClick={handlePopulate}
//                     disabled={populating}
//                     className="flex-1 h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
//                     size="lg"
//                 >
//                     {populating ? (
//                         <>
//                             <Loader2 className="mr-2 h-5 w-5 animate-spin" />
//                             Populating...
//                         </>
//                     ) : (
//                         <>
//                             <Download className="mr-2 h-5 w-5" />
//                             Populate Calendar
//                         </>
//                     )}
//                 </Button>

//                 {status?.isPopulated && (
//                     <Button
//                         variant="destructive"
//                         onClick={handleClear}
//                         disabled={clearing}
//                         className="h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
//                         size="lg"
//                     >
//                         {clearing ? (
//                             <>
//                                 <Loader2 className="mr-2 h-5 w-5 animate-spin" />
//                                 Clearing...
//                             </>
//                         ) : (
//                             <>
//                                 <Trash2 className="mr-2 h-5 w-5" />
//                                 Clear Calendar
//                             </>
//                         )}
//                     </Button>
//                 )}
//             </div>

//             {/* Info Cards */}
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
// <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
//     <CardContent className="pt-4">
//         <div className="flex items-start gap-3">
//             <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
//                 <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
//             </div>
//             <div className="space-y-1">
//                 <h3 className="text-sm font-semibold">Auto Attendance Config</h3>
//                 <p className="text-xs text-muted-foreground">
//                     Attendance config is created automatically when you populate the calendar.
//                 </p>
//             </div>
//         </div>
//     </CardContent>
// </Card>

// <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
//     <CardContent className="pt-4">
//         <div className="flex items-start gap-3">
//             <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
//                 <Globe className="h-5 w-5 text-purple-600 dark:text-purple-400" />
//             </div>
//             <div className="space-y-1">
//                 <h3 className="text-sm font-semibold">Google Calendar</h3>
//                 <p className="text-xs text-muted-foreground">
//                     National holidays are fetched. Add custom holidays manually later.
//                 </p>
//             </div>
//         </div>
//     </CardContent>
// </Card>
//             </div>
//         </div>
//     );
// }

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
// import {
//     Calendar, RefreshCw, CheckCircle, AlertCircle, Loader2,
//     Trash2, Download, Clock, Globe, Sun, Moon, Info, Settings,
//     ExternalLink, Check
// } from 'lucide-react';
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
        workingDays: [1, 2, 3, 4, 5, 6],
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
            const res = await fetch(`/api/schools/${schoolId}/calendar/events?startDate=2025-01-01&endDate=2025-12-31`);
            const data = await res.json();
            setHasGoogleCalendar(data.hasGoogleCalendar || false);
        } catch (error) {
            console.error('Failed to check Google Calendar:', error);
        }
    };

    const fetchStatus = async () => {
        try {
            setIsFetching(true);
            const res = await fetch(`/api/schools/${schoolId}/calendar/populate`);
            const data = await res.json();
            setStatus(data);

            if (data.isPopulated && data.currentConfig) {
                setConfig(prev => ({
                    ...prev,
                    workingDays: data.currentConfig.workingDays || prev.workingDays,
                    startTime: data.currentConfig.startTime || prev.startTime,
                    endTime: data.currentConfig.endTime || prev.endTime,
                    fetchGoogleHolidays: data.currentConfig.fetchGoogleHolidays ?? prev.fetchGoogleHolidays,
                }));
            }
        } catch (error) {
            toast.error('Failed to load calendar status');
        } finally {
            setIsLoading(false);
            setIsFetching(false);
        }
    };

    const handlePopulate = async () => {
        if (status?.isPopulated && !config.forceRefresh) {
            const confirmed = window.confirm(
                'Calendar already populated\n\n' +
                'Do you want to regenerate it?\n\n' +
                'This will delete all entries and recreate them.\n\n' +
                'Click OK to proceed.'
            );
            if (!confirmed) return;
            setConfig(prev => ({ ...prev, forceRefresh: true }));
        }

        try {
            setPopulating(true);
            const res = await fetch(`/api/schools/${schoolId}/calendar/populate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...config,
                    forceRefresh: status?.isPopulated ? true : config.forceRefresh,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Failed to populate calendar');
                return;
            }

            toast.success(
                `Calendar & Attendance Config Created!\n\n` +
                `Days: ${data.stats.totalDays} | ` +
                `Working: ${data.stats.workingDays} | ` +
                `Weekends: ${data.stats.weekends} | ` +
                `Holidays: ${data.stats.holidays}\n` +
                `Hours: ${data.workingHours.startTime} – ${data.workingHours.endTime}\n` +
                `Attendance config auto-created`
            );

            fetchStatus();
            checkGoogleCalendar();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setPopulating(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm('Are you sure?\n\nThis will delete ALL calendar entries.\nThis cannot be undone.')) {
            return;
        }

        try {
            setClearing(true);
            const res = await fetch(`/api/schools/${schoolId}/calendar/populate`, { method: 'DELETE' });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Failed to clear');
                return;
            }

            toast.success(`Calendar cleared! ${data.deletedCount} entries removed.`);
            fetchStatus();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setClearing(false);
        }
    };

    const toggleWorkingDay = (day) => {
        setConfig(prev => ({
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
                        <Calendar className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
                        <span>School Calendar Setup</span>
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                        Configure working days, hours, and auto-create attendance config
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!hasGoogleCalendar ? (
                        <Button
                            variant="outline"
                            onClick={() => window.location.href = `/api/auth/google-calendar?userId=${userId}&schoolId=${schoolId}`}
                            className="gap-2"
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
                    <Button variant="outline" size="sm" onClick={fetchStatus} disabled={isFetching}>
                        <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                    </Button>
                </div>
            </div>

            {/* Status Card */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-10 w-10 mx-auto animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground mt-3">Loading...</p>
                        </div>
                    ) : status ? (
                        <div className="space-y-6">
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
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}{' '}
                                                -{' '}
                                                {new Date(status.academicYear.endDate).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        'text-xs font-medium px-3 py-1.5',
                                        status.isPopulated
                                            ? 'bg-green-100 text-green-700 border-green-200'
                                            : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                    )}
                                >
                                    {status.isPopulated ? (
                                        <>Populated</>
                                    ) : (
                                        <>Not Populated</>
                                    )}
                                </Badge>
                            </div>

                            {status.calendarStats?.total > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">Working Days</p>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {status.calendarStats.breakdown?.WORKING_DAY || 0}
                                                    </p>
                                                </div>
                                                <Sun className="h-8 w-8 text-blue-500/40" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">Weekends</p>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {status.calendarStats.breakdown?.WEEKEND || 0}
                                                    </p>
                                                </div>
                                                <Moon className="h-8 w-8 text-purple-500/40" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">Holidays</p>
                                                    <p className="text-2xl font-bold text-red-600">
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
                                {status?.isPopulated ? 'Current Settings' : 'Customize'}
                            </Badge>
                        </div>

                        {/* Saved Config */}
                        {status?.isPopulated && status?.currentConfig && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-medium text-blue-900 mb-1">Saved Config</p>
                                <div className="text-xs text-blue-700 space-y-1">
                                    <p>Working Days: {status.currentConfig.workingDays.map(d => days[d]?.short).join(', ')}</p>
                                    <p>Hours: {status.currentConfig.startTime} - {status.currentConfig.endTime}</p>
                                    <p>Google Holidays: {status.currentConfig.fetchGoogleHolidays ? 'Enabled' : 'Disabled'}</p>
                                </div>
                            </div>
                        )}

                        {/* Attendance Config Status */}
                        {status?.attendanceConfigCreated ? (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-green-900">Attendance Config Created</p>
                                    <p className="text-xs text-green-700">
                                        Default: {status.attendanceConfig?.defaultStartTime} – {status.attendanceConfig?.defaultEndTime}
                                    </p>
                                </div>
                            </div>
                        ) : null}

                        {/* Working Days */}
                        <div className="space-y-3">
                            <label className="text-sm font-semibold">Select Working Days</label>
                            {config.workingDays.length === 0 && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                    <p className="text-xs text-yellow-700">
                                        <strong>Warning:</strong> No working days selected!
                                    </p>
                                </div>
                            )}
                            <div className="grid grid-cols-7 gap-2 sm:gap-3">
                                {days.map((day) => {
                                    const isSelected = config.workingDays.includes(day.value);
                                    return (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleWorkingDay(day.value)}
                                            className={cn(
                                                'relative rounded-xl p-3 sm:p-4 transition-all duration-200 group border-2',
                                                isSelected
                                                    ? 'bg-primary border-primary text-primary-foreground shadow-md'
                                                    : 'bg-muted/50 border-muted hover:border-muted-foreground/30'
                                            )}
                                        >
                                            {isSelected && (
                                                <div className="absolute -top-1 -right-1 bg-primary-foreground text-primary rounded-full p-0.5">
                                                    <Check className="h-3 w-3  dark:text-white" />
                                                </div>
                                            )}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="hidden lg:block text-xs sm:text-sm font-semibold dark:text-white">{day.short}</span>
                                                <span className="hidden sm:block lg:hidden text-xs font-semibold dark:text-white">{day.abbr}</span>
                                                <span className="sm:hidden text-xs font-semibold dark:text-white">{day.abbr}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Hours */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Start Time
                                </label>
                                <Input
                                    type="time"
                                    value={config.startTime}
                                    onChange={(e) => setConfig(prev => ({ ...prev, startTime: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    End Time
                                </label>
                                <Input
                                    type="time"
                                    value={config.endTime}
                                    onChange={(e) => setConfig(prev => ({ ...prev, endTime: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            <label className={cn('flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2', config.fetchGoogleHolidays ? 'bg-primary/5 border-primary/20' : 'bg-muted/30 border-muted')}>
                                <Checkbox
                                    id="googleHolidays"
                                    checked={config.fetchGoogleHolidays}
                                    onCheckedChange={(c) => setConfig(prev => ({ ...prev, fetchGoogleHolidays: !!c }))}
                                />
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-4 w-4" />
                                        <span className="font-medium text-sm">Fetch Indian Holidays</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Auto-import national holidays</p>
                                </div>
                            </label>

                            {status?.isPopulated && (
                                <label className={cn('flex items-start gap-3 p-4 rounded-xl cursor-pointer border-2', config.forceRefresh ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-muted/30 border-muted')}>
                                    <Checkbox
                                        id="forceRefresh"
                                        checked={config.forceRefresh}
                                        onCheckedChange={(c) => setConfig(prev => ({ ...prev, forceRefresh: !!c }))}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                            <span className="font-medium text-sm">Force Refresh</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Delete and regenerate calendar</p>
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
                    disabled={populating}
                    className="flex-1 h-12 text-base font-semibold"
                    size="lg"
                >
                    {populating ? (
                        <>Populating...</>
                    ) : (
                        <>Populate Calendar</>
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
                            <>Clearing...</>
                        ) : (
                            <>Clear Calendar</>
                        )}
                    </Button>
                )}
            </div>

            {/* Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold">Auto Attendance Config</h3>
                                <p className="text-xs text-muted-foreground">
                                    Attendance config is created automatically when you populate the calendar.
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
                                <h3 className="text-sm font-semibold">Google Calendar</h3>
                                <p className="text-xs text-muted-foreground">
                                    National holidays are fetched. Add custom holidays manually later.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}