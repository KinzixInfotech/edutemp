"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle, Timer } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function OnlineExamPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [examState, setExamState] = useState("START"); // START, IN_PROGRESS, SUBMITTED, TERMINATED
    const [examData, setExamData] = useState(null);
    const [attemptId, setAttemptId] = useState(null);
    const [answers, setAnswers] = useState({}); // { questionId: answer }
    const [warnings, setWarnings] = useState(0);

    const containerRef = useRef(null);

    useEffect(() => {
        if (fullUser?.schoolId && params.examId) {
            fetchExamDetails();
        }

        return () => {
            // Cleanup listeners on unmount
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
        };
    }, [fullUser?.schoolId, params.examId]);

    const fetchExamDetails = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}`);
            setExamData(res.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching exam:", error);
            toast.error("Failed to load exam");
            setLoading(false);
        }
    };

    const startExam = async () => {
        try {
            setLoading(true);

            // Enter Full Screen
            if (containerRef.current && containerRef.current.requestFullscreen) {
                await containerRef.current.requestFullscreen().catch(err => {
                    console.error("Error attempting to enable full-screen mode:", err);
                    // Continue anyway if fullscreen fails (optional: block if strict)
                });
            }

            const res = await axios.post(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}/attempt`, {
                studentId: fullUser.id // Assuming fullUser.id is studentId or userId
            });

            setAttemptId(res.data.attemptId);
            setExamData(prev => ({
                ...prev,
                questions: res.data.questions,
                securitySettings: res.data.securitySettings
            }));
            setExamState("IN_PROGRESS");

            // Initialize listeners
            if (res.data.securitySettings?.tabMonitoring) {
                document.addEventListener("visibilitychange", handleVisibilityChange);
                window.addEventListener("blur", handleBlur);
            }

        } catch (error) {
            console.error("Start error:", error);
            toast.error(error.response?.data?.error || "Failed to start exam");
        } finally {
            setLoading(false);
        }
    };

    const handleVisibilityChange = () => {
        if (document.hidden) {
            handleViolation("Tab Switch Detected");
        }
    };

    const handleBlur = () => {
        // Optional: Blur might be too sensitive (e.g. system notification). 
        // But user requested "cant switch the tab".
        handleViolation("Focus Lost (Window Blur)");
    };

    const handleViolation = (reason) => {
        setWarnings(prev => {
            const newCount = prev + 1;
            toast.error(`Warning ${newCount}: ${reason}. Exam will be terminated if this continues.`);

            // Log violation (fire and forget)
            if (attemptId) {
                axios.put(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}/attempt`, {
                    attemptId,
                    securityViolations: { reason, timestamp: new Date(), count: newCount }
                });
            }

            if (newCount >= 3) { // Terminate after 3 warnings
                terminateExam();
            }
            return newCount;
        });
    };

    const terminateExam = async () => {
        setExamState("TERMINATED");
        cleanupListeners();

        if (attemptId) {
            await axios.put(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}/attempt`, {
                attemptId,
                finish: true,
                answers: formatAnswers()
            });
        }
    };

    const cleanupListeners = () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleBlur);
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(err => console.error("Exit fullscreen error:", err));
        }
    };

    const formatAnswers = () => {
        return Object.entries(answers).map(([qId, ans]) => ({ questionId: qId, answer: ans }));
    };

    const submitExam = async () => {
        try {
            setLoading(true);
            await axios.put(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}/attempt`, {
                attemptId,
                finish: true,
                answers: formatAnswers()
            });
            setExamState("SUBMITTED");
            cleanupListeners();
        } catch (error) {
            console.error("Submit error:", error);
            toast.error("Failed to submit exam");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    if (examState === "START") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <CardTitle className="text-center">{examData?.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md text-sm text-yellow-800">
                            <div className="flex items-center gap-2 font-semibold mb-2">
                                <AlertTriangle className="h-4 w-4" />
                                Exam Instructions
                            </div>
                            <ul className="list-disc pl-4 space-y-1">
                                <li>This is a timed exam.</li>
                                <li>Do not switch tabs or minimize the window.</li>
                                <li>Full-screen mode is required.</li>
                                <li>Violations will be recorded and may lead to termination.</li>
                            </ul>
                        </div>
                        <Button className="w-full" onClick={startExam}>Start Exam</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (examState === "SUBMITTED") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
                <Card className="max-w-md w-full border-green-200">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle className="h-12 w-12 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-700">Exam Submitted!</h2>
                        <p className="text-gray-600">Your responses have been recorded successfully.</p>
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (examState === "TERMINATED") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <Card className="max-w-md w-full border-red-200">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <AlertTriangle className="h-12 w-12 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-700">Exam Terminated</h2>
                        <p className="text-gray-600">Multiple security violations were detected. Your exam has been automatically submitted.</p>
                        <Button variant="outline" onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="min-h-screen bg-white flex flex-col">
            {/* Exam Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    {examData?.school?.profilePicture && (
                        <img src={examData.school.profilePicture} alt="School Logo" className="h-10 w-10 rounded-full object-cover" />
                    )}
                    <div>
                        <h1 className="text-lg font-semibold">{examData?.title}</h1>
                        <p className="text-xs text-muted-foreground">{examData?.school?.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-orange-600 font-mono bg-orange-50 px-3 py-1 rounded-md">
                        <Timer className="h-4 w-4" />
                        <span>--:--</span>
                    </div>
                    <Button onClick={submitExam}>Submit Exam</Button>
                </div>
            </header>

            {/* EduBreezy Branding */}
            <div className="fixed bottom-4 right-4 text-xs text-gray-400 font-medium pointer-events-none z-50">
                Powered by <span className="text-primary font-bold">EduBreezy</span>
            </div>

            {/* Questions */}
            <main className="flex-1 p-8 max-w-3xl mx-auto w-full space-y-8 overflow-y-auto">
                {examData?.questions?.map((q, index) => (
                    <Card key={q.id} className="border-none shadow-none">
                        <CardContent className="p-0 space-y-4">
                            <div className="flex gap-4">
                                <div className="font-bold text-lg text-gray-500">{index + 1}.</div>
                                <div className="flex-1 space-y-4">
                                    <p className="text-lg font-medium">{q.question}</p>

                                    {q.type === 'MCQ' && (
                                        <RadioGroup
                                            value={answers[q.id]}
                                            onValueChange={(val) => handleAnswerChange(q.id, val)}
                                            className="space-y-2"
                                        >
                                            {q.options?.map((opt, i) => (
                                                <div key={i} className="flex items-center space-x-2">
                                                    <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                                                    <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    )}

                                    {q.type === 'CHECKBOX' && (
                                        <div className="space-y-2">
                                            {q.options?.map((opt, i) => (
                                                <div key={i} className="flex items-center space-x-2">
                                                    <Checkbox
                                                        id={`${q.id}-${i}`}
                                                        checked={answers[q.id]?.includes(opt)}
                                                        onCheckedChange={(checked) => {
                                                            const current = answers[q.id] || [];
                                                            if (checked) {
                                                                handleAnswerChange(q.id, [...current, opt]);
                                                            } else {
                                                                handleAnswerChange(q.id, current.filter(v => v !== opt));
                                                            }
                                                        }}
                                                    />
                                                    <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {q.type === 'SUBJECTIVE' && (
                                        <textarea
                                            className="w-full min-h-[100px] p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            placeholder="Type your answer here..."
                                            value={answers[q.id] || ''}
                                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                                        />
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </main>
        </div>
    );
}
