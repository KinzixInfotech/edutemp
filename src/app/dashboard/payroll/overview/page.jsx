"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Users,
    Wallet,
    IndianRupee,
    TrendingUp,
    AlertCircle,
    ArrowRight,
    FileText,
    RefreshCw,
    CheckCircle,
    Clock,
    Banknote,
    Download,
    Settings,
    Cake,
    Award,
    Scissors,
    Receipt,
    Building2
} from "lucide-react";
import Link from "next/link";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount || 0);
};

const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const getStatusBadge = (status) => {
    const variants = {
        DRAFT: { className: "bg-gray-100 text-gray-700", label: "Draft" },
        PROCESSING: { className: "bg-blue-100 text-blue-700", label: "Processing" },
        PENDING_APPROVAL: { className: "bg-yellow-100 text-yellow-700", label: "Pending" },
        APPROVED: { className: "bg-green-100 text-green-700", label: "Approved" },
        PAID: { className: "bg-emerald-100 text-emerald-700", label: "Paid" },
        CANCELLED: { className: "bg-red-100 text-red-700", label: "Cancelled" }
    };
    const config = variants[status] || variants.DRAFT;
    return <Badge className={config.className}>{config.label}</Badge>;
};

export default function PayrollOverview() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);

    // Fetch dashboard stats with caching
    const { data: stats, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["payroll-dashboard", schoolId, selectedYear],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/dashboard?year=${selectedYear}`);
            if (!res.ok) throw new Error("Failed to fetch dashboard");
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 2, // 2 minute stale time
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const {
        overview,
        summary,
        deductionSummary,
        recentProcessedPayroll,
        statusCounts,
        monthlyTrends,
        recentPayments,
        structureDistribution,
        upcomingBirthdays,
        upcomingAnniversaries
    } = stats || {};

    // Fetch pending requests count
    const { data: requestData } = useQuery({
        queryKey: ["payroll-requests", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/requests`);
            if (!res.ok) return { pendingCount: 0 };
            return res.json();
        },
        enabled: !!schoolId,
    });

    const pendingRequestCount = requestData?.pendingCount || 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Wallet className="w-8 h-8 text-green-600" />
                        Payroll Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Real-time payroll overview and analytics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                        <SelectTrigger className="w-28">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {[currentYear, currentYear - 1, currentYear - 2].map(year => (
                                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/dashboard/payroll/process">
                        <Button>
                            Run Payroll <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Pending Requests Alert */}
            {pendingRequestCount > 0 && (
                <Link href="/dashboard/payroll/requests">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between hover:bg-orange-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-full">
                                <AlertCircle className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-orange-900">Pending Profile Updates</h3>
                                <p className="text-sm text-orange-700">
                                    {pendingRequestCount} employee{pendingRequestCount !== 1 ? 's have' : ' has'} requested updates to their bank or ID details.
                                </p>
                            </div>
                        </div>
                        <Button size="sm" className="bg-orange-600 hover:bg-orange-700 text-white border-none shadow-sm">
                            Review Requests <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    </div>
                </Link>
            )}

            {/* Summary Cards - Gradient Style */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <IndianRupee className="w-8 h-8 opacity-80" />
                            <span className="text-2xl font-bold">{summary?.monthsProcessed || 0}</span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Total Gross ({selectedYear})</h3>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalGross)}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <CheckCircle className="w-8 h-8 opacity-80" />
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Total Net Paid</h3>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalNet)}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <AlertCircle className="w-8 h-8 opacity-80" />
                            <span className="text-sm bg-white/20 px-2 py-1 rounded">
                                {overview?.pendingApprovals || 0} Pending
                            </span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Total Deductions</h3>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalDeductions)}</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-2">
                            <Users className="w-8 h-8 opacity-80" />
                            <span className="text-sm bg-white/20 px-2 py-1 rounded">
                                {overview?.activeEmployees || 0} Active
                            </span>
                        </div>
                        <h3 className="text-sm font-medium opacity-90">Avg Monthly</h3>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.averageMonthly)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Status Breakdown Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-gray-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Draft</p>
                                <p className="text-2xl font-bold text-gray-600">{statusCounts?.draft || 0}</p>
                            </div>
                            <FileText className="w-10 h-10 text-gray-400 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-yellow-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending Approval</p>
                                <p className="text-2xl font-bold text-yellow-600">{statusCounts?.pendingApproval || 0}</p>
                            </div>
                            <Clock className="w-10 h-10 text-yellow-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-green-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Approved</p>
                                <p className="text-2xl font-bold text-green-600">{statusCounts?.approved || 0}</p>
                            </div>
                            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-emerald-500">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Paid / Settled</p>
                                <p className="text-2xl font-bold text-emerald-600">{statusCounts?.paid || 0}</p>
                            </div>
                            <Banknote className="w-10 h-10 text-emerald-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Processed Payroll Section */}
            {recentProcessedPayroll && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            <CardTitle className="text-lg">Recent Processed Payroll for {recentProcessedPayroll.monthName}, {recentProcessedPayroll.year}</CardTitle>
                        </div>
                        <Link href={`/dashboard/payroll/process/${recentProcessedPayroll.id}`}>
                            <Button variant="link" className="text-primary">View Details</Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="border-r pr-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">GROSS</p>
                                <p className="text-xl font-bold mt-1">{formatCurrency(recentProcessedPayroll.totalGross)}</p>
                            </div>
                            <div className="border-r pr-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">NET PAY</p>
                                <p className="text-xl font-bold mt-1 text-green-600">{formatCurrency(recentProcessedPayroll.totalNet)}</p>
                            </div>
                            <div className="border-r pr-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">PROCESSED ON</p>
                                <p className="text-xl font-bold mt-1">{formatDate(recentProcessedPayroll.processedAt)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">EMPLOYEES #</p>
                                <p className="text-xl font-bold mt-1">{recentProcessedPayroll.employeeCount}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Deduction Summary Section */}
            {deductionSummary && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Scissors className="w-5 h-5" />
                            <CardTitle className="text-lg">Deduction Summary ({selectedYear})</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="text-center p-4 border rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Receipt className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-sm font-medium">Tax</span>
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(deductionSummary.tax)}</p>
                                <Link href="/dashboard/payroll/reports?type=tax">
                                    <Button variant="link" size="sm" className="text-primary mt-1">View Details</Button>
                                </Link>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Building2 className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-sm font-medium">PF</span>
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(deductionSummary.pf)}</p>
                                <Link href="/dashboard/payroll/reports?type=pf">
                                    <Button variant="link" size="sm" className="text-primary mt-1">View Details</Button>
                                </Link>
                            </div>
                            <div className="text-center p-4 border rounded-lg">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <Receipt className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-sm font-medium">ESI</span>
                                </div>
                                <p className="text-2xl font-bold">{formatCurrency(deductionSummary.esi)}</p>
                                <Link href="/dashboard/payroll/reports?type=esi">
                                    <Button variant="link" size="sm" className="text-primary mt-1">View Details</Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Upcoming Birthdays & Anniversaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Cake className="w-5 h-5 text-pink-500" />
                            <CardTitle className="text-lg">Upcoming Birthdays</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {upcomingBirthdays?.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingBirthdays.map((birthday, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={birthday.profilePicture} />
                                            <AvatarFallback>{birthday.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium">{birthday.name}</p>
                                            <p className="text-sm text-muted-foreground">{birthday.date}</p>
                                        </div>
                                        {birthday.daysUntil === 0 && (
                                            <Badge className="bg-pink-100 text-pink-700">Today! 🎂</Badge>
                                        )}
                                        {birthday.daysUntil === 1 && (
                                            <Badge variant="outline">Tomorrow</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Cake className="mx-auto h-10 w-10 mb-2 opacity-30" />
                                <p>No upcoming birthdays in the next 30 days</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-amber-500" />
                            <CardTitle className="text-lg">Upcoming Anniversaries</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {upcomingAnniversaries?.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingAnniversaries.map((anniversary, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={anniversary.profilePicture} />
                                            <AvatarFallback>{anniversary.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-medium">{anniversary.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {anniversary.date}, {anniversary.yearsCompleted > 1 ? `${anniversary.yearsCompleted}nd` : '1st'} Work Anniversary
                                            </p>
                                        </div>
                                        {anniversary.daysUntil === 0 && (
                                            <Badge className="bg-amber-100 text-amber-700">Today! 🎉</Badge>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Award className="mx-auto h-10 w-10 mb-2 opacity-30" />
                                <p>No upcoming anniversaries in the next 30 days</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="trends" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
                    <TabsTrigger value="recent">Recent Payments</TabsTrigger>
                    <TabsTrigger value="structures">Salary Structures</TabsTrigger>
                    <TabsTrigger value="breakdown">Staff Breakdown</TabsTrigger>
                </TabsList>

                {/* Monthly Trends Tab */}
                <TabsContent value="trends">
                    <Card>
                        <CardHeader>
                            <CardTitle>Monthly Payroll Trends</CardTitle>
                            <CardDescription>Salary disbursement over {selectedYear}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {monthlyTrends?.length > 0 ? (
                                <div className="space-y-3">
                                    {monthlyTrends.map(trend => (
                                        <div key={trend.month} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                                            <div className="w-12 text-center">
                                                <span className="text-sm font-bold">{trend.monthName}</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-muted-foreground">
                                                        {trend.employees} employees
                                                    </span>
                                                    <span className="text-sm font-semibold">
                                                        {formatCurrency(trend.net)}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                                                        style={{
                                                            width: monthlyTrends.length > 0
                                                                ? `${(trend.net / Math.max(...monthlyTrends.map(t => t.net || 1))) * 100}%`
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
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No payroll data for {selectedYear}</p>
                                    <Link href="/dashboard/payroll/process">
                                        <Button variant="link" className="mt-2">Run your first payroll</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recent Payments Tab */}
                <TabsContent value="recent">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Salary Payments</CardTitle>
                            <CardDescription>Last 10 processed payments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {recentPayments?.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Period</TableHead>
                                            <TableHead>Paid On</TableHead>
                                            <TableHead className="text-right">Net Salary</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recentPayments.map((payment, idx) => (
                                            <TableRow key={payment.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/50'}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={payment.profilePicture} />
                                                            <AvatarFallback>{payment.employeeName?.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <span className="font-medium">{payment.employeeName}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {payment.employeeType === 'TEACHING' ? 'Teaching' : 'Non-Teaching'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(payment.year, payment.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                                                </TableCell>
                                                <TableCell>{formatDate(payment.paidAt)}</TableCell>
                                                <TableCell className="text-right font-semibold text-green-600">
                                                    {formatCurrency(payment.netSalary)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <Banknote className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No recent payments</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Salary Structures Tab */}
                <TabsContent value="structures">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Salary Structures</CardTitle>
                                <CardDescription>Distribution of employees by salary structure</CardDescription>
                            </div>
                            <Link href="/dashboard/payroll/salary-structures">
                                <Button variant="outline" size="sm">
                                    <Settings className="w-4 h-4 mr-2" /> Manage
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {structureDistribution?.length > 0 ? (
                                <div className="space-y-4">
                                    {structureDistribution.map(structure => (
                                        <div key={structure.id} className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="font-semibold">{structure.name}</h3>
                                                <Badge>{structure.employeeCount} Employees</Badge>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <p className="text-muted-foreground">Base Gross Salary</p>
                                                    <p className="font-semibold text-green-600">{formatCurrency(structure.grossSalary)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground">Monthly Payroll Impact</p>
                                                    <p className="font-semibold">{formatCurrency(structure.grossSalary * structure.employeeCount)}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-primary h-2 rounded-full"
                                                        style={{
                                                            width: `${Math.min(100, (structure.employeeCount / (overview?.activeEmployees || 1)) * 100)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
                                    <p>No salary structures defined</p>
                                    <Link href="/dashboard/payroll/salary-structures">
                                        <Button variant="outline" className="mt-3">Create Structure</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Staff Breakdown Tab */}
                <TabsContent value="breakdown">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff Type Distribution</CardTitle>
                            <CardDescription>Teaching vs Non-Teaching staff</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-blue-500 rounded-full" />
                                        <div>
                                            <p className="font-medium">Teaching Staff</p>
                                            <p className="text-sm text-muted-foreground">Teachers & Instructors</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold">{overview?.teachingCount || 0}</p>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-4 h-4 bg-purple-500 rounded-full" />
                                        <div>
                                            <p className="font-medium">Non-Teaching Staff</p>
                                            <p className="text-sm text-muted-foreground">Administrative & Support</p>
                                        </div>
                                    </div>
                                    <p className="text-2xl font-bold">{overview?.nonTeachingCount || 0}</p>
                                </div>
                                <div className="pt-4 border-t">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Total Active Employees</span>
                                        <span className="text-xl font-bold">{overview?.activeEmployees || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/dashboard/payroll/employees">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-6 flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="font-medium">Employees</p>
                                <p className="text-sm text-muted-foreground">Manage staff profiles</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/payroll/loans">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-6 flex items-center gap-3">
                            <Banknote className="w-8 h-8 text-green-500" />
                            <div>
                                <p className="font-medium">Loans</p>
                                <p className="text-sm text-muted-foreground">{overview?.activeLoans || 0} active</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/payroll/reports">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-6 flex items-center gap-3">
                            <Download className="w-8 h-8 text-purple-500" />
                            <div>
                                <p className="font-medium">Reports</p>
                                <p className="text-sm text-muted-foreground">Export & analytics</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/dashboard/payroll/settings">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="pt-6 flex items-center gap-3">
                            <Settings className="w-8 h-8 text-gray-500" />
                            <div>
                                <p className="font-medium">Settings</p>
                                <p className="text-sm text-muted-foreground">Configure payroll</p>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
