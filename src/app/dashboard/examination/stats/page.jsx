"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, CheckCircle, XCircle, Trophy, BarChart3 } from "lucide-react";
import axios from "axios";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

export default function ExamStatsPage() {
    const { fullUser } = useAuth();
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState("");
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchExams();
        }
    }, [fullUser?.schoolId]);

    useEffect(() => {
        if (selectedExamId) {
            fetchStats(selectedExamId);
        }
    }, [selectedExamId]);

    const fetchExams = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/exams`);
            setExams(res.data);
            if (res.data.length > 0) {
                setSelectedExamId(res.data[0].id.toString());
            }
        } catch (error) {
            console.error("Error fetching exams:", error);
        }
    };

    const fetchStats = async (examId) => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/exams/${examId}/stats`);
            setStats(res.data);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">Examination Statistics</h1>
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger className="w-[300px]">
                        <SelectValue placeholder="Select Exam" />
                    </SelectTrigger>
                    <SelectContent>
                        {exams.map((exam) => (
                            <SelectItem key={exam.id} value={exam.id.toString()}>
                                {exam.title}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {loading ? (
                <div className="flex justify-center h-64 items-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : stats ? (
                <div className="space-y-6">
                    {/* Overview Cards */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.totalEligible}</div>
                                <p className="text-xs text-muted-foreground">{stats.participated} Participated</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Passed</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.passed || "-"}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.participated ? Math.round((stats.passed / stats.participated) * 100) : 0}% Pass Rate
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                                <XCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.failed || "-"}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                                <BarChart3 className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{stats.averageScore ? stats.averageScore.toFixed(1) : "-"}</div>
                                <p className="text-xs text-muted-foreground">Highest: {stats.highestScore}</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Toppers */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Trophy className="h-5 w-5 text-yellow-500" />
                                    Top Performers
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {stats.toppers.map((student, index) => (
                                        <div key={index} className="flex items-center justify-between border-b pb-2 last:border-0">
                                            <div className="flex items-center gap-3">
                                                <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                          ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                                            'bg-orange-100 text-orange-700'}
                        `}>
                                                    {index + 1}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{student.studentName}</p>
                                                    <p className="text-xs text-muted-foreground">Class {student.className || "N/A"}</p>
                                                </div>
                                            </div>
                                            <div className="font-bold">{student.score}</div>
                                        </div>
                                    ))}
                                    {stats.toppers.length === 0 && <p className="text-muted-foreground text-center py-4">No data available</p>}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Attendance Stats */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Attendance Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span>Present</span>
                                        <span className="font-bold text-green-600">{stats.attendance?.present || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span>Absent</span>
                                        <span className="font-bold text-red-600">{stats.attendance?.absent || 0}</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-green-500 h-full"
                                            style={{ width: `${stats.attendance?.totalMarked ? (stats.attendance.present / stats.attendance.totalMarked) * 100 : 0}%` }}
                                        />
                                        <div
                                            className="bg-red-500 h-full"
                                            style={{ width: `${stats.attendance?.totalMarked ? (stats.attendance.absent / stats.attendance.totalMarked) * 100 : 0}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground">Select an exam to view statistics</div>
            )}
        </div>
    );
}
