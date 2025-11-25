"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

export default function OnlineExamResultsPage() {
    const { fullUser } = useAuth();
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [exams, setExams] = useState([]);
    const [selectedClass, setSelectedClass] = useState("all");
    const [selectedExam, setSelectedExam] = useState("all");
    const [results, setResults] = useState([]);
    const [selectedAttempt, setSelectedAttempt] = useState(null);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchInitialData();
        }
    }, [fullUser?.schoolId]);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchResults();
        }
    }, [selectedClass, selectedExam, fullUser?.schoolId]);

    const fetchInitialData = async () => {
        try {
            const [classesRes, examsRes] = await Promise.all([
                axios.get(`/api/schools/${fullUser.schoolId}/classes`),
                axios.get(`/api/schools/${fullUser.schoolId}/examination/exams?type=ONLINE`)
            ]);
            setClasses(classesRes.data || []);
            setExams(examsRes.data || []);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            toast.error("Failed to load filters");
        } finally {
            setLoading(false);
        }
    };

    const fetchResults = async () => {
        setLoading(true);
        try {
            let url = `/api/schools/${fullUser.schoolId}/examination/online-results?`;
            if (selectedClass && selectedClass !== "all") url += `classId=${selectedClass}&`;
            if (selectedExam && selectedExam !== "all") url += `examId=${selectedExam}`;

            const res = await axios.get(url);
            setResults(res.data || []);
        } catch (error) {
            console.error("Error fetching results:", error);
            toast.error("Failed to load results");
        } finally {
            setLoading(false);
        }
    };

    const getScoreColor = (percentage) => {
        if (percentage >= 75) return "text-green-600";
        if (percentage >= 60) return "text-blue-600";
        if (percentage >= 33) return "text-yellow-600";
        return "text-red-600";
    };

    return (
        <div className="p-6 space-y-6 bg-muted/40 min-h-screen">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Online Exam Results</h1>
                    <p className="text-muted-foreground">
                        View and analyze student performance in online examinations.
                    </p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Filter by Class</label>
                            <Select value={selectedClass} onValueChange={setSelectedClass}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Classes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Classes</SelectItem>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>
                                            {cls.className}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Filter by Exam</label>
                            <Select value={selectedExam} onValueChange={setSelectedExam}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Exams" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Exams</SelectItem>
                                    {exams.map((exam) => (
                                        <SelectItem key={exam.id} value={exam.id.toString()}>
                                            {exam.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <Button onClick={fetchResults} className="w-full">
                                <Search className="mr-2 h-4 w-4" /> Refresh Results
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Student Attempts</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            No results found matching your filters.
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Exam</TableHead>
                                        <TableHead>Submitted At</TableHead>
                                        <TableHead>Score</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {results.map((attempt) => {
                                        const maxScore = attempt.exam.questions.reduce((sum, q) => sum + q.marks, 0);
                                        const percentage = maxScore > 0 ? (attempt.score / maxScore) * 100 : 0;

                                        return (
                                            <TableRow key={attempt.id}>
                                                <TableCell className="font-medium">
                                                    <div className="flex flex-col">
                                                        <span>{attempt.student.name}</span>
                                                        <span className="text-xs text-muted-foreground">{attempt.student.rollNumber || "No Roll No"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{attempt.student.class?.className || "N/A"}</TableCell>
                                                <TableCell>{attempt.exam.title}</TableCell>
                                                <TableCell>
                                                    {attempt.endTime ? format(new Date(attempt.endTime), "MMM d, h:mm a") : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className={`font-bold ${getScoreColor(percentage)}`}>
                                                            {attempt.score} / {maxScore}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {percentage.toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={percentage >= 33 ? "default" : "destructive"}>
                                                        {percentage >= 33 ? "Pass" : "Fail"}
                                                    </Badge>
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
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
