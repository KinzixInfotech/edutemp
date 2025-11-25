"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    BookOpen,
    Calendar,
    Users,
    TrendingUp,
    Trophy,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    Download,
    GraduationCap,
    Target,
    AlertCircle
} from "lucide-react";
import axios from "axios";
import Link from "next/link";
import { format } from "date-fns";

export default function ExaminationOverviewPage() {
    const { fullUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [examStats, setExamStats] = useState(null);
    const [selectedAcademicYear, setSelectedAcademicYear] = useState("all");
    const [academicYears, setAcademicYears] = useState([]);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchAcademicYears();
            fetchOverviewStats();
        }
    }, [fullUser?.schoolId, selectedAcademicYear]);

    const fetchAcademicYears = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/academic-years`);
            setAcademicYears(res.data);
        } catch (error) {
            console.error("Error fetching academic years:", error);
        }
    };

    const fetchOverviewStats = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/overview`, {
                params: { academicYearId: selectedAcademicYear !== "all" ? selectedAcademicYear : undefined }
            });
            setExamStats(res.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Not set";
        return format(new Date(dateString), "MMM d, yyyy");
    };

    const formatTime = (dateString) => {
        if (!dateString) return "";
        return format(new Date(dateString), "h:mm a");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const {
        totalExams = 0,
        upcomingExams = [],
        recentExams = [],
        totalStudentsParticipated = 0,
        overallPassRate = 0,
        overallFailRate = 0,
        topPerformers = [],
        classWisePerformance = [],
        examTypeBreakdown = {}
    } = examStats || {};

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <GraduationCap className="w-8 h-8 text-primary" />
                        Examination Overview
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Comprehensive examination analytics and insights</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fetchOverviewStats()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Academic Year</label>
                            <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Academic Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    {academicYears?.map((year) => (
                                        <SelectItem key={year.id} value={year.id}>
                                            {year.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-3 flex items-end gap-2">
                            <Link href="/dashboard/examination/create" className="flex-1">
                                <Button variant="outline" className="w-full">
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Create Exam
                                </Button>
                            </Link>
                            <Link href="/dashboard/examination/manage" className="flex-1">
                                <Button variant="outline" className="w-full">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Manage Exams
                                </Button>
                            </Link>
                            <Link href="/dashboard/examination/stats" className="flex-1">
                                <Button variant="outline" className="w-full">
                                    <Target className="w-4 h-4 mr-2" />
                                    Detailed Stats
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <BookOpen className="w-8 h-8 opacity-80" />
                            <span className="text-sm bg-white/20 px-2 py-1 rounded">
                                {upcomingExams.length} Upcoming
                            </span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Total Exams</h3>
                        <p className="text-2xl font-bold mt-1">{totalExams}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="w-8 h-8 opacity-80" />
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Pass Rate</h3>
                        <p className="text-2xl font-bold mt-1">{overallPassRate}%</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <XCircle className="w-8 h-8 opacity-80" />
                            <span className="text-sm bg-white/20 px-2 py-1 rounded">
                                {overallFailRate}%
                            </span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Fail Rate</h3>
                        <p className="text-2xl font-bold mt-1">{Math.round((overallFailRate / 100) * totalStudentsParticipated)} Students</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-8 h-8 opacity-80" />
                            <span className="text-sm bg-white/20 px-2 py-1 rounded">
                                Total
                            </span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Students Participated</h3>
                        <p className="text-2xl font-bold mt-1">{totalStudentsParticipated}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Exam Type Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-l-4 border-blue-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Online Exams</p>
                                <p className="text-2xl font-bold text-blue-600">{examTypeBreakdown?.ONLINE || 0}</p>
                            </div>
                            <BookOpen className="w-10 h-10 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-gray-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Offline Exams</p>
                                <p className="text-2xl font-bold text-gray-600">{examTypeBreakdown?.OFFLINE || 0}</p>
                            </div>
                            <Calendar className="w-10 h-10 text-gray-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-yellow-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Draft Exams</p>
                                <p className="text-2xl font-bold text-yellow-600">{examTypeBreakdown?.DRAFT || 0}</p>
                            </div>
                            <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="upcoming" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="upcoming">Upcoming Exams</TabsTrigger>
                    <TabsTrigger value="toppers">Top Performers</TabsTrigger>
                    <TabsTrigger value="classwise">Class-wise Performance</TabsTrigger>
                    <TabsTrigger value="recent">Recent Exams</TabsTrigger>
                </TabsList>

                <TabsContent value="upcoming">
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Exams</CardTitle>
                            <CardDescription>Scheduled exams for the coming days</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {upcomingExams.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No upcoming exams scheduled</p>
                                    </div>
                                ) : (
                                    upcomingExams.map((exam) => (
                                        <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{exam.title}</span>
                                                    <Badge variant="outline">{exam.type}</Badge>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {exam._count?.classes || 0} Classes
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-4 h-4" />
                                                        {formatDate(exam.startDate)}
                                                    </span>
                                                    {exam.startDate && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            {formatTime(exam.startDate)}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {exam.classes?.slice(0, 5).map((cls) => (
                                                        <Badge key={cls.id} variant="secondary" className="text-xs">
                                                            {cls.className}
                                                        </Badge>
                                                    ))}
                                                    {exam.classes?.length > 5 && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            +{exam.classes.length - 5} more
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {exam.type === 'ONLINE' ? (
                                                    <Link href={`/dashboard/examination/builder/${exam.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            Open Builder
                                                        </Button>
                                                    </Link>
                                                ) : (
                                                    <Link href={`/dashboard/examination/${exam.id}`}>
                                                        <Button variant="outline" size="sm">
                                                            View Details
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="toppers">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                Top Performers Across All Exams
                            </CardTitle>
                            <CardDescription>Best performing students overall</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {topPerformers.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No performance data available yet</p>
                                    </div>
                                ) : (
                                    topPerformers.map((student, index) => (
                                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center font-bold
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                                            'bg-orange-100 text-orange-700'}
                        `}>
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{student.studentName}</span>
                                                        <Badge variant="secondary" className="text-xs">{student.className}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {student.examTitle} • {formatDate(student.examDate)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-xl">{student.score}</p>
                                                <p className="text-xs text-muted-foreground">out of {student.maxScore}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="classwise">
                    <Card>
                        <CardHeader>
                            <CardTitle>Class-wise Performance</CardTitle>
                            <CardDescription>Performance breakdown by class</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {classWisePerformance.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No class-wise data available</p>
                                    </div>
                                ) : (
                                    classWisePerformance.map((classData) => (
                                        <div key={classData.classId} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-semibold">{classData.className}</h3>
                                                <Badge>{classData.totalStudents} Students</Badge>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Participated</p>
                                                    <p className="font-semibold">{classData.participated}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Passed</p>
                                                    <p className="font-semibold text-green-600">{classData.passed}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Failed</p>
                                                    <p className="font-semibold text-red-600">{classData.failed}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Avg Score</p>
                                                    <p className="font-semibold">{classData.avgScore?.toFixed(1) || "N/A"}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <div className="w-full bg-gray-200 rounded-full h-2 flex overflow-hidden">
                                                    <div
                                                        className="bg-green-600 h-2"
                                                        style={{ width: `${(classData.passed / classData.participated) * 100}%` }}
                                                    />
                                                    <div
                                                        className="bg-red-600 h-2"
                                                        style={{ width: `${(classData.failed / classData.participated) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="recent">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Exams</CardTitle>
                            <CardDescription>Recently conducted examinations</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {recentExams.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p>No recent exams found</p>
                                    </div>
                                ) : (
                                    recentExams.map((exam) => (
                                        <div key={exam.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{exam.title}</span>
                                                    <Badge
                                                        variant={exam.status === 'COMPLETED' ? 'secondary' : 'outline'}
                                                    >
                                                        {exam.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {formatDate(exam.endDate)} • {exam.type} • {exam._count?.participated || 0} Students
                                                </p>
                                            </div>
                                            <Link href={`/dashboard/examination/stats?examId=${exam.id}`}>
                                                <Button variant="ghost" size="sm">
                                                    View Stats
                                                </Button>
                                            </Link>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
