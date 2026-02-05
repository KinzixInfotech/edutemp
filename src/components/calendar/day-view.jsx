"use client";

import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

const eventTypeLabels = {
    CUSTOM: 'Event',
    HOLIDAY: 'Holiday',
    VACATION: 'Vacation',
    EXAM: 'Exam',
    SPORTS: 'Sports',
    MEETING: 'Meeting',
    ADMISSION: 'Admission',
    FEE_DUE: 'Fee Due',
    BIRTHDAY: 'Birthday',
};

// Generate time slots from 00:00 to 23:00
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
});

/**
 * Day view component showing hourly breakdown
 * Similar to Google Calendar's day view
 */
export const DayView = memo(function DayView({
    date,
    events = [],
    onEventClick,
    onTimeSlotClick,
    onBack,
}) {
    // Get events for this day
    const dayEvents = useMemo(() => {
        return events.filter(event => {
            const eventStart = new Date(event.start || event.startDate);
            return eventStart.toDateString() === date.toDateString();
        });
    }, [events, date]);

    // Separate all-day events from timed events
    const { allDayEvents, timedEvents } = useMemo(() => {
        const allDay = [];
        const timed = [];

        dayEvents.forEach(event => {
            if (event.allDay || event.isAllDay || !event.startTime) {
                allDay.push(event);
            } else {
                timed.push(event);
            }
        });

        return { allDayEvents: allDay, timedEvents: timed };
    }, [dayEvents]);

    // Position events on the time grid
    const positionedEvents = useMemo(() => {
        return timedEvents.map(event => {
            const startTime = event.startTime || '09:00';
            const endTime = event.endTime || '10:00';

            const [startHour, startMin] = startTime.split(':').map(Number);
            const [endHour, endMin] = endTime.split(':').map(Number);

            const startMinutes = startHour * 60 + startMin;
            const endMinutes = endHour * 60 + endMin;
            const duration = Math.max(endMinutes - startMinutes, 30); // Min 30min height

            return {
                ...event,
                top: (startMinutes / (24 * 60)) * 100,
                height: (duration / (24 * 60)) * 100,
                startHour,
            };
        });
    }, [timedEvents]);

    const dateStr = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const isToday = date.toDateString() === new Date().toDateString();

    const handleTimeSlotClick = (hour, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onTimeSlotClick?.(hour, {
            top: rect.top,
            left: rect.left + rect.width / 2 - 160,
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 border-b bg-card">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onBack}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        {dateStr}
                        {isToday && (
                            <Badge variant="default" className="text-xs">Today</Badge>
                        )}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* All-day events section */}
            {allDayEvents.length > 0 && (
                <div className="border-b p-2 space-y-1">
                    <span className="text-xs text-muted-foreground font-medium px-2">All day</span>
                    {allDayEvents.map((event, idx) => (
                        <button
                            key={event.id || idx}
                            onClick={() => onEventClick?.(event)}
                            className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-white hover:brightness-110 transition-all"
                            style={{ backgroundColor: event.color || '#3B82F6' }}
                        >
                            {event.title}
                        </button>
                    ))}
                </div>
            )}

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="relative min-h-[1440px]"> {/* 24 hours * 60px */}
                    {/* Time labels */}
                    <div className="absolute left-0 top-0 w-16 h-full border-r bg-muted/30">
                        {TIME_SLOTS.map((time, idx) => (
                            <div
                                key={time}
                                className="h-[60px] flex items-start justify-end pr-2 text-xs text-muted-foreground"
                                style={{ paddingTop: '2px' }}
                            >
                                {idx !== 0 && time}
                            </div>
                        ))}
                    </div>

                    {/* Time slots */}
                    <div className="ml-16 relative">
                        {TIME_SLOTS.map((time, idx) => (
                            <div
                                key={time}
                                onClick={(e) => handleTimeSlotClick(idx, e)}
                                className="h-[60px] border-b hover:bg-muted/50 cursor-pointer transition-colors"
                            />
                        ))}

                        {/* Current time indicator */}
                        {isToday && (
                            <div
                                className="absolute left-0 right-0 h-0.5 bg-red-500 z-10"
                                style={{
                                    top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / (24 * 60)) * 100}%`,
                                }}
                            >
                                <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                            </div>
                        )}

                        {/* Positioned events */}
                        {positionedEvents.map((event, idx) => (
                            <button
                                key={event.id || idx}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEventClick?.(event);
                                }}
                                className={cn(
                                    "absolute left-1 right-1 rounded-md text-white text-sm p-2 overflow-hidden",
                                    "hover:brightness-110 hover:shadow-lg transition-all cursor-pointer",
                                    "flex flex-col"
                                )}
                                style={{
                                    backgroundColor: event.color || '#3B82F6',
                                    top: `${event.top}%`,
                                    minHeight: `${Math.max(event.height, 2.5)}%`,
                                }}
                            >
                                <span className="font-medium truncate">{event.title}</span>
                                {event.startTime && (
                                    <span className="text-xs opacity-80">
                                        {event.startTime} - {event.endTime || ''}
                                    </span>
                                )}
                                {event.location && (
                                    <span className="text-xs opacity-80 flex items-center gap-1 mt-auto">
                                        <MapPin className="h-3 w-3" />
                                        {event.location}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});

export default DayView;
