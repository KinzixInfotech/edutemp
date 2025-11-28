"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function PromotionPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // Wizard State
    const [step, setStep] = useState(1);

    // Selection State
    const [fromClassId, setFromClassId] = useState("");
    const [fromYearId, setFromYearId] = useState("");
    const [toClassId, setToClassId] = useState("");
    const [toYearId, setToYearId] = useState("");
    const [toSectionId, setToSectionId] = useState(""); // Bulk assign section

    // Candidates State
    const [candidates, setCandidates] = useState([]);
    const [selectedCandidates, setSelectedCandidates] = useState([]);

    // Fetch Data
    const { data: classes = [] } = useQuery({
        queryKey: ["classes", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error("Failed to fetch classes");
            return res.json();
        },
        enabled: !!schoolId
    });

    const { data: academicYears = [] } = useQuery({
        queryKey: ["academicYears", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            if (!res.ok) throw new Error("Failed to fetch years");
            return res.json();
        },
        enabled: !!schoolId
    });

    // Fetch Candidates
    const { isLoading: isLoadingCandidates, refetch: fetchCandidates } = useQuery({
        queryKey: ["promotionCandidates", schoolId, fromClassId, fromYearId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/academic/promotion/candidates?classId=${fromClassId}&academicYearId=${fromYearId}`);
            if (!res.ok) throw new Error("Failed to fetch candidates");
            return res.json();
        },
        enabled: false, // Manual fetch
    });

    // Execute Promotion Mutation
    const promoteMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/academic/promotion/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to promote");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(`Successfully promoted ${data.count} students`);
            setStep(1);
            setCandidates([]);
            setSelectedCandidates([]);
        },
        onError: (err) => toast.error(err.message)
    });

    // Handlers
    const handleFetchCandidates = async () => {
        if (!fromClassId || !fromYearId) {
            toast.error("Please select Class and Academic Year");
            return;
        }
        const { data } = await fetchCandidates();
        if (data) {
            // Initialize candidates with default status
            const initialized = data.map(s => ({
                ...s,
                status: s.recommendedStatus || "PROMOTED",
                remarks: "",
                selected: true
            }));
            setCandidates(initialized);
            setStep(2);
        }
    };

    const handleStatusChange = (studentId, status) => {
        setCandidates(prev => prev.map(c =>
            c.id === studentId ? { ...c, status } : c
        ));
    };

    const handleSelectionChange = (studentId, checked) => {
        setCandidates(prev => prev.map(c =>
            c.id === studentId ? { ...c, selected: checked } : c
        ));
    };

    const handleSelectAll = (checked) => {
        setCandidates(prev => prev.map(c => ({ ...c, selected: checked })));
    };

    const handleExecutePromotion = () => {
        if (!toClassId || !toYearId || !toSectionId) {
            toast.error("Please select Target Class, Year and Section");
            return;
        }

        const selected = candidates.filter(c => c.selected);
        if (selected.length === 0) {
            toast.error("No students selected");
            return;
        }

        const promotions = selected.map(c => ({
            studentId: c.id,
            toClassId: parseInt(toClassId),
            toSectionId: parseInt(toSectionId), // Assuming bulk assign for now
            status: c.status,
            remarks: c.remarks
        }));

        promoteMutation.mutate({
            promotions,
            toYearId,
            promotedBy: fullUser.id
        });
    };

    // Helper to get sections for target class
    const targetClass = classes.find(c => c.id.toString() === toClassId);
    const targetSections = targetClass?.sections || [];

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Student Promotion</h1>
                    <p className="text-muted-foreground">Promote students to the next academic session</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={step >= 1 ? "default" : "outline"}>1. Select Source</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant={step >= 2 ? "default" : "outline"}>2. Review List</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant={step >= 3 ? "default" : "outline"}>3. Execute</Badge>
                </div>
            </div>

            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Select Source Class</CardTitle>
                        <CardDescription>Choose the class and academic year to promote students FROM.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>Academic Year (Current)</Label>
                            <Select value={fromYearId} onValueChange={setFromYearId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {academicYears.map(y => (
                                        <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Class</Label>
                            <Select value={fromClassId} onValueChange={setFromClassId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.className}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2 flex justify-end">
                            <Button onClick={handleFetchCandidates} disabled={isLoadingCandidates}>
                                {isLoadingCandidates && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Fetch Students
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Review Candidates</CardTitle>
                        <CardDescription>Review exam performance and select students for promotion.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={candidates.every(c => c.selected)}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Exam Stats</TableHead>
                                        <TableHead>Recommendation</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {candidates.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={student.selected}
                                                    onCheckedChange={(checked) => handleSelectionChange(student.id, checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{student.name}</div>
                                                <div className="text-xs text-muted-foreground">Adm: {student.admissionNo}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    Marks: {student.examStats.totalMarks}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Exams: {student.examStats.examCount}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={student.recommendedStatus === "PROMOTED" ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}>
                                                    {student.recommendedStatus}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={student.status}
                                                    onValueChange={(val) => handleStatusChange(student.id, val)}
                                                >
                                                    <SelectTrigger className="w-[140px]">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="PROMOTED">Promote</SelectItem>
                                                        <SelectItem value="DETAINED">Detain</SelectItem>
                                                        <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <Button onClick={() => setStep(3)}>Next: Select Target</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Target Configuration</CardTitle>
                        <CardDescription>Select where the promoted students will be moved.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label>Target Academic Year</Label>
                                <Select value={toYearId} onValueChange={setToYearId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {academicYears.filter(y => y.id !== fromYearId).map(y => (
                                            <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Class</Label>
                                <Select value={toClassId} onValueChange={setToClassId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id.toString()}>{c.className}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Target Section (Bulk)</Label>
                                <Select value={toSectionId} onValueChange={setToSectionId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {targetSections.map(s => (
                                            <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">All selected students will be assigned to this section.</p>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md flex gap-3 items-start">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-yellow-800">Warning</h4>
                                <p className="text-sm text-yellow-700">
                                    You are about to promote {candidates.filter(c => c.selected).length} students.
                                    This action will update their current class and academic year.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                            <Button
                                onClick={handleExecutePromotion}
                                disabled={promoteMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {promoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Promotion
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
