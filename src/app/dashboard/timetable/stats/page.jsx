"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, Users, Calendar, BarChart3, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

export default function TimetableStatsPage() {
    const { fullUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchStats();
        }
    }, [fullUser?.schoolId]);

    const fetchStats = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/timetable/stats`);
            setStats(res.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
            toast.error("Failed to load statistics");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">No statistics available</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/timetable/manage">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Timetable Statistics</h1>
                    <p className="text-muted-foreground">
                        Analytics and insights for your school timetables
                    </p>
                </div>
            </div>

            {/* Global Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalPeriods}</div>
                        <p className="text-xs text-muted-foreground">
                            Scheduled across all classes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Classes</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalClasses}</div>
                        <p className="text-xs text-muted-foreground">
                            With timetables configured
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Teachers Assigned</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalTeachers}</div>
                        <p className="text-xs text-muted-foreground">
                            Teaching staff involved
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Periods/Class</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats.totalClasses > 0
                                ? Math.round(stats.totalPeriods / stats.totalClasses)
                                : 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per class weekly
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Teacher Workload */}
            <Card>
                <CardHeader>
                    <CardTitle>Teacher Workload</CardTitle>
                    <CardDescription>
                        Periods assigned per teacher
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.teacherwiseStats.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            No teacher data available
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Teacher Name</TableHead>
                                    <TableHead className="text-right">Total Periods</TableHead>
                                    <TableHead className="text-right">Workload</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.teacherwiseStats.slice(0, 10).map((teacher) => (
                                    <TableRow key={teacher.teacherId}>
                                        <TableCell className="font-medium">{teacher.teacherName}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline">{teacher.periodCount}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end">
                                                <div
                                                    className="h-2 bg-primary rounded"
                                                    style={{
                                                        width: `${Math.min((teacher.periodCount / 40) * 100, 100)}%`,
                                                        minWidth: "20px",
                                                    }}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Class-wise Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Class-wise Period Distribution</CardTitle>
                    <CardDescription>
                        Total periods scheduled per class
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.classwiseStats.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            No class data available
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Class</TableHead>
                                    <TableHead className="text-right">Periods</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.classwiseStats.map((cls) => (
                                    <TableRow key={cls.classId}>
                                        <TableCell className="font-medium">{cls.className}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge>{cls.periodCount}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Subject Distribution */}
            <Card>
                <CardHeader>
                    <CardTitle>Subject Distribution</CardTitle>
                    <CardDescription>
                        Most scheduled subjects across school
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {stats.subjectwiseStats.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                            No subject data available
                        </p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead className="text-right">Periods</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.subjectwiseStats.slice(0, 10).map((subject) => (
                                    <TableRow key={subject.subjectId}>
                                        <TableCell className="font-medium">{subject.subjectName}</TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="secondary">{subject.periodCount}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
