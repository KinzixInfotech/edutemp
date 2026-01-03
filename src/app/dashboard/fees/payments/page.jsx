'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    DollarSign,
    Search,
    Download,
    Eye,
    CreditCard,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    RefreshCw,
    FileText,
    Wallet,
    AlertTriangle,
    TrendingUp,
    ArrowUpDown,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Users,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

export default function PaymentTracking() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    // State
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedClass, setSelectedClass] = useState('all');
    const [selectedSection, setSelectedSection] = useState('all');
    const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [remarks, setRemarks] = useState('');

    // Table state
    const [sortColumn, setSortColumn] = useState('class');
    const [sortDirection, setSortDirection] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

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

    // Get sections for selected class
    const selectedClassData = classes?.find(c => c.id.toString() === selectedClass);
    const sections = selectedClassData?.sections || [];


    // Fetch students with fee details - show ALL students, not filtered by academic year
    const { data: students, isLoading, refetch } = useQuery({
        queryKey: ['students-fees', schoolId, selectedClass, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                schoolId,
                ...(selectedClass !== 'all' && { classId: selectedClass }),
            });

            const res = await fetch(`/api/schools/fee/students/list?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Calculate stats from students data
    const stats = useMemo(() => {
        if (!students?.length) return { totalCollected: 0, totalPending: 0, totalOverdue: 0, studentCount: 0 };

        let totalCollected = 0;
        let totalPending = 0;
        let totalOverdue = 0;

        students.forEach(student => {
            if (student.fee) {
                totalCollected += student.fee.paidAmount || 0;
                totalPending += student.fee.balanceAmount || 0;
                if (student.fee.status === 'OVERDUE') {
                    totalOverdue += student.fee.balanceAmount || 0;
                }
            }
        });

        return {
            totalCollected,
            totalPending,
            totalOverdue,
            studentCount: students.length,
        };
    }, [students]);

    // Record payment mutation
    const recordPaymentMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/schools/fee/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Payment recorded successfully');
            queryClient.invalidateQueries(['students-fees']);
            setRecordPaymentOpen(false);
            resetPaymentForm();
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const resetPaymentForm = () => {
        setPaymentAmount('');
        setPaymentMethod('CASH');
        setReferenceNumber('');
        setRemarks('');
    };

    const clearAllFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setSelectedClass('all');
        setSelectedSection('all');
        setCurrentPage(1);
    };

    const handleRecordPayment = () => {
        if (!selectedStudent || !paymentAmount) {
            toast.error('Please fill required fields');
            return;
        }

        recordPaymentMutation.mutate({
            studentFeeId: selectedStudent.fee.id,
            studentId: selectedStudent.userId,
            schoolId,
            academicYearId,
            amount: parseFloat(paymentAmount),
            paymentMethod,
            referenceNumber: referenceNumber || undefined,
            remarks: remarks || undefined,
            collectedBy: fullUser?.id,
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const variants = {
            PAID: { variant: 'default', icon: CheckCircle, className: 'bg-green-100 text-green-700 border-green-200' },
            PARTIAL: { variant: 'secondary', icon: Clock, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            UNPAID: { variant: 'outline', icon: XCircle, className: 'bg-blue-100 text-blue-700 border-blue-200' },
            OVERDUE: { variant: 'destructive', icon: XCircle, className: 'bg-red-100 text-red-700 border-red-200' },
        };

        const config = variants[status] || variants.UNPAID;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className={`flex items-center gap-1 ${config.className}`}>
                <Icon className="w-3 h-3" />
                {status}
            </Badge>
        );
    };

    // Filter and sort students
    const processedStudents = useMemo(() => {
        if (!students) return [];

        let filtered = students.filter(student => {
            const matchesSearch = search === '' ||
                student.name.toLowerCase().includes(search.toLowerCase()) ||
                student.admissionNo.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = statusFilter === 'all' || student.fee?.status === statusFilter;

            const matchesSection = selectedSection === 'all' ||
                student.section?.id?.toString() === selectedSection;

            return matchesSearch && matchesStatus && matchesSection;
        });

        // Sort - default groups by class, then section, then roll number
        filtered.sort((a, b) => {
            // Primary sort by class
            const classCompare = (a.class?.className || '').localeCompare(b.class?.className || '');
            if (classCompare !== 0 && sortColumn === 'class') {
                return sortDirection === 'asc' ? classCompare : -classCompare;
            }

            // Secondary sort by section
            const sectionCompare = (a.section?.name || '').localeCompare(b.section?.name || '');
            if (sectionCompare !== 0 && sortColumn === 'class') {
                return sortDirection === 'asc' ? sectionCompare : -sectionCompare;
            }

            // Tertiary sort by roll number for class sorting
            if (sortColumn === 'class') {
                const aRoll = parseInt(a.rollNumber) || 0;
                const bRoll = parseInt(b.rollNumber) || 0;
                return sortDirection === 'asc' ? aRoll - bRoll : bRoll - aRoll;
            }

            // Other column sorting
            let aVal, bVal;
            switch (sortColumn) {
                case 'name':
                    aVal = a.name || '';
                    bVal = b.name || '';
                    break;
                case 'total':
                    aVal = a.fee?.finalAmount || 0;
                    bVal = b.fee?.finalAmount || 0;
                    break;
                case 'paid':
                    aVal = a.fee?.paidAmount || 0;
                    bVal = b.fee?.paidAmount || 0;
                    break;
                case 'balance':
                    aVal = a.fee?.balanceAmount || 0;
                    bVal = b.fee?.balanceAmount || 0;
                    break;
                case 'status':
                    aVal = a.fee?.status || '';
                    bVal = b.fee?.status || '';
                    break;
                default:
                    aVal = a.name || '';
                    bVal = b.name || '';
            }

            if (typeof aVal === 'string') {
                return sortDirection === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        });

        return filtered;
    }, [students, search, statusFilter, selectedSection, sortColumn, sortDirection]);

    // Pagination
    const totalPages = Math.ceil(processedStudents.length / pageSize);
    const paginatedStudents = processedStudents.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
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

    // Table loading skeleton rows
    const TableLoadingRows = () => (
        <>
            {[1, 2, 3, 4, 5].map(i => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
            ))}
        </>
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <CreditCard className="w-8 h-8 text-green-600" />
                        Payment Tracking
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">Record and track fee payments</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                        <Wallet className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalCollected)}</div>
                        <p className="text-xs text-muted-foreground">This academic year</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Amount</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalPending)}</div>
                        <p className="text-xs text-muted-foreground">Yet to be collected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Amount</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalOverdue)}</div>
                        <p className="text-xs text-muted-foreground">Past due date</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.studentCount}</div>
                        <p className="text-xs text-muted-foreground">With fee assigned</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="border-0 shadow-none border">
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="relative lg:col-span-2">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or admission no..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setSelectedSection('all'); setCurrentPage(1); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Class" />
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
                        <Select value={selectedSection} onValueChange={(v) => { setSelectedSection(v); setCurrentPage(1); }} disabled={selectedClass === 'all'}>
                            <SelectTrigger>
                                <SelectValue placeholder="Section" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Sections</SelectItem>
                                {sections.map((sec) => (
                                    <SelectItem key={sec.id} value={sec.id.toString()}>
                                        {sec.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="PAID">Paid</SelectItem>
                                <SelectItem value="PARTIAL">Partial</SelectItem>
                                <SelectItem value="UNPAID">Unpaid</SelectItem>
                                <SelectItem value="OVERDUE">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={clearAllFilters} className="flex-1">
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Clear
                            </Button>
                            <Link href="/dashboard/fees/reports" className="flex-1">
                                <Button variant="outline" className="w-full">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Reports
                                </Button>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="border-0 shadow-none border">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Students ({processedStudents.length})</CardTitle>
                            <CardDescription>All students organized by class</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Rows per page:</span>
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
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="dark:bg-background/50 bg-muted/50 ">
                                    <SortableHeader column="name">Student Name</SortableHeader>
                                    <TableHead>Admission No</TableHead>
                                    <SortableHeader column="class">Class</SortableHeader>
                                    <SortableHeader column="total">Total Fee</SortableHeader>
                                    <SortableHeader column="paid">Paid</SortableHeader>
                                    <SortableHeader column="balance">Balance</SortableHeader>
                                    <SortableHeader column="status">Status</SortableHeader>
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
                                                <Users className="w-12 h-12 text-muted-foreground/50" />
                                                <p className="text-muted-foreground">No students found</p>
                                                <Button variant="outline" size="sm" onClick={clearAllFilters}>
                                                    Clear filters
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    paginatedStudents.map((student, index) => (
                                        <TableRow key={student.userId} className={`hover:bg-muted/30 dark:hover:bg-background/30 ${index % 2 === 0 ? 'bg-muted dark:bg-background/50' : ''}`}>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{student.admissionNo}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {student.class?.className} {student.section?.name && `- ${student.section.name}`}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {student.fee ? formatCurrency(student.fee.finalAmount) : '-'}
                                            </TableCell>
                                            <TableCell className="text-green-600 font-medium">
                                                {student.fee ? formatCurrency(student.fee.paidAmount) : '-'}
                                            </TableCell>
                                            <TableCell className="text-orange-600 font-medium">
                                                {student.fee ? formatCurrency(student.fee.balanceAmount) : '-'}
                                            </TableCell>
                                            <TableCell>
                                                {student.fee ? getStatusBadge(student.fee.status) : (
                                                    <Badge variant="outline" className="text-muted-foreground">No Fee</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link href={`/dashboard/fees/students/${student.userId}`}>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    {student.fee && student.fee.balanceAmount > 0 && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedStudent(student);
                                                                setRecordPaymentOpen(true);
                                                            }}
                                                        >
                                                            <DollarSign className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
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
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, processedStudents.length)} of {processedStudents.length} students
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
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
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Record Payment Dialog */}
            <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Record offline payment for {selectedStudent?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {selectedStudent?.fee && (
                            <div className="p-4 bg-muted rounded-lg space-y-1">
                                <p className="text-sm text-muted-foreground">Balance Due</p>
                                <p className="text-2xl font-bold">{formatCurrency(selectedStudent.fee.balanceAmount)}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Amount *</Label>
                            <Input
                                type="number"
                                placeholder="Enter amount"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Payment Method *</Label>
                            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASH">Cash</SelectItem>
                                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                                    <SelectItem value="CARD">Card</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
                                    <SelectItem value="NET_BANKING">Net Banking</SelectItem>
                                    <SelectItem value="DEMAND_DRAFT">Demand Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Reference Number</Label>
                            <Input
                                placeholder="Cheque/Transaction number"
                                value={referenceNumber}
                                onChange={(e) => setReferenceNumber(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Remarks</Label>
                            <Input
                                placeholder="Optional remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setRecordPaymentOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleRecordPayment}
                                disabled={recordPaymentMutation.isPending}
                            >
                                {recordPaymentMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Recording...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Record Payment
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}