"use client";

import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

// Generate time slots from 00:00 to 23:00
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return `${hour}:00`;
});

/**
 * Week view component showing 7 days with hourly breakdown
 * Similar to Google Calendar's week view
 */
export const WeekView = memo(function WeekView({
    currentDate,
    events = [],
    onEventClick,
    onTimeSlotClick,
    onDayClick,
}) {
    const today = useMemo(() => new Date(), []);

    // Get the start of the week (Sunday)
    const weekStart = useMemo(() => {
        const date = new Date(currentDate);
        const day = date.getDay();
        date.setDate(date.getDate() - day);
        date.setHours(0, 0, 0, 0);
        return date;
    }, [currentDate]);

    // Generate 7 days of the week
    const weekDays = useMemo(() => {
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + i);
            return date;
        });
    }, [weekStart]);

    // Get events for a specific day
    const getEventsForDay = (date) => {
        return events.filter(event => {
            const eventStart = new Date(event.start || event.startDate);
            return eventStart.toDateString() === date.toDateString();
        });
    };

    // Separate all-day and timed events for a day
    const getEventsByType = (date) => {
        const dayEvents = getEventsForDay(date);
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
    };

    // Position an event on the time grid
    const getEventPosition = (event) => {
        const startTime = event.startTime || '09:00';
        const endTime = event.endTime || '10:00';

        const [startHour, startMin] = startTime.split(':').map(Number);
        const [endHour, endMin] = endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMin;
        const endMinutes = endHour * 60 + endMin;
        const duration = Math.max(endMinutes - startMinutes, 30);

        return {
            top: (startMinutes / (24 * 60)) * 100,
            height: (duration / (24 * 60)) * 100,
        };
    };

    const handleTimeSlotClick = (date, hour, e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        onTimeSlotClick?.(date, hour, {
            top: rect.top,
            left: rect.left + rect.width / 2 - 160,
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header with day names */}
            <div className="flex border-b sticky top-0 bg-background z-10">
                {/* Time column header */}
                <div className="w-16 shrink-0 border-r" />

                {/* Day headers */}
                {weekDays.map((date, idx) => {
                    const isToday = date.toDateString() === today.toDateString();
                    const dayEvents = getEventsForDay(date);

                    return (
                        <div
                            key={idx}
                            className="flex-1 text-center py-2 border-r cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => onDayClick?.(date)}
                        >
                            <div className="text-xs text-muted-foreground uppercase">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div
                                className={cn(
                                    "inline-flex items-center justify-center w-10 h-10 text-xl font-semibold rounded-full mt-1",
                                    isToday && "bg-primary text-primary-foreground",
                                )}
                            >
                                {date.getDate()}
                            </div>
                            {dayEvents.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* All-day events row */}
            <div className="flex border-b bg-muted/20">
                <div className="w-16 shrink-0 border-r text-xs text-muted-foreground p-1">
                    All day
                </div>
                {weekDays.map((date, idx) => {
                    const { allDayEvents } = getEventsByType(date);

                    return (
                        <div key={idx} className="flex-1 border-r p-1 min-h-[40px]">
                            {allDayEvents.slice(0, 2).map((event, eventIdx) => (
                                <button
                                    key={event.id || eventIdx}
                                    onClick={() => onEventClick?.(event)}
                                    className="w-full text-left text-xs px-1 py-0.5 rounded text-white truncate mb-0.5 hover:brightness-110"
                                    style={{ backgroundColor: event.color || '#3B82F6' }}
                                >
                                    {event.title}
                                </button>
                            ))}
                            {allDayEvents.length > 2 && (
                                <span className="text-xs text-muted-foreground">
                                    +{allDayEvents.length - 2} more
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Time grid */}
            <div className="flex-1 overflow-y-auto">
                <div className="flex min-h-[1440px]"> {/* 24 hours * 60px */}
                    {/* Time labels column */}
                    <div className="w-16 shrink-0 border-r bg-muted/30">
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

                    {/* Day columns */}
                    {weekDays.map((date, dayIdx) => {
                        const { timedEvents } = getEventsByType(date);
                        const isToday = date.toDateString() === today.toDateString();

                        return (
                            <div key={dayIdx} className="flex-1 border-r relative">
                                {/* Time slots */}
                                {TIME_SLOTS.map((time, idx) => (
                                    <div
                                        key={time}
                                        onClick={(e) => handleTimeSlotClick(date, idx, e)}
                                        className={cn(
                                            "h-[60px] border-b hover:bg-muted/50 cursor-pointer transition-colors",
                                            isToday && "bg-primary/5"
                                        )}
                                    />
                                ))}

                                {/* Current time indicator */}
                                {isToday && (
                                    <div
                                        className="absolute left-0 right-0 h-0.5 bg-red-500 z-10 pointer-events-none"
                                        style={{
                                            top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / (24 * 60)) * 100}%`,
                                        }}
                                    >
                                        <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                                    </div>
                                )}

                                {/* Timed events */}
                                {timedEvents.map((event, idx) => {
                                    const pos = getEventPosition(event);

                                    return (
                                        <button
                                            key={event.id || idx}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEventClick?.(event);
                                            }}
                                            className={cn(
                                                "absolute left-0.5 right-0.5 rounded text-white text-xs p-1 overflow-hidden",
                                                "hover:brightness-110 hover:shadow-md transition-all cursor-pointer",
                                            )}
                                            style={{
                                                backgroundColor: event.color || '#3B82F6',
                                                top: `${pos.top}%`,
                                                minHeight: `${Math.max(pos.height, 2.5)}%`,
                                            }}
                                        >
                                            <div className="font-medium truncate">{event.title}</div>
                                            {event.startTime && pos.height > 4 && (
                                                <div className="opacity-80 text-[10px]">
                                                    {event.startTime}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
});

export default WeekView;
