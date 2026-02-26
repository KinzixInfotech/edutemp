'use client';
export const dynamic = 'force-dynamic';

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    XCircle, Users, Search, ArrowUpDown, ChevronLeft, ChevronRight,
    Download, Loader2, CalendarX, FileText, AlertTriangle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// Fetch stages to find the Rejected stage ID dynamically
async function fetchStages(schoolId) {
    const res = await fetch(`/api/schools/admissions/settings?schoolId=${schoolId}`);
    if (!res.ok) throw new Error("Failed to fetch stages");
    const data = await res.json();
    return data.stages || [];
}

// Fetch rejected applications by stage ID
async function fetchRejectedApplications(schoolId, stageId) {
    const res = await fetch(`/api/schools/${schoolId}/admissions/applications?stageId=${stageId}`);
    if (!res.ok) throw new Error("Failed to fetch rejected applications");
    return res.json();
}

export default function WaitlistRejected() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    // Search & Pagination
    const [search, setSearch] = useState("");
    const [sortColumn, setSortColumn] = useState("submittedAt");
    const [sortDirection, setSortDirection] = useState("desc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Excel download state
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    // Fetch stages → find rejected stage
    const { data: stages = [] } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: () => fetchStages(schoolId),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const rejectedStage = useMemo(
        () => stages.find(s => s.name?.toUpperCase().replace(/[^A-Z0-9]/g, '_') === 'REJECTED'),
        [stages]
    );

    // Fetch rejected applications
    const { data: { applications = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["rejectedApplications", schoolId, rejectedStage?.id],
        queryFn: () => fetchRejectedApplications(schoolId, rejectedStage.id),
        enabled: !!schoolId && !!rejectedStage?.id,
        staleTime: 2 * 60 * 1000,
    });

    // Stats
    const stats = useMemo(() => {
        const totalRejected = applications.length;
        const thisMonth = applications.filter(a => {
            const d = new Date(a.submittedAt);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;
        const withReason = applications.filter(a => {
            // Check stageHistory or notes for a rejection reason
            const data = a.data || {};
            return !!(data.rejectionReason || data.notes);
        }).length;
        return { totalRejected, thisMonth, withReason };
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
                case "email":
                    aVal = a.applicantEmail || "";
                    bVal = b.applicantEmail || "";
                    break;
                case "form":
                    aVal = a.form?.title || "";
                    bVal = b.form?.title || "";
                    break;
                case "submittedAt":
                default:
                    aVal = new Date(a.submittedAt || 0).getTime();
                    bVal = new Date(b.submittedAt || 0).getTime();
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

    // Excel Download — fetches ALL data (skips pagination), downloads as CSV
    const handleDownloadExcel = useCallback(async () => {
        if (downloading) return;
        setDownloading(true);
        setDownloadProgress(0);

        try {
            const allData = processedApps;
            const totalItems = allData.length;

            if (totalItems === 0) {
                toast.error("No data to download");
                return;
            }

            const BATCH_SIZE = 50;
            const csvRows = [
                ["#", "Name", "Email", "Form", "Submitted Date", "Stage"].join(",")
            ];

            for (let i = 0; i < totalItems; i += BATCH_SIZE) {
                const batch = allData.slice(i, i + BATCH_SIZE);
                batch.forEach((app, idx) => {
                    const row = [
                        i + idx + 1,
                        `"${(app.applicantName || "").replace(/"/g, '""')}"`,
                        `"${(app.applicantEmail || "").replace(/"/g, '""')}"`,
                        `"${(app.form?.title || "N/A").replace(/"/g, '""')}"`,
                        `"${app.submittedAt ? new Date(app.submittedAt).toLocaleDateString('en-IN') : "N/A"}"`,
                        `"${app.currentStage?.name || "Rejected"}"`,
                    ];
                    csvRows.push(row.join(","));
                });
                setDownloadProgress(Math.round(((i + BATCH_SIZE) / totalItems) * 100));
                await new Promise(r => setTimeout(r, 0));
            }

            setDownloadProgress(100);

            const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `rejected_applications_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            URL.revokeObjectURL(url);

            toast.success(`Downloaded ${totalItems} rejected applications`);
        } catch (err) {
            console.error(err);
            toast.error("Failed to download");
        } finally {
            setDownloading(false);
            setDownloadProgress(0);
        }
    }, [downloading, processedApps]);

    // Loading skeleton
    const TableLoadingRows = () => (
        <>
            {[...Array(5)].map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
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
                        <XCircle className="w-8 h-8 text-red-600" />
                        Rejected Applications
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Applications that have been rejected during the admission process.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalRejected}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <CalendarX className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.thisMonth}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">With Reason</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.withReason}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Data Table Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Rejected Applications ({processedApps.length})</CardTitle>
                            <CardDescription>View all rejected admission applications</CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={search}
                                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                    className="pl-9 w-[220px]"
                                />
                            </div>
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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDownloadExcel}
                                disabled={downloading || processedApps.length === 0}
                            >
                                {downloading ? (
                                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {downloadProgress}%</>
                                ) : (
                                    <><Download className="h-4 w-4 mr-2" /> Download Excel</>
                                )}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Download progress bar */}
                    {downloading && (
                        <div className="mb-4">
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-red-500 transition-all duration-300 rounded-full"
                                    style={{ width: `${downloadProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Preparing download... {downloadProgress}%
                            </p>
                        </div>
                    )}

                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50 dark:bg-background/50">
                                    <SortableHeader column="name">Applicant</SortableHeader>
                                    <SortableHeader column="form">Form</SortableHeader>
                                    <SortableHeader column="submittedAt">Submitted</SortableHeader>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableLoadingRows />
                                ) : paginatedApps.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12">
                                            <XCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                            <p className="text-muted-foreground">No rejected applications found.</p>
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
                                                    {app.submittedAt
                                                        ? new Date(app.submittedAt).toLocaleDateString('en-IN')
                                                        : "N/A"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800">
                                                    Rejected
                                                </Badge>
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
        </div>
    );
}