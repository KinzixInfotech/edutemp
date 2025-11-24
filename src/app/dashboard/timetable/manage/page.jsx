"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Eye, BarChart3, Clock } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

export default function TimetableManagePage() {
    const { fullUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedClass, setSelectedClass] = useState("");

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchClasses();
        }
    }, [fullUser?.schoolId]);

    useEffect(() => {
        if (selectedClass) {
            fetchSections();
        }
    }, [selectedClass]);

    const fetchClasses = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/classes`);
            setClasses(res.data);
        } catch (error) {
            console.error("Error fetching classes:", error);
            toast.error("Failed to load classes");
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/sections?classId=${selectedClass}`);
            setSections(res.data);
        } catch (error) {
            console.error("Error fetching sections:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Timeatable Management</h1>
                    <p className="text-muted-foreground">
                        Manage and view timetables for classes and teachers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/timetable/stats">
                        <Button variant="outline">
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Statistics
                        </Button>
                    </Link>
                    <Link href="/dashboard/timetable/slots">
                        <Button variant="outline">
                            <Clock className="mr-2 h-4 w-4" />
                            Time Slots
                        </Button>
                    </Link>
                    <Link href="/dashboard/timetable/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Timetable
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Class Timetables</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedClass && sections.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Sections:</p>
                                {sections.map((section) => (
                                    <Link
                                        key={section.id}
                                        href={`/dashboard/timetable/view/class/${selectedClass}?sectionId=${section.id}`}
                                    >
                                        <Button variant="outline" className="w-full justify-start" size="sm">
                                            <Eye className="mr-2 h-4 w-4" />
                                            {section.name}
                                        </Button>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {selectedClass && (
                            <Link href={`/dashboard/timetable/view/class/${selectedClass}`}>
                                <Button variant="outline" className="w-full">
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Full Class
                                </Button>
                            </Link>
                        )}

                        {selectedClass && (
                            <Link href={`/dashboard/timetable/create?classId=${selectedClass}`}>
                                <Button variant="default" className="w-full">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create/Edit
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Teacher Timetables</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Teachers can view their personal timetable from their profile.
                        </p>
                        {fullUser?.role === "TEACHER" && (
                            <Link href={`/dashboard/timetable/view/teacher/${fullUser.userId}`}>
                                <Button variant="default" className="w-full">
                                    <Eye className="mr-2 h-4 w-4" />
                                    My Timetable
                                </Button>
                            </Link>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Link href="/dashboard/timetable/stats">
                            <Button variant="outline" className="w-full justify-start">
                                <BarChart3 className="mr-2 h-4 w-4" />
                                View Statistics
                            </Button>
                        </Link>
                        <Link href="/dashboard/timetable/slots">
                            <Button variant="outline" className="w-full justify-start">
                                <Clock className="mr-2 h-4 w-4" />
                                Manage Time Slots
                            </Button>
                        </Link>
                        <Link href="/dashboard/timetable/conflicts">
                            <Button variant="outline" className="w-full justify-start">
                                <Eye className="mr-2 h-4 w-4" />
                                Check Conflicts
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
