'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    FileText, Download, TrendingUp, Users, Calendar, Award,
    BarChart3, AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import {
    exportSummaryToExcel,
    exportMonthlyToExcel,
    exportClassWiseToExcel,
    exportStudentWiseToExcel,
    exportTeacherToExcel,
    exportDefaultersToExcel,
    exportLeaveAnalysisToExcel
} from '@/lib/exportUtils';

export default function AttendanceReports() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [reportType, setReportType] = useState('SUMMARY');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });
    const [classFilter, setClassFilter] = useState('');
    const [sectionFilter, setSectionFilter] = useState('');

    // Pagination state for each tab
    const [monthlyPage, setMonthlyPage] = useState(1);
    const [studentPage, setStudentPage] = useState(1);
    const [teacherPage, setTeacherPage] = useState(1);
    const [defaulterPage, setDefaulterPage] = useState(1);
    const [leavePage, setLeavePage] = useState(1);
    const [classPage, setClassPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const PAGE_SIZE = 10;

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['attendance-report', schoolId, reportType, dateRange, classFilter, sectionFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                reportType,
                startDate: dateRange.start,
                endDate: dateRange.end,
                ...(classFilter && { classId: classFilter }),
                ...(sectionFilter && { sectionId: sectionFilter })
            });

            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/reports?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId && !!dateRange.start && !!dateRange.end,
        staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
        cacheTime: 10 * 60 * 1000, // Keep cached data for 10 minutes
        refetchOnWindowFocus: false, // Don't refetch when window regains focus
        refetchOnMount: false, // Don't refetch on component mount if data exists
        refetchOnReconnect: false, // Don't refetch on internet reconnect
    });

    // Fetch classes for filter
    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/classes`);
            return res.json();
        },
        enabled: !!schoolId
    });

    const handleExport = (format) => {
        console.log('Export called with format:', format, 'Report type:', reportType);
        console.log('Data available:', !!data);

        if (!data) {
            toast.error('No data to export');
            return;
        }

        try {
            if (format === 'EXCEL') {
                console.log('Starting Excel export for:', reportType);

                switch (reportType) {
                    case 'SUMMARY':
                        exportSummaryToExcel(data, dateRange);
                        break;
                    case 'MONTHLY':
                        exportMonthlyToExcel(data, dateRange);
                        break;
                    case 'CLASS_WISE':
                        exportClassWiseToExcel(data, dateRange);
                        break;
                    case 'STUDENT_WISE':
                        exportStudentWiseToExcel(data, dateRange);
                        break;
                    case 'TEACHER_PERFORMANCE':
                        exportTeacherToExcel(data, dateRange);
                        break;
                    case 'DEFAULTERS':
                        console.log('Exporting defaulters:', data.defaulters?.length, 'records');
                        exportDefaultersToExcel(data, dateRange);
                        break;
                    case 'LEAVE_ANALYSIS':
                        exportLeaveAnalysisToExcel(data, dateRange);
                        break;
                    default:
                        toast.error('Invalid report type');
                        return;
                }

                console.log('Export function completed');
                toast.success('Excel file downloaded successfully!');
            } else if (format === 'PDF') {
                toast.info('PDF export coming soon!');
            }
        } catch (error) {
            console.error('Export error:', error);
            toast.error(`Failed to export report: ${error.message}`);
        }
    };

    // Pagination component
    const Pagination = ({ current, total, totalItems, onChange }) => {
        if (total <= 1) return null;
        const startItem = (current - 1) * PAGE_SIZE + 1;
        const endItem = Math.min(current * PAGE_SIZE, totalItems);

        return (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                    Showing {startItem} to {endItem} of {totalItems}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onChange(Math.max(1, current - 1))}
                        disabled={current === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, total) }, (_, i) => {
                        let pageNum;
                        if (total <= 5) {
                            pageNum = i + 1;
                        } else if (current <= 3) {
                            pageNum = i + 1;
                        } else if (current >= total - 2) {
                            pageNum = total - 4 + i;
                        } else {
                            pageNum = current - 2 + i;
                        }
                        return (
                            <Button
                                key={pageNum}
                                variant={current === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => onChange(pageNum)}
                                className="w-8 h-8 p-0"
                            >
                                {pageNum}
                            </Button>
                        );
                    })}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onChange(Math.min(total, current + 1))}
                        disabled={current === total}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    };

    if (isLoading || isFetching) {
        return (
            <div className="flex flex-col items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-muted-foreground">Loading report data...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Attendance Reports
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Generate and export detailed attendance reports
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleExport('PDF')}>
                        <Download className="w-4 h-4 mr-2" />
                        Export PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('EXCEL')}>
                        <Download className="w-4 h-4 mr-2" />
                        Export Excel
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Report Configuration</CardTitle>
                    <CardDescription>Select report type, date range, and filters</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <Select
                            value={reportType}
                            onValueChange={(value) => {
                                setReportType(value);
                                toast.info(`Switched to ${value.replace(/_/g, ' ')} report`);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Report Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="SUMMARY">Summary Report</SelectItem>
                                <SelectItem value="MONTHLY">Monthly Report</SelectItem>
                                <SelectItem value="CLASS_WISE">Class-wise Report</SelectItem>
                                <SelectItem value="STUDENT_WISE">Student-wise Report</SelectItem>
                                <SelectItem value="TEACHER_PERFORMANCE">Teacher Performance</SelectItem>
                                <SelectItem value="DEFAULTERS">Defaulters Report</SelectItem>
                                <SelectItem value="LEAVE_ANALYSIS">Leave Analysis</SelectItem>
                            </SelectContent>
                        </Select>

                        <Input
                            type="date"
                            label="Start Date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />

                        <Input
                            type="date"
                            label="End Date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />

                        {(reportType === 'CLASS_WISE' || reportType === 'STUDENT_WISE') && (
                            <Select value={classFilter} onValueChange={setClassFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Classes" />
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
                        )}

                        <Button
                            onClick={() => {
                                toast.loading('Generating report...');
                                refetch().then(() => {
                                    toast.dismiss();
                                    toast.success('Report generated successfully!', {
                                        description: `${reportType.replace(/_/g, ' ')} report is ready. Click Export Excel or PDF button above to download.`,
                                        duration: 5000,
                                    });
                                }).catch(() => {
                                    toast.dismiss();
                                    toast.error('Failed to generate report');
                                });
                            }}
                        >
                            Generate Report
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Report Content */}
            <Tabs value={reportType} className="space-y-4">
                {/* Summary Report */}
                <TabsContent value="SUMMARY">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Avg Attendance</p>
                                            <p className="text-2xl font-bold text-blue-600">
                                                {data?.overview?.avgAttendancePercentage || 0}%
                                            </p>
                                        </div>
                                        <TrendingUp className="w-10 h-10 text-blue-500 opacity-20" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Classes</p>
                                            <p className="text-2xl font-bold text-green-600">
                                                {data?.classSummary?.totalClasses || 0}
                                            </p>
                                        </div>
                                        <Users className="w-10 h-10 text-green-500 opacity-20" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total Teachers</p>
                                            <p className="text-2xl font-bold text-purple-600">
                                                {data?.teacherSummary?.totalTeachers || 0}
                                            </p>
                                        </div>
                                        <Award className="w-10 h-10 text-purple-500 opacity-20" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Avg Working Hours</p>
                                            <p className="text-2xl font-bold text-orange-600">
                                                {data?.teacherSummary?.avgWorkingHours || 0}h
                                            </p>
                                        </div>
                                        <Clock className="w-10 h-10 text-orange-500 opacity-20" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {data?.leaveSummary && Object.keys(data.leaveSummary).length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Leave Summary</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {Object.entries(data.leaveSummary).map(([type, stats]) => (
                                            <div key={type} className="border rounded-lg p-4">
                                                <h4 className="font-semibold mb-2">{type} Leave</h4>
                                                <div className="space-y-1 text-sm">
                                                    <p className="flex justify-between">
                                                        <span className="text-muted-foreground">Approved:</span>
                                                        <Badge variant="default">{stats.approved || 0}</Badge>
                                                    </p>
                                                    <p className="flex justify-between">
                                                        <span className="text-muted-foreground">Pending:</span>
                                                        <Badge variant="secondary">{stats.pending || 0}</Badge>
                                                    </p>
                                                    <p className="flex justify-between">
                                                        <span className="text-muted-foreground">Total Days:</span>
                                                        <span className="font-medium">{stats.days || 0}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </TabsContent>

                {/* Monthly Report */}
                <TabsContent value="MONTHLY">
                    <Card>
                        <CardHeader>
                            <CardTitle>Daily Attendance Statistics</CardTitle>
                            <CardDescription>Day-by-day breakdown for the selected period ({data?.dailyStats?.length || 0} days)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data?.dailyStats && data.dailyStats.length > 0 ? (
                                <>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-muted/50 border-b">
                                                    <th className="text-left p-3 font-medium">Date</th>
                                                    <th className="text-center p-3 font-medium">Present</th>
                                                    <th className="text-center p-3 font-medium">Absent</th>
                                                    <th className="text-center p-3 font-medium">Late</th>
                                                    <th className="text-center p-3 font-medium">Leave</th>
                                                    <th className="text-center p-3 font-medium">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.dailyStats
                                                    .slice((monthlyPage - 1) * PAGE_SIZE, monthlyPage * PAGE_SIZE)
                                                    .map((day, idx) => (
                                                        <tr key={day.date} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                                            <td className="p-3">
                                                                {new Date(day.date).toLocaleDateString('en-IN', {
                                                                    weekday: 'short',
                                                                    day: 'numeric',
                                                                    month: 'short'
                                                                })}
                                                            </td>
                                                            <td className="text-center p-3 text-green-600 font-medium">{day.present}</td>
                                                            <td className="text-center p-3 text-red-600 font-medium">{day.absent}</td>
                                                            <td className="text-center p-3 text-yellow-600 font-medium">{day.late}</td>
                                                            <td className="text-center p-3 text-blue-600 font-medium">{day.onLeave}</td>
                                                            <td className="text-center p-3 font-bold">{day.total}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination
                                        current={monthlyPage}
                                        total={Math.ceil(data.dailyStats.length / PAGE_SIZE)}
                                        totalItems={data.dailyStats.length}
                                        onChange={setMonthlyPage}
                                    />
                                </>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No data available for the selected period
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Class-wise Report */}
                <TabsContent value="CLASS_WISE">
                    <Card>
                        <CardHeader>
                            <CardTitle>Class-wise Attendance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {data?.classes && data.classes.length > 0 ? (
                                <>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-muted/50 border-b">
                                                    <th className="text-left p-3 font-medium">Class</th>
                                                    <th className="text-center p-3 font-medium">Students</th>
                                                    <th className="text-center p-3 font-medium">Present</th>
                                                    <th className="text-center p-3 font-medium">Absent</th>
                                                    <th className="text-center p-3 font-medium">Late</th>
                                                    <th className="text-center p-3 font-medium">Leave</th>
                                                    <th className="text-center p-3 font-medium">Attendance %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.classes
                                                    .slice((classPage - 1) * PAGE_SIZE, classPage * PAGE_SIZE)
                                                    .map((cls, idx) => (
                                                        <tr key={cls.classId} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                                            <td className="p-3 font-medium">{cls.className}</td>
                                                            <td className="text-center p-3">{cls.totalStudents}</td>
                                                            <td className="text-center p-3 text-green-600 font-medium">{cls.present}</td>
                                                            <td className="text-center p-3 text-red-600 font-medium">{cls.absent}</td>
                                                            <td className="text-center p-3 text-yellow-600 font-medium">{cls.late}</td>
                                                            <td className="text-center p-3 text-blue-600 font-medium">{cls.onLeave}</td>
                                                            <td className="text-center p-3">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                                        <div
                                                                            className={`h-2 rounded-full ${cls.attendancePercentage >= 75 ? 'bg-green-600' : 'bg-red-600'}`}
                                                                            style={{ width: `${cls.attendancePercentage}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-medium">{cls.attendancePercentage}%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination
                                        current={classPage}
                                        total={Math.ceil(data.classes.length / PAGE_SIZE)}
                                        totalItems={data.classes.length}
                                        onChange={setClassPage}
                                    />
                                </>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No class data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Student-wise Report */}
                <TabsContent value="STUDENT_WISE">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle>Student-wise Attendance ({data?.students?.length || 0})</CardTitle>
                                    <CardDescription>Individual student attendance records</CardDescription>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search students..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setStudentPage(1); }}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {data?.students && data.students.length > 0 ? (
                                (() => {
                                    const filteredStudents = data.students.filter(s =>
                                        !searchQuery ||
                                        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        s.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        s.className?.toLowerCase().includes(searchQuery.toLowerCase())
                                    );
                                    const paginatedStudents = filteredStudents.slice((studentPage - 1) * PAGE_SIZE, studentPage * PAGE_SIZE);

                                    return (
                                        <>
                                            <div className="rounded-lg border overflow-hidden">
                                                <table className="w-full">
                                                    <thead>
                                                        <tr className="bg-muted/50 border-b">
                                                            <th className="text-left p-3 font-medium">Roll No</th>
                                                            <th className="text-left p-3 font-medium">Name</th>
                                                            <th className="text-left p-3 font-medium">Class</th>
                                                            <th className="text-center p-3 font-medium">Present</th>
                                                            <th className="text-center p-3 font-medium">Absent</th>
                                                            <th className="text-center p-3 font-medium">Late</th>
                                                            <th className="text-center p-3 font-medium">Streak</th>
                                                            <th className="text-center p-3 font-medium">Percentage</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {paginatedStudents.map((student, idx) => (
                                                            <tr key={student.userId} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                                                <td className="p-3">{student.rollNumber}</td>
                                                                <td className="p-3 font-medium">{student.name}</td>
                                                                <td className="p-3">{student.className}</td>
                                                                <td className="text-center p-3 text-green-600">{student.attendance?.present || 0}</td>
                                                                <td className="text-center p-3 text-red-600">{student.attendance?.absent || 0}</td>
                                                                <td className="text-center p-3 text-yellow-600">{student.attendance?.late || 0}</td>
                                                                <td className="text-center p-3">
                                                                    <Badge variant="secondary">{student.streak || 0} days</Badge>
                                                                </td>
                                                                <td className="text-center p-3">
                                                                    <Badge variant={(student.attendance?.percentage || 0) >= 75 ? 'default' : 'destructive'}>
                                                                        {student.attendance?.percentage || 0}%
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <Pagination
                                                current={studentPage}
                                                total={Math.ceil(filteredStudents.length / PAGE_SIZE)}
                                                totalItems={filteredStudents.length}
                                                onChange={setStudentPage}
                                            />
                                        </>
                                    );
                                })()
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No student data available. Please select a class.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>


                {/* Teacher Performance */}
                <TabsContent value="TEACHER_PERFORMANCE">
                    <Card>
                        <CardHeader>
                            <CardTitle>Teacher Performance Report ({data?.teachers?.length || 0})</CardTitle>
                            <CardDescription>Attendance summary for teaching staff</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data?.teachers && data.teachers.length > 0 ? (
                                <>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-muted/50 border-b">
                                                    <th className="text-left p-3 font-medium">Employee ID</th>
                                                    <th className="text-left p-3 font-medium">Name</th>
                                                    <th className="text-left p-3 font-medium">Designation</th>
                                                    <th className="text-center p-3 font-medium">Present Days</th>
                                                    <th className="text-center p-3 font-medium">Late Days</th>
                                                    <th className="text-center p-3 font-medium">Avg Hours</th>
                                                    <th className="text-center p-3 font-medium">Streak</th>
                                                    <th className="text-center p-3 font-medium">Attendance %</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.teachers
                                                    .slice((teacherPage - 1) * PAGE_SIZE, teacherPage * PAGE_SIZE)
                                                    .map((teacher, idx) => (
                                                        <tr key={teacher.userId} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                                            <td className="p-3">{teacher.employeeId}</td>
                                                            <td className="p-3 font-medium">{teacher.name}</td>
                                                            <td className="p-3">{teacher.designation}</td>
                                                            <td className="text-center p-3 text-green-600">{teacher.presentDays}</td>
                                                            <td className="text-center p-3 text-yellow-600">{teacher.lateDays}</td>
                                                            <td className="text-center p-3">{Number(teacher.avgHours || 0).toFixed(2)}h</td>
                                                            <td className="text-center p-3">
                                                                <Badge variant="secondary">{teacher.streak || 0} days</Badge>
                                                            </td>
                                                            <td className="text-center p-3">
                                                                <Badge variant={Number(teacher.attendancePercentage || 0) >= 90 ? 'default' : 'destructive'}>
                                                                    {teacher.attendancePercentage || 0}%
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination
                                        current={teacherPage}
                                        total={Math.ceil(data.teachers.length / PAGE_SIZE)}
                                        totalItems={data.teachers.length}
                                        onChange={setTeacherPage}
                                    />
                                </>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No teacher data available
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Defaulters Report */}
                <TabsContent value="DEFAULTERS">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                        Defaulters Report ({data?.count || 0})
                                    </CardTitle>
                                    <CardDescription>Students and staff with attendance below 75%</CardDescription>
                                </div>
                                {data?.defaulters && data.defaulters.length > 0 && (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleExport('EXCEL')}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Export Excel
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleExport('PDF')}
                                        >
                                            <Download className="w-4 h-4 mr-2" />
                                            Export PDF
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {data?.defaulters && data.defaulters.length > 0 ? (
                                <>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-muted/50 border-b">
                                                    <th className="text-left p-3 font-medium">Type</th>
                                                    <th className="text-left p-3 font-medium">Admission/Employee No</th>
                                                    <th className="text-left p-3 font-medium">Name</th>
                                                    <th className="text-left p-3 font-medium">Class/Designation</th>
                                                    <th className="text-left p-3 font-medium">Contact</th>
                                                    <th className="text-center p-3 font-medium">Present</th>
                                                    <th className="text-center p-3 font-medium">Absent</th>
                                                    <th className="text-center p-3 font-medium">Late</th>
                                                    <th className="text-center p-3 font-medium">Percentage</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.defaulters
                                                    .slice((defaulterPage - 1) * PAGE_SIZE, defaulterPage * PAGE_SIZE)
                                                    .map((person, idx) => (
                                                        <tr key={person.userId} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                                            <td className="p-3">
                                                                <Badge variant={person.userType === 'Student' ? 'default' : 'secondary'}>
                                                                    {person.userType}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-3">
                                                                {person.userType === 'Student'
                                                                    ? person.admissionNo
                                                                    : person.employeeId}
                                                            </td>
                                                            <td className="p-3 font-medium">{person.name}</td>
                                                            <td className="p-3">
                                                                {person.userType === 'Student'
                                                                    ? `${person.className} ${person.sectionName || ''}`
                                                                    : person.designation}
                                                            </td>
                                                            <td className="p-3">{person.contactNumber || person.email || 'N/A'}</td>
                                                            <td className="text-center p-3 text-green-600">{person.totalPresent || 0}</td>
                                                            <td className="text-center p-3 text-red-600">{person.totalAbsent || 0}</td>
                                                            <td className="text-center p-3 text-yellow-600">{person.totalLate || 0}</td>
                                                            <td className="text-center p-3">
                                                                <Badge variant="destructive">
                                                                    {person.attendancePercentage}%
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination
                                        current={defaulterPage}
                                        total={Math.ceil(data.defaulters.length / PAGE_SIZE)}
                                        totalItems={data.defaulters.length}
                                        onChange={setDefaulterPage}
                                    />
                                </>
                            ) : (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                                    <p className="text-lg font-medium text-gray-900">Great! No defaulters found</p>
                                    <p className="text-sm mt-2 text-muted-foreground">All students have attendance above 75%</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Leave Analysis */}
                <TabsContent value="LEAVE_ANALYSIS">
                    <Card>
                        <CardHeader>
                            <CardTitle>Leave Analysis Report</CardTitle>
                            <CardDescription>
                                Total Requests: {data?.totalRequests || 0} | Total Days: {data?.totalDays || 0}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {data?.requests && data.requests.length > 0 ? (
                                <>
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-muted/50 border-b">
                                                    <th className="text-left p-3 font-medium">Name</th>
                                                    <th className="text-left p-3 font-medium">Role</th>
                                                    <th className="text-left p-3 font-medium">Leave Type</th>
                                                    <th className="text-left p-3 font-medium">From - To</th>
                                                    <th className="text-center p-3 font-medium">Days</th>
                                                    <th className="text-center p-3 font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.requests
                                                    .slice((leavePage - 1) * PAGE_SIZE, leavePage * PAGE_SIZE)
                                                    .map((leave, idx) => (
                                                        <tr key={idx} className={`border-b hover:bg-muted/30 ${idx % 2 === 0 ? 'bg-muted/20' : ''}`}>
                                                            <td className="p-3 font-medium">{leave.userName}</td>
                                                            <td className="p-3">{leave.userRole}</td>
                                                            <td className="p-3">
                                                                <Badge variant="outline">{leave.leaveType}</Badge>
                                                            </td>
                                                            <td className="p-3">
                                                                {new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}
                                                            </td>
                                                            <td className="text-center p-3">{leave.totalDays}</td>
                                                            <td className="text-center p-3">
                                                                <Badge variant={
                                                                    leave.status === 'APPROVED' ? 'default' :
                                                                        leave.status === 'REJECTED' ? 'destructive' : 'secondary'
                                                                }>
                                                                    {leave.status}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <Pagination
                                        current={leavePage}
                                        total={Math.ceil(data.requests.length / PAGE_SIZE)}
                                        totalItems={data.requests.length}
                                        onChange={setLeavePage}
                                    />
                                </>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    No leave requests found for the selected period
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    );
}