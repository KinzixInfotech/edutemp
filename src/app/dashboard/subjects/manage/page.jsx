"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Loader2, Plus, Edit, Trash2, Search, BarChart3, Grip, Edit3, Settings2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";

export default function ManageSubjectsPage() {
    const { fullUser } = useAuth();
    const [masterSubjects, setMasterSubjects] = useState([]);
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
    }, [masterSubjects, searchTerm, classFilter]);

    const fetchData = async () => {
        try {
            const [subjectsRes, classesRes] = await Promise.all([
                axios.get(`/api/schools/${fullUser.schoolId}/subjects/master`),
                axios.get(`/api/schools/${fullUser.schoolId}/classes`),
            ]);
            setMasterSubjects(subjectsRes.data);
            setClasses(classesRes.data);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch subjects");
        } finally {
            setLoading(false);
        }
    };

    const filterSubjects = () => {
        let filtered = masterSubjects;

        if (searchTerm) {
            filtered = filtered.filter(
                (subject) =>
                    subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    subject.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (classFilter !== "all") {
            const clsId = parseInt(classFilter);
            filtered = filtered.filter(
                (subject) => subject.mappings?.some(m => m.classId === clsId)
            );
        }

        setFilteredSubjects(filtered);
    };

    const deleteMasterSubject = async (masterId) => {
        if (!confirm("Are you sure you want to delete this master subject? This will remove it from ALL assigned classes!")) return;

        try {
            await axios.delete(
                `/api/schools/${fullUser.schoolId}/subjects/master/${masterId}`
            );
            toast.success("Master Subject deleted successfully");
            fetchData();
        } catch (error) {
            console.error("Error deleting subject:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to delete subject";
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
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Master Subjects</h1>
                    <p className="text-muted-foreground">
                        Manage global subjects and their class assignments here.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Link href="/dashboard/subjects/stats">
                        <Button variant="outline" className="bg-white">
                            <BarChart3 className="mr-2 h-4 w-4" /> Statistics
                        </Button>
                    </Link>
                    <Link href="/dashboard/subjects/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Master Subject
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border shadow-sm">
                <CardHeader className="bg-muted/30 pb-4 border-b">
                    <CardTitle className="text-base flex items-center justify-between">
                        <span>All Master Subjects ({filteredSubjects.length})</span>
                    </CardTitle>
                    <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by subject name or code..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 bg-white"
                            />
                        </div>
                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-full sm:w-[200px] bg-white">
                                <SelectValue placeholder="Filter by class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Every Class</SelectItem>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {filteredSubjects.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground flex flex-col items-center">
                            <Settings2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
                            <h3 className="text-lg font-semibold text-foreground">No subjects found</h3>
                            <p className="text-sm">
                                {masterSubjects.length === 0
                                    ? "Create your first global subject to build your curriculum."
                                    : "No subjects match your current filters."}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/10 hover:bg-muted/10">
                                    <TableHead className="w-[30%]">Master Subject</TableHead>
                                    <TableHead className="w-[15%]">Code</TableHead>
                                    <TableHead className="w-[15%]">Type</TableHead>
                                    <TableHead className="w-[30%]">Mapped Classes</TableHead>
                                    <TableHead className="text-right w-[10%]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSubjects.map((subject) => (
                                    <TableRow key={subject.id} className="group">
                                        <TableCell className="font-semibold align-top pt-5">{subject.subjectName}</TableCell>
                                        <TableCell className="align-top pt-5">
                                            {subject.subjectCode ? (
                                                <Badge variant="outline" className="font-mono text-xs">{subject.subjectCode}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground/50">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="align-top pt-5">
                                            <Badge variant={subject.type === 'CORE' ? 'default' : 'secondary'} className="text-[10px] tracking-wider uppercase">
                                                {subject.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {subject.mappings?.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {subject.mappings.map(m => (
                                                        <Link key={m.mappingId} href={`/dashboard/subjects/create?id=${m.mappingId}`}>
                                                            <Badge 
                                                                variant={m.isOverridden ? "destructive" : "secondary"} 
                                                                className={`text-xs font-medium cursor-pointer transition-colors ${!m.isOverridden ? 'bg-primary/5 hover:bg-primary/10 text-primary border-primary/20' : ''}`}
                                                                title={m.isOverridden ? "This class uses a custom overridden name/code. Click to edit." : "Standard mapping. Click to edit."}
                                                            >
                                                                {m.className}
                                                            </Badge>
                                                        </Link>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-destructive italic">Not assigned to any class</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right align-top pt-4">
                                            <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                                                    onClick={() => deleteMasterSubject(subject.id)}
                                                    title="Delete Master Subject"
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
