"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, Save, ArrowLeft, Settings } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function ExamBuilderPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [exam, setExam] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [securitySettings, setSecuritySettings] = useState({
        lockScreen: true,
        tabMonitoring: true,
        fullScreen: true,
        blockUnpaidFees: false
    });
    const [enableTimer, setEnableTimer] = useState(false);
    const [duration, setDuration] = useState(60);

    useEffect(() => {
        if (fullUser?.schoolId && params.examId) {
            fetchExamData();
        }
    }, [fullUser?.schoolId, params.examId]);

    const fetchExamData = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}`);
            setExam(res.data);
            if (res.data.securitySettings) {
                setSecuritySettings(res.data.securitySettings);
            }
            setEnableTimer(res.data.enableTimer || false);
            setDuration(res.data.duration || 60);

            // Fetch questions
            const qRes = await axios.get(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}/questions`);
            setQuestions(qRes.data || []);

            setLoading(false);
        } catch (error) {
            console.error("Error fetching exam:", error);
            toast.error("Failed to load exam data");
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setQuestions([
            ...questions,
            {
                id: `temp-${Date.now()}`,
                question: "",
                type: "MCQ",
                options: ["Option 1", "Option 2", "Option 3", "Option 4"],
                correctAnswer: ["Option 1"],
                marks: 1
            }
        ]);
    };

    const updateQuestion = (index, field, value) => {
        const newQuestions = [...questions];
        newQuestions[index][field] = value;
        setQuestions(newQuestions);
    };

    const updateOption = (qIndex, oIndex, value) => {
        const newQuestions = [...questions];
        newQuestions[qIndex].options[oIndex] = value;
        setQuestions(newQuestions);
    };

    const removeQuestion = (index) => {
        const newQuestions = [...questions];
        newQuestions.splice(index, 1);
        setQuestions(newQuestions);
    };

    const handleSave = async () => {
        // Validate questions before saving
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];

            // Check question text is not empty
            if (!q.question || q.question.trim() === '') {
                toast.error(`Question ${i + 1} cannot be empty`);
                return;
            }

            // For MCQ/CHECKBOX, require at least one correct answer
            if (q.type === 'MCQ' || q.type === 'CHECKBOX') {
                if (!q.correctAnswer || q.correctAnswer.length === 0) {
                    toast.error(`Question ${i + 1}: Please select a correct answer by clicking the circle next to an option`);
                    return;
                }

                // Verify correct answer exists in options
                const validAnswer = q.correctAnswer.every(ans => q.options.includes(ans));
                if (!validAnswer) {
                    toast.error(`Question ${i + 1}: Correct answer must match one of the options`);
                    return;
                }

                // Check at least 2 options exist
                if (q.options.length < 2) {
                    toast.error(`Question ${i + 1}: Please add at least 2 options`);
                    return;
                }
            }
        }

        setSaving(true);
        try {
            // Save Security Settings and Timer
            await axios.put(`/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}`, {
                securitySettings,
                enableTimer,
                duration: enableTimer ? parseInt(duration) : null
            });

            // Save Questions
            await axios.put(
                `/api/schools/${fullUser.schoolId}/examination/exams/${params.examId}/questions`,
                { questions }
            );

            toast.success("Exam saved successfully!");
        } catch (error) {
            console.error("Save error:", error);

            // Check for specific error about exam attempts
            if (error.response?.data?.error && error.response.data.error.includes('Cannot modify questions')) {
                toast.error("Cannot modify questions - students have already attempted this exam!", {
                    duration: 5000,
                    description: "Questions are locked once students start taking the exam."
                });
            } else {
                toast.error(error.response?.data?.error || "Failed to save exam");
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-semibold">{exam?.title || "Untitled Exam"}</h1>
                        <p className="text-xs text-muted-foreground">Online Exam Builder</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-4 bg-muted p-2 rounded-md">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <Label className="text-sm cursor-pointer flex items-center gap-2">
                            Lock Screen
                            <Switch
                                checked={securitySettings.lockScreen}
                                onCheckedChange={(c) => setSecuritySettings(prev => ({ ...prev, lockScreen: c }))}
                            />
                        </Label>
                        <Label className="text-sm cursor-pointer flex items-center gap-2 ml-4">
                            Tab Monitoring
                            <Switch
                                checked={securitySettings.tabMonitoring}
                                onCheckedChange={(c) => setSecuritySettings(prev => ({ ...prev, tabMonitoring: c }))}
                            />
                        </Label>
                        <Label className="text-sm cursor-pointer flex items-center gap-2 ml-4">
                            Block Unpaid Fees
                            <Switch
                                checked={securitySettings.blockUnpaidFees}
                                onCheckedChange={(c) => setSecuritySettings(prev => ({ ...prev, blockUnpaidFees: c }))}
                            />
                        </Label>
                        <Label className="text-sm cursor-pointer flex items-center gap-2 ml-4 border-l pl-4">
                            Enable Timer
                            <Switch
                                checked={enableTimer}
                                onCheckedChange={setEnableTimer}
                            />
                        </Label>
                        {enableTimer && (
                            <Input
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                className="w-20 h-8"
                                placeholder="Mins"
                                min="1"
                            />
                        )}
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-6">
                {questions.map((q, index) => (
                    <Card key={q.id || index} className="border-l-4 border-l-primary">
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="font-bold text-lg text-muted-foreground">{index + 1}.</div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-4">
                                        <Input
                                            value={q.question}
                                            onChange={(e) => updateQuestion(index, 'question', e.target.value)}
                                            placeholder="Question Text"
                                            className="font-medium pl-2! text-lg border-none shadow-none focus-visible:ring-0 px-0"
                                        />
                                        <Select value={q.type} onValueChange={(val) => updateQuestion(index, 'type', val)}>
                                            <SelectTrigger className="w-[150px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MCQ">Multiple Choice</SelectItem>
                                                <SelectItem value="CHECKBOX">Checkbox</SelectItem>
                                                <SelectItem value="SUBJECTIVE">Subjective</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number"
                                            value={q.marks}
                                            onChange={(e) => updateQuestion(index, 'marks', e.target.value)}
                                            className="w-[80px]"
                                            placeholder="Marks"
                                        />
                                    </div>

                                    {/* Options for MCQ/Checkbox */}
                                    {(q.type === 'MCQ' || q.type === 'CHECKBOX') && (
                                        <div className="space-y-2 pl-2">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center gap-2">
                                                    <div className={`h-4 w-4 rounded-full border ${q.correctAnswer.includes(opt) ? 'bg-green-500 border-green-500' : 'border-muted-foreground'} cursor-pointer`}
                                                        onClick={() => {
                                                            const newCorrect = [opt]; // For MCQ
                                                            updateQuestion(index, 'correctAnswer', newCorrect);
                                                        }}
                                                    />
                                                    <Input
                                                        value={opt}
                                                        onChange={(e) => updateOption(index, oIndex, e.target.value)}
                                                        className="h-8"
                                                    />
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                                                        const newOptions = [...q.options];
                                                        newOptions.splice(oIndex, 1);
                                                        updateQuestion(index, 'options', newOptions);
                                                    }}>
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => {
                                                const newOptions = [...q.options, `Option ${q.options.length + 1}`];
                                                updateQuestion(index, 'options', newOptions);
                                            }}>
                                                <Plus className="h-3 w-3 mr-1" /> Add Option
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeQuestion(index)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Button variant="outline" className="w-full py-8 border-dashed" onClick={addQuestion}>
                    <Plus className="mr-2 h-4 w-4" /> Add Question
                </Button>
            </main>
        </div>
    );
}
