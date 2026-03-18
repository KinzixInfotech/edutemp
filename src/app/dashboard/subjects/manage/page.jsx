"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Loader2, Plus, Trash2, Search, BookOpen,
    FileSpreadsheet, Filter, Check, X, AlertTriangle,
    Settings2, Bookmark, Layers, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";

export default function ManageSubjectsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [masterSubjects, setMasterSubjects] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFetching, setIsFetching] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [classFilter, setClassFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [sortBy, setSortBy] = useState("name_asc");

    const [classes, setClasses] = useState([]);

    // Selection State
    const [selectedSubjects, setSelectedSubjects] = useState(new Set());
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (schoolId) {
            fetchData();
        }
    }, [schoolId]);

    useEffect(() => {
        filterAndSortSubjects();
        setSelectedSubjects(new Set()); // Clear selection when filters change
    }, [masterSubjects, searchTerm, classFilter, typeFilter, sortBy]);

    const fetchData = async () => {
        setIsFetching(true);
        try {
            const [subjectsRes, classesRes] = await Promise.all([
                axios.get(`/api/schools/${schoolId}/subjects/master`),
                axios.get(`/api/schools/${schoolId}/classes`),
            ]);
            setMasterSubjects(subjectsRes.data);

            // Adjust to classes API format (could be data array or object with data array)
            const classesData = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data.data || []);
            setClasses(classesData);
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch subjects");
        } finally {
            setLoading(false);
            setIsFetching(false);
        }
    };

    const filterAndSortSubjects = () => {
        let filtered = [...masterSubjects];

        // Search Filter
        if (searchTerm) {
            filtered = filtered.filter(
                (subject) =>
                    subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    subject.subjectCode?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Class Filter
        if (classFilter !== "all") {
            const clsId = parseInt(classFilter);
            filtered = filtered.filter(
                (subject) => subject.mappings?.some(m => m.classId === clsId)
            );
        }

        // Type Filter
        if (typeFilter !== "all") {
            filtered = filtered.filter((subject) => subject.type === typeFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === "name_asc") return a.subjectName.localeCompare(b.subjectName);
            if (sortBy === "name_desc") return b.subjectName.localeCompare(a.subjectName);
            return 0;
        });

        setFilteredSubjects(filtered);
    };

    // ─── Stats Calculation ──────────────────────────────────────────
    const stats = useMemo(() => {
        const total = masterSubjects.length;
        const core = masterSubjects.filter(s => s.type === "CORE").length;
        const optional = masterSubjects.filter(s => s.type === "OPTIONAL").length;
        const totalMappings = masterSubjects.reduce((acc, curr) => acc + (curr.mappings?.length || 0), 0);
        const unmapped = masterSubjects.filter(s => !s.mappings || s.mappings.length === 0).length;

        return { total, core, optional, totalMappings, unmapped };
    }, [masterSubjects]);

    // ─── Selection Handlers ────────────────────────────────────────
    const isAllSelected = filteredSubjects.length > 0 && selectedSubjects.size === filteredSubjects.length;

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedSubjects(new Set());
        } else {
            setSelectedSubjects(new Set(filteredSubjects.map(s => s.id)));
        }
    };

    const toggleSubject = (id) => {
        setSelectedSubjects(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const clearSelection = () => setSelectedSubjects(new Set());

    // ─── Deletion Handlers ─────────────────────────────────────────
    const handleConfirmDelete = async () => {
        setIsDeleting(true);
        try {
            const idsToDelete = Array.from(selectedSubjects);
            const promises = idsToDelete.map(id =>
                axios.delete(`/api/schools/${schoolId}/subjects/master/${id}`)
            );
            await Promise.all(promises);

            toast.success(`Deleted ${selectedSubjects.size} subject(s) successfully`);
            setDeleteDialogOpen(false);
            clearSelection();
            fetchData();
        } catch (error) {
            console.error("Error deleting subjects:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.error || "Failed to delete mapped subjects. Make sure they are not used in exams/timetables.";
            toast.error(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    };

    // ─── Export XLSX ───────────────────────────────────────────────
    const handleExportXLSX = useCallback(() => {
        try {
            if (filteredSubjects.length === 0) return toast.error("No data to export");

            toast.info("Preparing export...");
            const rows = [];

            filteredSubjects.forEach(sub => {
                if (!sub.mappings || sub.mappings.length === 0) {
                    rows.push({
                        'Subject Name': sub.subjectName,
                        'Code': sub.subjectCode || '—',
                        'Type': sub.type,
                        'Mapped Class': '—',
                        'Is Overridden': 'No'
                    });
                } else {
                    sub.mappings.forEach(m => {
                        rows.push({
                            'Subject Name': sub.subjectName,
                            'Code': sub.subjectCode || '—',
                            'Type': sub.type,
                            'Mapped Class': m.className,
                            'Is Overridden': m.isOverridden ? 'Yes' : 'No'
                        });
                    });
                }
            });

            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = Object.keys(rows[0]).map(k => ({
                wch: Math.max(k.length, ...rows.map(r => String(r[k]).length)) + 2
            }));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Subjects');
            XLSX.writeFile(wb, `Subjects_Overview_${new Date().toISOString().split('T')[0]}.xlsx`);
            toast.success("Report downloaded");
        } catch {
            toast.error("Failed to export data");
        }
    }, [filteredSubjects]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const hasSelection = selectedSubjects.size > 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6">

            {/* ─── Delete Confirmation AlertDialog ────────────────── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Deletion
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <p>
                                    You are about to permanently delete <strong className="text-foreground">{selectedSubjects.size} Master Subject(s)</strong>.
                                    This action <strong className="text-foreground">cannot be undone</strong>. All related class mappings will also be automatically removed.
                                </p>

                                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 inline mr-2" />
                                    <span className="text-xs text-amber-800 font-medium">
                                        Note: Deletion will fail if any of these subjects are actively used in exams, timetables, or homework assignments.
                                    </span>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                        >
                            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                            Delete {selectedSubjects.size} item{selectedSubjects.size !== 1 ? 's' : ''}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ─── Header ─────────────────────────────────────────── */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 text-blue-600 lg:h-8 flex-shrink-0" />
                        <span>Subject Management</span>
                    </h1>
                    <p className="text-xs sm:text-sm mt-2 text-muted-foreground">
                        Manage global master subjects and assign them across your school's classes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportXLSX} disabled={isFetching || filteredSubjects.length === 0}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" />
                        Export XLSX
                    </Button>
                    <Link href="/dashboard/subjects/create">
                        <Button className="dark:text-white" size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Create Subject
                        </Button>
                    </Link>
                </div>
            </div>

            <Separator />

            {/* ─── Stats Cards ────────────────────────────────────── */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Master Subjects</p>
                                <p className="text-2xl font-bold mt-1">{stats.total}</p>
                                <p className="text-xs text-muted-foreground mt-1">Total unique subjects</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Bookmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Core Subjects</p>
                                <p className="text-2xl font-bold mt-1">{stats.core}</p>
                                <p className="text-xs text-muted-foreground mt-1">Mandatory subjects</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                <BookOpen className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Optional Subjects</p>
                                <p className="text-2xl font-bold mt-1">{stats.optional}</p>
                                <p className="text-xs text-muted-foreground mt-1">Electives assigned</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Layers className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Mappings</p>
                                <p className="text-2xl font-bold mt-1">{stats.totalMappings}</p>
                                <p className="text-xs text-muted-foreground mt-1">Total distributed classes</p>
                            </div>
                            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="sm:hidden xl:block">
                    <CardContent className="pt-5 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unmapped</p>
                                <p className="text-2xl font-bold mt-1">{stats.unmapped}</p>
                                <p className="text-xs text-muted-foreground mt-1">Subjects without classes</p>
                            </div>
                            <div className={cn("h-10 w-10 rounded-full flex items-center justify-center", stats.unmapped > 0 ? "bg-amber-100 dark:bg-amber-900/30" : "bg-muted")}>
                                <AlertTriangle className={cn("h-5 w-5", stats.unmapped > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Filters Card ────────────────────────────────────── */}
            <Card>
                <CardContent className="pt-4 sm:pt-6">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or code..."
                                className="pl-9 text-sm bg-muted"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="bg-muted text-sm">
                                <Filter className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Subject Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="CORE">Core (Mandatory)</SelectItem>
                                <SelectItem value="OPTIONAL">Optional (Elective)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="bg-muted text-sm">
                                <Layers className="mr-2 h-4 w-4 flex-shrink-0" />
                                <SelectValue placeholder="Mapped Class" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any Class</SelectItem>
                                {classes.map((cls) => (
                                    <SelectItem key={cls.id} value={cls.id.toString()}>
                                        {cls.className}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="flex gap-2">
                            <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="bg-muted text-sm flex-1">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="name_asc">Name A-Z</SelectItem>
                                    <SelectItem value="name_desc">Name Z-A</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-muted px-3"
                                onClick={fetchData}
                                disabled={isFetching}
                            >
                                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ─── Subjects Table ──────────────────────────────────── */}
            <div className="border rounded-2xl bg-white dark:bg-muted/30">
                {/* ─── Bulk Action Bar ── */}
                {hasSelection && (
                    <div className="flex items-center justify-between px-4 py-2.5 bg-primary/5 border-b rounded-t-2xl">
                        <div className="flex items-center gap-2.5 text-sm">
                            <div className="flex items-center justify-center h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                                {selectedSubjects.size}
                            </div>
                            <span className="font-medium text-foreground">
                                {selectedSubjects.size} item{selectedSubjects.size !== 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={clearSelection}
                            >
                                <X className="h-3.5 w-3.5 mr-1" /> Clear
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => setDeleteDialogOpen(true)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete Selected
                            </Button>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                {/* Checkbox column */}
                                <TableHead className="w-10 pl-4">
                                    <Checkbox
                                        checked={isAllSelected && filteredSubjects.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                        aria-label="Select all subjects"
                                    />
                                </TableHead>
                                <TableHead className="w-[25%] font-medium">Subject Name</TableHead>
                                <TableHead className="w-[15%] font-medium">Code</TableHead>
                                <TableHead className="w-[10%] font-medium">Type</TableHead>
                                <TableHead className="w-[40%] font-medium">Mapped Classes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredSubjects.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <Settings2 className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                                        <h3 className="text-lg font-semibold mb-2 text-foreground">
                                            {searchTerm || classFilter !== 'all' || typeFilter !== 'all'
                                                ? 'No subjects match your filters'
                                                : 'No subjects created yet'}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            {searchTerm || classFilter !== 'all' || typeFilter !== 'all'
                                                ? 'Try adjusting your search criteria'
                                                : 'Create your first Master Subject to get started'}
                                        </p>
                                        {!searchTerm && classFilter === 'all' && typeFilter === 'all' && (
                                            <Link href="/dashboard/subjects/create">
                                                <Button size="sm">
                                                    <Plus className="mr-2 h-4 w-4" /> Create Subject
                                                </Button>
                                            </Link>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubjects.map((subject) => {
                                    const isSelected = selectedSubjects.has(subject.id);

                                    return (
                                        <TableRow
                                            key={subject.id}
                                            className={cn(
                                                "group cursor-pointer hover:bg-muted/40 transition-colors",
                                                isSelected && "bg-primary/5 hover:bg-primary/8"
                                            )}
                                            onClick={() => toggleSubject(subject.id)}
                                        >
                                            <TableCell className="pl-4 w-10 align-top pt-5" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleSubject(subject.id)}
                                                    aria-label={`Select subject ${subject.subjectName}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-semibold align-top pt-5 text-foreground">
                                                {subject.subjectName}
                                            </TableCell>
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
                                                    <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                        {subject.mappings.map(m => (
                                                            <Link key={m.mappingId} href={`/dashboard/subjects/create?id=${m.mappingId}`}>
                                                                <Badge
                                                                    variant={m.isOverridden ? "destructive" : "secondary"}
                                                                    className={cn(
                                                                        "text-xs font-medium cursor-pointer transition-colors hover:shadow-sm",
                                                                        !m.isOverridden && "bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                                                                    )}
                                                                    title={m.isOverridden ? "Custom overridden name/code. Click to edit." : "Standard mapping. Click to edit."}
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
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
