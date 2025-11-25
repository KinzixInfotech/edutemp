"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, AlertTriangle, Trophy, Target, X } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function ExamResultDetailPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState(null);

    useEffect(() => {
        if (fullUser?.schoolId && params.attemptId) {
            fetchAttemptDetails();
        }
    }, [fullUser?.schoolId, params.attemptId]);

    const fetchAttemptDetails = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/online-results?attemptId=${params.attemptId}`);
            if (res.data && res.data.length > 0) {
                setAttempt(res.data[0]);
            } else {
                toast.error("Result not found");
                router.back();
            }
        } catch (error) {
            console.error("Error fetching details:", error);
            toast.error("Failed to load result details");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!attempt) return null;

    const maxScore = attempt.exam.questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = maxScore > 0 ? (attempt.score / maxScore) * 100 : 0;

    // Calculate stats
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;

    attempt.exam.questions.forEach(q => {
        const studentAnswer = attempt.answers.find(a => a.questionId === q.id);
        if (!studentAnswer || !studentAnswer.answer) {
            unattemptedCount++;
        } else if (studentAnswer.isCorrect) {
            correctCount++;
        } else {
            wrongCount++;
        }
    });

    const totalQuestions = attempt.exam.questions.length;
    const attemptedCount = totalQuestions - unattemptedCount;

    return (
        <div className="min-h-screen bg-muted/40 p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{attempt.student.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <span>{attempt.exam.title}</span>
                            <span>•</span>
                            <span>{attempt.student.class?.className}</span>
                            <span>•</span>
                            <span>Roll No: {attempt.student.rollNumber || "N/A"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={percentage >= 33 ? "success" : "destructive"} className="text-base px-4 py-1">
                        {percentage >= 33 ? "PASSED" : "FAILED"}
                    </Badge>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <Trophy className="h-8 w-8 text-yellow-500 mb-2" />
                        <div className="text-3xl font-bold">{attempt.score} <span className="text-lg text-muted-foreground">/ {maxScore}</span></div>
                        <p className="text-sm text-muted-foreground font-medium">Total Score</p>
                        <Badge variant="outline" className="mt-2">{percentage.toFixed(1)}%</Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <Target className="h-8 w-8 text-blue-500 mb-2" />
                        <div className="text-3xl font-bold">{attemptedCount} <span className="text-lg text-muted-foreground">/ {totalQuestions}</span></div>
                        <p className="text-sm text-muted-foreground font-medium">Questions Attempted</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        <div className="text-3xl font-bold text-green-600">{correctCount}</div>
                        <p className="text-sm text-muted-foreground font-medium">Correct Answers</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <XCircle className="h-8 w-8 text-red-500 mb-2" />
                        <div className="text-3xl font-bold text-red-600">{wrongCount}</div>
                        <p className="text-sm text-muted-foreground font-medium">Wrong Answers</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Breakdown */}
            <Card className="col-span-full">
                <CardHeader>
                    <CardTitle>Question Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {attempt.exam.questions.map((q, idx) => {
                            const studentAnswer = attempt.answers.find(a => a.questionId === q.id);
                            const isCorrect = studentAnswer?.isCorrect;
                            const isSkipped = !studentAnswer || !studentAnswer.answer;

                            let statusColor = "bg-muted";
                            let borderColor = "border-muted";
                            if (!isSkipped) {
                                statusColor = isCorrect ? "bg-green-500/10 dark:bg-green-500/20" : "bg-destructive/10 dark:bg-destructive/20";
                                borderColor = isCorrect ? "border-green-500/20 dark:border-green-500/30" : "border-destructive/20 dark:border-destructive/30";
                            }

                            return (
                                <div key={q.id} className={`p-6 rounded-lg border ${borderColor} ${statusColor} transition-all`}>
                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
                                        <div className="flex items-start gap-3">
                                            <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-background border text-sm font-bold">
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <h4 className="font-semibold text-lg">{q.question}</h4>
                                                <div className="flex gap-2 mt-2">
                                                    <Badge variant="outline">{q.type}</Badge>
                                                    <Badge variant="secondary">{q.marks} Marks</Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {isSkipped ? (
                                                <Badge variant="outline" className="bg-muted text-muted-foreground">Skipped</Badge>
                                            ) : isCorrect ? (
                                                <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 border-green-500/20">Correct</Badge>
                                            ) : (
                                                <Badge variant="destructive" className="bg-destructive/15 text-destructive dark:text-red-400 hover:bg-destructive/25 border-destructive/20">Incorrect</Badge>
                                            )}
                                            <span className="font-bold ml-2">
                                                {studentAnswer?.marksObtained || 0} / {q.marks}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 pl-11">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-muted-foreground">Student's Answer</p>
                                            <div className={`p-3 rounded-md border bg-background ${isCorrect ? 'text-green-600 dark:text-green-400 border-green-500/30' : isSkipped ? 'text-muted-foreground border-dashed' : 'text-destructive dark:text-red-400 border-destructive/30'}`}>
                                                {Array.isArray(studentAnswer?.answer)
                                                    ? studentAnswer.answer.join(", ")
                                                    : studentAnswer?.answer || "Not Answered"}
                                            </div>
                                        </div>

                                        {!isCorrect && (
                                            <div className="space-y-1">
                                                <p className="text-sm font-medium text-muted-foreground">Correct Answer</p>
                                                <div className="p-3 rounded-md border bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
                                                    {Array.isArray(q.correctAnswer)
                                                        ? q.correctAnswer.join(", ")
                                                        : q.correctAnswer}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
