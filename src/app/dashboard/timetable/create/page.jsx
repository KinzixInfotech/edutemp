"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Loader2, Save, ArrowLeft, Clock, User2, BookOpen, MapPin, Coffee,
    Calendar, CheckCircle2, Circle, AlertTriangle, GraduationCap,
    Users, Layers, ChevronRight, Sparkles
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

const DAYS = [
    { value: 1, label: "Monday", short: "Mon" },
    { value: 2, label: "Tuesday", short: "Tue" },
    { value: 3, label: "Wednesday", short: "Wed" },
    { value: 4, label: "Thursday", short: "Thu" },
    { value: 5, label: "Friday", short: "Fri" },
    { value: 6, label: "Saturday", short: "Sat" },
];

export default function CreateTimetablePage() {
    const { fullUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const classId = searchParams.get("classId");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [timeSlots, setTimeSlots] = useState([]);
    const [activeDay, setActiveDay] = useState("1");

    const [selectedClass, setSelectedClass] = useState(classId || "");
    const [selectedSection, setSelectedSection] = useState("");
    const [timetable, setTimetable] = useState({});

    // Conflict detection state
    const [allSchoolEntries, setAllSchoolEntries] = useState([]);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [initialTimetable, setInitialTimetable] = useState({});

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchInitialData();
        }
    }, [fullUser?.schoolId]);

    // Unsaved changes warning
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Track unsaved changes
    useEffect(() => {
        if (Object.keys(initialTimetable).length > 0) {
            const hasChanges = JSON.stringify(timetable) !== JSON.stringify(initialTimetable);
            setHasUnsavedChanges(hasChanges);
        }
    }, [timetable, initialTimetable]);

    useEffect(() => {
        if (selectedClass) {
            fetchSubjects();
            fetchSections();
            fetchExistingTimetable();
        }
    }, [selectedClass, selectedSection]);

    const fetchInitialData = async () => {
        try {
            const [classesRes, slotsRes] = await Promise.all([
                axios.get(`/api/schools/${fullUser.schoolId}/classes`),
                axios.get(`/api/schools/${fullUser.schoolId}/timetable/slots`),
            ]);
            setClasses(classesRes.data);
            setTimeSlots(slotsRes.data || []);

            try {
                const teachersRes = await axios.get(`/api/schools/${fullUser.schoolId}/staff/teachers`);
                setTeachers(teachersRes.data || []);
            } catch (err) {
                setTeachers([]);
            }

            // Fetch all entries for conflict detection
            try {
                const allEntriesRes = await axios.get(`/api/schools/${fullUser.schoolId}/timetable/entries`);
                setAllSchoolEntries(allEntriesRes.data || []);
            } catch (err) {
                setAllSchoolEntries([]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/classes/${selectedClass}/sections`);
            setSections(res.data || []);
        } catch (error) {
            console.error("Error fetching sections:", error);
            setSections([]);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/subjects?classId=${selectedClass}`);
            setSubjects(res.data);
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchExistingTimetable = async () => {
        if (!selectedClass) return;

        try {
            const url = `/api/schools/${fullUser.schoolId}/timetable/entries?classId=${selectedClass}${selectedSection ? `&sectionId=${selectedSection}` : ''}`;
            const res = await axios.get(url);

            const newTimetable = {};
            res.data.forEach((entry) => {
                if (!newTimetable[entry.dayOfWeek]) {
                    newTimetable[entry.dayOfWeek] = {};
                }
                newTimetable[entry.dayOfWeek][entry.timeSlotId] = {
                    id: entry.id,
                    subjectId: entry.subject.id.toString(),
                    teacherId: entry.teacher.userId,
                    roomNumber: entry.roomNumber || "",
                };
            });
            setTimetable(newTimetable);
            setInitialTimetable(JSON.parse(JSON.stringify(newTimetable)));
        } catch (error) {
            console.error("Error fetching existing timetable:", error);
        }
    };

    // Conflict detection helpers
    const getTeacherConflict = (teacherId, timeSlotId, dayOfWeek) => {
        if (!teacherId) return null;
        return allSchoolEntries.find(e =>
            e.teacher.userId === teacherId &&
            e.timeSlotId === timeSlotId &&
            e.dayOfWeek === dayOfWeek &&
            // Exclude entries from current class/section being edited
            !(e.classId === parseInt(selectedClass) &&
                (selectedSection ? e.sectionId === parseInt(selectedSection) : !e.sectionId))
        );
    };

    const getRoomConflict = (roomNumber, timeSlotId, dayOfWeek) => {
        if (!roomNumber) return null;
        return allSchoolEntries.find(e =>
            e.roomNumber === roomNumber &&
            e.timeSlotId === timeSlotId &&
            e.dayOfWeek === dayOfWeek &&
            !(e.classId === parseInt(selectedClass) &&
                (selectedSection ? e.sectionId === parseInt(selectedSection) : !e.sectionId))
        );
    };

    const handleCellChange = (day, slotId, field, value) => {
        setTimetable((prev) => ({
            ...prev,
            [day]: {
                ...prev[day],
                [slotId]: {
                    ...prev[day]?.[slotId],
                    [field]: value,
                },
            },
        }));
    };

    const handleSave = async () => {
        if (!selectedClass) {
            toast.error("Please select a class");
            return;
        }

        setSaving(true);
        try {
            const entries = [];
            Object.entries(timetable).forEach(([day, slots]) => {
                Object.entries(slots).forEach(([slotId, data]) => {
                    if (data.subjectId && data.teacherId) {
                        entries.push({
                            classId: parseInt(selectedClass),
                            sectionId: selectedSection ? parseInt(selectedSection) : null,
                            subjectId: parseInt(data.subjectId),
                            teacherId: data.teacherId,
                            timeSlotId: slotId,
                            dayOfWeek: parseInt(day),
                            roomNumber: data.roomNumber || null,
                        });
                    }
                });
            });

            const existing = await axios.get(
                `/api/schools/${fullUser.schoolId}/timetable/entries?classId=${selectedClass}${selectedSection ? `&sectionId=${selectedSection}` : ''}`
            );

            for (const entry of existing.data) {
                await axios.delete(`/api/schools/${fullUser.schoolId}/timetable/entries/${entry.id}`);
            }

            for (const entry of entries) {
                await axios.post(`/api/schools/${fullUser.schoolId}/timetable/entries`, entry);
            }

            setHasUnsavedChanges(false);
            toast.success("Timetable saved successfully");
            router.push("/dashboard/timetable/manage");
        } catch (error) {
            console.error("Error saving timetable:", error);
            toast.error(error.response?.data?.message || error.response?.data?.error || "Failed to save timetable");
        } finally {
            setSaving(false);
        }
    };

    const isPeriodFilled = (day, slotId) => {
        return timetable[day]?.[slotId]?.subjectId && timetable[day]?.[slotId]?.teacherId;
    };

    const getDayProgress = (day) => {
        const daySlots = timeSlots.filter(s => !s.isBreak);
        const filled = daySlots.filter(slot => isPeriodFilled(day, slot.id)).length;
        return { filled, total: daySlots.length };
    };

    const getTotalProgress = () => {
        let totalFilled = 0;
        let totalSlots = 0;
        DAYS.forEach(day => {
            const progress = getDayProgress(day.value);
            totalFilled += progress.filled;
            totalSlots += progress.total;
        });
        return { filled: totalFilled, total: totalSlots };
    };

    const selectedClassData = classes.find(c => c.id.toString() === selectedClass);
    const selectedSectionData = sections.find(s => s.id.toString() === selectedSection);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center space-y-4">
                    <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                    <p className="text-muted-foreground">Loading timetable builder...</p>
                </div>
            </div>
        );
    }

    if (timeSlots.length === 0) {
        return (
            <div className="p-8 max-w-2xl mx-auto">
                <Card className="border-dashed border-2">
                    <CardContent className="pt-8">
                        <div className="text-center space-y-4 py-8">
                            <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                <Clock className="h-10 w-10 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold">No Time Slots Configured</h2>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Configure your school's period timings before creating timetables
                            </p>
                            <Link href="/dashboard/timetable/slots">
                                <Button size="lg" className="mt-4">
                                    <Clock className="mr-2 h-5 w-5" />
                                    Configure Time Slots
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/timetable/manage">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Create Timetable</h1>
                            <p className="text-muted-foreground">Build weekly class schedules with ease</p>
                        </div>
                    </div>
                    {selectedClass && selectedSection && (
                        <div className="hidden md:flex items-center gap-3">
                            <Badge variant="outline" className="px-3 py-1.5 text-sm">
                                <GraduationCap className="h-4 w-4 mr-2" />
                                {selectedClassData?.className}
                            </Badge>
                            <Badge variant="outline" className="px-3 py-1.5 text-sm">
                                <Users className="h-4 w-4 mr-2" />
                                Section {selectedSectionData?.name}
                            </Badge>
                        </div>
                    )}
                </div>

                {/* Step Indicator */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-muted-foreground/20"></div>
                    </div>
                    <div className="relative flex justify-between">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${selectedClass ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <div className="w-6 h-6 rounded-full bg-current/20 flex dark:text-white items-center justify-center text-xs font-bold">1</div>
                            <span className="font-medium dark:text-white text-sm hidden sm:inline">Select Class</span>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${selectedSection ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <div className="w-6 h-6 rounded-full bg-current/20 flex dark:text-white items-center justify-center text-xs font-bold">2</div>
                            <span className="font-medium dark:text-white text-sm hidden sm:inline">Select Section</span>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${selectedClass && selectedSection ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            <div className="w-6 h-6 rounded-full bg-current/20 flex dark:text-white items-center justify-center text-xs font-bold">3</div>
                            <span className="font-medium dark:text-white text-sm hidden sm:inline">Assign Schedule</span>
                        </div>
                    </div>
                </div>

                {/* Class & Section Selection */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10">
                                    <GraduationCap className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Select Class</CardTitle>
                                    <CardDescription>Choose the class for this timetable</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedClass} onValueChange={(val) => { setSelectedClass(val); setSelectedSection(""); }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a class..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded bg-primary/10">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                </div>
                                                <span className="font-medium">{cls.className}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card className={`transition-all ${!selectedClass ? 'opacity-60' : ''}`}>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 rounded-xl bg-blue-500/10">
                                        <Layers className="h-5 w-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">Select Section</CardTitle>
                                        <CardDescription>Each section has its own timetable</CardDescription>
                                    </div>
                                </div>
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
                                    Required
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder={selectedClass ? "Choose a section..." : "Select class first"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {sections.length > 0 ? sections.map((section) => (
                                        <SelectItem key={section.id} value={section.id.toString()}>
                                            <div className="flex items-center gap-2">
                                                <div className="p-1 rounded bg-blue-500/10">
                                                    <Users className="h-4 w-4 text-blue-500" />
                                                </div>
                                                <span className="font-medium">Section {section.name}</span>
                                            </div>
                                        </SelectItem>
                                    )) : (
                                        <div className="p-4 text-center text-muted-foreground">
                                            No sections available for this class
                                        </div>
                                    )}
                                </SelectContent>
                            </Select>
                            {selectedClass && !selectedSection && (
                                <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                    <p className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                        Select a section to start building the timetable
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Timetable Builder */}
                {selectedClass && selectedSection && (
                    <Card>
                        <Tabs value={activeDay} onValueChange={setActiveDay}>
                            {/* Day Tabs */}
                            <div className="px-6 py-4 border-b">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10">
                                            <Calendar className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg">Weekly Schedule</h3>
                                            <p className="text-sm text-muted-foreground">
                                                {getTotalProgress().filled} of {getTotalProgress().total} periods configured
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${(getTotalProgress().filled / getTotalProgress().total) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-medium text-primary">
                                            {Math.round((getTotalProgress().filled / getTotalProgress().total) * 100)}%
                                        </span>
                                    </div>
                                </div>
                                <TabsList className="grid grid-cols-6 w-full h-auto gap-2 bg-transparent p-0">
                                    {DAYS.map((day) => {
                                        const progress = getDayProgress(day.value);
                                        const isComplete = progress.filled === progress.total && progress.total > 0;
                                        return (
                                            <TabsTrigger
                                                key={day.value}
                                                value={day.value.toString()}
                                                className="relative data-[state=active]:bg-background rounded-lg py-3 px-3 flex flex-col items-center gap-1.5 transition-all"
                                            >
                                                {isComplete && (
                                                    <div className="absolute -top-1 -right-1">
                                                        <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-100" />
                                                    </div>
                                                )}
                                                <span className="font-bold text-lg">{day.short}</span>
                                                <span className="text-xs text-muted-foreground hidden md:block">{day.label}</span>
                                                {progress.total > 0 && (
                                                    <div className="flex items-center gap-1">
                                                        <div className="h-1.5 w-12 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-primary'}`}
                                                                style={{ width: `${(progress.filled / progress.total) * 100}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] text-muted-foreground">{progress.filled}/{progress.total}</span>
                                                    </div>
                                                )}
                                            </TabsTrigger>
                                        );
                                    })}
                                </TabsList>
                            </div>

                            {/* Period Cards */}
                            {DAYS.map((day) => (
                                <TabsContent key={day.value} value={day.value.toString()} className="mt-0 p-6">
                                    <div className="space-y-4">
                                        {timeSlots.map((slot, index) => {
                                            const cellData = timetable[day.value]?.[slot.id] || {};
                                            const isFilled = isPeriodFilled(day.value, slot.id);

                                            // Get conflicts for this slot
                                            const teacherConflict = getTeacherConflict(cellData.teacherId, slot.id, day.value);
                                            const roomConflict = getRoomConflict(cellData.roomNumber, slot.id, day.value);

                                            if (slot.isBreak) {
                                                return (
                                                    <div key={slot.id} className="flex items-center justify-center py-4">
                                                        <div className="flex items-center gap-4 px-8 py-3 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                                            <Coffee className="h-5 w-5 text-amber-600" />
                                                            <div className="text-center">
                                                                <p className="font-medium text-amber-700 dark:text-amber-400">Break Time</p>
                                                                <p className="text-xs text-amber-600/70">{slot.startTime} - {slot.endTime}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <Card
                                                    key={slot.id}
                                                    className={`transition-colors ${isFilled
                                                        ? 'border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20'
                                                        : 'border-l-4 border-l-muted'
                                                        }`}
                                                >
                                                    <CardContent className="p-4">
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`p-2.5 rounded-xl ${isFilled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                                                                    {isFilled ? (
                                                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                                                    ) : (
                                                                        <Circle className="h-5 w-5 text-muted-foreground" />
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-bold text-lg">{slot.label}</h4>
                                                                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                                        <Clock className="h-3.5 w-3.5" />
                                                                        {slot.startTime} - {slot.endTime}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="text-xs font-medium">
                                                                Period {index + 1}
                                                            </Badge>
                                                        </div>

                                                        <div className="grid gap-4 md:grid-cols-3">
                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
                                                                <Select
                                                                    value={cellData.subjectId || ""}
                                                                    onValueChange={(val) => handleCellChange(day.value, slot.id, "subjectId", val)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select subject" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {subjects.map((subject) => (
                                                                            <SelectItem key={subject.id} value={subject.id.toString()}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                                                    {subject.subjectName}
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-muted-foreground">Teacher</Label>
                                                                <Select
                                                                    value={cellData.teacherId || ""}
                                                                    onValueChange={(val) => handleCellChange(day.value, slot.id, "teacherId", val)}
                                                                >
                                                                    <SelectTrigger>
                                                                        <SelectValue placeholder="Select teacher" />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {teachers.map((teacher) => (
                                                                            <SelectItem key={teacher.userId} value={teacher.userId}>
                                                                                <div className="flex items-center gap-2">
                                                                                    <User2 className="h-4 w-4 text-blue-500" />
                                                                                    {teacher.name}
                                                                                </div>
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                {teacherConflict && (
                                                                    <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 p-1.5 rounded bg-amber-50 dark:bg-amber-950/30">
                                                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                                        <span>Already in {teacherConflict.class.className}{teacherConflict.section ? `-${teacherConflict.section.name}` : ''}</span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="space-y-1.5">
                                                                <Label className="text-xs font-medium text-muted-foreground">Room (Optional)</Label>
                                                                <div className="relative">
                                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input
                                                                        placeholder="e.g., 201"
                                                                        value={cellData.roomNumber || ""}
                                                                        onChange={(e) => handleCellChange(day.value, slot.id, "roomNumber", e.target.value)}
                                                                        className="pl-9"
                                                                    />
                                                                </div>
                                                                {roomConflict && (
                                                                    <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1 p-1.5 rounded bg-amber-50 dark:bg-amber-950/30">
                                                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                                        <span>Used by {roomConflict.class.className}{roomConflict.section ? `-${roomConflict.section.name}` : ''}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>

                        {/* Footer */}
                        <div className="p-4 border-t bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-semibold text-foreground">{getTotalProgress().filled} periods</span> configured for{" "}
                                        <span className="font-semibold text-foreground">{selectedClassData?.className} - Section {selectedSectionData?.name}</span>
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Link href="/dashboard/timetable/manage">
                                        <Button variant="outline" size="lg">
                                            Cancel
                                        </Button>
                                    </Link>
                                    <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[140px]">
                                        {saving ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="mr-2 h-5 w-5" />
                                                Save Timetable
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
