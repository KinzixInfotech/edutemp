"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

const DAYS_MAP = {
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
};

export default function TeacherTimetableViewPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const teacherId = params.teacherId;

    const [loading, setLoading] = useState(true);
    const [timetableData, setTimetableData] = useState(null);
    const [teacherName, setTeacherName] = useState("");

    useEffect(() => {
        if (fullUser?.schoolId && teacherId) {
            fetchTimetable();
            fetchTeacherName();
        }
    }, [fullUser?.schoolId, teacherId]);

    const fetchTeacherName = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/staff/teachers`);
            const teacher = res.data.find((t) => t.userId === teacherId);
            setTeacherName(teacher?.name || "");
        } catch (error) {
            console.error("Error fetching teacher name:", error);
        }
    };

    const fetchTimetable = async () => {
        try {
            const res = await axios.get(
                `/api/schools/${fullUser.schoolId}/timetable/view/teacher/${teacherId}`
            );
            setTimetableData(res.data);
        } catch (error) {
            console.error("Error fetching timetable:", error);
            toast.error("Failed to load timetable");
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!timetableData) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">No timetable data available</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { timeSlots, timetable } = timetableData;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/timetable/manage">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Teacher Timetable</h1>
                        <p className="text-muted-foreground">{teacherName}</p>
                    </div>
                </div>
                <Button onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                </Button>
            </div>

            {/* Print Header */}
            <div className="hidden print:block text-center mb-6">
                <h1 className="text-2xl font-bold">{fullUser?.schoolName || "School"}</h1>
                <h2 className="text-xl">Teacher Timetable - {teacherName}</h2>
                <p className="text-sm text-muted-foreground">Academic Year 2024-25</p>
            </div>

            {/* Timetable Grid */}
            <Card>
                <CardHeader className="print:hidden">
                    <CardTitle>Weekly Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full border">
                            <thead>
                                <tr>
                                    <th className="border px-3 py-2 bg-muted font-semibold">Day</th>
                                    {timeSlots.map((slot) => (
                                        <th key={slot.id} className="border px-3 py-2 bg-muted min-w-[150px]">
                                            <div className="font-semibold">{slot.label}</div>
                                            <div className="text-xs font-normal text-muted-foreground">
                                                {slot.startTime} - {slot.endTime}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5, 6].map((day) => (
                                    <tr key={day}>
                                        <td className="border px-3 py-2 font-semibold bg-muted">
                                            {DAYS_MAP[day]}
                                        </td>
                                        {timeSlots.map((slot) => {
                                            const entry = timetable[day]?.[slot.id];
                                            return (
                                                <td key={slot.id} className="border px-3 py-2 text-sm">
                                                    {entry ? (
                                                        <div className="space-y-1">
                                                            <div className="font-semibold">{entry.subject?.subjectName}</div>
                                                            <div className="text-muted-foreground">
                                                                {entry.class?.className}
                                                                {entry.section && ` - ${entry.section.name}`}
                                                            </div>
                                                            {entry.roomNumber && (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {entry.roomNumber}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground">Free</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
