'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
    FileText,
    Download,
    Filter,
    Calendar,
    TrendingUp,
    AlertCircle,
    Loader2,
    Eye,
    Printer,
    Mail
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function FeeReports() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [reportType, setReportType] = useState('collection');
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Fetch academic years
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const academicYearId = academicYears?.find(y => y.isActive)?.id;

    // Fetch classes
    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch collection report
    const { data: collectionReport, isLoading: collectionLoading } = useQuery({
        queryKey: ['collection-report', schoolId, academicYearId, selectedClass, selectedSection, statusFilter, dateRange],
        queryFn: async () => {
            const params = new URLSearchParams({
                schoolId,
                academicYearId,
                ...(selectedClass !== 'all' && { classId: selectedClass }),
                ...(selectedSection !== 'all' && { sectionId: selectedSection }),
                ...(statusFilter !== 'all' && { status: statusFilter }),
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            });

            const res = await fetch(`/api/schools/fee/admin/reports/collection?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId && !!academicYearId && reportType === 'collection',
    });

    // Fetch overdue report
    const { data: overdueReport, isLoading: overdueLoading } = useQuery({
        queryKey: ['overdue-report', schoolId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ schoolId, academicYearId });
            const res = await fetch(`/api/schools/fee/admin/reports/overdue?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId && !!academicYearId && reportType === 'overdue',
    });

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleExport = (format) => {
        // Export logic here
        const data = reportType === 'collection' ? collectionReport : overdueReport;
        console.log('Exporting as', format, data);
    };

    const getStatusColor = (status) => {
        const colors = {
            PAID: 'bg-green-100 text-green-800',
            PARTIAL: 'bg-yellow-100 text-yellow-800',
            UNPAID: 'bg-blue-100 text-blue-800',
            OVERDUE: 'bg-red-100 text-red-800',
        };
        return colors[status] || colors.UNPAID;
    };

    const isLoading = reportType === 'collection' ? collectionLoading : overdueLoading;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <FileText className="w-8 h-8 text-purple-600" />
                        Fee Collection Reports
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Generate detailed fee reports and analytics
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('pdf')}>
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('excel')}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* Report Type Selection */}
            <Tabs value={reportType} onValueChange={setReportType} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="collection">Collection Report</TabsTrigger>
                    <TabsTrigger value="overdue">Overdue Report</TabsTrigger>
                    <TabsTrigger value="summary">Summary Report</TabsTrigger>
                    <TabsTrigger value="installments">Installment Report</TabsTrigger>
                </TabsList>

                {/* Filters Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="space-y-2">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>End Date</Label>
                                <Input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Class</Label>
                                <Select value={selectedClass} onValueChange={setSelectedClass}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Classes</SelectItem>
                                        {classes?.map((cls) => (
                                            <SelectItem key={cls.id} value={cls.id.toString()}>
                                                {cls.className}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Section</Label>
                                <Select value={selectedSection} onValueChange={setSelectedSection}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Sections</SelectItem>
                                        {classes?.find(c => c.id.toString() === selectedClass)?.sections?.map((sec) => (
                                            <SelectItem key={sec.id} value={sec.id.toString()}>
                                                {sec.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="PAID">Paid</SelectItem>
                                        <SelectItem value="PARTIAL">Partial</SelectItem>
                                        <SelectItem value="UNPAID">Unpaid</SelectItem>
                                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Collection Report */}
                <TabsContent value="collection">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Total Students</p>
                                            <p className="text-3xl font-bold mt-2">{collectionReport?.summary?.totalStudents || 0}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Total Expected</p>
                                            <p className="text-2xl font-bold mt-2">{formatCurrency(collectionReport?.summary?.totalExpected)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Total Collected</p>
                                            <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(collectionReport?.summary?.totalCollected)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Total Balance</p>
                                            <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(collectionReport?.summary?.totalBalance)}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Detailed Report */}
                            <Card className={'mt-5'}>
                                <CardHeader>
                                    <CardTitle>Student-wise Collection</CardTitle>
                                    <CardDescription>Detailed fee collection breakdown</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {collectionReport?.report?.map((student, idx) => (
                                            <div
                                                key={student.studentId}
                                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium">{student.name}</span>
                                                        <Badge variant="outline" className="text-xs">{student.class}</Badge>
                                                        <Badge className={getStatusColor(student.status)}>{student.status}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {student.admissionNo} • Roll: {student.rollNumber}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                                        <span>Expected: {formatCurrency(student.originalAmount)}</span>
                                                        {student.discountAmount > 0 && (
                                                            <span className="text-green-600">Discount: -{formatCurrency(student.discountAmount)}</span>
                                                        )}
                                                        <span>Final: {formatCurrency(student.finalAmount)}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-muted-foreground">Paid</p>
                                                    <p className="text-xl font-bold text-green-600">{formatCurrency(student.paidAmount)}</p>
                                                    <p className="text-sm text-red-600 mt-1">Balance: {formatCurrency(student.balanceAmount)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Overdue Report */}
                <TabsContent value="overdue">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin" />
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Overdue Students</p>
                                            <p className="text-3xl font-bold text-red-600 mt-2">
                                                {overdueReport?.summary?.totalOverdueStudents || 0}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Total Overdue Amount</p>
                                            <p className="text-2xl font-bold text-red-600 mt-2">
                                                {formatCurrency(overdueReport?.summary?.totalOverdueAmount)}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="text-center">
                                            <p className="text-sm text-muted-foreground">Avg Days Overdue</p>
                                            <p className="text-3xl font-bold mt-2">
                                                {overdueReport?.summary?.averageDaysPastDue || 0}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Aging Analysis */}
                            <Card className={'mt-5'}>
                                <CardHeader>
                                    <CardTitle>Aging Analysis</CardTitle>
                                    <CardDescription>Overdue payment aging buckets</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        {Object.entries(overdueReport?.agingAnalysis || {}).map(([bucket, data]) => (
                                            <div key={bucket} className="p-4 border rounded-lg">
                                                <p className="text-sm font-medium text-muted-foreground">{bucket}</p>
                                                <p className="text-2xl font-bold mt-2">{data.count}</p>
                                                <p className="text-sm text-red-600 mt-1">{formatCurrency(data.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Overdue List */}
                            <Card className={'mt-5'}>
                                <CardHeader>
                                    <CardTitle>Overdue Students Details</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {overdueReport?.report?.map((student) => (
                                            <div
                                                key={student.userId}
                                                className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium">{student.name}</span>
                                                        <Badge variant="destructive">
                                                            {student.overdueInstallments} Overdue
                                                        </Badge>
                                                        <Badge variant="outline">{student.agingBucket}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {student.admissionNo} • {student.class} • {student.section}
                                                    </p>
                                                    <p className="text-sm text-red-600 mt-1">
                                                        {student.daysPastDue} days overdue since {formatDate(student.oldestDueDate)}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-bold text-red-600">{formatCurrency(student.balanceAmount)}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <Button variant="outline" size="sm">
                                                            <Mail className="w-4 h-4 mr-1" />
                                                            Remind
                                                        </Button>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="w-4 h-4 mr-1" />
                                                            View
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* Summary Report */}
                <TabsContent value="summary">
                    <Card>
                        <CardHeader>
                            <CardTitle>Coming Soon</CardTitle>
                            <CardDescription>Comprehensive summary report with charts and graphs</CardDescription>
                        </CardHeader>
                        <CardContent className="py-12 text-center">
                            <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Summary report feature is under development</p>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Installment Report */}
                <TabsContent value="installments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Coming Soon</CardTitle>
                            <CardDescription>Installment-wise payment tracking report</CardDescription>
                        </CardHeader>
                        <CardContent className="py-12 text-center">
                            <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Installment report feature is under development</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}