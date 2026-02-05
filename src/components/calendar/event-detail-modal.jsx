"use client";

import { memo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Clock,
    MapPin,
    ExternalLink,
    Trash2,
    Edit2,
    Bell,
    Users,
    Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

const eventTypeLabels = {
    CUSTOM: 'Event',
    HOLIDAY: 'Holiday',
    VACATION: 'Vacation',
    EXAM: 'Examination',
    SPORTS: 'Sports Event',
    MEETING: 'Meeting',
    ADMISSION: 'Admission',
    FEE_DUE: 'Fee Due',
    BIRTHDAY: 'Birthday',
};

/**
 * Event detail modal for viewing event details
 */
export const EventDetailModal = memo(function EventDetailModal({
    event,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    canEdit = true,
    canDelete = true,
}) {
    if (!event) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Date not set';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            const [hours, minutes] = timeStr.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            return date.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
            });
        } catch {
            return timeStr;
        }
    };

    const startDate = formatDate(event.start || event.startDate);
    const endDate = event.end || event.endDate
        ? formatDate(event.end || event.endDate)
        : null;
    const showEndDate = endDate && endDate !== startDate;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-lg">
                <DialogHeader className="space-y-4">
                    {/* Color bar */}
                    <div
                        className="h-2 -mx-6 -mt-6 rounded-t-lg"
                        style={{ backgroundColor: event.color || '#3B82F6' }}
                    />

                    <div className="flex items-start gap-4 pt-2">
                        {/* Color indicator */}
                        <div
                            className="w-4 h-4 rounded-sm mt-1 shrink-0"
                            style={{ backgroundColor: event.color || '#3B82F6' }}
                        />

                        <div className="flex-1 space-y-1">
                            <DialogTitle className="text-xl font-bold leading-tight">
                                {event.title}
                            </DialogTitle>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="secondary"
                                    style={{
                                        backgroundColor: `${event.color}20`,
                                        color: event.color,
                                    }}
                                >
                                    {eventTypeLabels[event.eventType] || event.eventType || 'Event'}
                                </Badge>

                                {event.priority && event.priority !== 'NORMAL' && (
                                    <Badge variant="outline" className="gap-1">
                                        <Sparkles className="h-3 w-3" />
                                        {event.priority}
                                    </Badge>
                                )}

                                {event.source === 'google' && (
                                    <Badge variant="outline" className="gap-1 text-xs">
                                        <ExternalLink className="h-3 w-3" />
                                        Google
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                            <p className="font-medium">{startDate}</p>
                            {showEndDate && (
                                <p className="text-sm text-muted-foreground">
                                    to {endDate}
                                </p>
                            )}
                            {event.allDay || event.isAllDay ? (
                                <p className="text-sm text-muted-foreground">All day</p>
                            ) : event.startTime && (
                                <p className="text-sm text-muted-foreground">
                                    {formatTime(event.startTime)}
                                    {event.endTime && ` - ${formatTime(event.endTime)}`}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Location */}
                    {(event.location || event.venue) && (
                        <div className="flex items-start gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-medium">{event.location}</p>
                                {event.venue && (
                                    <p className="text-sm text-muted-foreground">{event.venue}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div className="pt-2 border-t">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Target Audience */}
                    {event.targetAudience && event.targetAudience !== 'ALL' && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span>For: {event.targetAudience}</span>
                        </div>
                    )}

                    {/* Google Calendar Link */}
                    {event.source === 'google' && event.htmlLink && (
                        <a
                            href={event.htmlLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                        >
                            <ExternalLink className="h-4 w-4" />
                            View in Google Calendar
                        </a>
                    )}
                </div>

                {/* Actions */}
                {(canEdit || canDelete) && event.source !== 'google' && (
                    <div className="flex items-center justify-end gap-2 pt-4 border-t">
                        {canDelete && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete?.(event)}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                            </Button>
                        )}
                        {canEdit && (
                            <Button
                                size="sm"
                                onClick={() => onEdit?.(event)}
                            >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Edit
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
});

export default EventDetailModal;
