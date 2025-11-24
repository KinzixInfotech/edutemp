"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export default function MarksEntryPage() {
    const { fullUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);

    // Selectors
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState("");
    const [classes, setClasses] = useState([]);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [subjects, setSubjects] = useState([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState("");

    // Marks Data
    const [students, setStudents] = useState([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchExams();
        }
    }, [fullUser?.schoolId]);

    const fetchExams = async () => {
        try {
            const res = await axios.get(
                `/api/schools/${fullUser.schoolId}/examination/exams`
            );
            setExams(res.data);
        } catch (error) {
            console.error("Error fetching exams:", error);
        } finally {
            setFetchingData(false);
        }
    };

    // When Exam changes, fetch its classes
    useEffect(() => {
        if (selectedExamId) {
            const exam = exams.find((e) => e.id.toString() === selectedExamId);
            if (exam) {
                setClasses(exam.classes);
                setSelectedClassId("");
                setSelectedSubjectId("");
                setStudents([]);
            }
        }
    }, [selectedExamId, exams]);

    // When Class changes, fetch subjects (ideally filtered by class/exam schedule)
    useEffect(() => {
        if (selectedExamId && selectedClassId) {
            // Fetch subjects scheduled for this exam
            // We can get this from the exam details or a specific endpoint
            // Let's fetch exam details again to get subjects
            fetchExamSubjects();
        }
    }, [selectedExamId, selectedClassId]);

    const fetchExamSubjects = async () => {
        try {
            const res = await axios.get(
                `/api/schools/${fullUser.schoolId}/examination/exams/${selectedExamId}`
            );
            // Filter subjects? Or just show all scheduled subjects
            // Ideally we should filter by class if subjects are class-specific
            // For now, show all subjects scheduled in this exam
            setSubjects(res.data.subjects.map(s => ({
                id: s.subjectId,
                name: s.subject.subjectName,
                maxMarks: s.maxMarks
            })));
        } catch (error) {
            console.error("Error fetching subjects:", error);
        }
    };

    const fetchMarks = async () => {
        if (!selectedExamId || !selectedClassId || !selectedSubjectId) return;

        setLoading(true);
        try {
            const res = await axios.get(
                `/api/schools/${fullUser.schoolId}/examination/marks`,
                {
                    params: {
                        examId: selectedExamId,
                        classId: selectedClassId,
                        subjectId: selectedSubjectId,
                    },
                }
            );
            setStudents(res.data);
        } catch (error) {
            console.error("Error fetching marks:", error);
            toast.error("Failed to fetch student list");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkChange = (studentId, field, value) => {
        setStudents((prev) =>
            prev.map((s) =>
                s.userId === studentId ? { ...s, [field]: value } : s
            )
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const marksPayload = students.map((s) => ({
                studentId: s.userId,
                marksObtained: s.marksObtained,
                grade: s.grade,
                remarks: s.remarks,
                isAbsent: s.isAbsent,
            }));

            await axios.post(
                `/api/schools/${fullUser.schoolId}/examination/marks`,
                {
                    examId: selectedExamId,
                    subjectId: selectedSubjectId,
                    marks: marksPayload,
                }
            );
            toast.success("Marks saved successfully");
        } catch (error) {
            console.error("Error saving marks:", error);
            toast.error("Failed to save marks");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Marks Entry</h1>
                <p className="text-muted-foreground">
                    Input marks for students subject-wise.
                </p>
            </div>

            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="space-y-2">
                            <Label>Select Exam</Label>
                            <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                                <SelectTrigger>
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

                        <div className="space-y-2">
                            <Label>Select Class</Label>
                            <Select
                                value={selectedClassId}
                                onValueChange={setSelectedClassId}
                                disabled={!selectedExamId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id.toString()}>
                                            {cls.className}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Select Subject</Label>
                            <Select
                                value={selectedSubjectId}
                                onValueChange={setSelectedSubjectId}
                                disabled={!selectedClassId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((sub) => (
                                        <SelectItem key={sub.id} value={sub.id.toString()}>
                                            {sub.name} (Max: {sub.maxMarks})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={fetchMarks} disabled={!selectedSubjectId || loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                            Fetch Students
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {students.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Student List</CardTitle>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Save Marks
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Roll No</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead className="w-[100px]">Absent</TableHead>
                                    <TableHead className="w-[150px]">Marks Obtained</TableHead>
                                    <TableHead className="w-[150px]">Grade</TableHead>
                                    <TableHead>Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.userId}>
                                        <TableCell>{student.rollNumber}</TableCell>
                                        <TableCell className="font-medium">{student.name}</TableCell>
                                        <TableCell>
                                            <Checkbox
                                                checked={student.isAbsent}
                                                onCheckedChange={(checked) =>
                                                    handleMarkChange(student.userId, "isAbsent", checked)
                                                }
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                type="number"
                                                value={student.marksObtained}
                                                onChange={(e) =>
                                                    handleMarkChange(student.userId, "marksObtained", e.target.value)
                                                }
                                                disabled={student.isAbsent}
                                                className={student.isAbsent ? "bg-muted" : ""}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={student.grade}
                                                onChange={(e) =>
                                                    handleMarkChange(student.userId, "grade", e.target.value)
                                                }
                                                placeholder="e.g. A+"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Input
                                                value={student.remarks}
                                                onChange={(e) =>
                                                    handleMarkChange(student.userId, "remarks", e.target.value)
                                                }
                                                placeholder="Optional"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
