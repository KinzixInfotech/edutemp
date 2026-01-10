'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText, RefreshCw, Search, MoreHorizontal, Loader2, Info,
    ChevronLeft, ChevronRight, ArrowUpDown, RotateCcw, CheckCircle2, XCircle, AlertTriangle, Lock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
    Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function HallTicketsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [selectedExam, setSelectedExam] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [actionDialog, setActionDialog] = useState({ open: false, type: '', studentId: null, studentName: '' });
    const [actionReason, setActionReason] = useState('');
    const [publishDialog, setPublishDialog] = useState(false);

    // Pagination & sorting
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [sortColumn, setSortColumn] = useState('name');
    const [sortDirection, setSortDirection] = useState('asc');

    // Fetch exams
    const { data: examsData, isLoading: examsLoading } = useQuery({
        queryKey: ['exams', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/examination/exams`);
            return res.json();
        },
        enabled: !!schoolId
    });

    const exams = examsData?.exams || examsData || [];

    // Fetch hall tickets for selected exam
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['hall-tickets', schoolId, selectedExam],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/examination/${selectedExam}/hall-tickets`);
            return res.json();
        },
        enabled: !!schoolId && !!selectedExam,
        staleTime: 30000
    });

    // Check if exam is in progress
    const examInProgress = data?.exam?.startDate && new Date(data.exam.startDate) <= new Date();

    // Bulk issue mutation
    const bulkIssueMutation = useMutation({
        mutationFn: async ({ studentIds, action }) => {
            const res = await fetch(`/api/schools/${schoolId}/examination/${selectedExam}/hall-tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds, userId: fullUser.id, action })
            });
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries(['hall-tickets', schoolId, selectedExam]);
            setSelectedStudents([]);
        },
        onError: () => toast.error('Failed to process request')
    });

    // Individual action mutation
    const actionMutation = useMutation({
        mutationFn: async ({ studentId, action, reason }) => {
            const res = await fetch(`/api/schools/${schoolId}/examination/${selectedExam}/hall-tickets/${studentId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reason, userId: fullUser.id })
            });
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries(['hall-tickets', schoolId, selectedExam]);
            setActionDialog({ open: false, type: '', studentId: null, studentName: '' });
            setActionReason('');
        },
        onError: () => toast.error('Failed to process request')
    });

    // Publish mutation
    const publishMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/examination/${selectedExam}/hall-tickets/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: fullUser.id })
            });
            return res.json();
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries(['hall-tickets', schoolId, selectedExam]);
            setPublishDialog(false);
        },
        onError: () => toast.error('Failed to publish')
    });

    // Filter students
    const filteredStudents = useMemo(() => {
        let students = data?.students || [];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            students = students.filter(s =>
                s.name?.toLowerCase().includes(query) ||
                s.rollNumber?.toLowerCase().includes(query) ||
                s.admissionNo?.toLowerCase().includes(query)
            );
        }

        if (filterStatus !== 'all') {
            students = students.filter(s => {
                switch (filterStatus) {
                    case 'eligible': return s.isEligible;
                    case 'not-eligible': return !s.isEligible && s.status === 'NOT_ISSUED';
                    case 'issued': return s.status === 'ISSUED';
                    case 'published': return s.status === 'PUBLISHED';
                    case 'blocked': return s.status === 'BLOCKED' || s.manualBlock;
                    case 'override': return s.isOverride;
                    case 'fee-due': return !s.feeCleared;
                    case 'attendance-low': return !s.attendanceOk;
                    default: return true;
                }
            });
        }

        students.sort((a, b) => {
            let aVal = a[sortColumn] || '';
            let bVal = b[sortColumn] || '';
            if (typeof aVal === 'string') {
                return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return students;
    }, [data?.students, searchQuery, filterStatus, sortColumn, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(filteredStudents.length / pageSize);
    const paginatedStudents = filteredStudents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedStudents(paginatedStudents.map(s => s.studentId));
        } else {
            setSelectedStudents([]);
        }
    };

    const handleSelectStudent = (studentId, checked) => {
        if (checked) {
            setSelectedStudents([...selectedStudents, studentId]);
        } else {
            setSelectedStudents(selectedStudents.filter(id => id !== studentId));
        }
    };

    const clearAllFilters = () => {
        setSearchQuery('');
        setFilterStatus('all');
        setCurrentPage(1);
    };

    const SortableHeader = ({ column, children }) => (
        <TableHead
            className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
            onClick={() => handleSort(column)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={`w-4 h-4 ${sortColumn === column ? 'text-primary' : 'text-muted-foreground/50'}`} />
            </div>
        </TableHead>
    );

    // ENTERPRISE STATUS BADGE - Clear, detailed statuses
    const getStatusBadge = (student) => {
        if (student.status === 'PUBLISHED') {
            return <Badge className="bg-green-600 text-white">Published</Badge>;
        }
        if (student.status === 'BLOCKED' || student.manualBlock) {
            return <Badge variant="destructive">Blocked</Badge>;
        }
        if (student.isOverride && student.status === 'ISSUED') {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge className="bg-purple-600 text-white">Issued (Override)</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Override: {student.overrideReason || 'No reason provided'}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
        if (student.status === 'ISSUED') {
            return <Badge className="bg-blue-600 text-white">Issued</Badge>;
        }
        if (student.isEligible) {
            return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 border-emerald-200">Eligible</Badge>;
        }
        return <Badge variant="secondary" className="bg-gray-100 text-gray-600 border-gray-200">Not Eligible</Badge>;
    };

    // ATTENDANCE DISPLAY - Handle 0% edge case
    const getAttendanceDisplay = (student) => {
        // If attendance is exactly 0 or null, might mean not calculated yet
        if (student.attendancePercent === 0 || student.attendancePercent === null) {
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <Badge variant="outline" className="text-muted-foreground">—</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Attendance not calculated yet</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );
        }
        return (
            <Badge
                variant={student.attendanceOk ? 'secondary' : 'destructive'}
                className={student.attendanceOk ? 'bg-green-100 text-green-700 border-green-200' : ''}
            >
                {student.attendancePercent}%
            </Badge>
        );
    };

    // Table loading skeleton
    const TableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Hall Tickets
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Manage exam hall tickets and eligibility
                    </p>
                </div>
                {selectedExam && (
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                )}
            </div>

            <Separator />

            {/* Exam Selector Card */}
            <Card className="border-0 shadow-none border">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Select Exam</CardTitle>
                    <CardDescription>Choose an exam to manage hall tickets</CardDescription>
                </CardHeader>
                <CardContent>
                    {examsLoading ? (
                        <Skeleton className="h-10 w-full md:w-96" />
                    ) : (
                        <Select value={selectedExam} onValueChange={(v) => { setSelectedExam(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-full md:w-96">
                                <SelectValue placeholder="Select an exam..." />
                            </SelectTrigger>
                            <SelectContent>
                                {exams.length === 0 ? (
                                    <SelectItem value="none" disabled>No exams found</SelectItem>
                                ) : (
                                    exams.map((exam) => (
                                        <SelectItem key={exam.id} value={exam.id}>
                                            {exam.title} ({exam.status})
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {/* Show content only when exam selected */}
            {selectedExam && (
                <>
                    {/* ENTERPRISE: Exam Lock Warning */}
                    {examInProgress && (
                        <Alert variant="destructive">
                            <Lock className="h-4 w-4" />
                            <AlertDescription className="ml-2">
                                <strong>Exam in progress.</strong> Hall ticket changes are disabled during active examinations.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* ENTERPRISE: Eligibility Explanation */}
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription className="ml-2">
                            <strong>Eligibility is system-calculated</strong> based on attendance (≥75%) and fee clearance rules.
                            Admins can override eligibility for special cases with mandatory remarks.
                        </AlertDescription>
                    </Alert>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{data?.summary?.total || 0}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-green-300" onClick={() => setFilterStatus('eligible')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Eligible</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">{data?.summary?.eligible || 0}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-blue-300" onClick={() => setFilterStatus('issued')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Issued</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-blue-600">{data?.summary?.issued || 0}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-red-300" onClick={() => setFilterStatus('blocked')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Blocked</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">{data?.summary?.blocked || 0}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-orange-300" onClick={() => setFilterStatus('fee-due')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Fee Pending</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600">{data?.summary?.feeDefaulters || 0}</div>
                            </CardContent>
                        </Card>
                        <Card className="cursor-pointer hover:border-yellow-300" onClick={() => setFilterStatus('attendance-low')}>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Low Attendance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-600">{data?.summary?.attendanceDefaulters || 0}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters Card */}
                    <Card className="border-0 shadow-none border">
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="relative lg:col-span-2">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name, roll number..."
                                        value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setCurrentPage(1); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Students" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Students</SelectItem>
                                        <SelectItem value="eligible">✅ Eligible</SelectItem>
                                        <SelectItem value="not-eligible">❌ Not Eligible</SelectItem>
                                        <SelectItem value="issued">📄 Issued</SelectItem>
                                        <SelectItem value="published">🟢 Published</SelectItem>
                                        <SelectItem value="blocked">🚫 Blocked</SelectItem>
                                        <SelectItem value="override">⚠️ Override</SelectItem>
                                        <SelectItem value="fee-due">💰 Fee Pending</SelectItem>
                                        <SelectItem value="attendance-low">📉 Low Attendance</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" onClick={clearAllFilters}>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Clear
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Data Table Card */}
                    <Card className="border-0 shadow-none border">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle>Students ({filteredStudents.length})</CardTitle>
                                    <CardDescription>Manage hall ticket issuance</CardDescription>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {selectedStudents.length > 0 && !examInProgress && (
                                        <Button
                                            onClick={() => bulkIssueMutation.mutate({ studentIds: selectedStudents, action: 'ISSUE' })}
                                            disabled={bulkIssueMutation.isPending}
                                            size="sm"
                                        >
                                            {bulkIssueMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                            Issue Selected ({selectedStudents.length})
                                        </Button>
                                    )}
                                    {!examInProgress && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const eligibleIds = filteredStudents.filter(s => s.isEligible && s.status === 'NOT_ISSUED').map(s => s.studentId);
                                                    if (eligibleIds.length > 0) {
                                                        bulkIssueMutation.mutate({ studentIds: eligibleIds, action: 'ISSUE' });
                                                    } else {
                                                        toast.info('No eligible students to issue');
                                                    }
                                                }}
                                                disabled={bulkIssueMutation.isPending}
                                            >
                                                Issue All Eligible
                                            </Button>
                                            <Button
                                                className="bg-green-600 hover:bg-green-700"
                                                size="sm"
                                                onClick={() => setPublishDialog(true)}
                                                disabled={publishMutation.isPending || data?.exam?.isPublished}
                                            >
                                                {data?.exam?.isPublished ? '✓ Published' : 'Publish All'}
                                            </Button>
                                        </>
                                    )}
                                    <div className="flex items-center gap-2 ml-4">
                                        <span className="text-sm text-muted-foreground">Rows:</span>
                                        <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                            <SelectTrigger className="w-20">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10</SelectItem>
                                                <SelectItem value="25">25</SelectItem>
                                                <SelectItem value="50">50</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="dark:bg-background/50 bg-muted/50">
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                                                    onCheckedChange={handleSelectAll}
                                                    disabled={examInProgress}
                                                />
                                            </TableHead>
                                            <SortableHeader column="name">Student</SortableHeader>
                                            <SortableHeader column="rollNumber">Roll No</SortableHeader>
                                            <SortableHeader column="className">Class</SortableHeader>
                                            <TableHead>Fees</TableHead>
                                            <TableHead>Attendance</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableLoadingRows />
                                        ) : paginatedStudents.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-2">
                                                        <FileText className="w-12 h-12 text-muted-foreground/50" />
                                                        <p className="text-muted-foreground">No students found</p>
                                                        <Button variant="outline" size="sm" onClick={clearAllFilters}>
                                                            Clear filters
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedStudents.map((student, idx) => (
                                                <TableRow
                                                    key={student.studentId}
                                                    className={`hover:bg-muted/30 dark:hover:bg-background/30 ${idx % 2 === 0 ? 'bg-muted dark:bg-background/50' : ''}`}
                                                >
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedStudents.includes(student.studentId)}
                                                            onCheckedChange={(checked) => handleSelectStudent(student.studentId, checked)}
                                                            disabled={examInProgress}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {student.name}
                                                        {student.isOverride && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger>
                                                                        <AlertTriangle className="w-3 h-3 ml-1 inline text-purple-600" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p className="text-xs max-w-xs">
                                                                            <strong>Override applied</strong><br />
                                                                            Reason: {student.overrideReason || 'Not specified'}
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">{student.rollNumber || student.admissionNo || '-'}</TableCell>
                                                    <TableCell>{student.className} {student.sectionName}</TableCell>
                                                    <TableCell>
                                                        {student.feeCleared ? (
                                                            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                                                Cleared
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
                                                                ₹{student.feeDue} Due
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{getAttendanceDisplay(student)}</TableCell>
                                                    <TableCell>{getStatusBadge(student)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {!examInProgress && (
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm">
                                                                        <MoreHorizontal className="w-4 h-4" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    {student.status === 'NOT_ISSUED' && !student.manualBlock && (
                                                                        <DropdownMenuItem
                                                                            onClick={() => bulkIssueMutation.mutate({ studentIds: [student.studentId], action: 'ISSUE' })}
                                                                        >
                                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                            Issue Hall Ticket
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {!student.manualBlock && student.status !== 'PUBLISHED' && (
                                                                        <DropdownMenuItem
                                                                            onClick={() => setActionDialog({ open: true, type: 'BLOCK', studentId: student.studentId, studentName: student.name })}
                                                                        >
                                                                            <XCircle className="w-4 h-4 mr-2" />
                                                                            Block
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {student.manualBlock && (
                                                                        <DropdownMenuItem
                                                                            onClick={() => actionMutation.mutate({ studentId: student.studentId, action: 'UNBLOCK' })}
                                                                        >
                                                                            <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                            Unblock
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {!student.isEligible && !student.isOverride && student.status !== 'PUBLISHED' && (
                                                                        <>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem
                                                                                onClick={() => setActionDialog({ open: true, type: 'OVERRIDE', studentId: student.studentId, studentName: student.name })}
                                                                                className="text-purple-600"
                                                                            >
                                                                                <AlertTriangle className="w-4 h-4 mr-2" />
                                                                                Override Eligibility
                                                                            </DropdownMenuItem>
                                                                        </>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredStudents.length)} of {filteredStudents.length}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum;
                                                if (totalPages <= 5) pageNum = i + 1;
                                                else if (currentPage <= 3) pageNum = i + 1;
                                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                                else pageNum = currentPage - 2 + i;
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className="w-8 h-8 p-0"
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* ENTERPRISE: Block/Override Dialog with mandatory reason */}
            <Dialog open={actionDialog.open} onOpenChange={(open) => !open && setActionDialog({ open: false, type: '', studentId: null, studentName: '' })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{actionDialog.type === 'BLOCK' ? '🚫 Block Hall Ticket' : '⚠️ Override Eligibility'}</DialogTitle>
                        <DialogDescription>
                            {actionDialog.type === 'BLOCK'
                                ? `Blocking hall ticket for ${actionDialog.studentName}. This will prevent them from receiving permission to appear in the exam.`
                                : `Overriding eligibility rules for ${actionDialog.studentName}. This action bypasses fees/attendance checks and will be logged for audit.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-muted/50 p-3 rounded-lg text-sm">
                            <p className="font-medium">📝 Action will be logged:</p>
                            <p className="text-muted-foreground">By: {fullUser?.name || 'Admin'}</p>
                            <p className="text-muted-foreground">Time: {new Date().toLocaleString()}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium">
                                Reason <span className="text-red-500">*</span> (minimum 10 characters)
                            </label>
                            <Textarea
                                placeholder={actionDialog.type === 'BLOCK'
                                    ? "e.g., Disciplinary action pending, Document verification required..."
                                    : "e.g., Principal approval received, Fee waiver approved by management..."
                                }
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                rows={3}
                                className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">{actionReason.length}/10 characters minimum</p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setActionDialog({ open: false, type: '', studentId: null, studentName: '' })}>
                            Cancel
                        </Button>
                        <Button
                            variant={actionDialog.type === 'BLOCK' ? 'destructive' : 'default'}
                            onClick={() => actionMutation.mutate({ studentId: actionDialog.studentId, action: actionDialog.type, reason: actionReason })}
                            disabled={actionReason.length < 10 || actionMutation.isPending}
                        >
                            {actionMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Confirm {actionDialog.type === 'BLOCK' ? 'Block' : 'Override'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ENTERPRISE: Publish Confirmation Dialog */}
            <Dialog open={publishDialog} onOpenChange={setPublishDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>📢 Publish Hall Tickets</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                            <p className="font-medium text-blue-700 dark:text-blue-400 mb-2">What happens when you publish?</p>
                            <ul className="text-sm space-y-2 text-blue-600 dark:text-blue-300">
                                <li>✓ Hall tickets become <strong>visible to students & parents</strong></li>
                                <li>✓ PDF download is <strong>enabled</strong></li>
                                <li>✓ Status changes from "Issued" to "Published"</li>
                                <li>✓ Students can view/print from their dashboard</li>
                            </ul>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
                            <p className="font-medium text-amber-700 dark:text-amber-400 mb-2">Issue vs Publish:</p>
                            <ul className="text-sm space-y-1 text-amber-600 dark:text-amber-300">
                                <li><strong>Issue</strong> = Internal permission (not visible to students)</li>
                                <li><strong>Publish</strong> = Makes it visible + downloadable</li>
                            </ul>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            <strong>{data?.summary?.issued || 0}</strong> hall tickets will be published.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPublishDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => publishMutation.mutate()}
                            disabled={publishMutation.isPending}
                        >
                            {publishMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Publish to Students
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
