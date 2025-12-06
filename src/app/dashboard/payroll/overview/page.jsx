"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Users,
    Wallet,
    CircleDollarSign,
    Clock,
    AlertCircle,
    TrendingUp,
    ArrowRight,
    FileText,
    RefreshCw
} from "lucide-react";
import Link from "next/link";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const getStatusBadge = (status) => {
    const variants = {
        DRAFT: { variant: "secondary", label: "Draft" },
        PROCESSING: { variant: "outline", label: "Processing" },
        PENDING_APPROVAL: { variant: "warning", label: "Pending Approval" },
        APPROVED: { variant: "default", label: "Approved" },
        PAID: { variant: "success", label: "Paid" },
        CANCELLED: { variant: "destructive", label: "Cancelled" }
    };
    const config = variants[status] || { variant: "secondary", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
};

export default function PayrollOverview() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Fetch dashboard stats
    const { data: stats, isLoading, refetch } = useQuery({
        queryKey: ["payroll-dashboard", schoolId, selectedYear],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/dashboard?year=${selectedYear}`);
            if (!res.ok) throw new Error("Failed to fetch dashboard");
            return res.json();
        },
        enabled: !!schoolId,
    });

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-muted-foreground">Loading school information...</p>
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
                    <h1 className="text-2xl font-bold">Payroll Overview</h1>
                    <p className="text-muted-foreground">Monitor payroll operations and analytics</p>
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
                    <Link href="/dashboard/payroll/process">
                        <Button>
                            Run Payroll <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-white dark:bg-muted border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats?.overview?.activeEmployees || 0}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Teaching: {stats?.overview?.teachingCount || 0} | Non-Teaching: {stats?.overview?.nonTeachingCount || 0}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-muted border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Current Month Net</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(stats?.currentPeriod?.totalNet)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats?.currentPeriod ? getStatusBadge(stats.currentPeriod.status) : "No payroll"}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-muted border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Yearly Total (Net)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-28" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {formatCurrency(stats?.yearlyStats?.totalNet)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Avg: {formatCurrency(stats?.yearlyStats?.averageMonthly)}/month
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white dark:bg-muted border">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {(stats?.overview?.pendingApprovals || 0) + (stats?.overview?.pendingPayments || 0)}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats?.overview?.pendingApprovals || 0} approvals, {stats?.overview?.pendingPayments || 0} payments
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Trends */}
                <Card className="lg:col-span-2 bg-white dark:bg-muted border">
                    <CardHeader>
                        <CardTitle>Monthly Payroll Trends</CardTitle>
                        <CardDescription>Salary disbursement over the year</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                            </div>
                        ) : stats?.monthlyTrends?.length > 0 ? (
                            <div className="space-y-3">
                                {stats.monthlyTrends.map(trend => (
                                    <div key={`${trend.month}`} className="flex items-center gap-4 p-3 bg-background rounded-lg">
                                        <div className="w-12 text-center">
                                            <span className="text-sm font-medium">{trend.monthName}</span>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-sm text-muted-foreground">
                                                    {trend.employees} employees
                                                </span>
                                                <span className="text-sm font-medium">
                                                    {formatCurrency(trend.net)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white dark:bg-muted-foreground/20 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full transition-all"
                                                    style={{
                                                        width: stats.monthlyTrends.length > 0
                                                            ? `${(trend.net / Math.max(...stats.monthlyTrends.map(t => t.net || 1))) * 100}%`
                                                            : '0%'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {getStatusBadge(trend.status)}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                <p>No payroll data for {selectedYear}</p>
                                <Link href="/dashboard/payroll/process">
                                    <Button variant="link" className="mt-2">Run your first payroll</Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions & Stats */}
                <div className="space-y-6">
                    {/* Current Period */}
                    <Card className="bg-white dark:bg-muted border">
                        <CardHeader>
                            <CardTitle>Current Period</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-20 w-full" />
                            ) : stats?.currentPeriod ? (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Period</span>
                                        <span className="font-medium">
                                            {new Date(stats.currentPeriod.year, stats.currentPeriod.month - 1)
                                                .toLocaleString('default', { month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Status</span>
                                        {getStatusBadge(stats.currentPeriod.status)}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Employees</span>
                                        <span className="font-medium">{stats.currentPeriod.employeeCount}</span>
                                    </div>
                                    <Link href={`/dashboard/payroll/process/${stats.currentPeriod.id}`}>
                                        <Button variant="outline" className="w-full mt-3">
                                            View Details <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    <p>No active payroll period</p>
                                    <Link href="/dashboard/payroll/process">
                                        <Button variant="outline" className="mt-3">Create Period</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Loans Overview */}
                    <Card className="bg-white dark:bg-muted border">
                        <CardHeader>
                            <CardTitle>Active Loans</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-16 w-full" />
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Active Loans</span>
                                        <span className="font-medium">{stats?.overview?.activeLoans || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Pending Amount</span>
                                        <span className="font-medium">{formatCurrency(stats?.overview?.pendingLoanAmount)}</span>
                                    </div>
                                    <Link href="/dashboard/payroll/loans">
                                        <Button variant="outline" className="w-full mt-3 bg-muted!">
                                            Manage Loans <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Salary Structures */}
                    <Card className="bg-white dark:bg-muted border">
                        <CardHeader>
                            <CardTitle>Salary Structures</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <Skeleton className="h-20 w-full" />
                            ) : stats?.structureDistribution?.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.structureDistribution.slice(0, 4).map(structure => (
                                        <div key={structure.id} className="flex justify-between items-center py-2 border-b last:border-0">
                                            <span className="text-sm font-medium truncate max-w-[150px]">{structure.name}</span>
                                            <div className="text-right">
                                                <span className="text-sm text-muted-foreground">{structure.employeeCount} emp</span>
                                            </div>
                                        </div>
                                    ))}
                                    <Link href="/dashboard/payroll/salary-structures">
                                        <Button variant="link" className="w-full mt-2 p-0">View All</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    <p>No salary structures</p>
                                    <Link href="/dashboard/payroll/salary-structures">
                                        <Button variant="outline" className="mt-3">Create Structure</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
