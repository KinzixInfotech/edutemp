"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ShiftManager() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [date, setDate] = useState(new Date());
    const [shifts, setShifts] = useState([]);
    const [monthlyShifts, setMonthlyShifts] = useState([]); // For calendar dots
    const [timeSlots, setTimeSlots] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [editingShift, setEditingShift] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        teacherId: "",
        classId: "",
        sectionId: "",
        subjectId: "",
        roomNumber: "",
        notes: "",
    });

    useEffect(() => {
        if (!schoolId) return;
        fetchTimeSlots();
        fetchTeachers();
        fetchClasses();
        fetchSubjects();
        fetchMonthlyShifts(); // Fetch shifts for the entire month
    }, [schoolId]);

    useEffect(() => {
        if (date && schoolId) {
            fetchShifts();
            // Refetch monthly shifts if month changed
            const currentMonth = date.getMonth();
            const currentYear = date.getFullYear();
            fetchMonthlyShifts();
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
            console.log('Teachers API Response:', res.data);
            // API returns { success, count, teachers: [...] }
            const teachersData = res.data?.teachers || res.data;
            console.log('Extracted teachers:', teachersData);
            setTeachers(Array.isArray(teachersData) ? teachersData : []);
        } catch (error) {
            console.error("Failed to fetch teachers", error);
            setTeachers([]);
        }
    };

    const fetchClasses = async () => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/classes`);
            console.log('Classes API Response:', res.data);
            setClasses(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch classes", error);
            setClasses([]);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/subjects`);
            console.log('Subjects API Response:', res.data);
            setSubjects(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch subjects", error);
            setSubjects([]);
        }
    };

    const fetchShifts = async () => {
        setLoading(true);
        try {
            // Fetch shifts for the selected date
            // We can fetch for the whole month if we want to show indicators on the calendar
            // For now, let's just fetch for the selected date to show in the list
            const startDate = format(date, "yyyy-MM-dd");
            const endDate = format(date, "yyyy-MM-dd");
            const res = await axios.get(
                `/api/schools/${schoolId}/teacher-shifts?startDate=${startDate}&endDate=${endDate}`
            );
            setShifts(res.data);
        } catch (error) {
            console.error("Failed to fetch shifts", error);
            toast.error("Failed to load shifts");
        } finally {
            setLoading(false);
        }
    };

    const fetchMonthlyShifts = async () => {
        try {
            // Fetch shifts for the entire current month
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
            const startDate = format(startOfMonth, "yyyy-MM-dd");
            const endDate = format(endOfMonth, "yyyy-MM-dd");
            const res = await axios.get(
                `/api/schools/${schoolId}/teacher-shifts?startDate=${startDate}&endDate=${endDate}`
            );
            setMonthlyShifts(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch monthly shifts", error);
        }
    };

    const handleClassChange = async (classId) => {
        setFormData({ ...formData, classId, sectionId: "" });
        // Fetch sections for this class
        try {
            // Assuming sections are fetched via class or a separate API
            // If sections are nested in class, we might already have them.
            // Let's assume we need to fetch or filter.
            // Checking schema, Class has sections.
            // API for classes might return sections.
            // Let's check if we can get sections from the class object if we stored it.
            // For now, let's assume we can fetch sections or filter from a sections API if it exists.
            // Or just use the class object if it has sections.
            const selectedClass = classes.find((c) => c.id.toString() === classId);
            if (selectedClass && selectedClass.sections) {
                setSections(selectedClass.sections);
            } else {
                // Fallback: fetch sections
                const res = await axios.get(`/api/schools/${schoolId}/classes/${classId}/sections`);
                setSections(res.data);
            }
        } catch (error) {
            // If API fails or doesn't exist, just clear sections
            setSections([]);
        }
    };

    const handleSubmit = async () => {
        if (!formData.teacherId || !formData.classId || !formData.sectionId || !formData.subjectId) {
            toast.error("Please fill in all required fields (Teacher, Class, Section, Subject)");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...formData,
                timeSlotId: selectedSlot.id,
                date: date,
            };

            if (editingShift) {
                await axios.put(
                    `/api/schools/${schoolId}/teacher-shifts/${editingShift.id}`,
                    payload
                );
                toast.success("Shift updated successfully");
            } else {
                await axios.post(`/api/schools/${schoolId}/teacher-shifts`, payload);
                toast.success("Shift assigned successfully");
            }

            setIsDialogOpen(false);
            fetchShifts();
            fetchMonthlyShifts(); // Refresh calendar dots
            resetForm();
        } catch (error) {
            console.error("Error saving shift", error);
            toast.error(error.response?.data?.message || "Failed to save shift");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (shiftId) => {
        if (!confirm("Are you sure you want to delete this shift?")) return;
        try {
            await axios.delete(`/api/schools/${schoolId}/teacher-shifts/${shiftId}`);
            toast.success("Shift deleted successfully");
            fetchShifts();
        } catch (error) {
            console.error("Error deleting shift", error);
            toast.error("Failed to delete shift");
        }
    };

    const openAssignDialog = (slot, shift = null) => {
        setSelectedSlot(slot);
        if (shift) {
            setEditingShift(shift);
            setFormData({
                teacherId: shift.teacherId,
                classId: shift.classId.toString(),
                sectionId: shift.sectionId ? shift.sectionId.toString() : "",
                subjectId: shift.subjectId.toString(),
                roomNumber: shift.roomNumber || "",
                notes: shift.notes || "",
            });
            // Trigger section load
            handleClassChange(shift.classId.toString());
        } else {
            setEditingShift(null);
            resetForm();
        }
        setIsDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            teacherId: "",
            classId: "",
            sectionId: "",
            subjectId: "",
            roomNumber: "",
            notes: "",
        });
    };

    const getShiftForSlot = (slotId) => {
        return shifts.find((s) => s.timeSlotId === slotId);
    };

    return !schoolId ? (
        <div className="flex justify-center items-center w-full p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    ) : (
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
                            modifiers={{
                                hasShifts: monthlyShifts.map(shift => new Date(shift.date))
                            }}
                            modifiersClassNames={{
                                hasShifts: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
                            }}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Schedule Section */}
            <div className="lg:col-span-8">
                <Card className="shadow-sm h-full">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">
                            Schedule for {date ? format(date, "EEEE, MMMM d, yyyy") : "Selected Date"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {timeSlots.map((slot) => {
                                    const shift = getShiftForSlot(slot.id);
                                    return (
                                        <div
                                            key={slot.id}
                                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">
                                                        {slot.label}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({slot.startTime} - {slot.endTime})
                                                    </span>
                                                    {slot.isBreak && (
                                                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                                                            Break
                                                        </span>
                                                    )}
                                                </div>
                                                {shift ? (
                                                    <div className="mt-2 text-sm">
                                                        <div className="font-medium text-primary">
                                                            {shift.teacher.name}
                                                        </div>
                                                        <div className="text-muted-foreground">
                                                            {shift.class.className}
                                                            {shift.section && ` - ${shift.section.name}`} •{" "}
                                                            {shift.subject.subjectName}
                                                        </div>
                                                        {shift.roomNumber && (
                                                            <div className="text-xs text-muted-foreground mt-1">
                                                                Room: {shift.roomNumber}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="mt-2 text-sm text-muted-foreground italic">
                                                        No teacher assigned
                                                    </div>
                                                )}
                                            </div>

                                            {!slot.isBreak && (
                                                <div className="flex items-center gap-2">
                                                    {shift ? (
                                                        <>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openAssignDialog(slot, shift)}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-destructive hover:text-destructive"
                                                                onClick={() => handleDelete(shift.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openAssignDialog(slot)}
                                                        >
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Assign
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {timeSlots.length === 0 && (
                                    <div className="text-center text-muted-foreground py-8">
                                        No time slots configured. Please set up time slots first.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingShift ? "Edit Assignment" : "Assign Teacher"} -{" "}
                            {selectedSlot?.label}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Teacher *</Label>
                            <Select
                                value={formData.teacherId}
                                onValueChange={(val) =>
                                    setFormData({ ...formData, teacherId: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teachers.length === 0 ? (
                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                            No teachers available
                                        </div>
                                    ) : (
                                        teachers.map((t) => (
                                            <SelectItem key={t.userId} value={t.userId}>
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{t.name}</span>
                                                    {t.employeeId && (
                                                        <span className="text-xs text-muted-foreground ml-2">
                                                            ({t.employeeId})
                                                        </span>
                                                    )}
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Class *</Label>
                                <Select
                                    value={formData.classId}
                                    onValueChange={handleClassChange}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.className}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Section *</Label>
                                <Select
                                    value={formData.sectionId}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, sectionId: val })
                                    }
                                    disabled={!formData.classId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sections.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Subject *</Label>
                            <Select
                                value={formData.subjectId}
                                onValueChange={(val) =>
                                    setFormData({ ...formData, subjectId: val })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((s) => (
                                        <SelectItem key={s.id} value={s.id.toString()}>
                                            {s.subjectName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Room Number (Optional)</Label>
                            <Input
                                value={formData.roomNumber}
                                onChange={(e) =>
                                    setFormData({ ...formData, roomNumber: e.target.value })
                                }
                                placeholder="e.g. 101"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Notes (Optional)</Label>
                            <Input
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData({ ...formData, notes: e.target.value })
                                }
                                placeholder="Any special instructions..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDialogOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={saving}
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {saving ? "Saving..." : "Save Assignment"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
