"use client";

import { use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft,
    Play,
    CheckCircle,
    XCircle,
    Clock,
    IndianRupee,
    Users,
    Calendar,
    FileText,
    Download,
    FileSpreadsheet,
    Banknote,
    FileDown,
    Lock,
    Unlock,
    AlertTriangle
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

const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const statusConfig = {
    DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
    PROCESSING: { label: "Processing", variant: "warning", icon: Clock },
    PROCESSED: { label: "Processed", variant: "default", icon: CheckCircle },
    APPROVED: { label: "Approved", variant: "success", icon: CheckCircle },
    REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
    PAID: { label: "Paid", variant: "success", icon: CheckCircle }
};

export default function PayrollPeriodDetailPage({ params }) {
    const unwrappedParams = use(params);
    const periodId = unwrappedParams.id;

    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // Fetch period details
    const { data: period, isLoading, error } = useQuery({
        queryKey: ["payroll-period", schoolId, periodId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods/${periodId}`);
            if (!res.ok) throw new Error("Failed to fetch period");
            return res.json();
        },
        enabled: !!schoolId && !!periodId,
    });

    // Process payroll mutation
    const processMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods/${periodId}/process`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ processedBy: fullUser?.id })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to process");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Payroll processed successfully");
            queryClient.invalidateQueries(["payroll-period", schoolId, periodId]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Approve payroll mutation
    const approveMutation = useMutation({
        mutationFn: async (action) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods/${periodId}/approve`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to approve");
            }
            return res.json();
        },
        onSuccess: (_, action) => {
            toast.success(action === "APPROVE" ? "Payroll approved" : "Payroll rejected");
            queryClient.invalidateQueries(["payroll-period", schoolId, periodId]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Settlement mutation
    const settlementMutation = useMutation({
        mutationFn: async () => {
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
            queryClient.invalidateQueries(["payroll-period", schoolId, periodId]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Lock/Unlock mutation
    const lockMutation = useMutation({
        mutationFn: async (lock) => {
            const url = `/api/schools/${schoolId}/payroll/periods/${periodId}/lock`;
            if (lock) {
                const res = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: fullUser?.id,
                        userName: fullUser?.name,
                        reason: "Payroll finalized"
                    })
                });
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || "Failed to lock payroll");
                }
                return res.json();
            } else {
                const res = await fetch(
                    `${url}?userId=${fullUser?.id}&userName=${encodeURIComponent(fullUser?.name)}&reason=Re-processing required`,
                    { method: "DELETE" }
                );
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || "Failed to unlock payroll");
                }
                return res.json();
            }
        },
        onSuccess: (_, lock) => {
            toast.success(lock ? "Payroll locked" : "Payroll unlocked");
            queryClient.invalidateQueries(["payroll-period", schoolId, periodId]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Bank slip download handler
    const downloadBankSlip = async () => {
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
            a.download = `BankSlip_${period?.periodLabel?.replace(' ', '_') || periodId}.csv`;
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

    // PDF payslip download handler
    const downloadPayslipPDF = async (payslipId, employeeName) => {
        try {
            toast.loading(`Generating payslip for ${employeeName}...`);
            const res = await fetch(`/api/schools/${schoolId}/payroll/payslips/${payslipId}/pdf`);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to generate PDF");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Payslip_${employeeName?.replace(/\s/g, '_')}_${period?.periodLabel?.replace(' ', '_')}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast.dismiss();
            toast.success("Payslip downloaded!");
        } catch (error) {
            toast.dismiss();
            toast.error(error.message);
        }
    };

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card><CardContent className="p-6"><p>Loading...</p></CardContent></Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <Skeleton className="h-10 w-48" />
                <div className="grid grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    if (error || !period) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="text-muted-foreground mb-4">Period not found</p>
                        <Link href="/dashboard/payroll/process">
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Payroll
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const status = statusConfig[period.status] || statusConfig.DRAFT;
    const StatusIcon = status.icon;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/payroll/process">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">{period.periodLabel}</h1>
                            <Badge variant={status.variant}>
                                <StatusIcon className="mr-1 h-3 w-3" /> {status.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground">
                            {formatDate(period.startDate)} - {formatDate(period.endDate)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {period.status === "DRAFT" && (
                        <Button
                            onClick={() => processMutation.mutate()}
                            disabled={processMutation.isPending}
                        >
                            <Play className="mr-2 h-4 w-4" />
                            {processMutation.isPending ? "Processing..." : "Process Payroll"}
                        </Button>
                    )}
                    {(period.status === "PROCESSED" || period.status === "PENDING_APPROVAL") && (
                        <>
                            <Button
                                variant="destructive"
                                onClick={() => approveMutation.mutate("REJECT")}
                                disabled={approveMutation.isPending}
                            >
                                <XCircle className="mr-2 h-4 w-4" /> Reject
                            </Button>
                            <Button
                                onClick={() => approveMutation.mutate("APPROVE")}
                                disabled={approveMutation.isPending}
                            >
                                <CheckCircle className="mr-2 h-4 w-4" /> Approve
                            </Button>
                        </>
                    )}
                    {period.status === "APPROVED" && (
                        <>
                            <Button variant="outline" onClick={downloadBankSlip}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Bank Slip
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => settlementMutation.mutate()}
                                disabled={settlementMutation.isPending}
                            >
                                <Banknote className="mr-2 h-4 w-4" />
                                {settlementMutation.isPending ? "Confirming..." : "Confirm Settlement"}
                            </Button>
                        </>
                    )}
                    {period.status === "PAID" && (
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1.5 text-sm font-medium text-green-600 bg-green-50 rounded-md">
                                ✓ Settlement Confirmed
                            </span>
                            {period.isLocked && (
                                <span className="px-3 py-1.5 text-sm font-medium text-orange-600 bg-orange-50 rounded-md flex items-center gap-1">
                                    <Lock className="h-3 w-3" /> Locked
                                </span>
                            )}
                            <Button variant="outline" onClick={downloadBankSlip}>
                                <FileSpreadsheet className="mr-2 h-4 w-4" /> Bank Slip
                            </Button>
                            {!period.isLocked ? (
                                <Button
                                    variant="outline"
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                    onClick={() => lockMutation.mutate(true)}
                                    disabled={lockMutation.isPending}
                                >
                                    <Lock className="mr-2 h-4 w-4" />
                                    {lockMutation.isPending ? "Locking..." : "Lock Payroll"}
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    onClick={() => lockMutation.mutate(false)}
                                    disabled={lockMutation.isPending}
                                >
                                    <Unlock className="mr-2 h-4 w-4" />
                                    {lockMutation.isPending ? "Unlocking..." : "Unlock"}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Employees</p>
                                <p className="text-2xl font-bold">{period.summary?.totalEmployees || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <IndianRupee className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Gross</p>
                                <p className="text-2xl font-bold">{formatCurrency(period.summary?.totalGross)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/10 rounded-lg">
                                <IndianRupee className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Deductions</p>
                                <p className="text-2xl font-bold">{formatCurrency(period.summary?.totalDeductions)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <IndianRupee className="h-6 w-6 text-blue-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Net Payable</p>
                                <p className="text-2xl font-bold text-primary">{formatCurrency(period.summary?.totalNet)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payroll Items Table */}
            <Card className="border bg-white dark:bg-muted">
                <CardHeader>
                    <CardTitle>Payroll Items</CardTitle>
                    <CardDescription>
                        Individual salary breakdown for each employee
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {period.payrollItems?.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Working Days</TableHead>
                                    <TableHead className="text-right">Gross</TableHead>
                                    <TableHead className="text-right">Deductions</TableHead>
                                    <TableHead className="text-right">Net Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {period.payrollItems.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={item.profilePicture} />
                                                    <AvatarFallback>{item.employeeName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{item.employeeName}</p>
                                                    <p className="text-sm text-muted-foreground">{item.salaryStructureName}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{item.daysWorked || 0} / {period.totalWorkingDays || 0}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {item.daysAbsent > 0 && <span className="text-orange-500">Absent: {item.daysAbsent}</span>}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {formatCurrency(item.grossEarnings)}
                                        </TableCell>
                                        <TableCell className="text-right text-orange-500">
                                            -{formatCurrency(item.totalDeductions)}
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-primary">
                                            {formatCurrency(item.netSalary)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={item.paymentStatus === "PAID" || item.paymentStatus === "PROCESSED" ? "success" : "secondary"}>
                                                {item.paymentStatus}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {item.payslipId && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => downloadPayslipPDF(item.payslipId, item.employeeName)}
                                                    title="Download Payslip PDF"
                                                >
                                                    <FileDown className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No payroll items yet</p>
                            {period.status === "DRAFT" && (
                                <Button
                                    variant="link"
                                    onClick={() => processMutation.mutate()}
                                    disabled={processMutation.isPending}
                                >
                                    Process payroll to generate items
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Period Details */}
            <Card className="border bg-white dark:bg-muted">
                <CardHeader>
                    <CardTitle>Period Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <p className="text-sm text-muted-foreground">Month/Year</p>
                            <p className="font-medium">{period.month}/{period.year}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Working Days</p>
                            <p className="font-medium">{period.totalWorkingDays || "-"}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Payment Date</p>
                            <p className="font-medium">{formatDate(period.paymentDate)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Created</p>
                            <p className="font-medium">{formatDate(period.createdAt)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
