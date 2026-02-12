'use client';

import { useState, useMemo } from 'react';
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

    // Smart start date: Apr 1 of current academic year
    // If we're in Jan-Mar, academic year started last Apr
    const getAcademicYearStart = () => {
        const now = new Date();
        const year = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear(); // month 0=Jan, 3=Apr
        return new Date(year, 3, 1).toISOString().split('T')[0];
    };

    const [dateRange, setDateRange] = useState({
        startDate: getAcademicYearStart(),
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

    // Class-wise summary computed from collection data
    const classSummary = useMemo(() => {
        if (!collectionReport?.report) return [];
        const map = {};
        collectionReport.report.forEach(s => {
            const cls = s.class || 'Unknown';
            if (!map[cls]) map[cls] = { className: cls, students: 0, expected: 0, collected: 0, balance: 0, discount: 0, paid: 0, partial: 0, unpaid: 0 };
            map[cls].students++;
            map[cls].expected += s.originalAmount || 0;
            map[cls].collected += s.paidAmount || 0;
            map[cls].balance += s.balanceAmount || 0;
            map[cls].discount += s.discountAmount || 0;
            if (s.status === 'PAID') map[cls].paid++;
            else if (s.status === 'PARTIAL') map[cls].partial++;
            else map[cls].unpaid++;
        });
        return Object.values(map).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
    }, [collectionReport]);

    // Installment-level aggregation from collection data
    const installmentSummary = useMemo(() => {
        if (!collectionReport?.report) return [];
        const map = {};
        collectionReport.report.forEach(s => {
            s.installments?.forEach(inst => {
                const key = inst.number;
                if (!map[key]) map[key] = { number: key, total: 0, paid: 0, partial: 0, unpaid: 0, overdue: 0, amount: 0, collected: 0 };
                map[key].total++;
                map[key].amount += inst.amount || 0;
                map[key].collected += inst.paidAmount || 0;
                if (inst.status === 'PAID') map[key].paid++;
                else if (inst.status === 'PARTIAL') map[key].partial++;
                else if (inst.isOverdue) map[key].overdue++;
                else map[key].unpaid++;
            });
        });
        return Object.values(map).sort((a, b) => a.number - b.number);
    }, [collectionReport]);

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
                                            <p className="text-sm text-muted-foreground">Total  Fees Expected</p>
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
                                            <p className="text-sm text-muted-foreground">Total Fees Due</p>
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
                                                    <p className="text-sm text-red-600 mt-1">Fees Due: {formatCurrency(student.balanceAmount)}</p>
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
                                                        <span className="font-medium dark:text-gray-700">{student.name}</span>
                                                        <Badge variant="destructive" className={'dark:text-red-700'}>
                                                            {student.overdueInstallments} Overdue
                                                        </Badge>
                                                        <Badge variant="outline" className={'dark:text-black dark:border-black'}>{student.agingBucket}</Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground">
                                                        {student.admissionNo} • {student.class?.className} • {student.section?.name}
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
                    {collectionLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin" />
                        </div>
                    ) : classSummary.length > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Class-wise Fee Summary</CardTitle>
                                <CardDescription>Collection breakdown by class</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {classSummary.map((cls) => {
                                        const collectionRate = cls.expected > 0 ? Math.round((cls.collected / cls.expected) * 100) : 0;
                                        return (
                                            <div key={cls.className} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div>
                                                        <p className="font-semibold text-lg">{cls.className}</p>
                                                        <p className="text-sm text-muted-foreground">{cls.students} students</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm text-muted-foreground">Collection Rate</p>
                                                        <p className={`text-2xl font-bold ${collectionRate >= 80 ? 'text-green-600' : collectionRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                            {collectionRate}%
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${collectionRate >= 80 ? 'bg-green-500' : collectionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${collectionRate}%` }}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-4 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-muted-foreground">Expected</p>
                                                        <p className="font-medium">{formatCurrency(cls.expected)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Collected</p>
                                                        <p className="font-medium text-green-600">{formatCurrency(cls.collected)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Balance</p>
                                                        <p className="font-medium text-red-600">{formatCurrency(cls.balance)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Status</p>
                                                        <p className="text-xs">
                                                            <span className="text-green-600">{cls.paid} Paid</span> •{' '}
                                                            <span className="text-yellow-600">{cls.partial} Partial</span> •{' '}
                                                            <span className="text-red-600">{cls.unpaid} Unpaid</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <TrendingUp className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No data available for the selected filters</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* Installment Report */}
                <TabsContent value="installments">
                    {collectionLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin" />
                        </div>
                    ) : installmentSummary.length > 0 ? (
                        <Card>
                            <CardHeader>
                                <CardTitle>Installment-wise Status</CardTitle>
                                <CardDescription>Payment status breakdown by installment number</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {installmentSummary.map((inst) => {
                                        const collectionRate = inst.amount > 0 ? Math.round((inst.collected / inst.amount) * 100) : 0;
                                        return (
                                            <div key={inst.number} className="p-4 border rounded-lg">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                                                            {inst.number}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold">Installment {inst.number}</p>
                                                            <p className="text-sm text-muted-foreground">{inst.total} students</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-lg">{formatCurrency(inst.amount)}</p>
                                                        <p className="text-sm text-green-600">Collected: {formatCurrency(inst.collected)}</p>
                                                    </div>
                                                </div>
                                                {/* Progress */}
                                                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${collectionRate >= 80 ? 'bg-green-500' : collectionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                        style={{ width: `${collectionRate}%` }}
                                                    />
                                                </div>
                                                <div className="flex gap-3 text-xs">
                                                    <Badge className="bg-green-100 text-green-800">{inst.paid} Paid</Badge>
                                                    <Badge className="bg-yellow-100 text-yellow-800">{inst.partial} Partial</Badge>
                                                    <Badge className="bg-blue-100 text-blue-800">{inst.unpaid} Pending</Badge>
                                                    {inst.overdue > 0 && <Badge className="bg-red-100 text-red-800">{inst.overdue} Overdue</Badge>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No installment data available for the selected filters</p>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}