"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    RefreshCw,
    FileText,
    Download,
    Send,
    Eye
} from "lucide-react";
import { toast } from "sonner";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

export default function PayslipsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState("");

    // Fetch payslips
    const { data, isLoading, refetch } = useQuery({
        queryKey: ["payslips", schoolId, selectedYear, selectedMonth],
        queryFn: async () => {
            const params = new URLSearchParams({ year: selectedYear.toString() });
            if (selectedMonth) params.set("month", selectedMonth);
            const res = await fetch(`/api/schools/${schoolId}/payroll/payslips?${params}`);
            if (!res.ok) throw new Error("Failed to fetch payslips");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch approved periods for generating
    const { data: periods } = useQuery({
        queryKey: ["approved-periods", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods?status=APPROVED,PAID&limit=12`);
            if (!res.ok) throw new Error("Failed to fetch periods");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Generate payslips
    const generatePayslips = useMutation({
        mutationFn: async (periodId) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/payslips`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ periodId })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to generate payslips");
            }
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(`Generated ${data.summary?.generated} payslips`);
            queryClient.invalidateQueries(["payslips"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const months = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const payslips = data?.payslips || [];

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
                    <h1 className="text-2xl font-bold">Payslips</h1>
                    <p className="text-muted-foreground">Generate and manage employee payslips</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Generate Section */}
            <Card className="border bg-white dark:bg-muted">
                <CardHeader>
                    <CardTitle>Generate Payslips</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                            <Select onValueChange={(v) => generatePayslips.mutate(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select approved payroll period" />
                                </SelectTrigger>
                                <SelectContent>
                                    {periods?.filter(p => ['APPROVED', 'PAID'].includes(p.status)).map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.periodLabel} - {p.totalEmployees} employees
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {generatePayslips.isPending ? "Generating..." : "Select a period to generate payslips"}
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Filters */}
            <div className="flex gap-4">
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
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Months" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {months.map((month, idx) => (
                            <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Payslips Table */}
            <Card className="border bg-white dark:bg-muted">
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : payslips.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Period</TableHead>
                                    <TableHead>Net Salary</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payslips.map(payslip => (
                                    <TableRow key={payslip.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarImage src={payslip.profilePicture} />
                                                    <AvatarFallback>{payslip.employeeName?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium">{payslip.employeeName}</p>
                                                    <p className="text-sm text-muted-foreground">{payslip.employeeId_staff}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{payslip.periodLabel}</TableCell>
                                        <TableCell className="font-medium">{formatCurrency(payslip.netSalary)}</TableCell>
                                        <TableCell>
                                            <Badge variant={
                                                payslip.status === 'DOWNLOADED' ? 'success' :
                                                    payslip.status === 'SENT' ? 'default' : 'secondary'
                                            }>
                                                {payslip.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="ghost" size="sm">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>No payslips found</p>
                            <p className="text-sm">Generate payslips from an approved payroll period</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
