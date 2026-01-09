"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Loader2, Plus, Eye, BarChart3, Clock, Calendar,
    Users, BookOpen, GraduationCap, Search, RefreshCw,
    ChevronRight, LayoutGrid
} from "lucide-react";
import Link from "next/link";

export default function TimetableManagePage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch stats
    const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
        queryKey: ["timetable-stats", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/timetable/stats`);
            if (!res.ok) throw new Error("Failed to fetch stats");
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 30000,
    });

    // Fetch classes with sections
    const { data: classes, isLoading: classesLoading } = useQuery({
        queryKey: ["classes-with-sections", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes?includeSections=true`);
            if (!res.ok) throw new Error("Failed to fetch classes");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch time slots
    const { data: timeSlots } = useQuery({
        queryKey: ["time-slots", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/timetable/slots`);
            if (!res.ok) throw new Error("Failed to fetch time slots");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Filter classes based on search
    const filteredClasses = useMemo(() => {
        if (!classes) return [];
        if (!searchQuery) return classes;
        return classes.filter(cls =>
            cls.className.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [classes, searchQuery]);

    // Filter teachers based on search
    const filteredTeachers = useMemo(() => {
        if (!stats?.teacherwiseStats) return [];
        if (!searchQuery) return stats.teacherwiseStats;
        return stats.teacherwiseStats.filter(t =>
            t.teacherName.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [stats?.teacherwiseStats, searchQuery]);

    const isLoading = statsLoading || classesLoading;

    if (isLoading) {
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
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        Timetable Management
                    </h1>
                    <p className="text-muted-foreground">
                        Manage and view timetables for classes and teachers
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetchStats()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
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

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalPeriods || 0}</div>
                        <p className="text-xs text-muted-foreground">Configured periods</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Classes</CardTitle>
                        <GraduationCap className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalClasses || 0}</div>
                        <p className="text-xs text-muted-foreground">With timetables</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                        <Users className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalTeachers || 0}</div>
                        <p className="text-xs text-muted-foreground">Assigned to periods</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Time Slots</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{timeSlots?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Period slots defined</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search classes or teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Link href="/dashboard/timetable/stats">
                    <Button variant="outline" size="sm">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Statistics
                    </Button>
                </Link>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="classes" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="classes">Class Timetables</TabsTrigger>
                    <TabsTrigger value="teachers">Teacher Shifts</TabsTrigger>
                    <TabsTrigger value="subjects">Subject Distribution</TabsTrigger>
                </TabsList>

                {/* Class Timetables Tab */}
                <TabsContent value="classes">
                    <Card>
                        <CardHeader>
                            <CardTitle>Class Timetables</CardTitle>
                            <CardDescription>View and manage timetables for each class and section</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {filteredClasses.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No classes found</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {filteredClasses.map((cls) => (
                                        <Card key={cls.id} className="hover:border-primary/50 transition-colors">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between">
                                                    <CardTitle className="text-base">{cls.className}</CardTitle>
                                                    <Badge variant="outline">
                                                        {cls.sections?.length || 0} sections
                                                    </Badge>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {cls.sections?.length > 0 ? (
                                                    <div className="flex flex-wrap gap-2">
                                                        {cls.sections.map((section) => (
                                                            <Link
                                                                key={section.id}
                                                                href={`/dashboard/timetable/view/class/${cls.id}?sectionId=${section.id}`}
                                                            >
                                                                <Button variant="secondary" size="sm">
                                                                    {section.name}
                                                                    <ChevronRight className="ml-1 h-3 w-3" />
                                                                </Button>
                                                            </Link>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">No sections</p>
                                                )}
                                                <div className="flex gap-2 pt-2 border-t">
                                                    <Link href={`/dashboard/timetable/view/class/${cls.id}`} className="flex-1">
                                                        <Button variant="outline" size="sm" className="w-full">
                                                            <Eye className="mr-2 h-3 w-3" />
                                                            View All
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/dashboard/timetable/create?classId=${cls.id}`} className="flex-1">
                                                        <Button size="sm" className="w-full">
                                                            <Plus className="mr-2 h-3 w-3" />
                                                            Create
                                                        </Button>
                                                    </Link>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Teacher Shifts Tab */}
                <TabsContent value="teachers">
                    <Card>
                        <CardHeader>
                            <CardTitle>Teacher Shifts</CardTitle>
                            <CardDescription>Period allocation and workload for each teacher</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {filteredTeachers.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No teachers with assigned periods</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Teacher</TableHead>
                                            <TableHead className="text-center">Periods/Week</TableHead>
                                            <TableHead className="text-center">Workload</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredTeachers.map((teacher) => {
                                            const workloadPercent = Math.min((teacher.periodCount / 30) * 100, 100);
                                            return (
                                                <TableRow key={teacher.teacherId}>
                                                    <TableCell className="font-medium">{teacher.teacherName}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary">{teacher.periodCount}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${workloadPercent > 80 ? 'bg-red-500' : workloadPercent > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                                    style={{ width: `${workloadPercent}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs text-muted-foreground w-10">
                                                                {Math.round(workloadPercent)}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link href={`/dashboard/timetable/view/teacher/${teacher.teacherId}`}>
                                                            <Button variant="ghost" size="sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Subject Distribution Tab */}
                <TabsContent value="subjects">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subject Distribution</CardTitle>
                            <CardDescription>Period allocation per subject across all classes</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {stats?.subjectwiseStats?.length === 0 ? (
                                <p className="text-muted-foreground text-center py-8">No subject data available</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {stats?.subjectwiseStats?.map((subject) => (
                                        <div
                                            key={subject.subjectId}
                                            className="flex items-center justify-between p-4 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <BookOpen className="h-4 w-4 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{subject.subjectName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {subject.periodCount} periods/week
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge>{subject.periodCount}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
