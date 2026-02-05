"use client";

import { memo, useMemo, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { EventBar } from './event-bar';
import { cn } from '@/lib/utils';

/**
 * Google Calendar-style month grid
 * Features:
 * - Tall cells for better event visibility
 * - Multi-day event spanning
 * - Click-to-create functionality
 */
export const CalendarGrid = memo(function CalendarGrid({
    currentDate,
    events = [],
    selectedDate,
    onDateClick,
    onEventClick,
    maxEventsPerCell = 3,
}) {
    const today = useMemo(() => new Date(), []);

    // Generate calendar days
    const days = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const result = [];

        // Previous month days
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            result.push({
                date: prevMonthLastDay - i,
                isCurrentMonth: false,
                fullDate: new Date(year, month - 1, prevMonthLastDay - i),
            });
        }

        // Current month days
        for (let i = 1; i <= daysInMonth; i++) {
            result.push({
                date: i,
                isCurrentMonth: true,
                fullDate: new Date(year, month, i),
            });
        }

        // Next month days (fill to 35 or 42 cells)
        const totalCells = result.length <= 35 ? 35 : 42;
        const remainingDays = totalCells - result.length;
        for (let i = 1; i <= remainingDays; i++) {
            result.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i),
            });
        }

        return result;
    }, [currentDate]);

    // Get events for a specific date
    const getEventsForDate = useCallback((date) => {
        return events.filter(event => {
            const eventStart = new Date(event.start || event.startDate);
            const eventEnd = new Date(event.end || event.endDate || event.start || event.startDate);
            const checkDate = new Date(date);

            // Normalize dates to compare day only
            eventStart.setHours(0, 0, 0, 0);
            eventEnd.setHours(23, 59, 59, 999);
            checkDate.setHours(12, 0, 0, 0);

            return checkDate >= eventStart && checkDate <= eventEnd;
        });
    }, [events]);

    // Check if event starts on this date
    const isEventStart = useCallback((event, date) => {
        const eventStart = new Date(event.start || event.startDate);
        return eventStart.toDateString() === date.toDateString();
    }, []);

    // Check if event ends on this date
    const isEventEnd = useCallback((event, date) => {
        const eventEnd = new Date(event.end || event.endDate || event.start || event.startDate);
        return eventEnd.toDateString() === date.toDateString();
    }, []);

    // Number of rows
    const rows = Math.ceil(days.length / 7);

    return (
        <div className="flex flex-col h-full">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 border-b">
                {[
                    { short: 'S', full: 'SUN' },
                    { short: 'M', full: 'MON' },
                    { short: 'T', full: 'TUE' },
                    { short: 'W', full: 'WED' },
                    { short: 'T', full: 'THU' },
                    { short: 'F', full: 'FRI' },
                    { short: 'S', full: 'SAT' },
                ].map((day, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "text-center text-xs font-semibold text-muted-foreground py-2 sm:py-3",
                            (idx === 0 || idx === 6) && "text-muted-foreground/70"
                        )}
                    >
                        <span className="sm:hidden">{day.short}</span>
                        <span className="hidden sm:inline">{day.full}</span>
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div
                className="grid grid-cols-7 flex-1"
                style={{ gridTemplateRows: `repeat(${rows}, minmax(80px, 1fr))` }}
            >
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDate(day.fullDate);
                    const isToday = day.fullDate.toDateString() === today.toDateString();
                    const isSelected = selectedDate?.toDateString() === day.fullDate.toDateString();
                    const isWeekend = day.fullDate.getDay() === 0 || day.fullDate.getDay() === 6;
                    const visibleEvents = dayEvents.slice(0, maxEventsPerCell);
                    const hiddenCount = dayEvents.length - maxEventsPerCell;

                    return (
                        <div
                            key={idx}
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                onDateClick?.(day, {
                                    top: rect.top + 30,
                                    left: rect.left + rect.width / 2 - 160,
                                }, dayEvents);
                            }}
                            className={cn(
                                "border-b border-r p-1 cursor-pointer transition-colors",
                                "hover:bg-muted/30",
                                !day.isCurrentMonth && "bg-muted/20",
                                isWeekend && day.isCurrentMonth && "bg-muted/10",
                                isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
                            )}
                        >
                            {/* Date Number */}
                            <div className="flex items-center justify-between mb-1">
                                <span
                                    className={cn(
                                        "inline-flex items-center justify-center w-7 h-7 text-sm font-medium rounded-full transition-colors",
                                        isToday && "bg-primary text-primary-foreground font-bold",
                                        !isToday && !day.isCurrentMonth && "text-muted-foreground/50",
                                        !isToday && day.isCurrentMonth && "hover:bg-muted",
                                    )}
                                >
                                    {day.date}
                                </span>
                            </div>

                            {/* Events */}
                            <div className="space-y-1 overflow-hidden">
                                {visibleEvents.map((event, eventIdx) => {
                                    const isStart = isEventStart(event, day.fullDate);
                                    const isEnd = isEventEnd(event, day.fullDate);
                                    const eventStartDate = new Date(event.start || event.startDate);
                                    const eventEndDate = new Date(event.end || event.endDate || event.start || event.startDate);
                                    const isMultiDay = eventStartDate.toDateString() !== eventEndDate.toDateString();

                                    return (
                                        <EventBar
                                            key={event.id || eventIdx}
                                            event={event}
                                            isStart={isStart}
                                            isEnd={isEnd}
                                            isMultiDay={isMultiDay}
                                            onClick={onEventClick}
                                            compact
                                        />
                                    );
                                })}

                                {hiddenCount > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            onDateClick?.(day, {
                                                top: rect.top,
                                                left: rect.left,
                                            }, dayEvents);
                                        }}
                                        className="text-xs text-primary font-medium hover:underline w-full text-left px-1"
                                    >
                                        +{hiddenCount} more
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default CalendarGrid;
