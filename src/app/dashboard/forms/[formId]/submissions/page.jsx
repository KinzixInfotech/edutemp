"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Loader2, ArrowLeft, Download, Search, RotateCcw,
    ArrowUpDown, ChevronLeft, ChevronRight, GripVertical, FileText, FileSpreadsheet, Eye
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import * as XLSX from "xlsx";

export default function FormSubmissionsPage({ params }) {
    const { formId } = React.use(params);
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [search, setSearch] = useState("");

    // Table state
    const [sortColumn, setSortColumn] = useState("submittedAt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Fetch Form Details
    const { data: form, isLoading: formLoading } = useQuery({
        queryKey: ["form", formId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms/${formId}`);
            return res.data;
        },
        enabled: !!schoolId && !!formId,
    });

    // Fetch Submissions
    const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
        queryKey: ["form-submissions", formId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms/${formId}/submissions`);
            return res.data;
        },
        enabled: !!schoolId && !!formId,
    });

    // Filter, Sort, and Paginate
    const processedSubmissions = useMemo(() => {
        let filtered = [...submissions];

        // Filter
        if (search) {
            const lowerSearch = search.toLowerCase();
            filtered = filtered.filter(sub =>
                sub.applicantName?.toLowerCase().includes(lowerSearch) ||
                sub.applicantEmail?.toLowerCase().includes(lowerSearch) ||
                Object.values(sub.data || {}).some(val =>
                    String(val).toLowerCase().includes(lowerSearch)
                )
            );
        }

        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            switch (sortColumn) {
                case "name":
                    aVal = a.applicantName || "";
                    bVal = b.applicantName || "";
                    break;
                case "email":
                    aVal = a.applicantEmail || "";
                    bVal = b.applicantEmail || "";
                    break;
                case "submittedAt":
                    aVal = new Date(a.submittedAt).getTime();
                    bVal = new Date(b.submittedAt).getTime();
                    break;
                default:
                    aVal = new Date(a.submittedAt).getTime();
                    bVal = new Date(b.submittedAt).getTime();
            }

            if (typeof aVal === "string") {
                return sortDirection === "asc"
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [submissions, search, sortColumn, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(processedSubmissions.length / pageSize);
    const paginatedSubmissions = processedSubmissions.slice(
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

    // Helper to format values for export
    const formatExportValue = (value) => {
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join(', ');
        if (typeof value === 'object') {
            // Handle file upload objects
            if (value.url) return value.url;
            return JSON.stringify(value);
        }
        return String(value);
    };

    // Get field name from ID using form fields
    const getFieldName = (fieldId) => {
        const field = form?.fields?.find(f => f.id === fieldId);
        return field?.name || fieldId;
    };

    const exportToCSV = () => {
        if (!processedSubmissions.length) return;

        // Get all unique keys from data
        const dataKeys = Array.from(new Set(processedSubmissions.flatMap(s => Object.keys(s.data || {}))));

        // Map keys to readable names
        const headerNames = dataKeys.map(key => getFieldName(key));

        const headers = ["ID", "Name", "Email", "Submitted At", ...headerNames];
        const csvContent = [
            headers.map(h => `"${h}"`).join(","),
            ...processedSubmissions.map(s => {
                const row = [
                    s.id,
                    `"${s.applicantName || ''}"`,
                    s.applicantEmail || '',
                    format(new Date(s.submittedAt), "yyyy-MM-dd HH:mm:ss"),
                    ...dataKeys.map(key => `"${formatExportValue(s.data?.[key])}"`)
                ];
                return row.join(",");
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${form?.title || "submissions"}_export.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportToExcel = () => {
        if (!processedSubmissions.length) return;

        // Get all unique keys from data
        const dataKeys = Array.from(new Set(processedSubmissions.flatMap(s => Object.keys(s.data || {}))));

        // Prepare data for Excel with readable headers
        const excelData = processedSubmissions.map(s => {
            const row = {
                "ID": s.id,
                "Name": s.applicantName,
                "Email": s.applicantEmail,
                "Submitted At": format(new Date(s.submittedAt), "yyyy-MM-dd HH:mm:ss"),
            };
            dataKeys.forEach(key => {
                const fieldName = getFieldName(key);
                row[fieldName] = formatExportValue(s.data?.[key]);
            });
            return row;
        });

        // Create workbook and worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Submissions");

        // Generate and download
        XLSX.writeFile(wb, `${form?.title || "submissions"}_export.xlsx`);
    };

    // Table loading skeleton
    const TableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    if (formLoading && !form) return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/forms">
                        <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{form?.title}</h1>
                        <p className="text-muted-foreground">Manage and view all submissions</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportToCSV} disabled={!processedSubmissions.length}>
                        <Download className="mr-2 h-4 w-4" /> Export CSV
                    </Button>
                    <Button variant="outline" onClick={exportToExcel} disabled={!processedSubmissions.length}>
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-none border">
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or submission data..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="pl-10"
                            />
                        </div>
                        <Button variant="outline" onClick={() => { setSearch(""); setCurrentPage(1); }} disabled={!search}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Clear
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-none border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Submissions ({processedSubmissions.length})</CardTitle>
                            <CardDescription>
                                {submissions.length > 0
                                    ? `Showing ${processedSubmissions.length} of ${submissions.length} total records`
                                    : "No submissions found"}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows per page:</span>
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
                                <TableRow className="dark:bg-background/50 bg-muted/50">
                                    <TableHead className="w-[50px]">#</TableHead>
                                    <SortableHeader column="name">Name</SortableHeader>
                                    <SortableHeader column="email">Email</SortableHeader>
                                    <SortableHeader column="submittedAt">Submitted At</SortableHeader>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {submissionsLoading ? (
                                    <TableLoadingRows />
                                ) : paginatedSubmissions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-12">
                                            <div className="flex flex-col items-center gap-2">
                                                <FileText className="w-12 h-12 text-muted-foreground/50" />
                                                <p className="text-muted-foreground">No submissions found matching your search</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedSubmissions.map((sub, index) => (
                                        <TableRow key={sub.id} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? "bg-muted dark:bg-background/50" : ""}`}>
                                            <TableCell className="text-muted-foreground">{(currentPage - 1) * pageSize + index + 1}</TableCell>
                                            <TableCell className="font-medium">{sub.applicantName}</TableCell>
                                            <TableCell className="text-muted-foreground">{sub.applicantEmail}</TableCell>
                                            <TableCell className="text-muted-foreground">{format(new Date(sub.submittedAt), "MMM d, yyyy HH:mm")}</TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/dashboard/forms/${formId}/submissions/${sub.id}`}>
                                                        <Button variant="default" size="sm">
                                                            <Eye className="mr-1 h-3 w-3" /> View
                                                        </Button>
                                                    </Link>
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="outline" size="sm" onClick={() => setSelectedSubmission(sub)}>
                                                                Quick Preview
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                            <DialogHeader>
                                                                <DialogTitle>Submission Preview</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Applicant</p>
                                                                        <p className="font-medium">{sub.applicantName}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Email</p>
                                                                        <p className="font-medium">{sub.applicantEmail}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm text-muted-foreground">Submitted At</p>
                                                                        <p className="font-medium">{format(new Date(sub.submittedAt), "PPpp")}</p>
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h3 className="font-semibold mb-2">Form Data</h3>
                                                                    <div className="grid grid-cols-1 gap-2">
                                                                        {Object.entries(sub.data || {}).map(([key, value]) => (
                                                                            <div key={key} className="bg-muted p-3 rounded-md">
                                                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{key}</p>
                                                                                <p className="text-sm whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div className="pt-2 border-t">
                                                                    <Link href={`/dashboard/forms/${formId}/submissions/${sub.id}`}>
                                                                        <Button className="w-full">
                                                                            <Eye className="mr-2 h-4 w-4" /> View Full Details
                                                                        </Button>
                                                                    </Link>
                                                                </div>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
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
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedSubmissions.length)} of {processedSubmissions.length} submissions
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
