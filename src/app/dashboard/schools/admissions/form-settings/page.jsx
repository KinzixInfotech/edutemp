"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Loader2, Plus, FileText, Trash2, Edit, Link2,
    ArrowUpDown, ChevronLeft, ChevronRight, ClipboardList, CheckCircle, FileEdit, Users, ChevronDown, Search, RefreshCw
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";

export default function AdmissionFormsPage() {
    const { fullUser } = useAuth();
    const router = useRouter();
    const schoolId = fullUser?.schoolId;

    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newForm, setNewForm] = useState({
        title: "",
        description: "",
        category: "ADMISSION"
    });

    // Filter & Table state
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortColumn, setSortColumn] = useState("createdAt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        if (schoolId) {
            fetchForms();
        }
    }, [schoolId]);

    const fetchForms = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`/api/schools/${schoolId}/forms?category=ADMISSION`);
            setForms(response.data);
        } catch (error) {
            console.error("Error fetching forms:", error);
            toast.error("Failed to fetch admission forms");
        } finally {
            setLoading(false);
        }
    };

    const createForm = async () => {
        if (!newForm.title) {
            toast.error("Title is required");
            return;
        }
        setCreating(true);
        try {
            const res = await axios.post(`/api/schools/${schoolId}/forms`, {
                ...newForm,
                category: "ADMISSION"
            });
            toast.success("Form created! Redirecting to builder...");
            setCreateDialogOpen(false);
            setNewForm({ title: "", description: "", category: "ADMISSION" });
            router.push(`/dashboard/forms/builder/${res.data.id}`);
        } catch (error) {
            console.error("Error creating form:", error);
            toast.error("Failed to create form");
        } finally {
            setCreating(false);
        }
    };

    const deleteForm = async (formId) => {
        if (!confirm("Are you sure you want to delete this form? All applications will be lost.")) return;
        try {
            await axios.delete(`/api/schools/${schoolId}/forms/${formId}`);
            toast.success("Form deleted successfully");
            fetchForms();
        } catch (error) {
            console.error("Error deleting form:", error);
            toast.error("Failed to delete form");
        }
    };

    const copyFormUrl = (formId) => {
        const url = `${window.location.origin}/forms/${formId}`;
        navigator.clipboard.writeText(url);
        toast.success("Form URL copied to clipboard");
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "PUBLISHED": return "default";
            case "DRAFT": return "secondary";
            case "ARCHIVED": return "destructive";
            default: return "outline";
        }
    };

    const updateStatus = async (formId, newStatus) => {
        try {
            await axios.put(`/api/schools/${schoolId}/forms/${formId}`, { status: newStatus });
            toast.success(`Form status updated to ${newStatus}`);
            fetchForms();
        } catch (error) {
            console.error("Failed to update status", error);
            toast.error("Failed to update status");
        }
    };

    // Stats
    const stats = useMemo(() => {
        const totalForms = forms.length;
        const publishedForms = forms.filter(f => f.status === "PUBLISHED").length;
        const draftForms = forms.filter(f => f.status === "DRAFT").length;
        const totalSubmissions = forms.reduce((acc, f) => acc + (f._count?.applications || 0), 0);
        return { totalForms, publishedForms, draftForms, totalSubmissions };
    }, [forms]);

    // Filter, Sort and Paginate
    const processedForms = useMemo(() => {
        let filtered = [...forms];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(f =>
                f.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(f => f.status === statusFilter);
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            switch (sortColumn) {
                case "title":
                    aVal = a.title || "";
                    bVal = b.title || "";
                    break;
                case "status":
                    aVal = a.status || "";
                    bVal = b.status || "";
                    break;
                case "submissions":
                    aVal = a._count?.applications || 0;
                    bVal = b._count?.applications || 0;
                    break;
                case "createdAt":
                    aVal = new Date(a.createdAt).getTime();
                    bVal = new Date(b.createdAt).getTime();
                    break;
                default:
                    aVal = a.title || "";
                    bVal = b.title || "";
            }

            if (typeof aVal === "string") {
                return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [forms, searchQuery, statusFilter, sortColumn, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(processedForms.length / pageSize);
    const paginatedForms = processedForms.slice(
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

    // Loading skeleton
    const TableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ClipboardList className="w-8 h-8 text-primary" />
                        Admission Forms
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Create and manage admission forms for your school.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchForms} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Create New Form
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Admission Form</DialogTitle>
                                <DialogDescription>
                                    Enter the details for your new admission form. You can add fields in the builder.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Form Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., Admission Form 2026-27"
                                        value={newForm.title}
                                        onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Description (Optional)</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Brief description of the form..."
                                        value={newForm.description}
                                        onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                                <Button onClick={createForm} disabled={creating}>
                                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create & Open Builder
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Forms</CardTitle>
                        <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalForms}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Published</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.publishedForms}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                        <FileEdit className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.draftForms}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                        <Users className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{stats.totalSubmissions}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Admission Forms ({processedForms.length})</CardTitle>
                            <CardDescription>Manage your admission forms and view applications</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search forms..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                                <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="PUBLISHED">Published</SelectItem>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                <SelectTrigger className="w-20">
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
                                <TableRow className="bg-muted/50">
                                    <SortableHeader column="title">Title</SortableHeader>
                                    <SortableHeader column="status">Status</SortableHeader>
                                    <SortableHeader column="submissions">Applications</SortableHeader>
                                    <SortableHeader column="createdAt">Created</SortableHeader>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableLoadingRows />
                                ) : paginatedForms.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="w-12 h-12 text-muted-foreground/50" />
                                                <p className="text-muted-foreground">No admission forms found</p>
                                                <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                                                    <Plus className="w-4 h-4 mr-2" /> Create your first form
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedForms.map((form, index) => (
                                        <TableRow key={form.id} className={index % 2 === 0 ? "bg-muted/30" : ""}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{form.title}</span>
                                                    {form.description && (
                                                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{form.description}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Badge
                                                            variant={getStatusColor(form.status)}
                                                            className="cursor-pointer hover:opacity-80 transition-opacity flex items-center w-fit gap-1 pr-1"
                                                        >
                                                            {form.status}
                                                            <ChevronDown className="h-3 w-3 opacity-50" />
                                                        </Badge>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start">
                                                        <DropdownMenuItem onClick={() => updateStatus(form.id, "DRAFT")}>
                                                            Set as Draft
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateStatus(form.id, "PUBLISHED")}>
                                                            Publish Form
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => updateStatus(form.id, "ARCHIVED")} className="text-destructive">
                                                            Archive Form
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{form._count?.applications || 0}</TableCell>
                                            <TableCell className="text-muted-foreground">{format(new Date(form.createdAt), "MMM d, yyyy")}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => copyFormUrl(form.id)} title="Copy Public Link">
                                                        <Link2 className="h-4 w-4" />
                                                    </Button>
                                                    <Link href={`/dashboard/forms/${form.id}/submissions`}>
                                                        <Button variant="ghost" size="icon" title="View Applications">
                                                            <FileText className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/dashboard/forms/builder/${form.id}`}>
                                                        <Button variant="ghost" size="icon" title="Edit Form">
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteForm(form.id)} title="Delete Form">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
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
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedForms.length)} of {processedForms.length} forms
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}