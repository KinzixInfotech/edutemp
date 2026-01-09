"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { format, getDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Lock, AlertTriangle, RefreshCw, Info, UserCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ShiftManager() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [date, setDate] = useState(new Date());
    const [timetableEntries, setTimetableEntries] = useState([]); // Weekly timetable
    const [overrideShifts, setOverrideShifts] = useState([]); // Daily overrides
    const [timeSlots, setTimeSlots] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);

    // Form State for substitute
    const [substituteTeacherId, setSubstituteTeacherId] = useState("");
    const [notes, setNotes] = useState("");

    // Get day of week (0=Sunday, 1=Monday, etc.)
    const dayOfWeek = useMemo(() => getDay(date), [date]);

    useEffect(() => {
        if (!schoolId) return;
        fetchTimeSlots();
        fetchTeachers();
    }, [schoolId]);

    useEffect(() => {
        if (date && schoolId) {
            fetchTimetableForDay();
            fetchOverrideShifts();
        }
    }, [date, schoolId]);

    const fetchTimeSlots = async () => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/timetable/slots`);
            setTimeSlots(res.data);
        } catch (error) {
            console.error("Failed to fetch time slots", error);
        }
    };

    const fetchTeachers = async () => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/teachers`);
            const teachersData = res.data?.teachers || res.data;
            setTeachers(Array.isArray(teachersData) ? teachersData : []);
        } catch (error) {
            console.error("Failed to fetch teachers", error);
            setTeachers([]);
        }
    };

    // Fetch timetable entries for the selected day of week
    const fetchTimetableForDay = async () => {
        setLoading(true);
        try {
            const res = await axios.get(
                `/api/schools/${schoolId}/timetable/entries?dayOfWeek=${dayOfWeek}`
            );
            setTimetableEntries(res.data);
        } catch (error) {
            console.error("Failed to fetch timetable", error);
            toast.error("Failed to load timetable");
        } finally {
            setLoading(false);
        }
    };

    // Fetch override shifts for the specific date
    const fetchOverrideShifts = async () => {
        try {
            const dateStr = format(date, "yyyy-MM-dd");
            const res = await axios.get(
                `/api/schools/${schoolId}/teacher-shifts?startDate=${dateStr}&endDate=${dateStr}`
            );
            // Only get overrides (isOverride=true)
            setOverrideShifts(res.data.filter(s => s.isOverride));
        } catch (error) {
            console.error("Failed to fetch overrides", error);
        }
    };

    // Merge timetable with overrides
    const dailySchedule = useMemo(() => {
        return timeSlots
            .filter(slot => !slot.isBreak)
            .map(slot => {
                // Check if there's an override for this slot
                const override = overrideShifts.find(s => s.timeSlotId === slot.id);

                // Get timetable entry for this slot (could be multiple classes)
                const timetableEntry = timetableEntries.find(e => e.timeSlotId === slot.id);

                return {
                    slot,
                    timetableEntry,
                    override,
                    // Final display data
                    teacher: override?.teacher || timetableEntry?.teacher,
                    subject: override?.subject || timetableEntry?.subject,
                    class: override?.class || timetableEntry?.class,
                    section: override?.section || timetableEntry?.section,
                    isFromTimetable: !override && !!timetableEntry,
                    isOverride: !!override,
                    isEmpty: !override && !timetableEntry,
                };
            });
    }, [timeSlots, timetableEntries, overrideShifts]);

    const openSubstituteDialog = (entry) => {
        setSelectedEntry(entry);
        setSubstituteTeacherId("");
        setNotes("");
        setIsDialogOpen(true);
    };

    const handleAssignSubstitute = async () => {
        if (!substituteTeacherId) {
            toast.error("Please select a substitute teacher");
            return;
        }

        setSaving(true);
        try {
            const dateStr = format(date, "yyyy-MM-dd");

            await axios.post(`/api/schools/${schoolId}/teacher-shifts`, {
                classId: selectedEntry.class?.id || selectedEntry.timetableEntry?.classId,
                sectionId: selectedEntry.section?.id || selectedEntry.timetableEntry?.sectionId,
                subjectId: selectedEntry.subject?.id || selectedEntry.timetableEntry?.subjectId,
                teacherId: substituteTeacherId,
                timeSlotId: selectedEntry.slot.id,
                date: dateStr,
                notes: notes || `Substitute for ${selectedEntry.teacher?.name || 'absent teacher'}`,
            });

            toast.success("Substitute assigned successfully");
            setIsDialogOpen(false);
            fetchOverrideShifts();
        } catch (error) {
            console.error("Error assigning substitute", error);
            toast.error(error.response?.data?.message || "Failed to assign substitute");
        } finally {
            setSaving(false);
        }
    };

    const handleResetOverride = async (override) => {
        if (!confirm("Reset this period to the regular timetable?")) return;

        try {
            await axios.patch(`/api/schools/${schoolId}/teacher-shifts/${override.id}`, {
                action: 'reset'
            });
            toast.success("Reset to timetable schedule");
            fetchOverrideShifts();
        } catch (error) {
            console.error("Error resetting override", error);
            toast.error("Failed to reset");
        }
    };

    const handleRemoveOverride = async (override) => {
        if (!confirm("Remove this substitute assignment?")) return;

        try {
            await axios.delete(`/api/schools/${schoolId}/teacher-shifts/${override.id}`);
            toast.success("Substitute removed");
            fetchOverrideShifts();
        } catch (error) {
            console.error("Error removing override", error);
            toast.error("Failed to remove");
        }
    };

    return !schoolId ? (
        <div className="flex justify-center items-center w-full p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    ) : (
        <div className="space-y-6">
            {/* Info Banner */}
            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    <strong>How it works:</strong> This page shows the daily schedule from your timetable.
                    You can only assign substitutes for absent teachers - regular periods are locked.
                </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Calendar Section */}
                <div className="lg:col-span-4">
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Select Date</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                className="rounded-md border-0 w-full"
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Schedule Section */}
                <div className="lg:col-span-8">
                    <Card className="shadow-sm h-full">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">
                                        {date ? format(date, "EEEE, MMMM d, yyyy") : "Select a Date"}
                                    </CardTitle>
                                    <CardDescription>
                                        Schedule from timetable • Substitutes shown with override badge
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => { fetchTimetableForDay(); fetchOverrideShifts(); }}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {dailySchedule.map((item) => (
                                        <div
                                            key={item.slot.id}
                                            className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${item.isOverride
                                                    ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
                                                    : item.isFromTimetable
                                                        ? 'hover:bg-muted/50'
                                                        : 'border-dashed'
                                                }`}
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-sm">
                                                        {item.slot.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({item.slot.startTime} - {item.slot.endTime})
                                                    </span>
                                                    {item.isFromTimetable && (
                                                        <Lock className="h-3 w-3 text-muted-foreground" />
                                                    )}
                                                    {item.isOverride && (
                                                        <Badge variant="outline" className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300">
                                                            Substitute
                                                        </Badge>
                                                    )}
                                                </div>

                                                {item.teacher ? (
                                                    <div className="text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <UserCheck className="h-4 w-4 text-primary" />
                                                            <span className="font-medium">{item.teacher.name}</span>
                                                        </div>
                                                        <div className="text-muted-foreground ml-6">
                                                            {item.class?.className}
                                                            {item.section && ` - ${item.section.name}`} • {item.subject?.subjectName}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                        No class scheduled
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {item.isOverride ? (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleResetOverride(item.override)}
                                                        >
                                                            Reset
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive"
                                                            onClick={() => handleRemoveOverride(item.override)}
                                                        >
                                                            Remove
                                                        </Button>
                                                    </>
                                                ) : item.isFromTimetable ? (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openSubstituteDialog(item)}
                                                    >
                                                        Assign Substitute
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </div>
                                    ))}

                                    {dailySchedule.length === 0 && (
                                        <div className="text-center text-muted-foreground py-8">
                                            No time slots configured. Please set up time slots first.
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Substitute Assignment Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Assign Substitute - {selectedEntry?.slot?.label}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedEntry && (
                        <div className="space-y-4 py-4">
                            {/* Current Assignment Info */}
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-1">Current Assignment (from timetable):</p>
                                <p className="font-medium">
                                    {selectedEntry.teacher?.name || 'No teacher'} • {selectedEntry.subject?.subjectName || 'No subject'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {selectedEntry.class?.className}{selectedEntry.section && ` - ${selectedEntry.section.name}`}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Substitute Teacher *</Label>
                                <Select
                                    value={substituteTeacherId}
                                    onValueChange={setSubstituteTeacherId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select substitute teacher" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers
                                            .filter(t => t.userId !== selectedEntry.teacher?.userId)
                                            .map((t) => (
                                                <SelectItem key={t.userId} value={t.userId}>
                                                    {t.name}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Notes (Optional)</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="e.g., Teacher on sick leave"
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAssignSubstitute} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Assign Substitute
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
