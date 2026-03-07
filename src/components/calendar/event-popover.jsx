"use client";

import { useState, useRef, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { X, Clock, MapPin, ChevronRight, Loader2, Bell, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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
    const [sendPush, setSendPush] = useState(() => {
        try { return localStorage.getItem('calendar_push_pref') === 'true'; } catch { return false; }
    });
    const [targetAudience, setTargetAudience] = useState('ALL');
    const inputRef = useRef(null);
    const popoverRef = useRef(null);
    const selectOpenRef = useRef(false);

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
            setTargetAudience('ALL');
            try { setSendPush(localStorage.getItem('calendar_push_pref') === 'true'); } catch { setSendPush(false); }
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
            // If the Select dropdown is open, don't close the popover
            if (selectOpenRef.current) return;

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

    // Format date as YYYY-MM-DD without timezone shift
    const formatLocalDate = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const handleSave = () => {
        if (!title.trim()) return;

        const dateStr = formatLocalDate(selectedDate);

        onSave({
            title: title.trim(),
            eventType,
            color: eventTypeColors[eventType],
            startDate: dateStr,
            endDate: dateStr,
            startTime: isAllDay ? null : startTime,
            endTime: isAllDay ? null : endTime,
            isAllDay,
            sendPushNotification: sendPush,
            targetAudience,
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
                    <Select value={eventType} onValueChange={setEventType} onOpenChange={(open) => { selectOpenRef.current = open; }}>
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

                {/* Target Audience */}
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Select value={targetAudience} onValueChange={setTargetAudience} onOpenChange={(open) => { selectOpenRef.current = open; }}>
                        <SelectTrigger className="h-8 w-auto border-0 bg-transparent hover:bg-muted/50 px-2">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Everyone</SelectItem>
                            <SelectItem value="STUDENTS">Students</SelectItem>
                            <SelectItem value="TEACHERS">Teachers</SelectItem>
                            <SelectItem value="PARENTS">Parents</SelectItem>
                            <SelectItem value="STAFF">Staff Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Push Notification Toggle */}
                <div className="flex items-center gap-2">
                    <Checkbox
                        id="popover-push"
                        checked={sendPush}
                        onCheckedChange={(checked) => {
                            setSendPush(checked);
                            try { localStorage.setItem('calendar_push_pref', String(checked)); } catch { }
                        }}
                    />
                    <label htmlFor="popover-push" className="text-sm cursor-pointer flex items-center gap-1.5">
                        <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                        Send Push Notification
                    </label>
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
                        startDate: formatLocalDate(selectedDate),
                        isAllDay,
                        startTime,
                        endTime,
                        sendPushNotification: sendPush,
                        targetAudience,
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
