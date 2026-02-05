"use client";

import { useState, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X, Clock, MapPin, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

/**
 * Google-style quick event creation popover
 * Appears when clicking on an empty calendar cell
 */
export const EventPopover = memo(function EventPopover({
    isOpen,
    onClose,
    onSave,
    onMoreOptions,
    selectedDate,
    position = { top: 0, left: 0 },
    isSaving = false,
}) {
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState('CUSTOM');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [isAllDay, setIsAllDay] = useState(true);
    const inputRef = useRef(null);
    const popoverRef = useRef(null);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Reset form when closed or set times from selectedDate
    useEffect(() => {
        if (!isOpen) {
            setTitle('');
            setEventType('CUSTOM');
            setStartTime('09:00');
            setEndTime('10:00');
            setIsAllDay(true);
        } else if (selectedDate) {
            // If a specific hour is selected (from DayView/WeekView time slot click)
            const hour = selectedDate.getHours();
            if (hour !== 0 || selectedDate.getMinutes() !== 0) {
                // A specific time was clicked, not just a date
                const startHour = hour.toString().padStart(2, '0');
                const endHour = (hour + 1).toString().padStart(2, '0');
                setStartTime(`${startHour}:00`);
                setEndTime(`${endHour}:00`);
                setIsAllDay(false);
            }
        }
    }, [isOpen, selectedDate]);

    // Close on escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen, onClose]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                onClose();
            }
        };
        if (isOpen) {
            setTimeout(() => {
                document.addEventListener('mousedown', handleClickOutside);
            }, 100);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    const handleSave = () => {
        if (!title.trim()) return;

        const dateStr = selectedDate.toISOString().split('T')[0];

        onSave({
            title: title.trim(),
            eventType,
            color: eventTypeColors[eventType],
            startDate: dateStr,
            endDate: dateStr,
            startTime: isAllDay ? null : startTime,
            endTime: isAllDay ? null : endTime,
            isAllDay,
        });
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
    };

    if (!isOpen) return null;

    const formattedDate = selectedDate?.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div
            ref={popoverRef}
            className={cn(
                "fixed z-50 bg-popover border rounded-xl shadow-2xl",
                "animate-in fade-in-0 zoom-in-95 duration-200",
                // Mobile: full width at bottom, Desktop: positioned near click
                "w-full sm:w-80",
                "bottom-0 left-0 right-0 sm:bottom-auto sm:left-auto sm:right-auto",
                "rounded-b-none sm:rounded-xl",
            )}
            style={{
                // Only apply position on desktop
                ...(typeof window !== 'undefined' && window.innerWidth >= 640 ? {
                    top: Math.min(position.top, window.innerHeight - 350),
                    left: Math.min(position.left, window.innerWidth - 340),
                } : {}),
            }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <span className="text-sm font-medium text-muted-foreground">
                    {formattedDate}
                </span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onClose}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* Title Input */}
                <Input
                    ref={inputRef}
                    placeholder="Add title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="text-lg font-medium border-0 border-b-2 rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary"
                />

                {/* Event Type */}
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: eventTypeColors[eventType] }}
                    />
                    <Select value={eventType} onValueChange={setEventType}>
                        <SelectTrigger className="h-8 w-auto border-0 bg-transparent hover:bg-muted/50 px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(eventTypeLabels).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: eventTypeColors[key] }}
                                        />
                                        {label}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Time Selection */}
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <button
                        onClick={() => setIsAllDay(!isAllDay)}
                        className={cn(
                            "text-sm px-2 py-1 rounded-md transition-colors",
                            isAllDay
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted text-muted-foreground"
                        )}
                    >
                        All day
                    </button>
                    {!isAllDay && (
                        <div className="flex items-center gap-1 text-sm">
                            <Input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="h-7 w-24 text-xs"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="h-7 w-24 text-xs"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-3 border-t bg-muted/30">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMoreOptions?.({
                        title,
                        eventType,
                        startDate: selectedDate.toISOString().split('T')[0],
                        isAllDay,
                        startTime,
                        endTime,
                    })}
                    className="text-muted-foreground"
                >
                    More options
                    <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!title.trim() || isSaving}
                    className="min-w-[70px]"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        'Save'
                    )}
                </Button>
            </div>
        </div>
    );
});

export default EventPopover;
