'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Plus, Clock, MapPin, X, Check, Loader2, ExternalLink, Calendar, Bell, Sparkles, Filter, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';

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

export default function SchoolCalendar() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const userId = fullUser?.id;
    const queryClient = useQueryClient();

    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [showEventList, setShowEventList] = useState(false);
    const [dateEvents, setDateEvents] = useState([]);
    const [filterType, setFilterType] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Holiday marking state for event detail dialog
    const [markAsHoliday, setMarkAsHoliday] = useState(false);
    const [sendHolidayNotification, setSendHolidayNotification] = useState(false);
    const [isSavingHoliday, setIsSavingHoliday] = useState(false);

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

    const { data: eventsData, isLoading: eventsLoading } = useQuery({
        queryKey: ['calendar-events', schoolId, currentDate.getFullYear(), currentDate.getMonth()],
        queryFn: async () => {
            const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

            const res = await fetch(
                `/api/schools/${schoolId}/calendar/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
            );

            if (!res.ok) {
                throw new Error('Failed to fetch events');
            }

            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
    });

    const { data: upcomingData } = useQuery({
        queryKey: ['upcoming-events', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/calendar/upcoming?limit=5`);

            if (!res.ok) {
                throw new Error('Failed to fetch upcoming events');
            }

            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
    });

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

            if (!res.ok) {
                throw new Error('Failed to create event');
            }

            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });
            setIsCreateOpen(false);
            resetForm();
        },
    });

    const events = eventsData?.events || [];
    const upcomingEvents = upcomingData?.events || [];
    const hasGoogleCalendar = eventsData?.hasGoogleCalendar || false;

    // Filter events
    const filteredEvents = useMemo(() => {
        let filtered = events;

        if (filterType !== 'ALL') {
            filtered = filtered.filter(e => e.eventType === filterType);
        }

        if (searchQuery) {
            filtered = filtered.filter(e =>
                e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return filtered;
    }, [events, filterType, searchQuery]);

    // Get event statistics
    const eventStats = useMemo(() => {
        const stats = {
            total: events.length,
            holidays: events.filter(e => e.eventType === 'HOLIDAY').length,
            exams: events.filter(e => e.eventType === 'EXAM').length,
            meetings: events.filter(e => e.eventType === 'MEETING').length,
        };
        return stats;
    }, [events]);

    const handleCreateEvent = useCallback(() => {
        if (!formData.title || !formData.startDate) return;
        createEventMutation.mutate(formData);
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

    // Handle marking an event (e.g., Google Calendar event) as school holiday
    const handleMarkAsHoliday = useCallback(async () => {
        if (!selectedEvent || !markAsHoliday) return;

        setIsSavingHoliday(true);
        try {
            // Create a new holiday event based on the selected event
            const holidayData = {
                title: `${selectedEvent.title} (School Holiday)`,
                description: `Official school holiday: ${selectedEvent.title}`,
                eventType: 'HOLIDAY',
                color: '#EF4444', // Red for holidays
                startDate: selectedEvent.startDate || new Date(selectedEvent.start).toISOString().split('T')[0],
                endDate: selectedEvent.endDate || selectedEvent.startDate || new Date(selectedEvent.start).toISOString().split('T')[0],
                isAllDay: true,
                sendPushNotification: sendHolidayNotification,
            };

            const res = await fetch(`/api/schools/${schoolId}/calendar/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(holidayData),
            });

            if (!res.ok) throw new Error('Failed to mark as holiday');

            queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
            queryClient.invalidateQueries({ queryKey: ['upcoming-events'] });

            setIsDetailOpen(false);
            setMarkAsHoliday(false);
            setSendHolidayNotification(false);
        } catch (error) {
            console.error('Error marking as holiday:', error);
        } finally {
            setIsSavingHoliday(false);
        }
    }, [selectedEvent, markAsHoliday, sendHolidayNotification, schoolId, queryClient]);

    const getDaysInMonth = useCallback(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days = [];

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: prevMonthLastDay - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevMonthLastDay - i),
            });
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push({
                date: i,
                isCurrentMonth: true,
                fullDate: new Date(year, month, i),
            });
        }

        const remainingDays = 42 - days.length;
        for (let i = 1; i <= remainingDays; i++) {
            days.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i),
            });
        }

        return days;
    }, [currentDate]);


    const getEventsForDate = useCallback((date) => {
        return filteredEvents.filter(event => {
            const eventStart = new Date(event.start);
            return eventStart.toDateString() === date.toDateString();
        });
    }, [filteredEvents]);

    const handleDateClick = useCallback((day) => {
        const clickedDate = new Date(day.fullDate.getFullYear(), day.fullDate.getMonth(), day.fullDate.getDate());
        const dayEvents = getEventsForDate(clickedDate);

        const year = clickedDate.getFullYear();
        const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
        const dayNum = String(clickedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayNum}`;

        setSelectedDate(clickedDate);

        if (dayEvents.length > 1) {
            setDateEvents(dayEvents);
            setShowEventList(true);
        } else if (dayEvents.length === 1) {
            setSelectedEvent(dayEvents[0]);
            setIsDetailOpen(true);
        } else {
            setFormData(prev => ({
                ...prev,
                startDate: dateStr,
                endDate: dateStr,
            }));
            setIsCreateOpen(true);
        }
    }, [getEventsForDate]);

    const handlePrevMonth = useCallback(() => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    }, [currentDate]);

    const handleNextMonth = useCallback(() => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    }, [currentDate]);

    const handleToday = useCallback(() => {
        setCurrentDate(new Date());
    }, []);

    const handleGoogleCalendarConnect = useCallback(() => {
        window.location.href = `/api/auth/google-calendar?userId=${userId}&schoolId=${schoolId}`;
    }, [userId, schoolId]);

    const days = useMemo(() => getDaysInMonth(), [getDaysInMonth]);
    const monthYear = useMemo(() =>
        currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        [currentDate]
    );
    const today = useMemo(() => new Date(), []);

    const updateFormField = useCallback((field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    if (!schoolId || !userId) return <LoaderPage />;

    return (
        <div className="h-full flex flex-col gap-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 text-primary">
                        <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                        <span>Calendar</span>
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Manage school events and schedules
                    </p>
                </div>
                {/* Show sync status badge only */}
                {hasGoogleCalendar ? (
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs">Google Synced</span>
                    </Badge>
                ) : (
                    <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        <span className="text-xs text-yellow-700 dark:text-yellow-400">Not Synced</span>
                    </Badge>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1">
                {/* Main Calendar */}
                <div className="flex-1 flex flex-col">
                    <Card className="flex-1 flex flex-col border hover:border-border/80 transition-all">
                        <CardContent className="p-4 md:p-6 flex flex-col h-full">
                            {/* Calendar Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-xl md:text-2xl font-bold">{monthYear}</h2>
                                    {/* {hasGoogleCalendar && (
                                        <Badge variant="outline" className="gap-1.5 px-2.5 py-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-xs">Google Synced</span>
                                        </Badge>
                                    )} */}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <Button variant="outline" size="sm" onClick={handleToday} className="gap-1.5">
                                        <Calendar className="h-3.5 w-3.5" />
                                        Today
                                    </Button>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={handlePrevMonth}>
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <Button variant="outline" size="icon" className="h-9 w-9" onClick={handleNextMonth}>
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateOpen(true)}
                                        className="gap-1.5"
                                    >
                                        <Plus className="h-4 w-4" />
                                        New Event
                                    </Button>
                                </div>
                            </div>

                            {/* Filters and Search */}
                            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search events..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={filterType} onValueChange={setFilterType}>
                                    <SelectTrigger className="w-full sm:w-[180px]">
                                        <Filter className="h-4 w-4 mr-2" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Events</SelectItem>
                                        {Object.entries(eventTypeLabels).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Calendar Grid */}
                            <div className="flex-1 flex flex-col">
                                {/* Weekday Headers */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                        <div
                                            key={`${day}-${idx}`}
                                            className={cn(
                                                "text-center text-[10px] sm:text-xs md:text-sm font-semibold text-muted-foreground py-1.5 sm:py-2 rounded-lg",
                                                (idx === 0 || idx === 6) && "bg-muted/50"
                                            )}
                                        >
                                            <span className="hidden sm:inline">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx]}</span>
                                            <span className="sm:hidden">{day}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Days */}
                                <div className="grid grid-cols-7 gap-1 sm:gap-2 flex-1">
                                    {eventsLoading ? (
                                        <div className="col-span-7 flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                                <p className="text-sm text-muted-foreground">Loading events...</p>
                                            </div>
                                        </div>
                                    ) : (
                                        days.map((day, idx) => {
                                            const dayEvents = getEventsForDate(day.fullDate);
                                            const isToday = day.fullDate.toDateString() === today.toDateString();
                                            const isSelected = selectedDate?.toDateString() === day.fullDate.toDateString();
                                            const isWeekend = day.fullDate.getDay() === 0 || day.fullDate.getDay() === 6;

                                            return (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleDateClick(day)}
                                                    className={cn(
                                                        "min-h-[60px] sm:min-h-[80px] md:min-h-[100px] p-1 sm:p-2 rounded-lg border transition-all duration-200",
                                                        "hover:border-primary/50 hover:bg-muted/50",
                                                        !day.isCurrentMonth && "opacity-40",
                                                        isToday && "bg-primary/10 border-primary",
                                                        isSelected && "border-primary bg-primary/5",
                                                        day.isCurrentMonth && !isToday && !isSelected && "border-border bg-card",
                                                        isWeekend && day.isCurrentMonth && !isToday && !isSelected && "bg-muted/20"
                                                    )}
                                                >
                                                    <div className="flex flex-col h-full">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={cn(
                                                                "text-xs md:text-sm font-bold",
                                                                isToday && "text-primary",
                                                                !day.isCurrentMonth && "text-muted-foreground"
                                                            )}>
                                                                {day.date}
                                                            </span>
                                                            {dayEvents.length > 0 && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="h-5 min-w-5 px-1.5 text-xs"
                                                                >
                                                                    {dayEvents.length}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="space-y-0.5 sm:space-y-1 overflow-y-auto flex-1 scrollbar-thin">
                                                            {dayEvents.slice(0, window?.innerWidth < 640 ? 1 : 2).map((event, i) => (
                                                                <EventTitle title={event.title} color={event.color} key={i} />
                                                            ))}
                                                            {dayEvents.length > (window?.innerWidth < 640 ? 1 : 2) && (
                                                                <div className="text-[8px] sm:text-[10px] md:text-xs text-primary font-semibold bg-primary/10 rounded px-1 sm:px-2 py-0.5 sm:py-1">
                                                                    +{dayEvents.length - (window?.innerWidth < 640 ? 1 : 2)} more
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </CardContent>

                    </Card>
                </div>

                {/* Enhanced Sidebar - Collapsible on mobile */}
                <div className="w-full lg:w-80 xl:w-96">
                    <Card className="border transition-all">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-4 sm:mb-5">
                                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    </div>
                                    <span>Upcoming</span>
                                </h3>
                                <Badge variant="outline" className="font-semibold text-xs sm:text-sm">
                                    {upcomingEvents.length} events
                                </Badge>
                            </div>
                            <div className="space-y-2 sm:space-y-3 max-h-[300px] lg:max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                                {upcomingEvents.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                        <p className="text-sm text-muted-foreground">
                                            No upcoming events
                                        </p>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => setIsCreateOpen(true)}
                                            className="mt-2"
                                        >
                                            Create your first event
                                        </Button>
                                    </div>
                                ) : (
                                    upcomingEvents.map((event, idx) => {
                                        const eventDate = event.start ? new Date(event.start) : null;
                                        const isValidDate = eventDate && !isNaN(eventDate.getTime());

                                        return (
                                            <button
                                                key={event.id}
                                                onClick={() => {
                                                    setSelectedEvent(event);
                                                    setIsDetailOpen(true);
                                                }}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-lg border transition-all duration-200",
                                                    "hover:border-primary/50 hover:bg-muted/30",
                                                    "bg-card"
                                                )}
                                                style={{
                                                    animationDelay: `${idx * 50}ms`,
                                                    animation: 'slideIn 0.3s ease-out forwards'
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className="w-1.5 h-full rounded-full"
                                                        style={{ backgroundColor: event.color || '#3B82F6' }}
                                                    />
                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <p className="font-semibold text-sm truncate">{event.title || 'Untitled Event'}</p>
                                                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                            <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                                                <Clock className="h-3 w-3" />
                                                                {event.startDate && event.endDate ? (
                                                                    `${new Date(event.startDate).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    })}, ${event.startTime} - ${new Date(event.endDate).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: '2-digit',
                                                                    })}, ${event.endTime}`
                                                                ) : (
                                                                    'Date not set'
                                                                )}
                                                            </div>
                                                            {event.location && (
                                                                <div className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                                                    <MapPin className="h-3 w-3" />
                                                                    <span className="truncate max-w-[100px]">{event.location}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs"
                                                            style={{
                                                                borderColor: event.color || '#3B82F6',
                                                                color: event.color || '#3B82F6',
                                                                backgroundColor: `${event.color || '#3B82F6'}10`
                                                            }}
                                                        >
                                                            {eventTypeLabels[event.eventType] || event.eventType || 'Event'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Event List Dialog */}
            <Dialog open={showEventList} onOpenChange={setShowEventList}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            {selectedDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
                        {dateEvents.map((event, idx) => (
                            <button
                                key={event.id}
                                onClick={() => {
                                    setShowEventList(false);
                                    setSelectedEvent(event);
                                    setIsDetailOpen(true);
                                }}
                                className="w-full text-left p-3 rounded-lg border-2 hover:border-primary hover:shadow-md transition-all"
                            >
                                <div className="flex items-start gap-3">
                                    <div
                                        className="w-1 h-full rounded-full"
                                        style={{ backgroundColor: event.color }}
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{event.title}</p>
                                        {event.startTime && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {event.startTime} - {event.endTime}
                                            </p>
                                        )}
                                        <Badge
                                            variant="outline"
                                            className="mt-2 text-xs"
                                            style={{
                                                borderColor: event.color,
                                                color: event.color
                                            }}
                                        >
                                            {eventTypeLabels[event.eventType]}
                                        </Badge>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Event Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Plus className="h-5 w-5 text-primary" />
                            </div>
                            Create New Event
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Event Title *</label>
                            <Input
                                placeholder="Enter event title"
                                value={formData.title}
                                onChange={(e) => updateFormField('title', e.target.value)}
                                className="border-2 focus:border-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Event Type</label>
                                <Select
                                    value={formData.eventType}
                                    onValueChange={(value) => {
                                        updateFormField('eventType', value);
                                        updateFormField('color', eventTypeColors[value]);
                                    }}
                                >
                                    <SelectTrigger className="border-2">
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
                                <label className="text-sm font-semibold">Priority</label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(value) => updateFormField('priority', value)}
                                >
                                    <SelectTrigger className="border-2">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NORMAL">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                                Normal
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="IMPORTANT">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                                Important
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="URGENT">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                                Urgent
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Description</label>
                            <Textarea
                                placeholder="Enter event description"
                                value={formData.description}
                                onChange={(e) => updateFormField('description', e.target.value)}
                                rows={3}
                                className="border-2 focus:border-primary resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Start Date *</label>
                                <Input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => updateFormField('startDate', e.target.value)}
                                    className="border-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">End Date</label>
                                <Input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => updateFormField('endDate', e.target.value)}
                                    className="border-2"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border-2">
                            <Checkbox
                                id="allDay"
                                checked={formData.isAllDay}
                                onCheckedChange={(checked) => updateFormField('isAllDay', checked)}
                            />
                            <label htmlFor="allDay" className="text-sm font-medium cursor-pointer">
                                All Day Event
                            </label>
                        </div>

                        {!formData.isAllDay && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">Start Time</label>
                                    <Input
                                        type="time"
                                        value={formData.startTime}
                                        onChange={(e) => updateFormField('startTime', e.target.value)}
                                        className="border-2"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">End Time</label>
                                    <Input
                                        type="time"
                                        value={formData.endTime}
                                        onChange={(e) => updateFormField('endTime', e.target.value)}
                                        className="border-2"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    Location
                                </label>
                                <Input
                                    placeholder="Event location"
                                    value={formData.location}
                                    onChange={(e) => updateFormField('location', e.target.value)}
                                    className="border-2"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Venue</label>
                                <Input
                                    placeholder="Specific venue"
                                    value={formData.venue}
                                    onChange={(e) => updateFormField('venue', e.target.value)}
                                    className="border-2"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold">Event Color</label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => updateFormField('color', e.target.value)}
                                    className="w-24 h-12 border-2 cursor-pointer"
                                />
                                <div className="flex-1 p-3 rounded-lg border-2 font-mono text-sm" style={{ backgroundColor: `${formData.color}20`, borderColor: formData.color }}>
                                    {formData.color}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-primary/20">
                            <Checkbox
                                id="pushNotif"
                                checked={formData.sendPushNotification}
                                onCheckedChange={(checked) => updateFormField('sendPushNotification', checked)}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <label htmlFor="pushNotif" className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
                                    <Bell className="h-4 w-4 text-primary" />
                                    Send Push Notification
                                </label>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Notify all school members about this event
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsCreateOpen(false);
                                    resetForm();
                                }}
                                className="gap-2 w-full sm:w-auto"
                            >
                                <X className="h-4 w-4" />
                                Cancel
                            </Button>
                            <Button
                                onClick={handleCreateEvent}
                                disabled={!formData.title || !formData.startDate || createEventMutation.isPending}
                                className="gap-2 bg-gradient-to-r from-primary to-primary/80 w-full sm:w-auto"
                            >
                                {createEventMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="h-4 w-4" />
                                        Create Event
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Event Detail Dialog */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-2xl">
                    {selectedEvent && (
                        <>
                            <DialogHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-3">
                                        <DialogTitle className="text-2xl font-bold flex items-start gap-3">
                                            <div
                                                className="w-1.5 h-8 rounded-full shadow-lg mt-1"
                                                style={{ backgroundColor: selectedEvent.color }}
                                            />
                                            {selectedEvent.title}
                                        </DialogTitle>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="px-3 py-1"
                                                style={{
                                                    backgroundColor: `${selectedEvent.color}15`,
                                                    borderColor: selectedEvent.color,
                                                    color: selectedEvent.color,
                                                }}
                                            >
                                                {eventTypeLabels[selectedEvent.eventType] || selectedEvent.eventType}
                                            </Badge>
                                            {selectedEvent.priority && selectedEvent.priority !== 'NORMAL' && (
                                                <Badge variant="outline" className="gap-1">
                                                    <Sparkles className="h-3 w-3" />
                                                    {selectedEvent.priority}
                                                </Badge>
                                            )}
                                            {selectedEvent.source === 'google' && (
                                                <Badge variant="outline" className="gap-1.5">
                                                    <ExternalLink className="h-3 w-3" />
                                                    Google Calendar
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </DialogHeader>

                            <div className="space-y-5 py-4">
                                {selectedEvent.description && (
                                    <div className="p-4 rounded-lg bg-muted/50 border">
                                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                            <div className="w-1 h-4 rounded-full bg-primary" />
                                            Description
                                        </h4>
                                        <p className="text-sm text-muted-foreground leading-relaxed">
                                            {selectedEvent.description}
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Calendar className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold mb-1">Date</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedEvent.startDate ? (
                                                    new Date(selectedEvent.startDate).toLocaleDateString('en-US', {
                                                        month: 'long', // "November"
                                                        day: '2-digit' // "12"
                                                    })
                                                ) : (
                                                    'Date not set'
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {!selectedEvent.allDay && selectedEvent.startTime && (
                                        <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <Clock className="h-5 w-5 text-primary" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-semibold mb-1">Time</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {selectedEvent.startTime && selectedEvent.endTime
                                                        ? `${new Date(`1970-01-01T${selectedEvent.startTime}:00`).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })} - ${new Date(`1970-01-01T${selectedEvent.endTime}:00`).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })}`
                                                        : 'Time not set'}
                                                </p>
                                            </div>

                                        </div>
                                    )}
                                </div>

                                {selectedEvent.location && (
                                    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <MapPin className="h-5 w-5 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold mb-1">Location</p>
                                            <p className="text-sm text-muted-foreground">
                                                {selectedEvent.location}
                                                {selectedEvent.venue && ` - ${selectedEvent.venue}`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {selectedEvent.source === 'google' && selectedEvent.htmlLink && (
                                    <div className="pt-2">
                                        <a
                                            href={selectedEvent.htmlLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
                                        >
                                            <ExternalLink className="h-4 w-4" />
                                            View in Google Calendar
                                        </a>
                                    </div>
                                )}

                                {/* Mark as Holiday Section - Only for Google Calendar events that are NOT already holidays */}
                                {selectedEvent.source === 'google' && selectedEvent.eventType !== 'HOLIDAY' && (
                                    <div className="mt-4 p-4 rounded-lg border bg-muted/30 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                id="markHoliday"
                                                checked={markAsHoliday}
                                                onCheckedChange={(checked) => {
                                                    setMarkAsHoliday(checked);
                                                    if (!checked) setSendHolidayNotification(false);
                                                }}
                                            />
                                            <div className="flex-1">
                                                <label htmlFor="markHoliday" className="text-sm font-semibold cursor-pointer">
                                                    Mark this day as Holiday
                                                </label>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Add this event to school calendar as an official holiday
                                                </p>
                                            </div>
                                        </div>

                                        {markAsHoliday && (
                                            <div className="flex items-start gap-3 ml-6 p-3 rounded-lg bg-primary/5 border border-primary/20">
                                                <Checkbox
                                                    id="sendNotif"
                                                    checked={sendHolidayNotification}
                                                    onCheckedChange={setSendHolidayNotification}
                                                />
                                                <div className="flex-1">
                                                    <label htmlFor="sendNotif" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                                                        <Bell className="h-4 w-4 text-primary" />
                                                        Send Push Notification
                                                    </label>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        Notify all school members about this holiday
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {markAsHoliday && (
                                            <Button
                                                onClick={handleMarkAsHoliday}
                                                disabled={isSavingHoliday}
                                                className="w-full gap-2 bg-red-600 hover:bg-red-700"
                                            >
                                                {isSavingHoliday ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Saving...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Check className="h-4 w-4" />
                                                        Save as School Holiday
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .scrollbar-thin::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }

                .scrollbar-thin::-webkit-scrollbar-track {
                    background: transparent;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: hsl(var(--muted-foreground) / 0.3);
                    border-radius: 3px;
                }

                .scrollbar-thin::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--muted-foreground) / 0.5);
                }

.marquee-wrapper {
  overflow: hidden;
  display: block;
}

.marquee {
  display: inline-flex;
  width: max-content;
  animation: marquee 10s linear infinite;
}

.marquee span {
  padding-right: 2rem; /* space between repeats */
}

@keyframes marquee {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}


            `}</style>
        </div>
    );
}
function EventTitle({ title, color }) {
    const containerRef = useRef(null);
    const textRef = useRef(null);
    const [shouldScroll, setShouldScroll] = useState(false);

    useEffect(() => {
        if (containerRef.current && textRef.current) {
            setShouldScroll(textRef.current.scrollWidth > containerRef.current.offsetWidth);
        }
    }, [title]);

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden text-[10px] md:text-xs px-2 py-1 rounded-md text-white font-medium shadow-sm"
            style={{ backgroundColor: color }}
            title={title}
        >
            {shouldScroll ? (
                <div className="marquee-wrapper">
                    <div className="marquee">
                        <span ref={textRef}>{title}</span>
                        <span>{title}</span> {/* duplicate for smooth loop */}
                    </div>
                </div>
            ) : (
                <span ref={textRef} className="truncate block">{title}</span>
            )}
        </div>
    );
}