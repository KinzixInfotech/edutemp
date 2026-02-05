'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, useQueries } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Clock,
    MapPin,
    X,
    Check,
    Loader2,
    ExternalLink,
    Calendar as CalendarIcon,
    Bell,
    Sparkles,
    Settings,
    LayoutGrid,
    List,
    CalendarDays,
    PanelLeftClose,
    PanelLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

// Import calendar components
import {
    CalendarGrid,
    DayView,
    WeekView,
    MiniCalendar,
    EventPopover,
    EventDetailModal
} from '@/components/calendar';

// Event type configurations
const eventTypeColors = {
    CUSTOM: '#3B82F6',
    HOLIDAY: '#EF4444',
    VACATION: '#F59E0B',
    EXAM: '#8B5CF6',
    SPORTS: '#10B981',
    MEETING: '#6366F1',
    ADMISSION: '#EC4899',
    FEE_DUE: '#F97316',
    BIRTHDAY: '#14B8A6',
};

const eventTypeLabels = {
    CUSTOM: 'Custom Event',
    HOLIDAY: 'Holiday',
    VACATION: 'Vacation',
    EXAM: 'Examination',
    SPORTS: 'Sports Event',
    MEETING: 'Meeting',
    ADMISSION: 'Admission',
    FEE_DUE: 'Fee Due',
    BIRTHDAY: 'Birthday',
};

// View mode options
const VIEW_MODES = {
    MONTH: 'month',
    WEEK: 'week',
    DAY: 'day',
    SCHEDULE: 'schedule',
};

// Helper to generate month keys for ±6 months
function getMonthsToPreload(centerDate) {
    const months = [];
    for (let i = -6; i <= 6; i++) {
        const date = new Date(centerDate);
        date.setMonth(date.getMonth() + i);
        months.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            date: date,
        });
    }
    return months;
}

// Fetch function for a specific month
const fetchMonthEvents = async (schoolId, year, month) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const res = await fetch(
        `/api/schools/${schoolId}/calendar/events?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
    );
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
};

export default function SchoolCalendar() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const userId = fullUser?.id;
    const queryClient = useQueryClient();

    // Core state
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewMode, setViewMode] = useState(VIEW_MODES.MONTH);
    const [showSidebar, setShowSidebar] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const initialLoadRef = useRef(false);

    // Event state
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Quick event popover
    const [popoverState, setPopoverState] = useState({
        isOpen: false,
        position: { top: 0, left: 0 },
        date: null,
    });

    // Form state for full create dialog
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventType: 'CUSTOM',
        category: 'OTHER',
        startDate: '',
        endDate: '',
        startTime: '',
        endTime: '',
        isAllDay: false,
        location: '',
        venue: '',
        color: '#3B82F6',
        priority: 'NORMAL',
        targetAudience: 'ALL',
        sendPushNotification: false,
    });

    // Get months to prefetch (±6 months from current)
    const monthsToLoad = useMemo(() => getMonthsToPreload(currentDate), [currentDate]);

    // Parallel fetch all 13 months at once
    const monthQueries = useQueries({
        queries: monthsToLoad.map(({ year, month }) => ({
            queryKey: ['calendar-events', schoolId, year, month],
            queryFn: () => fetchMonthEvents(schoolId, year, month),
            enabled: !!schoolId,
            staleTime: 10 * 60 * 1000, // 10 min stale
            gcTime: 60 * 60 * 1000, // 1 hour cache
            refetchOnMount: false,
            refetchOnWindowFocus: false,
        })),
    });

    // Calculate loading progress based on completed queries
    useEffect(() => {
        const completed = monthQueries.filter(q => q.isSuccess || q.isError).length;
        const total = monthQueries.length;
        const progress = Math.round((completed / total) * 100);
        setLoadingProgress(progress);

        if (progress === 100 && !initialLoadRef.current) {
            initialLoadRef.current = true;
        }
    }, [monthQueries]);

    // Get current month's data
    const currentMonthIndex = monthsToLoad.findIndex(
        m => m.year === currentDate.getFullYear() && m.month === currentDate.getMonth()
    );
    const currentMonthQuery = monthQueries[currentMonthIndex];
    const eventsData = currentMonthQuery?.data;
    const eventsLoading = currentMonthQuery?.isLoading;
    const isFetching = currentMonthQuery?.isFetching;

    // Check if target month data is available before navigation
    const isMonthDataReady = useCallback((targetDate) => {
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();
        const data = queryClient.getQueryData(['calendar-events', schoolId, targetYear, targetMonth]);
        return !!data;
    }, [queryClient, schoolId]);

    const { data: upcomingData } = useQuery({
        queryKey: ['upcoming-events', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/calendar/upcoming?limit=5`);
            if (!res.ok) throw new Error('Failed to fetch upcoming events');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    // Optimistic create mutation
    const createEventMutation = useMutation({
        mutationFn: async (eventData) => {
            const res = await fetch(`/api/schools/${schoolId}/calendar/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...eventData,
                    createdById: userId,
                }),
            });
            if (!res.ok) throw new Error('Failed to create event');
            return res.json();
        },
        onMutate: async (newEvent) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['calendar-events'] });

            // Snapshot previous events
            const previousEvents = queryClient.getQueryData(['calendar-events', schoolId, currentDate.getFullYear(), currentDate.getMonth()]);

            // Optimistically add event
            if (previousEvents) {
                const optimisticEvent = {
                    id: `temp-${Date.now()}`,
                    ...newEvent,
                    start: newEvent.startDate,
                    end: newEvent.endDate,
                    source: 'custom',
                };

                queryClient.setQueryData(
                    ['calendar-events', schoolId, currentDate.getFullYear(), currentDate.getMonth()],
                    {
                        ...previousEvents,
                        events: [...(previousEvents.events || []), optimisticEvent],
                    }
                );
            }

            return { previousEvents };
        },
        onError: (err, newEvent, context) => {
            // Rollback on error
            if (context?.previousEvents) {
                queryClient.setQueryData(
                    ['calendar-events', schoolId, currentDate.getFullYear(), currentDate.getMonth()],
                    context.previousEvents
                );
            }
        },
        onSuccess: (data) => {
            // Show success with Google Calendar sync status
            if (data?.googleCalendarSynced) {
                console.log('✅ Event synced to Google Calendar:', data.googleEventId);
            }
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
        },
    });

    const events = eventsData?.events || [];
    const upcomingEvents = upcomingData?.events || [];
    const hasGoogleCalendar = eventsData?.hasGoogleCalendar || false;

    // Event dates for mini calendar
    const eventDates = useMemo(() =>
        events.map(e => new Date(e.start || e.startDate)),
        [events]
    );

    // Stats
    const eventStats = useMemo(() => ({
        total: events.length,
        holidays: events.filter(e => e.eventType === 'HOLIDAY').length,
        exams: events.filter(e => e.eventType === 'EXAM').length,
        meetings: events.filter(e => e.eventType === 'MEETING').length,
    }), [events]);


    // Handlers
    const handleQuickSave = useCallback((eventData) => {
        setPopoverState({ isOpen: false, position: { top: 0, left: 0 }, date: null });
        createEventMutation.mutate(eventData);
    }, [createEventMutation]);

    const handleMoreOptions = useCallback((prefilledData) => {
        setPopoverState({ isOpen: false, position: { top: 0, left: 0 }, date: null });
        setFormData(prev => ({
            ...prev,
            ...prefilledData,
            color: eventTypeColors[prefilledData.eventType] || '#3B82F6',
        }));
        setIsCreateOpen(true);
    }, []);

    const handleCreateEvent = useCallback(() => {
        if (!formData.title || !formData.startDate) return;
        createEventMutation.mutate(formData);
        setIsCreateOpen(false);
        resetForm();
    }, [formData, createEventMutation]);

    const resetForm = useCallback(() => {
        setFormData({
            title: '',
            description: '',
            eventType: 'CUSTOM',
            category: 'OTHER',
            startDate: '',
            endDate: '',
            startTime: '',
            endTime: '',
            isAllDay: false,
            location: '',
            venue: '',
            color: '#3B82F6',
            priority: 'NORMAL',
            targetAudience: 'ALL',
            sendPushNotification: false,
        });
    }, []);

    const handleDateClick = useCallback((day, position, dayEvents) => {
        if (dayEvents && dayEvents.length > 0) {
            // If events exist, show day view or first event
            if (dayEvents.length === 1) {
                setSelectedEvent(dayEvents[0]);
                setIsDetailOpen(true);
            } else {
                setSelectedDate(day.fullDate);
                setViewMode(VIEW_MODES.DAY);
            }
        } else {
            // Show quick create popover
            setPopoverState({
                isOpen: true,
                position,
                date: day.fullDate,
            });
        }
    }, []);

    const handleEventClick = useCallback((event) => {
        setSelectedEvent(event);
        setIsDetailOpen(true);
    }, []);

    const handlePrevious = useCallback(() => {
        const targetDate = new Date(currentDate);
        if (viewMode === VIEW_MODES.MONTH) {
            targetDate.setMonth(targetDate.getMonth() - 1);
        } else if (viewMode === VIEW_MODES.WEEK) {
            targetDate.setDate(targetDate.getDate() - 7);
        } else {
            targetDate.setDate(targetDate.getDate() - 1);
        }

        // Only navigate if data is ready (cached) or for non-month views
        if (viewMode !== VIEW_MODES.MONTH || isMonthDataReady(targetDate)) {
            setCurrentDate(targetDate);
        }
    }, [viewMode, currentDate, isMonthDataReady]);

    const handleNext = useCallback(() => {
        const targetDate = new Date(currentDate);
        if (viewMode === VIEW_MODES.MONTH) {
            targetDate.setMonth(targetDate.getMonth() + 1);
        } else if (viewMode === VIEW_MODES.WEEK) {
            targetDate.setDate(targetDate.getDate() + 7);
        } else {
            targetDate.setDate(targetDate.getDate() + 1);
        }

        // Only navigate if data is ready (cached) or for non-month views
        if (viewMode !== VIEW_MODES.MONTH || isMonthDataReady(targetDate)) {
            setCurrentDate(targetDate);
        }
    }, [viewMode, currentDate, isMonthDataReady]);

    const handleToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    const updateFormField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    // Format header title based on view
    const headerTitle = useMemo(() => {
        if (viewMode === VIEW_MODES.MONTH) {
            return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        } else if (viewMode === VIEW_MODES.WEEK) {
            const weekStart = new Date(currentDate);
            weekStart.setDate(currentDate.getDate() - currentDate.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;
            }
            return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
        return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }, [currentDate, viewMode]);

    if (!schoolId || !userId) return <LoaderPage />;

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col relative">
            {/* Top Loading Progress Bar - Supabase style */}
            {(isFetching || loadingProgress < 100) && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-transparent overflow-hidden z-50">
                    <div
                        className="absolute h-full w-1/4 bg-primary rounded-full"
                        style={{
                            animation: 'calendar-loading 1.4s ease-in-out infinite',
                        }}
                    />
                    <style jsx>{`
                        @keyframes calendar-loading {
                            0% {
                                left: -25%;
                            }
                            100% {
                                left: 100%;
                            }
                        }
                    `}</style>
                </div>
            )}

            {/* Header - Google Calendar Style */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
                <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                    {/* Sidebar Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hidden lg:flex shrink-0"
                        onClick={() => setShowSidebar(!showSidebar)}
                    >
                        {showSidebar ? (
                            <PanelLeftClose className="h-5 w-5" />
                        ) : (
                            <PanelLeft className="h-5 w-5" />
                        )}
                    </Button>

                    {/* Logo/Title - hidden on mobile to save space */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                        <CalendarIcon className="h-6 w-6 text-primary" />
                        <span className="text-xl font-semibold">Calendar</span>
                    </div>

                    {/* Today Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToday}
                        className="font-medium rounded-full shrink-0 h-8 px-3"
                    >
                        Today
                    </Button>

                    {/* Navigation */}
                    <div className="flex items-center shrink-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handlePrevious}
                            disabled={viewMode === VIEW_MODES.MONTH && !isMonthDataReady(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                            className={cn(
                                "h-8 w-8",
                                viewMode === VIEW_MODES.MONTH && !isMonthDataReady(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleNext}
                            disabled={viewMode === VIEW_MODES.MONTH && !isMonthDataReady(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                            className={cn(
                                "h-8 w-8",
                                viewMode === VIEW_MODES.MONTH && !isMonthDataReady(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Current Date/Period - truncate on small screens */}
                    <h1 className="text-sm sm:text-lg font-semibold truncate">
                        {headerTitle}
                    </h1>

                </div>

                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    {/* Sync Status - hidden on very small screens */}
                    {eventsData?.googleCalendarError ? (
                        <Badge variant="outline" className="gap-1.5 bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 hidden sm:flex">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-xs text-red-700 dark:text-red-400 hidden md:inline">Sync Error</span>
                        </Badge>
                    ) : hasGoogleCalendar ? (
                        <Badge variant="outline" className="gap-1.5 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 hidden sm:flex">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs text-green-700 dark:text-green-400 hidden md:inline">Synced</span>
                        </Badge>
                    ) : null}

                    {/* View Mode Selector - compact on mobile */}
                    <div className="flex items-center border rounded-lg p-0.5 bg-muted/50">
                        <Button
                            variant={viewMode === VIEW_MODES.MONTH ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 sm:px-3 text-xs"
                            onClick={() => setViewMode(VIEW_MODES.MONTH)}
                        >
                            <span className="sm:hidden">M</span>
                            <span className="hidden sm:inline">Month</span>
                        </Button>
                        <Button
                            variant={viewMode === VIEW_MODES.WEEK ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 sm:px-3 text-xs"
                            onClick={() => setViewMode(VIEW_MODES.WEEK)}
                        >
                            <span className="sm:hidden">W</span>
                            <span className="hidden sm:inline">Week</span>
                        </Button>
                        <Button
                            variant={viewMode === VIEW_MODES.DAY ? 'default' : 'ghost'}
                            size="sm"
                            className="h-7 px-2 sm:px-3 text-xs"
                            onClick={() => setViewMode(VIEW_MODES.DAY)}
                        >
                            <span className="sm:hidden">D</span>
                            <span className="hidden sm:inline">Day</span>
                        </Button>
                    </div>

                    {/* Create Button */}
                    <Button
                        onClick={() => {
                            resetForm();
                            setIsCreateOpen(true);
                        }}
                        size="sm"
                        className="h-8 px-2 sm:px-3"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Create</span>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className={cn(
                    "w-64 border-r bg-card p-4 space-y-6 shrink-0 transition-all duration-300 overflow-y-auto hidden lg:block",
                    !showSidebar && "w-0 p-0 overflow-hidden"
                )}>
                    {showSidebar && (
                        <>
                            {/* Create Button */}
                            <Button
                                onClick={() => {
                                    resetForm();
                                    setIsCreateOpen(true);
                                }}
                                className="w-full rounded-lg justify-start gap-2 "
                                size="lg"
                            >
                                <Plus className="h-5 w-5" />
                                Create
                            </Button>

                            {/* Mini Calendar */}
                            <MiniCalendar
                                currentDate={currentDate}
                                selectedDate={selectedDate}
                                eventDates={eventDates}
                                onDateSelect={(date) => {
                                    setSelectedDate(date);
                                    setCurrentDate(date);
                                    setViewMode(VIEW_MODES.DAY);
                                }}
                                onMonthChange={setCurrentDate}
                            />

                            {/* Stats */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    This Month
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-3 rounded-lg bg-muted/50 border">
                                        <p className="text-2xl font-bold">{eventStats.total}</p>
                                        <p className="text-xs text-muted-foreground">Events</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-red-500/10 border">
                                        <p className="text-2xl font-bold text-red-600">{eventStats.holidays}</p>
                                        <p className="text-xs text-muted-foreground">Holidays</p>
                                    </div>
                                </div>
                            </div>

                            {/* Upcoming Events */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Upcoming
                                </h3>
                                {upcomingEvents.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-4 text-center">
                                        No upcoming events
                                    </p>
                                ) : (
                                    <div className="space-y-1">
                                        {upcomingEvents.slice(0, 4).map((event, idx) => (
                                            <button
                                                key={event.id || idx}
                                                onClick={() => handleEventClick(event)}
                                                className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                        style={{ backgroundColor: event.color || '#3B82F6' }}
                                                    />
                                                    <span className="text-sm truncate">{event.title}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground ml-4">
                                                    {new Date(event.start || event.startDate).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Calendar View */}
                <div className="flex-1 overflow-hidden bg-card">
                    {eventsLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading calendar...</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {viewMode === VIEW_MODES.MONTH && (
                                <CalendarGrid
                                    currentDate={currentDate}
                                    events={events}
                                    selectedDate={selectedDate}
                                    onDateClick={handleDateClick}
                                    onEventClick={handleEventClick}
                                />
                            )}
                            {viewMode === VIEW_MODES.WEEK && (
                                <WeekView
                                    currentDate={currentDate}
                                    events={events}
                                    onEventClick={handleEventClick}
                                    onTimeSlotClick={(date, hour, position) => {
                                        const selectedDate = new Date(date);
                                        selectedDate.setHours(hour, 0, 0, 0);
                                        setPopoverState({
                                            isOpen: true,
                                            position,
                                            date: selectedDate,
                                        });
                                    }}
                                    onDayClick={(date) => {
                                        setSelectedDate(date);
                                        setViewMode(VIEW_MODES.DAY);
                                    }}
                                />
                            )}
                            {viewMode === VIEW_MODES.DAY && (
                                <DayView
                                    date={selectedDate || currentDate}
                                    events={events}
                                    onEventClick={handleEventClick}
                                    onTimeSlotClick={(hour, position) => {
                                        const date = selectedDate || currentDate;
                                        const selectedDateTime = new Date(date);
                                        selectedDateTime.setHours(hour, 0, 0, 0);
                                        setPopoverState({
                                            isOpen: true,
                                            position,
                                            date: selectedDateTime,
                                        });
                                    }}
                                    onBack={() => setViewMode(VIEW_MODES.MONTH)}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Quick Event Popover */}
            <EventPopover
                isOpen={popoverState.isOpen}
                onClose={() => setPopoverState({ isOpen: false, position: { top: 0, left: 0 }, date: null })}
                onSave={handleQuickSave}
                onMoreOptions={handleMoreOptions}
                selectedDate={popoverState.date}
                position={popoverState.position}
                isSaving={createEventMutation.isPending}
            />

            {/* Event Detail Modal */}
            <EventDetailModal
                event={selectedEvent}
                isOpen={isDetailOpen}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelectedEvent(null);
                }}
                onEdit={(event) => {
                    setIsDetailOpen(false);
                    setFormData({
                        ...formData,
                        title: event.title || '',
                        description: event.description || '',
                        eventType: event.eventType || 'CUSTOM',
                        startDate: event.startDate || new Date(event.start).toISOString().split('T')[0],
                        endDate: event.endDate || event.startDate || '',
                        startTime: event.startTime || '',
                        endTime: event.endTime || '',
                        isAllDay: event.allDay || event.isAllDay || false,
                        location: event.location || '',
                        venue: event.venue || '',
                        color: event.color || '#3B82F6',
                        priority: event.priority || 'NORMAL',
                    });
                    setIsCreateOpen(true);
                }}
            />

            {/* Full Create/Edit Event Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Plus className="h-5 w-5 text-primary" />
                            </div>
                            Create Event
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        {/* Title */}
                        <Input
                            placeholder="Add title"
                            value={formData.title}
                            onChange={(e) => updateFormField('title', e.target.value)}
                            className="text-xl font-medium border-0 border-b-2 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                        />

                        {/* Event Type and Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Event Type</label>
                                <Select
                                    value={formData.eventType}
                                    onValueChange={(value) => {
                                        updateFormField('eventType', value);
                                        updateFormField('color', eventTypeColors[value]);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(eventTypeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: eventTypeColors[key] }}
                                                    />
                                                    {label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Priority</label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => updateFormField('priority', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NORMAL">Normal</SelectItem>
                                        <SelectItem value="IMPORTANT">Important</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Description</label>
                            <Textarea
                                placeholder="Add description"
                                value={formData.description}
                                onChange={(e) => updateFormField('description', e.target.value)}
                                rows={3}
                                className="resize-none"
                            />
                        </div>

                        {/* Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Start Date</label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => updateFormField('startDate', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">End Date</label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => updateFormField('endDate', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* All Day Toggle */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                            <Checkbox
                                id="allDay"
                                checked={formData.isAllDay}
                                onCheckedChange={(checked) => updateFormField('isAllDay', checked)}
                            />
                            <label htmlFor="allDay" className="text-sm font-medium cursor-pointer">
                                All Day Event
                            </label>
                        </div>

                        {/* Time */}
                        {!formData.isAllDay && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Start Time</label>
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => updateFormField('startTime', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">End Time</label>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => updateFormField('endTime', e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Location */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Location
                                </label>
                                <Input
                                    placeholder="Add location"
                                    value={formData.location}
                                    onChange={(e) => updateFormField('location', e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Venue</label>
                                <Input
                                    placeholder="Add venue"
                                    value={formData.venue}
                                    onChange={(e) => updateFormField('venue', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Notification Toggle */}
                        <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                            <Checkbox
                                id="pushNotif"
                                checked={formData.sendPushNotification}
                                onCheckedChange={(checked) => updateFormField('sendPushNotification', checked)}
                            />
                            <div>
                                <label htmlFor="pushNotif" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                                    <Bell className="h-4 w-4 text-primary" />
                                    Send Push Notification
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Notify all school members about this event
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsCreateOpen(false);
                                    resetForm();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateEvent}
                                disabled={!formData.title || !formData.startDate || createEventMutation.isPending}
                            >
                                {createEventMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4 mr-2" />
                                        Save
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}