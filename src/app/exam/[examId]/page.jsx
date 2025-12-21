"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Loader2, AlertTriangle, CheckCircle, Timer, Lock, School, User, MapPin } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

export default function PublicExamPage() {
    const params = useParams();
    const router = useRouter();

    // States: LOGIN, VERIFYING, HALL_INFO, INSTRUCTION, EXAM, SUBMITTED, TERMINATED, ERROR
    const [viewState, setViewState] = useState("LOGIN");
    const [loading, setLoading] = useState(false);

    // Auth Data
    const [credentials, setCredentials] = useState({ email: "", password: "" });
    const [student, setStudent] = useState(null);
    const [hallInfo, setHallInfo] = useState(null);
    const [examInfo, setExamInfo] = useState(null);
    const [errorMsg, setErrorMsg] = useState("");
    console.log(student);

    // Exam Data
    const [examData, setExamData] = useState(null);
    const [attemptId, setAttemptId] = useState(null);
    const [answers, setAnswers] = useState({});
    const [warnings, setWarnings] = useState(0);
    const [timeRemaining, setTimeRemaining] = useState(null); // in seconds

    const containerRef = useRef(null);

    // Check sessionStorage on mount
    useEffect(() => {
        const savedSession = sessionStorage.getItem('examSession');
        if (savedSession) {
            try {
                const session = JSON.parse(savedSession);
                if (session.examId === params.examId) {
                    setStudent(session.student);
                    setHallInfo(session.hall);
                    setExamInfo(session.exam);
                    // Skip hall info for online exams
                    if (session.hall) {
                        setViewState("HALL_INFO");
                    } else {
                        setViewState("INSTRUCTION");
                    }
                }
            } catch (error) {
                console.error("Failed to parse session:", error);
                sessionStorage.removeItem('examSession');
            }
        }
    }, [params.examId]);

    // Timer countdown
    useEffect(() => {
        if (viewState === "EXAM" && timeRemaining !== null && timeRemaining > 0) {
            const timer = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        submitExam(); // Auto-submit when time runs out
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [viewState, timeRemaining]);

    // --- AUTHENTICATION HANDLERS ---

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg("");

        try {
            const res = await axios.post("/api/exam/auth", {
                examId: params.examId,
                email: credentials.email,
                password: credentials.password
            });

            if (res.data.success) {
                setStudent(res.data.student);
                setHallInfo(res.data.hall);
                setExamInfo(res.data.exam);

                // Save to sessionStorage
                sessionStorage.setItem('examSession', JSON.stringify({
                    examId: params.examId,
                    student: res.data.student,
                    hall: res.data.hall,
                    exam: res.data.exam
                }));

                // Skip hall info for online exams (hall will be null)
                if (res.data.hall) {
                    setViewState("HALL_INFO");
                } else {
                    // Directly start exam for online exams
                    setViewState("INSTRUCTION");
                }
            } else if (res.data.status === 'NOT_ASSIGNED' || res.data.status === 'FEES_PENDING') {
                setStudent(res.data.student);
                setErrorMsg(res.data.message);
                setViewState("ERROR_NOT_ASSIGNED");
            }
        } catch (error) {
            console.error("Login error:", error);
            setErrorMsg(error.response?.data?.error || error.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    // --- EXAM LOGIC (Reused & Adapted) ---

    const fetchExamQuestions = async () => {
        try {
            // We need a way to fetch questions securely. 
            // Reusing the attempt start endpoint which returns questions.
            const res = await axios.post(`/api/schools/${'schoolId_placeholder'}/examination/exams/${params.examId}/attempt`, {
                studentId: student.id
            });

            // Note: The API path above needs the schoolId. 
            // Since this is a public route, we might not have schoolId in params.
            // We should update the Auth API to return schoolId or fetch it here.
            // For now, let's assume we can get schoolId from the exam info or a separate lookup.
            // To fix this properly, we should probably make the attempt route not depend on schoolId in URL 
            // OR get the schoolId from the auth response.

            // Let's assume we update the Auth API to return schoolId.
            // For this iteration, I'll fetch the exam details first to get schoolId if possible, 
            // BUT the public route shouldn't expose everything.

            // WORKAROUND: The previous attempt API required schoolId in URL.
            // I will use a new public endpoint or modify the auth response to include it.
            // Let's assume the auth response includes `exam.schoolId`.

            // Assuming we have schoolId now (I will update the Auth API in next step if needed, 
            // but for now let's try to fetch it or use a direct route if I created one.
            // Actually, I didn't create a public 'start attempt' route. 
            // I should probably use the authenticated session to start.

            // Let's use the existing route but we need the schoolId.
            // I'll update the Auth API to return schoolId.
        } catch (error) {
            toast.error("Failed to load exam questions");
        }
    };

    // REVISED START EXAM
    const startExam = async () => {
        setLoading(true);
        try {
            // Enter Full Screen
            if (containerRef.current && containerRef.current.requestFullscreen) {
                await containerRef.current.requestFullscreen().catch(err => console.error(err));
            }

            // We need schoolId. Let's assume we get it from a pre-fetch or auth.
            // For now, I'll fetch the exam public info to get schoolId.
            // Or better, I'll update the Auth API to return it.
            // Let's assume `examInfo.schoolId` is available.

            const res = await axios.post(`/api/schools/${examInfo.schoolId}/examination/exams/${params.examId}/attempt`, {
                studentId: student.id
            });

            setAttemptId(res.data.attemptId);
            setExamData({
                questions: res.data.questions,
                securitySettings: res.data.securitySettings,
                title: examInfo.title
            });

            // Initialize timer only if enabled in exam settings
            if (res.data.exam?.enableTimer && res.data.exam?.duration) {
                setTimeRemaining(res.data.exam.duration * 60); // Convert minutes to seconds
            } else {
                setTimeRemaining(null); // No timer
            }

            setViewState("EXAM");

            // Security Listeners
            if (res.data.securitySettings?.tabMonitoring) {
                document.addEventListener("visibilitychange", handleVisibilityChange);
                window.addEventListener("blur", handleBlur);
            }

        } catch (error) {
            console.error("Start error:", error);
            toast.error("Failed to start exam. " + (error.response?.data?.error || ""));
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
        handleViolation("Focus Lost (Window Blur)");
    };

    const handleViolation = (reason) => {
        setWarnings(prev => {
            const newCount = prev + 1;
            toast.error(`Warning ${newCount}: ${reason}`);

            if (attemptId && examInfo?.schoolId) {
                axios.put(`/api/schools/${examInfo.schoolId}/examination/exams/${params.examId}/attempt`, {
                    attemptId,
                    securityViolations: { reason, timestamp: new Date(), count: newCount }
                });
            }

            if (newCount >= 3) {
                terminateExam();
            }
            return newCount;
        });
    };

    const terminateExam = async () => {
        setViewState("TERMINATED");
        cleanupListeners();
        if (attemptId && examInfo?.schoolId) {
            await axios.put(`/api/schools/${examInfo.schoolId}/examination/exams/${params.examId}/attempt`, {
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
            document.exitFullscreen().catch(err => console.error(err));
        }
    };

    const formatAnswers = () => {
        return Object.entries(answers).map(([qId, ans]) => ({ questionId: qId, answer: ans }));
    };

    const submitExam = async () => {
        setLoading(true);
        try {
            await axios.put(`/api/schools/${examInfo.schoolId}/examination/exams/${params.examId}/attempt`, {
                attemptId,
                finish: true,
                answers: formatAnswers()
            });
            setViewState("SUBMITTED");
            cleanupListeners();
        } catch (error) {
            toast.error("Failed to submit exam");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERERS ---

    if (viewState === "LOGIN") {
        return (
            <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50 overflow-hidden flex items-center justify-center p-4">
                {/* Animated Background Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 rounded-full blur-3xl opacity-20 animate-pulse" style={{ backgroundColor: '#0c65f1' }} />
                    <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full blur-3xl opacity-15 animate-pulse" style={{ backgroundColor: '#0c65f1', animationDelay: '1s' }} />
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md relative z-10"
                >
                    <Card className="overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-md">
                        <CardContent className="p-8 sm:p-12">
                            {/* Logo Section */}
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-50 mb-6">
                                    <School className="h-8 w-8 text-[#0c65f1]" />
                                </div>
                                <h1 className="text-3xl font-bold mb-2" style={{ color: '#0c65f1' }}>
                                    Student Exam Portal
                                </h1>
                                <p className="text-gray-600">
                                    Sign in to access your examination
                                </p>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Email Address</Label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                        <Input
                                            type="email"
                                            placeholder="student@school.com"
                                            value={credentials.email}
                                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                            required
                                            className="pl-12 h-12 bg-gray-50 border-2 border-gray-200 focus:border-[#0c65f1] focus:bg-white transition-all rounded-xl font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-semibold text-gray-700">Password</Label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#0c65f1] transition-colors" />
                                        <Input
                                            type="password"
                                            placeholder="Enter your password"
                                            value={credentials.password}
                                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                            required
                                            className="pl-12 h-12 bg-gray-50 border-2 border-gray-200 focus:border-[#0c65f1] focus:bg-white transition-all rounded-xl font-medium"
                                        />
                                    </div>
                                </div>

                                {errorMsg && (
                                    <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 text-white font-bold text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                                    style={{
                                        background: 'linear-gradient(135deg, #0c65f1 0%, #0a52c6 100%)'
                                    }}
                                >
                                    {loading ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Verifying...</span>
                                        </div>
                                    ) : (
                                        "Start Exam Session"
                                    )}
                                </Button>
                            </form>

                            {/* Footer */}
                            <div className="mt-8 text-center">
                                <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                                    <Lock className="h-3 w-3" />
                                    Secure Examination Environment
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <p className="text-center text-gray-500 text-sm mt-8">
                        Powered by <span className="font-semibold text-[#0c65f1]">EduBreezy</span>
                    </p>
                </motion.div>
            </div>
        );
    }

    if (viewState === "ERROR_NOT_ASSIGNED") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Card className="w-full max-w-md border-red-200 shadow-xl">
                        <CardHeader className="text-center">
                            <div className="mx-auto bg-red-100 p-4 rounded-full mb-4 w-fit">
                                <AlertTriangle className="h-8 w-8 text-red-600" />
                            </div>
                            <CardTitle className="text-xl text-red-700">Access Denied</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center space-y-4">
                            <p className="text-gray-600">
                                Hello <strong>{student?.name}</strong>,
                            </p>
                            <div className="bg-white p-4 rounded-md border border-red-100 text-sm text-left">
                                <p className="font-semibold text-red-800 mb-2">You cannot take this exam:</p>
                                <p className="text-red-700">{errorMsg || 'You have not been assigned to any exam hall. Please contact your teacher or admin.'}</p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => setViewState("LOGIN")}>
                                Back to Login
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (viewState === "INSTRUCTION") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-primary">
                        <CardHeader>
                            <CardTitle className="text-2xl">Ready to Start?</CardTitle>
                            <CardDescription>Please review the instructions carefully</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Student Name</Label>
                                    <div className="flex items-center gap-2 font-medium">
                                        <User className="h-4 w-4 text-primary" />
                                        {student?.name}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Exam</Label>
                                    <div className="font-medium">{examInfo?.title}</div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5" />
                                    Important Instructions
                                </h3>
                                <ul className="space-y-2 text-sm text-yellow-800">
                                    <li className="flex gap-2">
                                        <span>•</span>
                                        <span>The exam will open in full-screen mode</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>•</span>
                                        <span>Do NOT switch tabs or minimize the window</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>•</span>
                                        <span>Security violations will be tracked and may result in exam termination</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>•</span>
                                        <span>Make sure you have a stable internet connection</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span>•</span>
                                        <span>Click "Submit" when you complete the exam</span>
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button className="w-full h-12 text-lg" onClick={startExam} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                I Understand - Start Exam
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (viewState === "HALL_INFO") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-blue-50 p-4">
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                    <Card className="w-full max-w-lg shadow-xl border-t-4 border-t-primary">
                        <CardHeader>
                            <CardTitle className="text-2xl">Exam Hall Ticket</CardTitle>
                            <CardDescription>Please verify your details before proceeding</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Student Name</Label>
                                    <div className="flex items-center gap-2 font-medium">
                                        <User className="h-4 w-4 text-primary" />
                                        {student?.name}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs">Exam</Label>
                                    <div className="font-medium">{examInfo?.title}</div>
                                </div>
                            </div>

                            <div className="bg-slate-100 p-4 rounded-lg space-y-3">
                                <div className="flex items-center gap-2 text-primary font-semibold border-b border-slate-200 pb-2">
                                    <School className="h-5 w-5" />
                                    Hall Allocation
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Hall Name:</span>
                                        <p className="font-medium">{hallInfo?.name}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Room No:</span>
                                        <p className="font-medium">{hallInfo?.roomNumber || "N/A"}</p>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-muted-foreground">Seat Number:</span>
                                        <p className="text-xl font-bold text-primary">{hallInfo?.seatNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-xs text-yellow-800 flex gap-2">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                <p>Once you start, do not switch tabs or exit full screen. Doing so will result in warnings and potential termination.</p>
                            </div>

                        </CardContent>
                        <CardFooter>
                            <Button className="w-full size-lg text-lg" onClick={startExam} disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Start Exam Now
                            </Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        );
    }

    if (viewState === "EXAM") {
        const formatTime = (seconds) => {
            if (seconds === null) return "--:--";
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };

        const getTimeColor = () => {
            if (timeRemaining === null) return "text-gray-600";
            if (timeRemaining < 300) return "text-red-600"; // Less than 5 mins
            if (timeRemaining < 600) return "text-orange-600"; // Less than 10 mins
            return "text-green-600";
        };

        return (
            <div ref={containerRef} className="min-h-screen bg-gray-50 flex flex-col">
                {/* Google Forms Style Header */}
                <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
                    <div className="max-w-4xl mx-auto px-6 py-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-normal text-gray-800">{examData?.title}</h1>
                                <p className="text-sm text-gray-500 mt-1">{student?.name}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={`flex items-center gap-2 font-mono text-lg font-semibold px-4 py-2 rounded-lg bg-gray-100 ${getTimeColor()}`}>
                                    <Timer className="h-5 w-5" />
                                    <span>{formatTime(timeRemaining)}</span>
                                </div>
                                <Button onClick={submitExam} disabled={loading} size="lg" className="bg-primary hover:bg-primary/90">
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Submit
                                </Button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content matching builder style */}
                <main className="flex-1 py-8 overflow-y-auto bg-gray-50">
                    <div className="max-w-4xl mx-auto px-6 space-y-6">
                        {examData?.questions?.map((q, index) => (
                            <Card key={q.id} className="border-l-4 border-l-primary bg-white">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="font-bold text-lg text-muted-foreground">{index + 1}.</div>
                                        <div className="flex-1 space-y-4">
                                            <div className="flex items-start justify-between gap-4">
                                                <p className="text-lg font-medium text-gray-800">{q.question}</p>
                                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                                                    {q.marks} {q.marks === 1 ? 'mark' : 'marks'}
                                                </span>
                                            </div>

                                            {/* MCQ Options */}
                                            {q.type === 'MCQ' && (
                                                <RadioGroup
                                                    value={answers[q.id]}
                                                    onValueChange={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))}
                                                    className="space-y-2 pl-2"
                                                >
                                                    {q.options?.map((opt, i) => (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt} id={`${q.id}-${i}`} />
                                                            <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            )}

                                            {/* Checkbox Options */}
                                            {q.type === 'CHECKBOX' && (
                                                <div className="space-y-2 pl-2">
                                                    {q.options?.map((opt, i) => (
                                                        <div key={i} className="flex items-center space-x-2">
                                                            <Checkbox
                                                                id={`${q.id}-${i}`}
                                                                checked={answers[q.id]?.includes(opt)}
                                                                onCheckedChange={(checked) => {
                                                                    const current = answers[q.id] || [];
                                                                    if (checked) {
                                                                        setAnswers(prev => ({ ...prev, [q.id]: [...current, opt] }));
                                                                    } else {
                                                                        setAnswers(prev => ({ ...prev, [q.id]: current.filter(v => v !== opt) }));
                                                                    }
                                                                }}
                                                            />
                                                            <Label htmlFor={`${q.id}-${i}`} className="font-normal cursor-pointer">{opt}</Label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Subjective Answer */}
                                            {q.type === 'SUBJECTIVE' && (
                                                <textarea
                                                    className="w-full min-h-[100px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                                    placeholder="Type your answer here..."
                                                    value={answers[q.id] || ''}
                                                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Submit Button at Bottom */}
                        <div className="flex justify-center pt-4 pb-8">
                            <Button onClick={submitExam} disabled={loading} size="lg" className="px-12">
                                {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Submit Exam
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (viewState === "SUBMITTED") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-green-50 p-4">
                <Card className="max-w-md w-full border-green-200 shadow-lg">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <CheckCircle className="h-16 w-16 text-green-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-700">Exam Submitted!</h2>
                        <p className="text-gray-600">Your responses have been recorded successfully. You may now close this window.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (viewState === "TERMINATED") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
                <Card className="max-w-md w-full border-red-200 shadow-lg">
                    <CardContent className="pt-6 text-center space-y-4">
                        <div className="flex justify-center">
                            <AlertTriangle className="h-16 w-16 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-red-700">Exam Terminated</h2>
                        <p className="text-gray-600">Multiple security violations were detected. Your exam has been automatically submitted.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return null;
}
