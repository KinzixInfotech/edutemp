'use client';

import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { createRoot } from 'react-dom/client';
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
    IndianRupee,
    Banknote,
    Printer,
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
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import ReceiptTemplate from '@/components/receipts/ReceiptTemplate';

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
    const [selectedInstallmentIds, setSelectedInstallmentIds] = useState([]);
    const [checkedStudents, setCheckedStudents] = useState([]);

    // Dialog step state: 'search' | 'payment' | 'success'
    const [dialogStep, setDialogStep] = useState('search');
    const [dialogSearch, setDialogSearch] = useState('');
    const [lastPaymentResult, setLastPaymentResult] = useState(null);
    const [generatingReceipt, setGeneratingReceipt] = useState(false);

    // Table state
    const [sortColumn, setSortColumn] = useState('class');
    const [sortDirection, setSortDirection] = useState('asc');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Generate PDF/Print document helper
    const generateDocument = async (Component, props, fileName, action = 'download') => {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        document.body.appendChild(container);

        const root = createRoot(container);
        root.render(<Component {...props} />);
        await new Promise((r) => setTimeout(r, 500));

        const el = container.firstChild;
        if (!el) { root.unmount(); document.body.removeChild(container); return; }

        const dataUrl = await toJpeg(el, { quality: 0.95, pixelRatio: 2 });
        const img = new Image();
        img.src = dataUrl;
        await new Promise((r) => { img.onload = r; });

        const isThermal = props.settings?.paperSize === 'thermal';
        const pdfWidth = isThermal ? 80 : 215.9;
        const pdfHeight = isThermal ? (img.height / img.width) * pdfWidth : 279.4;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
        const imgHeight = (img.height / img.width) * pdfWidth;
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pdfWidth, imgHeight);

        if (action === 'print') {
            const blob = pdf.output('blob');
            const url = URL.createObjectURL(blob);
            const printWindow = window.open(url);
            printWindow?.addEventListener('load', () => {
                printWindow.focus();
                printWindow.print();
            });
        } else {
            pdf.save(fileName);
        }
        root.unmount();
        document.body.removeChild(container);
    };

    // Handle receipt download/print for a payment
    const handleReceiptDownload = async (paymentId, action = 'download') => {
        setGeneratingReceipt(true);
        try {
            const res = await fetch('/api/receipts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feePaymentId: paymentId, schoolId }),
            });
            if (!res.ok) throw new Error('Failed to generate receipt');
            const data = await res.json();
            const rd = data.receipt.receiptData;

            const schoolProps = {
                name: rd.schoolName,
                profilePicture: rd.schoolLogo,
                location: rd.schoolAddress,
                contactNumber: rd.schoolContact,
                email: rd.schoolEmail || '',
            };
            const receiptProps = {
                receiptNumber: rd.receiptNumber,
                receiptDate: rd.receiptDate,
                studentName: rd.studentName,
                fatherName: rd.parentName,
                degree: rd.studentClass,
                admissionNo: rd.admissionNo,
                financialYear: rd.academicYear,
                feeItems: rd.feeItems || [],
                total: rd.totalPaid,
                balanceAfterPayment: rd.balanceAfterPayment || 0,
                paymentMode: rd.paymentMethod,
                transactionId: rd.transactionId,
            };
            const settingsProps = {
                showSchoolLogo: rd.showSchoolLogo ?? true,
                showBalanceDue: rd.showBalanceDue ?? true,
                showPaymentMode: rd.showPaymentMode ?? true,
                showSignatureLine: rd.showSignatureLine ?? true,
                paperSize: rd.paperSize || 'a4',
                receiptFooterText: rd.footerText || '',
            };

            await generateDocument(
                ReceiptTemplate,
                { schoolData: schoolProps, receiptData: receiptProps, settings: settingsProps },
                `Receipt_${rd.receiptNumber || 'Payment'}.pdf`,
                action
            );
            toast.success(action === 'print' ? 'Print dialog opened!' : 'Receipt downloaded!');
        } catch (err) {
            console.error(err);
            toast.error('Failed to generate receipt');
        } finally {
            setGeneratingReceipt(false);
        }
    };

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

    // Fetch installments when dialog opens for a student
    const { data: studentInstallments, isLoading: installmentsLoading } = useQuery({
        queryKey: ['student-installments', selectedStudent?.fee?.id],
        queryFn: async () => {
            const res = await fetch(`/api/schools/fee/students/${selectedStudent.userId}?academicYearId=${academicYearId}`);
            if (!res.ok) throw new Error('Failed');
            const data = await res.json();
            return data.installments || [];
        },
        enabled: !!selectedStudent?.fee?.id && !!academicYearId && recordPaymentOpen,
    });

    // Pending/partial installments for the picker
    const pendingInstallments = useMemo(() => {
        if (!studentInstallments) return [];
        return studentInstallments.filter(i => i.status !== 'PAID').sort((a, b) => a.installmentNumber - b.installmentNumber);
    }, [studentInstallments]);

    // Compute live allocation preview
    const allocationPreview = useMemo(() => {
        if (!pendingInstallments.length || !paymentAmount) return [];
        const amount = parseFloat(paymentAmount) || 0;
        if (amount <= 0) return [];

        let remaining = amount;
        const preview = [];
        const targetInstallments = selectedInstallmentIds.length > 0
            ? pendingInstallments.filter(i => selectedInstallmentIds.includes(i.id))
            : pendingInstallments;

        for (const inst of targetInstallments) {
            if (remaining <= 0) break;
            const balance = inst.amount - (inst.paidAmount || 0);
            const allocated = Math.min(remaining, balance);
            preview.push({
                number: inst.installmentNumber,
                allocated,
                willComplete: allocated >= balance,
                balance,
            });
            remaining -= allocated;
        }
        return preview;
    }, [pendingInstallments, paymentAmount, selectedInstallmentIds]);

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
        onSuccess: (data) => {
            toast.success('Payment recorded successfully');
            queryClient.invalidateQueries(['students-fees']);
            // Don't close, move to success step
            setLastPaymentResult(data.payment);
            setDialogStep('success');
            setPaymentAmount('');
            setPaymentMethod('CASH');
            setReferenceNumber('');
            setRemarks('');
            setSelectedInstallmentIds([]);
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
        setSelectedInstallmentIds([]);
        setDialogStep('search');
        setDialogSearch('');
        setLastPaymentResult(null);
    };

    const handleQuickFill = (type) => {
        if (!selectedStudent?.fee) return;
        if (type === 'full') {
            setPaymentAmount(selectedStudent.fee.balanceAmount.toString());
            setSelectedInstallmentIds([]);
        } else if (type === 'next' && pendingInstallments.length > 0) {
            const next = pendingInstallments[0];
            const balance = next.amount - (next.paidAmount || 0);
            setPaymentAmount(balance.toString());
            setSelectedInstallmentIds([next.id]);
        }
    };

    const toggleInstallment = (id) => {
        setSelectedInstallmentIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
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
            ...(selectedInstallmentIds.length > 0 && { installmentIds: selectedInstallmentIds }),
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

    const handleSelectStudent = (studentId) => {
        setCheckedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
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

    // Filter students for dialog search
    const dialogFilteredStudents = useMemo(() => {
        if (!dialogSearch || dialogSearch.length < 2) return [];
        if (!students) return [];

        const term = dialogSearch.toLowerCase();
        return students.filter(s =>
            s.name.toLowerCase().includes(term) ||
            s.admissionNo.toLowerCase().includes(term)
        ).slice(0, 5); // Limit result to 5
    }, [students, dialogSearch]);

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
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => {
                            if (checkedStudents.length > 1) {
                                toast.error('Please select only one student to collect fee');
                                return;
                            }
                            if (checkedStudents.length === 1) {
                                const s = students.find(s => s.userId === checkedStudents[0]);
                                if (s) {
                                    setSelectedStudent(s);
                                    setDialogStep('payment');
                                    setRecordPaymentOpen(true);
                                    return;
                                }
                            }
                            setSelectedStudent(null);
                            setDialogStep('search');
                            setDialogSearch('');
                            setRecordPaymentOpen(true);
                        }}
                    >
                        <IndianRupee className="w-4 h-4 mr-2" />
                        Collect Fee
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
                                    <TableHead className="w-[50px]"></TableHead>
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
                                        <TableCell colSpan={9} className="text-center py-12">
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
                                            <TableCell>
                                                <Checkbox
                                                    checked={checkedStudents.includes(student.userId)}
                                                    onCheckedChange={() => handleSelectStudent(student.userId)}
                                                />
                                            </TableCell>
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
                                                                setDialogStep('payment');
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

            {/* Enhanced Record Payment Dialog */}
            <Dialog open={recordPaymentOpen} onOpenChange={(open) => { setRecordPaymentOpen(open); if (!open) resetPaymentForm(); }}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    {/* STEP 1: SEARCH STUDENT */}
                    {dialogStep === 'search' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Search className="w-5 h-5 text-primary" />
                                    Search Student
                                </DialogTitle>
                                <DialogDescription>
                                    Search for a student to collect fee payment
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by name or admission no..."
                                        value={dialogSearch}
                                        onChange={(e) => setDialogSearch(e.target.value)}
                                        className="pl-9"
                                        autoFocus
                                    />
                                </div>
                                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                                    {dialogFilteredStudents.length > 0 ? (
                                        dialogFilteredStudents.map((student) => (
                                            <div
                                                key={student.userId}
                                                onClick={() => {
                                                    setSelectedStudent(student);
                                                    setDialogStep('payment');
                                                    setPaymentAmount('');
                                                    setSelectedInstallmentIds([]);
                                                }}
                                                className="flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                                            >
                                                <div>
                                                    <p className="font-medium">{student.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="outline" className="text-[10px] h-5">{student.admissionNo}</Badge>
                                                        <span>{student.class?.className} - {student.section?.name}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground">Balance</p>
                                                    <p className="font-bold text-red-600">
                                                        {formatCurrency(student.fee?.balanceAmount)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-muted-foreground">
                                            {dialogSearch.length < 2 ? (
                                                <p className="text-sm">Type at least 2 characters to search</p>
                                            ) : (
                                                <p className="text-sm">No students found matching &quot;{dialogSearch}&quot;</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* STEP 2: REFUND PAYMENT FORM */}
                    {dialogStep === 'payment' && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-green-600" />
                                    Collect Fee Payment
                                </DialogTitle>
                                <DialogDescription>
                                    Record offline payment for {selectedStudent?.name}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4">
                                {/* Student Info + Balance */}
                                <div className="p-4 bg-muted/50 rounded-lg border">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-lg">{selectedStudent?.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {selectedStudent?.admissionNo} • {selectedStudent?.class?.className} {selectedStudent?.section?.name && `- ${selectedStudent.section.name}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground">Balance Due</p>
                                            <p className="text-xl font-bold text-red-600">{formatCurrency(selectedStudent?.fee?.balanceAmount)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Fill Buttons */}
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => handleQuickFill('full')}
                                    >
                                        <DollarSign className="w-3 h-3 mr-1" />
                                        Pay Full Balance
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 text-xs"
                                        onClick={() => handleQuickFill('next')}
                                        disabled={!pendingInstallments.length}
                                    >
                                        <Calendar className="w-3 h-3 mr-1" />
                                        Pay Next Installment
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs px-2"
                                        onClick={() => {
                                            setDialogStep('search');
                                            setDialogSearch('');
                                        }}
                                    >
                                        Change Student
                                    </Button>
                                </div>

                                {/* Installment Picker */}
                                {installmentsLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Loading installments...
                                    </div>
                                ) : pendingInstallments.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">
                                            Select installments (optional — leave empty to auto-allocate)
                                        </Label>
                                        <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                                            {pendingInstallments.map((inst) => {
                                                const balance = inst.amount - (inst.paidAmount || 0);
                                                return (
                                                    <label
                                                        key={inst.id}
                                                        className="flex items-center gap-3 p-2.5 hover:bg-muted/50 cursor-pointer text-sm"
                                                    >
                                                        <Checkbox
                                                            checked={selectedInstallmentIds.includes(inst.id)}
                                                            onCheckedChange={() => toggleInstallment(inst.id)}
                                                        />
                                                        <div className="flex-1">
                                                            <span className="font-medium">Inst. {inst.installmentNumber}</span>
                                                            <span className="text-muted-foreground ml-2 text-xs">
                                                                Due: {new Date(inst.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            </span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`font-medium ${inst.isOverdue ? 'text-red-600' : ''}`}>
                                                                {formatCurrency(balance)}
                                                            </span>
                                                            {inst.isOverdue && (
                                                                <span className="block text-[10px] text-red-500">Overdue</span>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Amount Input */}
                                <div className="space-y-2">
                                    <Label>Amount *</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                                        <Input
                                            type="number"
                                            placeholder="Enter amount"
                                            className="pl-7"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Allocation Preview */}
                                {allocationPreview.length > 0 && (
                                    <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Payment Allocation Preview</p>
                                        <div className="space-y-1">
                                            {allocationPreview.map((a) => (
                                                <div key={a.number} className="flex items-center justify-between text-xs">
                                                    <span>
                                                        Inst. {a.number}
                                                        {a.willComplete && (
                                                            <CheckCircle className="w-3 h-3 inline ml-1 text-green-600" />
                                                        )}
                                                    </span>
                                                    <span className="font-medium">{formatCurrency(a.allocated)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Payment Method */}
                                <div className="grid grid-cols-2 gap-3">
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
                                        <Label>Reference No.</Label>
                                        <Input
                                            placeholder="Txn/Cheque no."
                                            value={referenceNumber}
                                            onChange={(e) => setReferenceNumber(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Remarks</Label>
                                    <Input
                                        placeholder="Optional remarks"
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1"
                                        onClick={() => setRecordPaymentOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                        onClick={handleRecordPayment}
                                        disabled={recordPaymentMutation.isPending || !paymentAmount}
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
                        </>
                    )}

                    {/* Step 3: SUCCESS & RECEIPT */}
                    {dialogStep === 'success' && lastPaymentResult && (
                        <div className="py-6 text-center space-y-6">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-green-700 mb-1">Payment Successful!</h3>
                                <p className="text-muted-foreground">Transaction ID: {lastPaymentResult.transactionId || lastPaymentResult.receiptNumber}</p>
                            </div>

                            <div className="p-4 bg-muted/50 rounded-lg max-w-sm mx-auto">
                                <p className="text-sm text-muted-foreground mb-1">Amount Paid</p>
                                <p className="text-2xl font-bold">{formatCurrency(lastPaymentResult.amount)}</p>
                            </div>

                            <div className="flex flex-col gap-3 max-w-xs mx-auto">
                                <Button
                                    className="w-full"
                                    onClick={() => handleReceiptDownload(lastPaymentResult.id, 'download')}
                                    disabled={generatingReceipt}
                                >
                                    {generatingReceipt ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                                    Download Receipt
                                </Button>
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleReceiptDownload(lastPaymentResult.id, 'print')}
                                    disabled={generatingReceipt}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Print Receipt
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="w-full"
                                    onClick={() => {
                                        setRecordPaymentOpen(false);
                                        // Reset optional
                                    }}
                                >
                                    Done
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}