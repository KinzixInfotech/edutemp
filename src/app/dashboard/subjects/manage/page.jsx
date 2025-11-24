"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Edit, Trash2, Search, BarChart3 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

export default function ManageSubjectsPage() {
    const { fullUser } = useAuth();
    const [subjects, setSubjects] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [classes, setClasses] = useState([]);

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchData();
        }
    }, [fullUser?.schoolId]);

    useEffect(() => {
        filterSubjects();
    }, [subjects, searchTerm, classFilter]);

    const fetchData = async () => {
        try {
            const [subjectsRes, classesRes] = await Promise.all([
                axios.get(`/api/schools/${fullUser.schoolId}/subjects`),
                axios.get(`/api/schools/${fullUser.schoolId}/classes`),
            ]);
            setSubjects(subjectsRes.data);
            setClasses(classesRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    const filterSubjects = () => {
        let filtered = subjects;

        if (searchTerm) {
            filtered = filtered.filter(
                (subject) =>
                    subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    subject.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (classFilter !== "all") {
            filtered = filtered.filter(
                (subject) => subject.classId === parseInt(classFilter)
            );
        }

        setFilteredSubjects(filtered);
    };

    const deleteSubject = async (subjectId) => {
        if (!confirm("Are you sure you want to delete this subject?")) return;

        try {
            await axios.delete(
                `/api/schools/${fullUser.schoolId}/subjects/${subjectId}`
            );
            toast.success("Subject deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting subject:", error);
            const errorMessage = error.response?.data?.message || "Failed to delete subject";
            toast.error(errorMessage);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Subject Management</h1>
                    <p className="text-muted-foreground">
                        Manage subjects across all classes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/dashboard/subjects/stats">
                        <Button variant="outline">
                            <BarChart3 className="mr-2 h-4 w-4" /> Statistics
                        </Button>
                    </Link>
                    <Link href="/dashboard/subjects/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create New Subject
                        </Button>
                    </Link>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Subjects ({filteredSubjects.length})</CardTitle>
                    <div className="flex gap-4 mt-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by subject name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Filter by class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Classes</SelectItem>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {filteredSubjects.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            {subjects.length === 0
                                ? "No subjects found. Create your first subject to get started."
                                : "No subjects match your filters."}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject Name</TableHead>
                                    <TableHead>Subject Code</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSubjects.map((subject) => (
                                    <TableRow key={subject.id}>
                                        <TableCell className="font-medium">{subject.subjectName}</TableCell>
                                        <TableCell>
                                            {subject.subjectCode ? (
                                                <Badge variant="outline">{subject.subjectCode}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{subject.class?.className}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/dashboard/subjects/create?id=${subject.id}`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => deleteSubject(subject.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
