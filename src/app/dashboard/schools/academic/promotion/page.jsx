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

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterSection, setFilterSection] = useState("all");

    // Helper to display class names as Roman numerals
    const displayClassName = (name) => {
        const num = parseInt(name, 10);
        if (isNaN(num)) return name;
        const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
        return romanNumerals[num - 1] || name;
    };

    // Fetch Data
    const { data: rawClasses = [] } = useQuery({
        queryKey: ["classes", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error("Failed to fetch classes");
            return res.json();
        },
        enabled: !!schoolId
    });

    // Deduplicate classes by className and sort numerically
    const classes = rawClasses
        .reduce((acc, cls) => {
            if (!acc.some(c => c.className === cls.className)) {
                acc.push(cls);
            }
            return acc;
        }, [])
        .sort((a, b) => {
            const numA = parseInt(a.className, 10);
            const numB = parseInt(b.className, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.className.localeCompare(b.className);
        });

    // Check if source class is Class 12 (graduation year)
    const sourceClass = classes.find(c => c.id.toString() === fromClassId);
    const isSourceClass12 = sourceClass?.className === "12" || sourceClass?.className === "XII";

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
            // Class 12 students default to GRADUATE, others to PROMOTED
            const initialized = data.map(s => ({
                ...s,
                status: isSourceClass12 ? "GRADUATE" : (s.recommendedStatus || "PROMOTED"),
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

    const handleSectionChange = (studentId, sectionId) => {
        setCandidates(prev => prev.map(c =>
            c.id === studentId ? { ...c, toSectionId: sectionId } : c
        ));
    };

    const handleRemarksChange = (studentId, remarks) => {
        setCandidates(prev => prev.map(c =>
            c.id === studentId ? { ...c, remarks } : c
        ));
    };

    // Bulk assign section to all selected students
    const handleBulkSectionAssign = (sectionId) => {
        setCandidates(prev => prev.map(c =>
            c.selected && c.status !== "DETAINED" ? { ...c, toSectionId: sectionId } : c
        ));
        toast.success(`Assigned section to ${candidates.filter(c => c.selected && c.status !== "DETAINED").length} students`);
    };

    const handleSelectAll = (checked) => {
        // Only select/deselect filtered candidates
        const filteredIds = filteredCandidates.map(c => c.id);
        setCandidates(prev => prev.map(c =>
            filteredIds.includes(c.id) ? { ...c, selected: checked } : c
        ));
    };

    // Filter candidates by search and section
    const filteredCandidates = candidates.filter(c => {
        const matchesSearch = searchQuery === "" ||
            c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.admissionNo?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSection = filterSection === "all" || c.sectionName === filterSection;
        return matchesSearch && matchesSection;
    });

    // Get unique sections from candidates for filter
    const candidateSections = [...new Set(candidates.map(c => c.sectionName).filter(Boolean))];

    const handleExecutePromotion = () => {
        // For Class 12, only year is required (they become alumni)
        if (!toYearId) {
            toast.error("Please select Target Year");
            return;
        }

        // For non-Class 12, target class is also required
        if (!isSourceClass12 && !toClassId) {
            toast.error("Please select Target Class");
            return;
        }

        const selected = candidates.filter(c => c.selected);
        if (selected.length === 0) {
            toast.error("No students selected");
            return;
        }

        // Check section assignment - skip for Class 12 (alumni), DETAINED, and GRADUATE
        const needsSectionAssignment = selected.filter(c =>
            c.status !== "DETAINED" &&
            c.status !== "GRADUATE" &&
            !c.toSectionId &&
            !toSectionId
        );

        if (needsSectionAssignment.length > 0) {
            toast.error(`${needsSectionAssignment.length} students need target sections assigned`);
            return;
        }

        // Check remarks for CONDITIONAL status (required)
        const conditionalWithoutRemarks = selected.filter(c =>
            c.status === "CONDITIONAL" && !c.remarks?.trim()
        );

        if (conditionalWithoutRemarks.length > 0) {
            toast.error(`${conditionalWithoutRemarks.length} conditional student(s) need remarks/reason`);
            return;
        }

        const promotions = selected.map(c => ({
            studentId: c.id,
            toClassId: isSourceClass12 ? null : parseInt(toClassId), // Class 12 doesn't need target class
            toSectionId: c.status === "DETAINED" || isSourceClass12 ? null : parseInt(c.toSectionId || toSectionId),
            status: c.status,
            remarks: c.remarks
        }));

        promoteMutation.mutate({
            promotions,
            fromYearId, // Pass source year for validation
            toYearId,
            promotedBy: fullUser.id
        });
    };

    // Helper to get sections for target class
    const targetClass = classes.find(c => c.id.toString() === toClassId);
    const targetSections = targetClass?.sections || [];

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Student Promotion</h1>
                    <p className="text-muted-foreground">Promote students to the next academic session</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant={step >= 1 ? "default" : "outline"}>1. Select Source</Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <Badge variant={step >= 2 ? "default" : "outline"}>2. Review & Execute</Badge>
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
                                        <SelectItem key={c.id} value={c.id.toString()}>{displayClassName(c.className)}</SelectItem>
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
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Review Candidates</CardTitle>
                                <CardDescription>Select students and assign target sections for promotion.</CardDescription>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                {isSourceClass12 ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                                        <span>🎓 Graduate: {candidates.filter(c => c.status === "GRADUATE" && c.selected).length}</span>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500" />
                                            <span>Promote: {candidates.filter(c => c.status === "PROMOTED" && c.selected).length}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                                            <span>Conditional: {candidates.filter(c => c.status === "CONDITIONAL" && c.selected).length}</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <span>Detain: {candidates.filter(c => c.status === "DETAINED" && c.selected).length}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Graduation Alert for Class 12 */}
                        {isSourceClass12 && (
                            <div className="p-4 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg flex gap-3">
                                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                                <div>
                                    <h4 className="font-medium text-purple-800 dark:text-purple-200">🎓 Graduation Year</h4>
                                    <p className="text-sm text-purple-700 dark:text-purple-300">
                                        Class 12 students will be marked as <strong>Alumni</strong> when promoted.
                                        They will not be assigned to a new class. Select target year and click Execute to complete their graduation.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Filters and Bulk Actions Row */}
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="flex-1 min-w-[200px]">
                                <Input
                                    placeholder="Search by name or admission no..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="max-w-sm"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-sm text-muted-foreground">Filter Section:</Label>
                                <Select value={filterSection} onValueChange={setFilterSection}>
                                    <SelectTrigger className="w-[120px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {candidateSections.map(sec => (
                                            <SelectItem key={sec} value={sec}>{sec}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {toClassId && targetSections.length > 0 && (
                                <div className="flex items-center gap-2 border-l pl-4">
                                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Bulk Assign:</Label>
                                    <Select onValueChange={handleBulkSectionAssign}>
                                        <SelectTrigger className="w-[140px]">
                                            <SelectValue placeholder="Assign to..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {targetSections.map(sec => (
                                                <SelectItem key={sec.id} value={sec.id.toString()}>
                                                    {sec.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Info bar */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Showing {filteredCandidates.length} of {candidates.length} students</span>
                            <span>{candidates.filter(c => c.selected).length} selected for promotion</span>
                        </div>

                        {/* Target Selection Card */}
                        <div className="p-4 border rounded-lg bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                                <ArrowRight className="w-4 h-4" />
                                <span>Set Target Class & Section</span>
                            </div>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <Label className="text-xs">Target Year</Label>
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
                                <div className="space-y-1">
                                    <Label className="text-xs">Target Class</Label>
                                    <Select value={toClassId} onValueChange={setToClassId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Class" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {classes.map(c => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{displayClassName(c.className)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Default Section (Optional)</Label>
                                    <Select value={toSectionId} onValueChange={setToSectionId} disabled={!toClassId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Auto or select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {targetSections.map(s => (
                                                <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                💡 Tip: Select target class, then use bulk assign above or individual dropdowns in the table.
                            </p>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">
                                            <Checkbox
                                                checked={filteredCandidates.length > 0 && filteredCandidates.every(c => c.selected)}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Current Section</TableHead>
                                        <TableHead>Exam Stats</TableHead>
                                        <TableHead>Action</TableHead>
                                        <TableHead>Target Section</TableHead>
                                        <TableHead>Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCandidates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                                {candidates.length === 0 ? "No students found for the selected class" : "No students match the current filter"}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCandidates.map(student => (
                                            <TableRow
                                                key={student.id}
                                                className={
                                                    student.status === "DETAINED" ? "bg-yellow-50 dark:bg-yellow-950/20" :
                                                        student.status === "CONDITIONAL" ? "bg-orange-50 dark:bg-orange-950/20" :
                                                            ""
                                                }
                                            >
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
                                                    <Badge variant="outline">{student.sectionName || "-"}</Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">
                                                        Marks: {student.examStats?.totalMarks || 0}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Exams: {student.examStats?.examCount || 0}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={student.status}
                                                        onValueChange={(val) => handleStatusChange(student.id, val)}
                                                    >
                                                        <SelectTrigger className="w-[130px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {isSourceClass12 ? (
                                                                <>
                                                                    <SelectItem value="GRADUATE">🎓 Graduate</SelectItem>
                                                                    <SelectItem value="DETAINED">Detain</SelectItem>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <SelectItem value="PROMOTED">Promote</SelectItem>
                                                                    <SelectItem value="DETAINED">Detain</SelectItem>
                                                                    <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                                                                </>
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    {student.status === "GRADUATE" ? (
                                                        <Badge className="bg-purple-600 text-white">🎓 Alumni</Badge>
                                                    ) : student.status === "DETAINED" ? (
                                                        <span className="text-muted-foreground text-sm">Same class</span>
                                                    ) : targetSections.length > 0 ? (
                                                        <Select
                                                            value={student.toSectionId || ""}
                                                            onValueChange={(val) => handleSectionChange(student.id, val)}
                                                        >
                                                            <SelectTrigger className="w-[100px]">
                                                                <SelectValue placeholder="Section" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {targetSections.map(s => (
                                                                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">Select target class first</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {student.status === "CONDITIONAL" ? (
                                                        <Input
                                                            placeholder="Required reason..."
                                                            value={student.remarks || ""}
                                                            onChange={(e) => handleRemarksChange(student.id, e.target.value)}
                                                            className={`w-[150px] ${!student.remarks?.trim() ? "border-orange-400" : ""}`}
                                                        />
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t">
                            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                            <div className="flex items-center gap-3">
                                {candidates.filter(c => c.selected && !c.toSectionId && c.status !== "DETAINED").length > 0 && !toSectionId && (
                                    <span className="text-sm text-amber-600 dark:text-amber-400">
                                        ⚠️ {candidates.filter(c => c.selected && !c.toSectionId && c.status !== "DETAINED").length} students need sections
                                    </span>
                                )}
                                <Button
                                    onClick={handleExecutePromotion}
                                    disabled={!toClassId || !toYearId || promoteMutation.isPending}
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    {promoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Execute Promotion ({candidates.filter(c => c.selected).length})
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
