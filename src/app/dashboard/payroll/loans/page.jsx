"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    RefreshCw,
    Wallet,
    HandCoins
} from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const getStatusBadge = (status) => {
    const configs = {
        PENDING_APPROVAL: { variant: "warning", label: "Pending" },
        ACTIVE: { variant: "default", label: "Active" },
        COMPLETED: { variant: "success", label: "Completed" },
        CANCELLED: { variant: "destructive", label: "Cancelled" },
    };
    const config = configs[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function LoansPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [showDialog, setShowDialog] = useState(false);
    const [statusFilter, setStatusFilter] = useState("all");

    // Fetch loans
    const { data: loans, isLoading, refetch } = useQuery({
        queryKey: ["payroll-loans", schoolId, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== "all") params.set("status", statusFilter);
            const res = await fetch(`/api/schools/${schoolId}/payroll/loans?${params}`);
            if (!res.ok) throw new Error("Failed to fetch loans");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch employees for new loan
    const { data: employees } = useQuery({
        queryKey: ["payroll-employees-active", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees?isActive=true`);
            if (!res.ok) throw new Error("Failed to fetch employees");
            return res.json();
        },
        enabled: !!schoolId && showDialog,
    });

    // Create loan mutation
    const createLoan = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/loans`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...data, approvedBy: fullUser?.id })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create loan");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success("Loan created successfully");
            queryClient.invalidateQueries(["payroll-loans"]);
            setShowDialog(false);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        createLoan.mutate({
            employeeId: formData.get("employeeId"),
            type: formData.get("type"),
            principalAmount: parseFloat(formData.get("principalAmount")),
            interestRate: parseFloat(formData.get("interestRate")) || 0,
            tenure: parseInt(formData.get("tenure")),
            startDate: formData.get("startDate"),
            remarks: formData.get("remarks"),
        });
    };

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading...</p></CardContent></Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Loans & Advances</h1>
                    <p className="text-muted-foreground">Manage employee loans and salary advances</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => setShowDialog(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Loan
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <HandCoins className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Active Loans</p>
                                <p className="text-2xl font-bold">{loans?.filter(l => l.status === 'ACTIVE').length || 0}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500/10 rounded-lg">
                                <Wallet className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(loans?.reduce((sum, l) => sum + (l.amountPending || 0), 0))}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500/10 rounded-lg">
                                <Wallet className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Total Recovered</p>
                                <p className="text-2xl font-bold">
                                    {formatCurrency(loans?.reduce((sum, l) => sum + (l.amountPaid || 0), 0))}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
            </Select>

            {/* Loans Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full" />)}
                </div>
            ) : loans?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loans.map(loan => (
                        <Card key={loan.id} className="border bg-white dark:bg-muted">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={loan.profilePicture} />
                                            <AvatarFallback>{loan.employeeName?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-base">{loan.employeeName}</CardTitle>
                                            <CardDescription>{loan.type.replace(/_/g, ' ')}</CardDescription>
                                        </div>
                                    </div>
                                    {getStatusBadge(loan.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">Principal</p>
                                        <p className="font-medium">{formatCurrency(loan.principalAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">EMI</p>
                                        <p className="font-medium">{formatCurrency(loan.emiAmount)}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Tenure</p>
                                        <p className="font-medium">{loan.tenure} months</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">Pending</p>
                                        <p className="font-medium text-orange-500">{formatCurrency(loan.amountPending)}</p>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span>Progress</span>
                                        <span>{loan.progress}%</span>
                                    </div>
                                    <Progress value={parseFloat(loan.progress)} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="border bg-white dark:bg-muted">
                    <CardContent className="py-12 text-center">
                        <HandCoins className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">No Loans</h3>
                        <p className="text-muted-foreground mb-4">Create employee loans or salary advances</p>
                        <Button onClick={() => setShowDialog(true)}>
                            <Plus className="mr-2 h-4 w-4" /> New Loan
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Create Loan Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Loan</DialogTitle>
                        <DialogDescription>Create a loan or salary advance for an employee</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Employee *</Label>
                                <Select name="employeeId" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {employees?.employees?.map(emp => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.name} ({emp.employeeId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Loan Type *</Label>
                                <Select name="type" defaultValue="SALARY_ADVANCE">
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SALARY_ADVANCE">Salary Advance</SelectItem>
                                        <SelectItem value="PERSONAL_LOAN">Personal Loan</SelectItem>
                                        <SelectItem value="EMERGENCY_LOAN">Emergency Loan</SelectItem>
                                        <SelectItem value="FESTIVAL_ADVANCE">Festival Advance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Principal Amount *</Label>
                                    <Input name="principalAmount" type="number" placeholder="10000" required />
                                </div>
                                <div>
                                    <Label>Interest Rate (%)</Label>
                                    <Input name="interestRate" type="number" step="0.01" placeholder="0" defaultValue="0" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Tenure (months) *</Label>
                                    <Input name="tenure" type="number" placeholder="6" required />
                                </div>
                                <div>
                                    <Label>Start Date *</Label>
                                    <Input name="startDate" type="date" required />
                                </div>
                            </div>
                            <div>
                                <Label>Remarks</Label>
                                <Input name="remarks" placeholder="Optional notes" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={createLoan.isPending}>
                                {createLoan.isPending ? "Creating..." : "Create Loan"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
