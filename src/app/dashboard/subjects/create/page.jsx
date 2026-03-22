"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAcademicYear } from "@/context/AcademicYearContext";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, CheckSquare } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

export default function CreateSubjectPage() {
    const { fullUser } = useAuth();
    const { selectedYear } = useAcademicYear();
    const academicYearId = selectedYear?.id;
    const router = useRouter();
    const searchParams = useSearchParams();
    const subjectId = searchParams.get("id"); // Editing existing mapping

    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [classes, setClasses] = useState([]);

    const [formData, setFormData] = useState({
        subjectName: "",
        subjectCode: "",
        type: "CORE", 
        classIds: [], 
    });

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchInitialData();
        }
    }, [fullUser?.schoolId, subjectId]);

    const fetchInitialData = async () => {
        try {
            const classParams = new URLSearchParams({ limit: '-1' });
            if (academicYearId) classParams.append('academicYearId', academicYearId);
            const classesRes = await axios.get(`/api/schools/${fullUser.schoolId}/classes?${classParams}`);
            const classesData = classesRes.data;
            setClasses(Array.isArray(classesData) ? classesData : (classesData.data || []));

            // If editing, fetch subject data
            if (subjectId) {
                const subjectRes = await axios.get(
                    `/api/schools/${fullUser.schoolId}/subjects/${subjectId}`
                );
                const subject = subjectRes.data;
                setFormData({
                    subjectName: subject.subjectName,
                    subjectCode: subject.subjectCode || "",
                    type: subject.globalSubject?.type || (subject.isOptional ? "OPTIONAL" : "CORE"),
                    classIds: [subject.classId.toString()],
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load form data");
        } finally {
            setFetchingData(false);
        }
    };

    const handleClassToggle = (classId) => {
        setFormData(prev => {
            const current = new Set(prev.classIds);
            if (current.has(classId)) {
                current.delete(classId);
            } else {
                current.add(classId);
            }
            return { ...prev, classIds: Array.from(current) };
        });
    };

    const handleSelectAllClasses = () => {
        if (formData.classIds.length === classes.length) {
            setFormData(prev => ({ ...prev, classIds: [] }));
        } else {
            setFormData(prev => ({ ...prev, classIds: classes.map(c => c.id.toString()) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subjectName || formData.classIds.length === 0) {
            toast.error("Please provide a subject name and select at least one class.");
            return;
        }

        setLoading(true);
        try {
            if (subjectId) {
                // Update specific mapping
                await axios.put(
                    `/api/schools/${fullUser.schoolId}/subjects/${subjectId}`,
                    { ...formData, classId: formData.classIds[0] }
                );
                toast.success("Subject updated successfully");
            } else {
                // Bulk creation
                await axios.post(
                    `/api/schools/${fullUser.schoolId}/subjects`,
                    formData
                );
                toast.success("Subjects created and assigned successfully");
            }
            router.push("/dashboard/subjects/manage");
        } catch (error) {
            console.error("Error saving subject:", error);
            toast.error(error.response?.data?.error || "Failed to save subject");
        } finally {
            setLoading(false);
        }
    };

    if (fetchingData) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const isAllSelected = classes.length > 0 && formData.classIds.length === classes.length;

    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/subjects/manage">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {subjectId ? "Edit Subject Mapping" : "Create Master Subject"}
                    </h1>
                    <p className="text-muted-foreground">
                        {subjectId
                            ? "Update specific mapping for a class"
                            : "Create a global subject and assign it to multiple classes at once."}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Master Subject Details</CardTitle>
                        <CardDescription>This creates a global subject that applies across the school.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="subjectName">Subject Name *</Label>
                                <Input
                                    id="subjectName"
                                    placeholder="e.g. Mathematics"
                                    value={formData.subjectName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, subjectName: e.target.value })
                                    }
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subjectCode">Subject Code</Label>
                                <Input
                                    id="subjectCode"
                                    placeholder="e.g. MATH101"
                                    value={formData.subjectCode}
                                    onChange={(e) =>
                                        setFormData({ ...formData, subjectCode: e.target.value })
                                    }
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Subject Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, type: val })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CORE">Core (Mandatory)</SelectItem>
                                        <SelectItem value="OPTIONAL">Optional / Elective</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                            <CardTitle>Class Assignment</CardTitle>
                            <CardDescription>Select all classes where this subject applies.</CardDescription>
                        </div>
                        {!subjectId && (
                            <Button 
                                type="button" 
                                variant={isAllSelected ? "secondary" : "outline"}
                                size="sm" 
                                onClick={handleSelectAllClasses}
                                className="gap-2 shrink-0"
                            >
                                <CheckSquare className="h-4 w-4" />
                                {isAllSelected ? "Deselect All" : "Select All Classes"}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        {subjectId ? (
                             <div className="space-y-2 max-w-xs">
                                 <Label>Mapped Class</Label>
                                 <Select
                                     value={formData.classIds[0]}
                                     onValueChange={(val) => setFormData({ ...formData, classIds: [val] })}
                                 >
                                     <SelectTrigger>
                                         <SelectValue placeholder="Select class" />
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
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {classes.map((cls) => {
                                    const idStr = cls.id.toString();
                                    const isChecked = formData.classIds.includes(idStr);
                                    return (
                                        <label 
                                            key={cls.id} 
                                            className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'bg-primary/5 border-primary/20' : 'hover:bg-muted'}`}
                                        >
                                            <Checkbox 
                                                checked={isChecked} 
                                                onCheckedChange={() => handleClassToggle(idStr)} 
                                            />
                                            <span className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                {cls.className}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                        {formData.classIds.length === 0 && !subjectId && (
                            <p className="text-sm text-destructive mt-4">Please select at least one class to assign this subject to.</p>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2 pt-2">
                    <Link href="/dashboard/subjects/manage">
                        <Button type="button" variant="outline">
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={loading || formData.classIds.length === 0}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {subjectId ? "Update Mapping" : "Create & Assign Subject"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
