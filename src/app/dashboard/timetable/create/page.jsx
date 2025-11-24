"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Save, ArrowLeft, Clock, User2, BookOpen, MapPin, Coffee, Calendar, CheckCircle2, Circle } from "lucide-react";
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

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchInitialData();
        }
    }, [fullUser?.schoolId]);

    useEffect(() => {
        if (selectedClass) {
            fetchSubjects();
            fetchSections();
            fetchExistingTimetable();
        }
    }, [selectedClass, selectedSection]);

    const fetchInitialData = async () => {
        try {
            const classesRes = await axios.get(`/api/schools/${fullUser.schoolId}/classes`);
            setClasses(classesRes.data);

            try {
                const teachersRes = await axios.get(`/api/schools/${fullUser.schoolId}/staff/teachers`);
                setTeachers(teachersRes.data || []);
            } catch (err) {
                setTeachers([]);
            }

            const slotsRes = await axios.get(`/api/schools/${fullUser.schoolId}/timetable/slots`);
            setTimeSlots(slotsRes.data || []);
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
        } catch (error) {
            console.error("Error fetching existing timetable:", error);
        }
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

            toast.success("Timetable saved successfully");
            router.push("/dashboard/timetable/manage");
        } catch (error) {
            console.error("Error saving timetable:", error);
            toast.error(error.response?.data?.error || "Failed to save timetable");
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (timeSlots.length === 0) {
        return (
            <div className="p-6 space-y-6">
                <Card className="border-dashed">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4 py-8">
                            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <Clock className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="text-xl font-bold">No Time Slots Configured</h2>
                            <p className="text-muted-foreground max-w-md mx-auto text-sm">
                                Configure your school's period timings before creating timetables
                            </p>
                            <Link href="/dashboard/timetable/slots">
                                <Button size="lg" className="mt-4">
                                    <Clock className="mr-2 h-4 w-4" />
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
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/timetable/manage">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Create Timetable</h1>
                        <p className="text-muted-foreground text-sm mt-1">Build weekly schedules with ease</p>
                    </div>
                </div>
            </div>

            {/* Class Selection */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-sm">
                    <CardHeader className="pb-3 bg-muted/50">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Select Class
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder="Choose a class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                        <div className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                                            <span>{cls.className}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="pb-3 bg-muted/50">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Select Section (Optional)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedSection} onValueChange={setSelectedSection}>
                            <SelectTrigger className="h-12 text-base">
                                <SelectValue placeholder="All sections" />
                            </SelectTrigger>
                            <SelectContent>
                                {sections.length > 0 ? sections.map((section) => (
                                    <SelectItem key={section.id} value={section.id.toString()}>
                                        <span>Section {section.name}</span>
                                    </SelectItem>
                                )) : (
                                    <div className="p-2 text-sm text-muted-foreground">No sections available</div>
                                )}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>
            </div>

            {/* Timetable Builder with Tabs */}
            {selectedClass && (
                <Card className="overflow-hidden">
                    <Tabs value={activeDay} onValueChange={setActiveDay}>
                        <div className="border-b bg-muted/30 px-6 py-4">
                            <TabsList className="grid grid-cols-6 w-full h-auto gap-2 bg-transparent p-0">
                                {DAYS.map((day) => {
                                    const progress = getDayProgress(day.value);
                                    return (
                                        <TabsTrigger
                                            key={day.value}
                                            value={day.value.toString()}
                                            className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-3 px-4 flex flex-col items-start gap-1"
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="font-semibold">{day.short}</span>
                                                {progress.filled > 0 && (
                                                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                                        {progress.filled}/{progress.total}
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground hidden md:block">{day.label}</span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                        </div>

                        {DAYS.map((day) => (
                            <TabsContent key={day.value} value={day.value.toString()} className="mt-0 p-6">
                                <div className="space-y-4">
                                    {timeSlots.map((slot, index) => {
                                        const cellData = timetable[day.value]?.[slot.id] || {};
                                        const isFilled = isPeriodFilled(day.value, slot.id);

                                        if (slot.isBreak) {
                                            return (
                                                <div key={slot.id} className="flex items-center justify-center py-6 text-muted-foreground">
                                                    <div className="flex items-center gap-3">
                                                        <Coffee className="h-5 w-5" />
                                                        <div>
                                                            <p className="font-medium">Break Time</p>
                                                            <p className="text-xs">{slot.startTime} - {slot.endTime}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <Card key={slot.id} className={`transition-all ${isFilled ? 'bg-muted/50 border-primary/30' : ''}`}>
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            {isFilled ? (
                                                                <CheckCircle2 className="h-5 w-5 text-primary" />
                                                            ) : (
                                                                <Circle className="h-5 w-5 text-muted-foreground" />
                                                            )}
                                                            <div>
                                                                <CardTitle className="text-base font-semibold">{slot.label}</CardTitle>
                                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                                    <Clock className="inline h-3 w-3 mr-1" />
                                                                    {slot.startTime} - {slot.endTime}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className="text-xs">
                                                            Period {index + 1}
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid gap-3 md:grid-cols-3">
                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">Subject</Label>
                                                            <Select
                                                                value={cellData.subjectId || ""}
                                                                onValueChange={(val) => handleCellChange(day.value, slot.id, "subjectId", val)}
                                                            >
                                                                <SelectTrigger className="h-10">
                                                                    <SelectValue placeholder="Select subject" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {subjects.map((subject) => (
                                                                        <SelectItem key={subject.id} value={subject.id.toString()}>
                                                                            <div className="flex items-center gap-2">
                                                                                <BookOpen className="h-3 w-3" />
                                                                                {subject.subjectName}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">Teacher</Label>
                                                            <Select
                                                                value={cellData.teacherId || ""}
                                                                onValueChange={(val) => handleCellChange(day.value, slot.id, "teacherId", val)}
                                                            >
                                                                <SelectTrigger className="h-10">
                                                                    <SelectValue placeholder="Select teacher" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {teachers.map((teacher) => (
                                                                        <SelectItem key={teacher.userId} value={teacher.userId}>
                                                                            <div className="flex items-center gap-2">
                                                                                <User2 className="h-3 w-3" />
                                                                                {teacher.name}
                                                                            </div>
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs text-muted-foreground">Room Number</Label>
                                                            <div className="relative">
                                                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                <Input
                                                                    placeholder="e.g., 201"
                                                                    value={cellData.roomNumber || ""}
                                                                    onChange={(e) => handleCellChange(day.value, slot.id, "roomNumber", e.target.value)}
                                                                    className="h-10 pl-9"
                                                                />
                                                            </div>
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

                    <Separator />

                    <div className="p-6 bg-muted/30">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-muted-foreground">
                                {Object.values(timetable).reduce((total, day) => total + Object.keys(day).length, 0)} periods configured
                            </p>
                            <div className="flex gap-3">
                                <Link href="/dashboard/timetable/manage">
                                    <Button variant="outline" size="lg">
                                        Cancel
                                    </Button>
                                </Link>
                                <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-[140px]">
                                    {saving ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" />
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
    );
}
