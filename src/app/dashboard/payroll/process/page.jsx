"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Plus,
    RefreshCw,
    Play,
    CheckCircle,
    XCircle,
    Clock,
    Eye,
    AlertCircle,
    FileSpreadsheet,
    CheckSquare,
    Banknote,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const getStatusConfig = (status) => {
    const configs = {
        DRAFT: { variant: "secondary", icon: Clock, label: "Draft", color: "text-muted-foreground" },
        PROCESSING: { variant: "outline", icon: RefreshCw, label: "Processing", color: "text-yellow-500" },
        PENDING_APPROVAL: { variant: "warning", icon: AlertCircle, label: "Pending Approval", color: "text-orange-500" },
        APPROVED: { variant: "default", icon: CheckCircle, label: "Approved", color: "text-blue-500" },
        PAID: { variant: "success", icon: CheckCircle, label: "Paid", color: "text-green-500" },
        CANCELLED: { variant: "destructive", icon: XCircle, label: "Cancelled", color: "text-red-500" }
    };
    return configs[status] || configs.DRAFT;
};

const ITEMS_PER_PAGE = 10;

export default function PayrollProcess() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newPeriodMonth, setNewPeriodMonth] = useState(currentMonth);
    const [newPeriodYear, setNewPeriodYear] = useState(currentYear);
    const [currentPage, setCurrentPage] = useState(1);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Fetch periods
    const { data: periods, isLoading, refetch } = useQuery({
        queryKey: ["payroll-periods", schoolId, selectedYear],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods?year=${selectedYear}&limit=50`);
            if (!res.ok) throw new Error("Failed to fetch periods");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Filter by status and month
    const filteredPeriods = periods?.filter(p => {
        const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
        const matchesMonth = selectedMonth === 'all' || p.month === parseInt(selectedMonth);
        return matchesStatus && matchesMonth;
    }) || [];

    // Calculate pagination on filtered results
    const totalPages = Math.ceil(filteredPeriods.length / ITEMS_PER_PAGE);
    const paginatedPeriods = filteredPeriods.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Create period mutation
    const createPeriod = useMutation({
        mutationFn: async ({ month, year }) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ month, year })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create period");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Payroll period created");
            queryClient.invalidateQueries(["payroll-periods"]);
            setShowCreateDialog(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Process payroll mutation
    const processPayroll = useMutation({
        mutationFn: async (periodId) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods/${periodId}/process`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ processedBy: fullUser?.id })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to process payroll");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(`Payroll processed: ${data.summary?.processed} employees`);
            queryClient.invalidateQueries(["payroll-periods"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Approve payroll mutation
    const approvePayroll = useMutation({
        mutationFn: async (periodId) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods/${periodId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ approvedBy: fullUser?.id })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to approve payroll");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Payroll approved successfully");
            queryClient.invalidateQueries(["payroll-periods"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Confirm settlement mutation
    const confirmSettlement = useMutation({
        mutationFn: async (periodId) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods/${periodId}/settlement`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    confirmedBy: fullUser?.id,
                    bankTransferReference: `REF-${Date.now()}`
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to confirm settlement");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Settlement confirmed! Employees notified.");
            queryClient.invalidateQueries(["payroll-periods"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Bank slip download handler
    const downloadBankSlip = async (periodId, periodLabel) => {
        try {
            toast.loading("Generating bank slip...");
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods/${periodId}/bank-slip?format=csv`);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to generate bank slip");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BankSlip_${periodLabel.replace(' ', '_')}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.dismiss();
            toast.success("Bank slip downloaded!");
        } catch (error) {
            toast.dismiss();
            toast.error(error.message);
        }
    };

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">Loading...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Banknote className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Payroll Processing</h1>
                        <p className="text-muted-foreground">Create and manage monthly payroll cycles</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={selectedYear.toString()} onValueChange={(v) => { setSelectedYear(parseInt(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="w-24 h-9">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-28 h-9">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {monthNames.map((month, idx) => (
                                <SelectItem key={idx + 1} value={(idx + 1).toString()}>{month}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
                        <SelectTrigger className="w-36 h-9">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="PAID">Paid</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetch()} className="h-9 w-9">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setShowCreateDialog(true)} className="h-9">
                        <Plus className="mr-2 h-4 w-4" /> New Period
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {!isLoading && periods?.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200/50">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Periods</p>
                                    <p className="text-2xl font-bold">{periods.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200/50">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Paid</p>
                                    <p className="text-2xl font-bold">{periods.filter(p => p.status === 'PAID').length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200/50">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <AlertCircle className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Pending</p>
                                    <p className="text-2xl font-bold">{periods.filter(p => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT').length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200/50">
                        <CardContent className="pt-4 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Banknote className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Disbursed</p>
                                    <p className="text-xl font-bold">{formatCurrency(periods.filter(p => p.status === 'PAID').reduce((sum, p) => sum + (p.totalNetSalary || 0), 0))}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Periods Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Payroll Periods ({filteredPeriods.length})</CardTitle>
                            <CardDescription>Manage and process monthly payroll</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                        </div>
                    ) : periods?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-[140px]">Period</TableHead>
                                        <TableHead className="w-[130px]">Status</TableHead>
                                        <TableHead className="text-center w-[100px]">Working Days</TableHead>
                                        <TableHead className="text-center w-[90px]">Employees</TableHead>
                                        <TableHead className="text-right w-[120px]">Gross</TableHead>
                                        <TableHead className="text-right w-[120px]">Net</TableHead>
                                        <TableHead className="text-right w-[180px]">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedPeriods.map(period => {
                                        const statusConfig = getStatusConfig(period.status);
                                        const StatusIcon = statusConfig.icon;

                                        return (
                                            <TableRow key={period.id} className="hover:bg-muted/30">
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{period.periodLabel}</p>
                                                        {period.processedAt && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Processed: {new Date(period.processedAt).toLocaleDateString('en-IN')}
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={statusConfig.variant} className="flex items-center w-fit gap-1">
                                                        <StatusIcon className="h-3 w-3" />
                                                        {statusConfig.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-medium">
                                                    {period.totalWorkingDays}
                                                </TableCell>
                                                <TableCell className="text-center font-medium">
                                                    {period.employeeCount}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(period.totalGrossSalary)}
                                                </TableCell>
                                                <TableCell className="text-right font-medium text-primary">
                                                    {formatCurrency(period.totalNetSalary)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-2">
                                                        {period.status === "DRAFT" && (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => processPayroll.mutate(period.id)}
                                                                disabled={processPayroll.isPending}
                                                            >
                                                                <Play className="h-3 w-3 mr-1" />
                                                                Process
                                                            </Button>
                                                        )}

                                                        {period.status === "PENDING_APPROVAL" && (
                                                            <Button
                                                                size="sm"
                                                                className="bg-orange-500 hover:bg-orange-600"
                                                                onClick={() => approvePayroll.mutate(period.id)}
                                                                disabled={approvePayroll.isPending}
                                                            >
                                                                <CheckSquare className="h-3 w-3 mr-1" />
                                                                Approve
                                                            </Button>
                                                        )}

                                                        {period.status === "APPROVED" && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => downloadBankSlip(period.id, period.periodLabel)}
                                                                >
                                                                    <FileSpreadsheet className="h-3 w-3 mr-1" />
                                                                    Slip
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-green-600 hover:bg-green-700"
                                                                    onClick={() => confirmSettlement.mutate(period.id)}
                                                                    disabled={confirmSettlement.isPending}
                                                                >
                                                                    <Banknote className="h-3 w-3 mr-1" />
                                                                    Settle
                                                                </Button>
                                                            </>
                                                        )}

                                                        {period.status === "PAID" && (
                                                            <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-50 rounded">
                                                                ✓ Settled
                                                            </span>
                                                        )}

                                                        <Link href={`/dashboard/payroll/process/${period.id}`}>
                                                            <Button variant="ghost" size="sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPeriods.length)} of {filteredPeriods.length} periods
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm font-medium px-3">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Payroll Periods</h3>
                            <p className="text-muted-foreground mb-4">Create your first payroll period to start processing</p>
                            <Button onClick={() => setShowCreateDialog(true)}>
                                <Plus className="mr-2 h-4 w-4" /> Create Period
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create Period Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Payroll Period</DialogTitle>
                        <DialogDescription>
                            Select the month and year for the new payroll period
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                        <div>
                            <Select value={newPeriodMonth.toString()} onValueChange={(v) => setNewPeriodMonth(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map((month, idx) => (
                                        <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Select value={newPeriodYear.toString()} onValueChange={(v) => setNewPeriodYear(parseInt(v))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[currentYear, currentYear + 1].map(year => (
                                        <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => createPeriod.mutate({ month: newPeriodMonth, year: newPeriodYear })}
                            disabled={createPeriod.isPending}
                        >
                            {createPeriod.isPending ? "Creating..." : "Create Period"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
