"use client";

import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Loader2, UserPlus, Eye, ArrowRight, Users, ClipboardCheck, Clock,
    CheckCircle, XCircle, Search, ArrowUpDown, ChevronLeft, ChevronRight,
    FileText
} from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { Label } from "@/components/ui/label";

export default function Applications() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    // State
    const [stageId, setStageId] = useState("All");
    const [formId, setFormId] = useState("ALL");
    const [search, setSearch] = useState("");
    const [admitDialogOpen, setAdmitDialogOpen] = useState(false);
    const [selectedAppForAdmission, setSelectedAppForAdmission] = useState(null);
    const [admissionData, setAdmissionData] = useState({ classId: "", admissionNumber: "" });
    const [admitting, setAdmitting] = useState(false);

    // Sorting & Pagination
    const [sortColumn, setSortColumn] = useState("submittedAt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const queryClient = useQueryClient();

    // Fetch Applications
    const { data: { applications = [], total } = {}, isLoading: appsLoading } = useQuery({
        queryKey: ["applications", schoolId, stageId, formId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (stageId && stageId !== "All") params.append("stageId", stageId);
            if (formId && formId !== "ALL") params.append("formId", formId);
            const res = await axios.get(`/api/schools/${schoolId}/admissions/applications?${params}`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Forms for Filter
    const { data: forms = [] } = useQuery({
        queryKey: ["admission-forms", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms?category=ADMISSION`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Stages for Filter
    const { data: stages = [] } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/admissions/stages`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Classes for Admission Dialog
    const { data: classes = [] } = useQuery({
        queryKey: ["classes", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/classes`);
            return res.data;
        },
        enabled: !!schoolId && admitDialogOpen,
    });

    // Stats
    const stats = useMemo(() => {
        const totalApps = applications.length;
        const pending = applications.filter(a =>
            a.currentStage?.name?.toLowerCase().includes("review") ||
            a.currentStage?.name?.toLowerCase().includes("pending")
        ).length;
        const inProgress = applications.filter(a =>
            a.currentStage?.name?.toLowerCase().includes("interview") ||
            a.currentStage?.name?.toLowerCase().includes("test")
        ).length;
        const enrolled = applications.filter(a =>
            a.currentStage?.name?.toLowerCase().includes("enrolled")
        ).length;
        const rejected = applications.filter(a =>
            a.currentStage?.name?.toLowerCase().includes("reject")
        ).length;
        return { totalApps, pending, inProgress, enrolled, rejected };
    }, [applications]);

    // Filter, Sort and Paginate
    const processedApps = useMemo(() => {
        let filtered = applications.filter(app =>
            app.applicantName?.toLowerCase().includes(search.toLowerCase()) ||
            app.applicantEmail?.toLowerCase().includes(search.toLowerCase())
        );

        filtered.sort((a, b) => {
            let aVal, bVal;
            switch (sortColumn) {
                case "name":
                    aVal = a.applicantName || "";
                    bVal = b.applicantName || "";
                    break;
                case "form":
                    aVal = a.form?.title || "";
                    bVal = b.form?.title || "";
                    break;
                case "stage":
                    aVal = a.currentStage?.name || "";
                    bVal = b.currentStage?.name || "";
                    break;
                case "submittedAt":
                default:
                    aVal = new Date(a.submittedAt).getTime();
                    bVal = new Date(b.submittedAt).getTime();
            }

            if (typeof aVal === "string") {
                return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [applications, search, sortColumn, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(processedApps.length / pageSize);
    const paginatedApps = processedApps.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(column);
            setSortDirection("asc");
        }
    };

    const SortableHeader = ({ column, children }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? "text-primary" : "text-muted-foreground/50"}`} />
            </div>
        </TableHead>
    );

    const admitStudentMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.post(`/api/schools/${schoolId}/admissions/admit`, data);
            return res.data;
        },
        onMutate: () => setAdmitting(true),
        onSuccess: (data) => {
            setAdmitting(false);
            setAdmitDialogOpen(false);
            setSelectedAppForAdmission(null);
            setAdmissionData({ classId: "", admissionNumber: "" });
            queryClient.invalidateQueries(["applications"]);
            toast.success("Student admitted successfully!");
            toast.message("Credentials Generated", {
                description: `Email: ${data.credentials.email}, Password: ${data.credentials.password}`,
                duration: 10000,
            });
        },
        onError: (error) => {
            setAdmitting(false);
            toast.error(error.response?.data?.error || "Failed to admit student");
        }
    });

    const handleAdmitClick = (app) => {
        setSelectedAppForAdmission(app);
        setAdmissionData({ classId: "", admissionNumber: `ADM-${Date.now().toString().slice(-6)}` });
        setAdmitDialogOpen(true);
    };

    const confirmAdmission = () => {
        if (!selectedAppForAdmission) return;
        admitStudentMutation.mutate({
            applicationId: selectedAppForAdmission.id,
            ...admissionData
        });
    };

    const getStageStyle = (stageName) => {
        if (!stageName) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
        const name = stageName.toLowerCase();
        if (name.includes("review") || name.includes("pending")) return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800";
        if (name.includes("interview") || name.includes("test")) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
        if (name.includes("offer")) return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800";
        if (name.includes("enrolled")) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800";
        if (name.includes("reject")) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800";
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700";
    };

    // Loading skeleton
    const TableLoadingRows = () => (
        <>
            {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Applications
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and process student admission applications.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalApps}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.pending}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.inProgress}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Enrolled</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.enrolled}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.rejected}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle>All Applications ({processedApps.length})</CardTitle>
                            <CardDescription>Filter and manage student applications</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                    className="pl-9 w-[200px]"
                                />
                            </div>
                            <Select value={stageId} onValueChange={(v) => { setStageId(v); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Stages</SelectItem>
                                    {Array.isArray(stages) && stages.map((stage) => (
                                        <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={formId} onValueChange={(v) => { setFormId(v); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Form" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Forms</SelectItem>
                                    {Array.isArray(forms) && forms.map((form) => (
                                        <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-[80px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="10">10</SelectItem>
                                    <SelectItem value="25">25</SelectItem>
                                    <SelectItem value="50">50</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 dark:bg-background/50">
                                    <SortableHeader column="name">Applicant</SortableHeader>
                                    <SortableHeader column="form">Form</SortableHeader>
                                    <SortableHeader column="submittedAt">Submitted</SortableHeader>
                                    <SortableHeader column="stage">Stage</SortableHeader>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {appsLoading ? (
                                    <TableLoadingRows />
                                ) : paginatedApps.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                            <p className="text-muted-foreground">No applications found matching your filters.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedApps.map((app) => (
                                        <TableRow key={app.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{app.applicantName}</span>
                                                    <span className="text-xs text-muted-foreground">{app.applicantEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{app.form?.title || "Unknown Form"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(app.submittedAt).toLocaleDateString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStageStyle(app.currentStage?.name)}>
                                                    {app.currentStage?.name || "Unknown"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`applications/${app.id}/view`}>
                                                        <Button size="sm" variant="ghost">
                                                            <Eye className="h-4 w-4 mr-1" /> View
                                                        </Button>
                                                    </Link>
                                                    {app.currentStage?.name !== "Enrolled" && app.currentStage?.name !== "Rejected" && (
                                                        <Button size="sm" onClick={() => handleAdmitClick(app)}>
                                                            <UserPlus className="h-4 w-4 mr-1" /> Admit
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, processedApps.length)} of {processedApps.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                </Button>
                                <span className="text-sm text-muted-foreground px-2">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages}
                                >
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Admit Student Dialog */}
            <Dialog open={admitDialogOpen} onOpenChange={setAdmitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Admit Student</DialogTitle>
                        <DialogDescription>
                            Create a student record for <strong>{selectedAppForAdmission?.applicantName}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Admission Number</Label>
                            <Input
                                value={admissionData.admissionNumber}
                                onChange={(e) => setAdmissionData({ ...admissionData, admissionNumber: e.target.value })}
                                placeholder="Enter admission number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Class</Label>
                            <Select
                                value={admissionData.classId}
                                onValueChange={(val) => setAdmissionData({ ...admissionData, classId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section ? `- ${cls.section}` : ""}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdmitDialogOpen(false)}>Cancel</Button>
                        <Button onClick={confirmAdmission} disabled={admitting}>
                            {admitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Admission
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}