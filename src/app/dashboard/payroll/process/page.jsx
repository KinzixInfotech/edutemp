"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
    Download
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

export default function PayrollProcess() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [newPeriodMonth, setNewPeriodMonth] = useState(currentMonth);
    const [newPeriodYear, setNewPeriodYear] = useState(currentYear);

    // Fetch periods
    const { data: periods, isLoading, refetch } = useQuery({
        queryKey: ["payroll-periods", schoolId, selectedYear],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods?year=${selectedYear}&limit=12`);
            if (!res.ok) throw new Error("Failed to fetch periods");
            return res.json();
        },
        enabled: !!schoolId,
    });

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
                <div>
                    <h1 className="text-2xl font-bold">Payroll Processing</h1>
                    <p className="text-muted-foreground">Create and manage monthly payroll cycles</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Period
                    </Button>
                </div>
            </div>

            {/* Periods Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            ) : periods?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {periods.map(period => {
                        const statusConfig = getStatusConfig(period.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <Card key={period.id} className="border bg-white dark:bg-muted">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-lg">{period.periodLabel}</CardTitle>
                                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Working Days</p>
                                            <p className="font-medium">{period.totalWorkingDays}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Employees</p>
                                            <p className="font-medium">{period.employeeCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Gross</p>
                                            <p className="font-medium">{formatCurrency(period.totalGrossSalary)}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Net</p>
                                            <p className="font-medium text-primary">{formatCurrency(period.totalNetSalary)}</p>
                                        </div>
                                    </div>

                                    {/* Action Buttons - Status Based */}
                                    <div className="flex flex-col gap-2">
                                        {/* Primary Actions Row */}
                                        <div className="flex gap-2">
                                            {period.status === "DRAFT" && (
                                                <Button
                                                    size="sm"
                                                    className="flex-1"
                                                    onClick={() => processPayroll.mutate(period.id)}
                                                    disabled={processPayroll.isPending}
                                                >
                                                    <Play className="h-4 w-4 mr-1" />
                                                    {processPayroll.isPending ? "Processing..." : "Process"}
                                                </Button>
                                            )}

                                            {period.status === "PENDING_APPROVAL" && (
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-orange-500 hover:bg-orange-600"
                                                    onClick={() => approvePayroll.mutate(period.id)}
                                                    disabled={approvePayroll.isPending}
                                                >
                                                    <CheckSquare className="h-4 w-4 mr-1" />
                                                    {approvePayroll.isPending ? "Approving..." : "Approve"}
                                                </Button>
                                            )}

                                            {period.status === "APPROVED" && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => downloadBankSlip(period.id, period.periodLabel)}
                                                    >
                                                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                                                        Bank Slip
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                                        onClick={() => confirmSettlement.mutate(period.id)}
                                                        disabled={confirmSettlement.isPending}
                                                    >
                                                        <Banknote className="h-4 w-4 mr-1" />
                                                        {confirmSettlement.isPending ? "Confirming..." : "Settle"}
                                                    </Button>
                                                </>
                                            )}

                                            {period.status === "PAID" && (
                                                <div className="flex-1 text-center py-1.5 text-sm text-green-600 font-medium bg-green-50 rounded-md">
                                                    ✓ Settled
                                                </div>
                                            )}

                                            <Link href={`/dashboard/payroll/process/${period.id}`} className={period.status === "PAID" ? "flex-1" : ""}>
                                                <Button variant="outline" size="sm" className="w-full">
                                                    <Eye className="h-4 w-4 mr-1" /> View
                                                </Button>
                                            </Link>
                                        </div>

                                        {/* Status Info */}
                                        {period.processedAt && (
                                            <p className="text-xs text-muted-foreground">
                                                Processed: {new Date(period.processedAt).toLocaleDateString('en-IN')}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="py-12 text-center">
                        <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Payroll Periods</h3>
                        <p className="text-muted-foreground mb-4">Create your first payroll period to start processing</p>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Create Period
                        </Button>
                    </CardContent>
                </Card>
            )}

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
