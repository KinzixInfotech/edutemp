"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, UserPlus, AlertCircle, Users, User, Search, Filter } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export default function AlumniConversionDialog({ onSuccess }) {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [converting, setConverting] = useState(false);
    const [step, setStep] = useState(0); // 0: Mode, 1: Search/Select, 2: Details/Confirm
    const [mode, setMode] = useState(null); // 'INDIVIDUAL' or 'BULK'

    // Data State
    const [classes, setClasses] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);

    // Selection State
    const [selectedClass, setSelectedClass] = useState("");
    const [selectedSection, setSelectedSection] = useState("");
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        leavingReason: "GRADUATED",
        leavingDate: new Date().toISOString().split('T')[0],
        graduationYear: new Date().getFullYear().toString(),
        notes: ""
    });

    useEffect(() => {
        if (isOpen && schoolId) {
            fetchClasses();
        }
    }, [isOpen, schoolId]);

    useEffect(() => {
        if (selectedClass) {
            fetchSections(selectedClass);
            // Auto-fetch students when class changes in Individual mode
            if (mode === 'INDIVIDUAL') {
                fetchEligibleStudents(selectedClass, selectedSection);
            }
        } else {
            setSections([]);
        }
    }, [selectedClass]);

    useEffect(() => {
        if (mode === 'INDIVIDUAL' && selectedClass) {
            fetchEligibleStudents(selectedClass, selectedSection);
        }
    }, [selectedSection]);

    // Debounce search for individual mode
    useEffect(() => {
        if (mode === 'INDIVIDUAL' && searchQuery.length > 2) {
            const timer = setTimeout(() => {
                fetchEligibleStudents(selectedClass, selectedSection, searchQuery);
            }, 500);
            return () => clearTimeout(timer);
        } else if (mode === 'INDIVIDUAL' && searchQuery.length === 0 && !selectedClass) {
            setStudents([]);
        }
    }, [searchQuery, mode]);

    const fetchClasses = async () => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/classes`);
            setClasses(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch classes", error);
        }
    };

    const fetchSections = async (classId) => {
        try {
            const res = await axios.get(`/api/schools/${schoolId}/classes/${classId}/sections`);
            setSections(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error("Failed to fetch sections", error);
        }
    };

    const fetchEligibleStudents = async (clsId = selectedClass, secId = selectedSection, query = searchQuery) => {
        setLoading(true);
        try {
            let url = `/api/schools/${schoolId}/students/eligible-for-graduation?`;

            if (mode === 'BULK') {
                if (!clsId) {
                    // Don't fetch for bulk if no class selected (triggered by button usually)
                    setLoading(false);
                    return;
                }
                url += `classId=${clsId}`;
                if (secId && secId !== "all") url += `&sectionId=${secId}`;
            } else {
                // Individual mode: Can fetch by Class OR Search
                const params = [];
                if (clsId) params.push(`classId=${clsId}`);
                if (secId && secId !== "all") params.push(`sectionId=${secId}`);
                if (query) params.push(`search=${encodeURIComponent(query)}`);

                if (params.length === 0) {
                    setLoading(false);
                    return;
                }
                url += params.join('&');
            }

            const res = await axios.get(url);
            const fetchedStudents = res.data.students || [];
            setStudents(fetchedStudents);

            // Auto-select all ONLY for BULK mode
            if (mode === 'BULK') {
                setSelectedStudents(fetchedStudents.map(s => s.userId));
                setStep(2); // Move to confirm step directly for bulk after fetch
            }

        } catch (error) {
            console.error("Failed to fetch students", error);
            toast.error("Failed to load students");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedStudents(students.map(s => s.userId));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectStudent = (studentId, checked) => {
        if (checked) {
            setSelectedStudents([...selectedStudents, studentId]);
        } else {
            setSelectedStudents(selectedStudents.filter(id => id !== studentId));
        }
    };

    const handleConvert = async () => {
        if (selectedStudents.length === 0) {
            toast.error("Please select at least one student");
            return;
        }

        setConverting(true);
        try {
            await axios.post(`/api/schools/${schoolId}/alumni/convert`, {
                studentIds: selectedStudents,
                leavingReason: formData.leavingReason,
                leavingDate: formData.leavingDate,
                graduationYear: parseInt(formData.graduationYear),
                notes: formData.notes
            });

            toast.success(`Successfully converted ${selectedStudents.length} students to alumni`);
            setIsOpen(false);
            resetForm();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Conversion failed", error);
            toast.error(error.response?.data?.error || "Failed to convert students");
        } finally {
            setConverting(false);
        }
    };

    const resetForm = () => {
        setStep(0);
        setMode(null);
        setSelectedClass("");
        setSelectedSection("");
        setSelectedStudents([]);
        setStudents([]);
        setSearchQuery("");
        setFormData({
            leavingReason: "GRADUATED",
            leavingDate: new Date().toISOString().split('T')[0],
            graduationYear: new Date().getFullYear().toString(),
            notes: ""
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Convert Students
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>Convert Students to Alumni</DialogTitle>
                    <DialogDescription>
                        {step === 0 ? "Choose how you want to convert students." :
                            step === 1 ? (mode === 'INDIVIDUAL' ? "Search or filter to find students." : "Select class to pass out.") :
                                "Enter leaving details and confirm."}
                    </DialogDescription>
                </DialogHeader>

                {step === 0 && (
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <Card
                            className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary"
                            onClick={() => { setMode('INDIVIDUAL'); setStep(1); }}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Specific Students</h3>
                                    <p className="text-sm text-muted-foreground">Select one or more students by search or class filter.</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card
                            className="cursor-pointer hover:bg-muted/50 transition-colors border-2 hover:border-primary"
                            onClick={() => { setMode('BULK'); setStep(1); }}
                        >
                            <CardContent className="flex flex-col items-center justify-center p-6 text-center space-y-4">
                                <div className="p-4 bg-primary/10 rounded-full">
                                    <Users className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Bulk Class</h3>
                                    <p className="text-sm text-muted-foreground">Convert an entire class at once (auto-selects all).</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {step === 1 && mode === 'INDIVIDUAL' && (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Filter by Class (Optional)</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Classes" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.className}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section (Optional)</Label>
                                <Select value={selectedSection} onValueChange={setSelectedSection} disabled={!selectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {sections.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or Search Directly</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Search Student</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Name or Admission No..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between bg-muted p-2 rounded-md mt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="select-all-ind"
                                    checked={students.length > 0 && selectedStudents.length === students.length}
                                    onCheckedChange={handleSelectAll}
                                />
                                <label htmlFor="select-all-ind" className="text-sm font-medium cursor-pointer">
                                    Select All
                                </label>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                {selectedStudents.length} selected
                            </div>
                        </div>

                        <ScrollArea className="h-[250px] border rounded-md p-4">
                            {loading ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : students.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    {selectedClass || searchQuery.length > 2 ? "No students found." : "Select a class or type to search."}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {students.map((student) => (
                                        <div
                                            key={student.userId}
                                            className="flex items-center p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                                            onClick={() => handleSelectStudent(student.userId, !selectedStudents.includes(student.userId))}
                                        >
                                            <Checkbox
                                                checked={selectedStudents.includes(student.userId)}
                                                onCheckedChange={(checked) => handleSelectStudent(student.userId, checked)}
                                            />
                                            <div className="ml-3">
                                                <p className="font-medium">{student.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {student.admissionNo} • {student.class?.className} {student.section?.name}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                )}

                {step === 1 && mode === 'BULK' && (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Class *</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Class" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((c) => (
                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                {c.className}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section (Optional)</Label>
                                <Select value={selectedSection} onValueChange={setSelectedSection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Sections" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {sections.map((s) => (
                                            <SelectItem key={s.id} value={s.id.toString()}>
                                                {s.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                )}
                {step === 2 && (
                    <div className="space-y-4 py-4">
                        {/* Summary of Selection */}
                        <div className="bg-muted p-4 rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium">{selectedStudents.length} Students Selected</p>
                                    <p className="text-sm text-muted-foreground">
                                        Ready to convert to alumni
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Leaving Reason *</Label>
                                <Select
                                    value={formData.leavingReason}
                                    onValueChange={(val) => setFormData({ ...formData, leavingReason: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GRADUATED">Passed Out</SelectItem>
                                        <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                                        <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Session Passed Out (Year) *</Label>
                                <Input
                                    type="number"
                                    value={formData.graduationYear}
                                    placeholder="e.g. 2024"
                                    onChange={(e) => setFormData({ ...formData, graduationYear: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Leaving Date *</Label>
                            <Input
                                type="date"
                                value={formData.leavingDate}
                                onChange={(e) => setFormData({ ...formData, leavingDate: e.target.value })}
                            />
                        </div>

                        <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Warning</AlertTitle>
                            <AlertDescription>
                                Selected student(s) will be moved to alumni status.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                <DialogFooter>
                    {step > 0 && (
                        <Button variant="outline" onClick={() => setStep(step - 1)} disabled={converting}>
                            Back
                        </Button>
                    )}

                    {step === 1 && mode === 'BULK' ? (
                        <Button onClick={() => fetchEligibleStudents(selectedClass, selectedSection)} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Next: Select Students
                        </Button>
                    ) : step === 1 && mode === 'INDIVIDUAL' ? (
                        <Button onClick={() => setStep(2)} disabled={selectedStudents.length === 0}>
                            Next: Details
                        </Button>
                    ) : step === 2 ? (
                        <Button onClick={handleConvert} disabled={converting || selectedStudents.length === 0}>
                            {converting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Conversion
                        </Button>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
