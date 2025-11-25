"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, Users, TrendingUp, CheckCircle, XCircle, Clock, AlertTriangle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import Link from "next/link";

export default function OnlineExamResultsPage() {
    const { fullUser } = useAuth();
    const [selectedExam, setSelectedExam] = useState("all");
    const [selectedClass, setSelectedClass] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Fetch all exams
    const { data: exams = [] } = useQuery({
        queryKey: ['online-exams', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/exams?type=ONLINE`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId
    });

    // Fetch all classes with attempt stats
    const { data: classes = [], isLoading: classesLoading } = useQuery({
        queryKey: ['classes', fullUser?.schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/classes`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId
    });

    // Fetch ALL attempts for the selected exam (to calculate class stats)
    const { data: allAttempts = [], isLoading: allAttemptsLoading } = useQuery({
        queryKey: ['all-exam-results', fullUser?.schoolId, selectedExam],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedExam && selectedExam !== 'all') params.append('examId', selectedExam);
            
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/online-results?${params}`);
            return res.data;
        },
        enabled: !!fullUser?.schoolId && selectedExam !== 'all'
    });

    // Fetch student attempts for selected class (only when class is selected)
    const { data: attempts = [], isLoading: attemptsLoading } = useQuery({
        queryKey: ['exam-results', fullUser?.schoolId, selectedExam, selectedClass],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedExam && selectedExam !== 'all') params.append('examId', selectedExam);
            if (selectedClass) params.append('classId', selectedClass);
            
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/online-results?${params}`);
            return res.data;
        },
        enabled: !!selectedClass && !!fullUser?.schoolId
    });

    // Filter attempts by search query
    const filteredAttempts = React.useMemo(() => {
        if (!searchQuery || !attempts) return attempts;

        const query = searchQuery.toLowerCase();
        return attempts.filter(attempt =>
            attempt.student.name.toLowerCase().includes(query) ||
            attempt.student.email?.toLowerCase().includes(query) ||
            attempt.student.admissionNo?.toLowerCase().includes(query) ||
            attempt.student.rollNumber?.toLowerCase().includes(query)
        );
    }, [attempts, searchQuery]);

    // Calculate class statistics - ONLY show classes with attempts
    const classStats = React.useMemo(() => {
        if (!classes.length || !selectedExam || selectedExam === 'all' || !allAttempts.length) return [];
        
        // Group attempts by class
        const classesWithAttempts = classes.map(cls => {
            const classAttempts = allAttempts.filter(a => a.student.classId === cls.id);
            
            // Skip classes with no attempts
            if (classAttempts.length === 0) return null;
            
            const totalStudents = cls._count?.students || 0;
            const attemptedCount = classAttempts.length;
            const completedCount = classAttempts.filter(a => a.status === 'COMPLETED').length;
            const terminatedCount = classAttempts.filter(a => a.status === 'TERMINATED').length;
            
            // Calculate average score as percentage
            let avgScore = 0;
            if (attemptedCount > 0) {
                const totalScore = classAttempts.reduce((sum, attempt) => {
                    const maxScore = attempt.exam.questions.reduce((qSum, q) => qSum + q.marks, 0);
                    const percentage = maxScore > 0 ? (attempt.score / maxScore) * 100 : 0;
                    return sum + percentage;
                }, 0);
                avgScore = totalScore / attemptedCount;
            }

            return {
                ...cls,
                totalStudents,
                attemptedCount,
                completedCount,
                terminatedCount,
                avgScore
            };
        }).filter(cls => cls !== null); // Remove classes with no attempts
        
        return classesWithAttempts;
    }, [classes, allAttempts, selectedExam]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-600';
            case 'IN_PROGRESS': return 'text-orange-600';
            case 'TERMINATED': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const getScoreColor = (percentage) => {
        if (percentage >= 75) return 'text-green-600';
        if (percentage >= 50) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className="p-6 space-y-6 bg-muted/40 min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Online Exam Results</h1>
                <p className="text-muted-foreground">View and analyze student performance in online exams</p>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="text-sm font-medium mb-2 block">Filter by Exam</label>
                            <Select value={selectedExam} onValueChange={setSelectedExam}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Exam" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Exams</SelectItem>
                                    {exams.map((exam) => (
                                        <SelectItem key={exam.id} value={exam.id}>
                                            {exam.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedClass && (
                            <div className="flex-1">
                                <label className="text-sm font-medium mb-2 block">Search Students</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, email, admission no..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Class View or Student View */}
            {!selectedClass ? (
                /* Class Cards View */
                <div>
                    <h2 className="text-xl font-semibold mb-4">Select a Class to View Results</h2>
                    {(classesLoading || allAttemptsLoading) ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : classStats.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center text-muted-foreground">
                                {selectedExam === 'all'
                                    ? 'Please select a specific exam to view class statistics'
                                    : 'No classes found or no results available for this exam'}
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {classStats.map((cls) => (
                                <Card
                                    key={cls.id}
                                    className="hover:shadow-lg transition-shadow cursor-pointer"
                                    onClick={() => setSelectedClass(cls.id)}
                                >
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Users className="h-5 w-5 text-primary" />
                                                Class {cls.className}
                                            </span>
                                            <Badge variant="outline">{cls.totalStudents} students</Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Attempted</span>
                                                <span className="font-semibold">{cls.attemptedCount} / {cls.totalStudents}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                                    Completed
                                                </span>
                                                <span className="font-semibold text-green-600">{cls.completedCount}</span>
                                            </div>
                                            {cls.terminatedCount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                        <AlertTriangle className="h-3 w-3 text-red-600" />
                                                        Terminated
                                                    </span>
                                                    <span className="font-semibold text-red-600">{cls.terminatedCount}</span>
                                                </div>
                                            )}
                                            <div className="pt-2 border-t">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm font-medium flex items-center gap-1">
                                                        <TrendingUp className="h-4 w-4" />
                                                        Average Score
                                                    </span>
                                                    <span className="text-xl font-bold">{cls.avgScore.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Student List View */
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => {
                                setSelectedClass(null);
                                setSearchQuery("");
                            }}>
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h2 className="text-xl font-semibold">
                                Students - Class {classes.find(c => c.id === selectedClass)?.className}
                            </h2>
                        </div>
                        <Badge variant="outline">{filteredAttempts.length} results</Badge>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            {attemptsLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : filteredAttempts.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    {searchQuery ? 'No students found matching your search' : 'No exam attempts found for this class'}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Roll No</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Score</TableHead>
                                            <TableHead>Submitted At</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredAttempts.map((attempt) => {
                                            const maxScore = attempt.exam.questions.reduce((sum, q) => sum + q.marks, 0);
                                            const percentage = maxScore > 0 ? (attempt.score / maxScore) * 100 : 0;

                                            return (
                                                <TableRow key={attempt.id}>
                                                    <TableCell>
                                                        <div>
                                                            <div className="font-medium">{attempt.student.name}</div>
                                                            <div className="text-sm text-muted-foreground">{attempt.student.email}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{attempt.student.rollNumber || "-"}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={attempt.status === 'COMPLETED' ? 'default' : attempt.status === 'TERMINATED' ? 'destructive' : 'secondary'}
                                                            className={getStatusColor(attempt.status)}
                                                        >
                                                            {attempt.status === 'TERMINATED' && (
                                                                <AlertTriangle className="h-3 w-3 mr-1" />
                                                            )}
                                                            {attempt.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className={`font-semibold ${getScoreColor(percentage)}`}>
                                                                {attempt.score} / {maxScore}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {percentage.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {attempt.endTime
                                                            ? format(new Date(attempt.endTime), "PPp")
                                                            : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link href={`/dashboard/examination/online-results/${attempt.id}`}>
                                                            <Button variant="ghost" size="sm">
                                                                <Eye className="h-4 w-4 mr-2" /> View Details
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
                </div>
            )}
        </div>
    );
}
