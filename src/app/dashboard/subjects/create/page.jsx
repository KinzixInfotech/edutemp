"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

export default function CreateSubjectPage() {
    const { fullUser } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const subjectId = searchParams.get("id");

    const [loading, setLoading] = useState(false);
    const [fetchingData, setFetchingData] = useState(true);
    const [classes, setClasses] = useState([]);

    const [formData, setFormData] = useState({
        subjectName: "",
        subjectCode: "",
        classId: "",
    });

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchInitialData();
        }
    }, [fullUser?.schoolId, subjectId]);

    const fetchInitialData = async () => {
        try {
            const classesRes = await axios.get(`/api/schools/${fullUser.schoolId}/classes`);
            setClasses(classesRes.data);

            // If editing, fetch subject data
            if (subjectId) {
                const subjectRes = await axios.get(
                    `/api/schools/${fullUser.schoolId}/subjects/${subjectId}`
                );
                const subject = subjectRes.data;
                setFormData({
                    subjectName: subject.subjectName,
                    subjectCode: subject.subjectCode || "",
                    classId: subject.classId.toString(),
                });
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load form data");
        } finally {
            setFetchingData(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subjectName || !formData.classId) {
            toast.error("Please fill in all required fields");
            return;
        }

        setLoading(true);
        try {
            if (subjectId) {
                // Update existing subject
                await axios.put(
                    `/api/schools/${fullUser.schoolId}/subjects/${subjectId}`,
                    formData
                );
                toast.success("Subject updated successfully");
            } else {
                // Create new subject
                await axios.post(
                    `/api/schools/${fullUser.schoolId}/subjects`,
                    formData
                );
                toast.success("Subject created successfully");
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

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/subjects/manage">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {subjectId ? "Edit Subject" : "Create New Subject"}
                    </h1>
                    <p className="text-muted-foreground">
                        {subjectId
                            ? "Update subject details"
                            : "Add a new subject to your curriculum"}
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Subject Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-4">
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
                                <Label htmlFor="classId">Class *</Label>
                                <Select
                                    value={formData.classId}
                                    onValueChange={(val) =>
                                        setFormData({ ...formData, classId: val })
                                    }
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
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Link href="/dashboard/subjects/manage">
                                <Button type="button" variant="outline">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {subjectId ? "Update Subject" : "Create Subject"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
