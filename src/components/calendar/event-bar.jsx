"use client";

import { memo, useMemo } from 'react';
import { cn } from '@/lib/utils';

/**
 * Event bar component for displaying events in the calendar grid
 * Supports multi-day events that span across cells
 */
export const EventBar = memo(function EventBar({
    event,
    isStart = true,
    isEnd = true,
    isMultiDay = false,
    onClick,
    compact = false,
}) {
    const style = useMemo(() => ({
        backgroundColor: event.color || '#3B82F6',
        '--event-color': event.color || '#3B82F6',
    }), [event.color]);

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(event);
            }}
            className={cn(
                "w-full text-left text-white font-medium transition-all duration-150",
                "hover:brightness-110 hover:shadow-md active:scale-[0.98]",
                "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50",
                compact ? "px-2 py-1.5 text-[11px] min-h-[26px]" : "px-3 py-2 text-xs",
                // Rounded corners based on position in multi-day span
                isStart && isEnd && "rounded-md",
                isStart && !isEnd && "rounded-l-md rounded-r-none",
                !isStart && isEnd && "rounded-r-md rounded-l-none",
                !isStart && !isEnd && "rounded-none",
                // Multi-day styling
                isMultiDay && !isStart && "border-l-0",
                isMultiDay && !isEnd && "border-r-0",
            )}
            style={style}
            title={event.title}
        >
            <span className="flex items-center gap-1 truncate">
                {isStart && !event.allDay && event.startTime && (
                    <span className="opacity-80 text-[10px] font-normal shrink-0">
                        {event.startTime}
                    </span>
                )}
                <span className="truncate">{event.title}</span>
            </span>
        </button>
    );
});

/**
 * Small event dot for when there are too many events to display
 */
export const EventDot = memo(function EventDot({ color, count }) {
    return (
        <div
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={`${count} more event${count > 1 ? 's' : ''}`}
        >
            <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color || '#3B82F6' }}
            />
            <span>+{count} more</span>
        </div>
    );
});

export default EventBar;
