"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
    Calendar,
    History,
    Lock,
    Unlock,
    Eye,
    Download,
    CheckCircle,
    Clock,
    XCircle,
    FileText,
    Users,
    IndianRupee,
    AlertTriangle
} from "lucide-react";
import Link from "next/link";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const statusConfig = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Clock },
    PROCESSING: { label: "Processing", color: "bg-blue-100 text-blue-700", icon: Clock },
    PENDING_APPROVAL: { label: "Pending Approval", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
    APPROVED: { label: "Approved", color: "bg-green-100 text-green-700", icon: CheckCircle },
    PAID: { label: "Paid", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: XCircle }
};

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const formatCurrency = (amt) => `₹${(amt || 0).toLocaleString('en-IN')}`;

export default function PayrollHistory() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [selectedYear, setSelectedYear] = useState(currentYear);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["payroll-history", schoolId, selectedYear],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/periods?year=${selectedYear}`);
            if (!res.ok) throw new Error("Failed to fetch payroll history");
            return res.json();
        },
        enabled: !!schoolId
    });

    const periods = data?.periods || [];

    // Create a calendar view of the year
    const calendarData = months.map((month, idx) => {
        const period = periods.find(p => p.month === idx + 1);
        return {
            month: idx + 1,
            monthName: month,
            fullMonthName: fullMonths[idx],
            period: period || null
        };
    });

    const handleLock = async (periodId, lock = true) => {
        try {
            const url = `/api/schools/${schoolId}/payroll/periods/${periodId}/lock`;
            const method = lock ? 'POST' : 'DELETE';
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' },
            };

            if (lock) {
                options.body = JSON.stringify({
                    userId: fullUser?.id,
                    userName: fullUser?.name,
                    reason: 'Payroll finalized'
                });
            }

            const res = await fetch(
                lock ? url : `${url}?userId=${fullUser?.id}&userName=${encodeURIComponent(fullUser?.name)}&reason=Re-processing required`,
                options
            );

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error);
            }

            toast.success(lock ? 'Payroll locked' : 'Payroll unlocked');
            refetch();
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <History className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Payroll History</h1>
                        <p className="text-muted-foreground">View and manage past payroll periods</p>
                    </div>
                </div>

                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                    <SelectTrigger className="w-[120px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                                {year}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Year Summary Stats */}
            {!isLoading && periods.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Periods</p>
                                    <p className="text-xl font-bold">{periods.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-500/10 rounded-lg">
                                    <IndianRupee className="h-5 w-5 text-green-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Paid</p>
                                    <p className="text-xl font-bold">
                                        {formatCurrency(periods.filter(p => p.status === 'PAID').reduce((s, p) => s + p.totalNetSalary, 0))}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-500/10 rounded-lg">
                                    <Users className="h-5 w-5 text-purple-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Avg Employees/Month</p>
                                    <p className="text-xl font-bold">
                                        {Math.round(periods.reduce((s, p) => s + p.totalEmployees, 0) / (periods.length || 1))}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg">
                                    <Lock className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Locked Periods</p>
                                    <p className="text-xl font-bold">
                                        {periods.filter(p => p.isLocked).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Calendar View */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Year at a Glance - {selectedYear}</CardTitle>
                    <CardDescription>Quick overview of payroll status for each month</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {Array(12).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-24" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {calendarData.map((item) => {
                                const status = item.period?.status;
                                const config = status ? statusConfig[status] : null;

                                return (
                                    <div
                                        key={item.month}
                                        className={`p-3 rounded-lg border ${item.period ? 'bg-white dark:bg-muted' : 'bg-muted/30'} ${item.period?.isLocked ? 'border-orange-300' : 'border-gray-200'}`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-sm">{item.monthName}</span>
                                            {item.period?.isLocked && (
                                                <Lock className="h-3 w-3 text-orange-500" />
                                            )}
                                        </div>
                                        {item.period ? (
                                            <>
                                                <Badge variant="secondary" className={`text-xs ${config?.color}`}>
                                                    {config?.label}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {item.period.totalEmployees} employees
                                                </p>
                                            </>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">No payroll</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Detailed Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Payroll Periods</CardTitle>
                    <CardDescription>Detailed list of all payroll periods for {selectedYear}</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array(5).fill(0).map((_, i) => (
                                <Skeleton key={i} className="h-14" />
                            ))}
                        </div>
                    ) : periods.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No payroll periods found for {selectedYear}</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Period</TableHead>
                                        <TableHead>Employees</TableHead>
                                        <TableHead>Gross Salary</TableHead>
                                        <TableHead>Deductions</TableHead>
                                        <TableHead>Net Salary</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Locked</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {periods.sort((a, b) => b.month - a.month).map((period) => {
                                        const config = statusConfig[period.status];
                                        const StatusIcon = config?.icon || Clock;

                                        return (
                                            <TableRow key={period.id}>
                                                <TableCell className="font-medium">
                                                    {fullMonths[period.month - 1]} {period.year}
                                                </TableCell>
                                                <TableCell>{period.totalEmployees}</TableCell>
                                                <TableCell>{formatCurrency(period.totalGrossSalary)}</TableCell>
                                                <TableCell className="text-red-600">-{formatCurrency(period.totalDeductions)}</TableCell>
                                                <TableCell className="font-semibold">{formatCurrency(period.totalNetSalary)}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={config?.color}>
                                                        <StatusIcon className="h-3 w-3 mr-1" />
                                                        {config?.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {period.isLocked ? (
                                                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                                                            <Lock className="h-3 w-3 mr-1" /> Locked
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-sm">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Link href={`/dashboard/payroll/process/${period.id}`}>
                                                            <Button variant="ghost" size="sm">
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                        </Link>
                                                        {period.status === 'PAID' && !period.isLocked && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleLock(period.id, true)}
                                                                title="Lock payroll"
                                                            >
                                                                <Lock className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        {period.isLocked && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleLock(period.id, false)}
                                                                title="Unlock payroll"
                                                            >
                                                                <Unlock className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info Card */}
            <Card className="bg-muted/50 border-dashed">
                <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-orange-500/10 rounded-lg">
                            <Lock className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-medium">About Payroll Lock</h3>
                            <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• <strong>Locking</strong> prevents any modifications to the payroll period</li>
                                <li>• Lock your payroll after confirming bank transfers are complete</li>
                                <li>• Unlocking requires a reason and is logged in the audit trail</li>
                                <li>• Only payroll periods with <strong>PAID</strong> status can be locked</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
