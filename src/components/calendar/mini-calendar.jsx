"use client";

import { memo, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mini calendar component for sidebar navigation
 * Similar to Google Calendar's left sidebar calendar
 */
export const MiniCalendar = memo(function MiniCalendar({
    currentDate,
    selectedDate,
    onDateSelect,
    onMonthChange,
    eventDates = [], // Array of dates that have events
}) {
    const today = useMemo(() => new Date(), []);

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

        // Next month days (fill to 42 cells for 6 rows)
        const remainingDays = 42 - result.length;
        for (let i = 1; i <= remainingDays; i++) {
            result.push({
                date: i,
                isCurrentMonth: false,
                fullDate: new Date(year, month + 1, i),
            });
        }

        return result;
    }, [currentDate]);

    const monthYear = useMemo(() =>
        currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        [currentDate]
    );

    const hasEvent = useCallback((date) => {
        return eventDates.some(d =>
            new Date(d).toDateString() === date.toDateString()
        );
    }, [eventDates]);

    const handlePrevMonth = () => {
        onMonthChange?.(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        onMonthChange?.(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    return (
        <div className="w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">{monthYear}</span>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handlePrevMonth}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={handleNextMonth}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <div
                        key={`${day}-${idx}`}
                        className="text-center text-[10px] font-medium text-muted-foreground py-1"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0">
                {days.map((day, idx) => {
                    const isToday = day.fullDate.toDateString() === today.toDateString();
                    const isSelected = selectedDate?.toDateString() === day.fullDate.toDateString();
                    const hasEvents = hasEvent(day.fullDate);

                    return (
                        <button
                            key={idx}
                            onClick={() => onDateSelect?.(day.fullDate)}
                            className={cn(
                                "relative h-7 w-7 text-xs flex items-center justify-center rounded-full transition-colors mx-auto",
                                "hover:bg-muted",
                                !day.isCurrentMonth && "text-muted-foreground/50",
                                isToday && "bg-primary text-primary-foreground font-bold",
                                isSelected && !isToday && "bg-primary/20 text-primary font-semibold ring-1 ring-primary",
                            )}
                        >
                            {day.date}
                            {hasEvents && !isToday && !isSelected && (
                                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export default MiniCalendar;
