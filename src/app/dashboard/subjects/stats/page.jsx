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
import { Loader2, BookOpen, Users, Building2, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";

export default function SubjectStatsPage() {
    const { fullUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchStats();
        }
    }, [fullUser?.schoolId]);

    const fetchStats = async () => {
        try {
            const response = await axios.get(
                `/api/schools/${fullUser.schoolId}/subjects/stats`
            );
            setStats(response.data);
        } catch (error) {
            console.error("Error fetching statistics:", error);
            toast.error("Failed to fetch statistics");
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
            <div className="flex items-center justify-center h-screen">
                <p className="text-muted-foreground">No statistics available</p>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/subjects/manage">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Subject Statistics</h1>
                    <p className="text-muted-foreground">
                        Overview of subjects across your institution
                    </p>
                </div>
            </div>

            {/* Global Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Subjects</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalSubjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all classes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Classes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.classwiseStats.length}</div>
                        <p className="text-xs text-muted-foreground">
                            With assigned subjects
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Exam Usage</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.examUsageCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Subjects used in exams
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Class-wise Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Subjects by Class</CardTitle>
                    <CardDescription>
                        Distribution of subjects across different classes
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
                                    <TableHead className="text-right">Subject Count</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.classwiseStats
                                    .sort((a, b) => b.subjectCount - a.subjectCount)
                                    .map((classData) => (
                                        <TableRow key={classData.classId}>
                                            <TableCell className="font-medium">
                                                {classData.className}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <span className="inline-flex items-center justify-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                                    {classData.subjectCount}
                                                </span>
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
