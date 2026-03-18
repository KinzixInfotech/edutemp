'use client';

import { use, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { createRoot } from 'react-dom/client';

import {
    ArrowLeft,
    Download,
    DollarSign,
    Calendar,
    CheckCircle,
    Clock,
    AlertCircle,
    CreditCard,
    Percent,
    FileText,
    Send,
    Loader2,
    AlertTriangle,
    TrendingUp,
    Printer
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';
import ReceiptTemplate from '@/components/receipts/ReceiptTemplate';
import { supabase } from '@/lib/supabase';

export default function StudentFeeDetails({ params }) {

    const { fullUser } = useAuth();
    const [token, setToken] = useState('');
    supabase.auth.onAuthStateChange((_event, session) => {
        const token = session?.access_token;
        setToken(token);
    });

    const router = useRouter();
    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    // Unwrap params
    const unwrappedParams = use(params);
    const studentId = unwrappedParams.studentId;


    const [discountOpen, setDiscountOpen] = useState(false);
    const [discountType, setDiscountType] = useState('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [discountReason, setDiscountReason] = useState('');
    
    // Adjust/Waive state
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustEntry, setAdjustEntry] = useState(null);
    const [adjustAction, setAdjustAction] = useState('discount'); // 'discount' or 'waive'
    const [adjustValue, setAdjustValue] = useState('');
    const [adjustReason, setAdjustReason] = useState('');

    const [statementDialogOpen, setStatementDialogOpen] = useState(false);
    const [statementPeriod, setStatementPeriod] = useState('full_year');
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingReceiptId, setGeneratingReceiptId] = useState(null);

    // Fetch fee settings for default print action
    const { data: feeSettings } = useQuery({
        queryKey: ['fee-settings', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/fee/settings?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
    });
    const defaultAction = feeSettings?.settings?.defaultPrintAction || 'download';

    // Helper: render a React component to hidden container, capture, then download or print
    const generateDocument = async (Component, props, fileName, action) => {
        const container = document.createElement('div');
        container.id = 'pdf-gen-container';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '8.5in';
        container.style.zIndex = '-9999';
        container.style.background = '#ffffff';
        container.style.color = '#000000';
        document.body.appendChild(container);

        const root = createRoot(container);
        root.render(<Component {...props} />);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const imgData = await toJpeg(container, {
            quality: 0.98,
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            style: { background: 'white' },
            fontEmbedCSS: '',
        });

        const pdf = new jsPDF('p', 'pt', 'letter');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);

        if (action === 'print') {
            // Open PDF in new window and print
            const pdfBlob = pdf.output('blob');
            const pdfUrl = URL.createObjectURL(pdfBlob);
            const printWindow = window.open(pdfUrl, '_blank');
            if (printWindow) {
                printWindow.addEventListener('load', () => {
                    printWindow.focus();
                    printWindow.print();
                });
            }
        } else {
            pdf.save(fileName);
        }

        root.unmount();
        document.body.removeChild(container);
    };

    // Handle receipt download/print for a payment
    const handleReceipt = async (payment, action) => {
        setGeneratingReceiptId(payment.id);
        const loadingToast = toast.loading(action === 'print' ? 'Preparing to print...' : 'Generating receipt...');
        try {
            // Fetch receipt data from API
            const res = await fetch('/api/receipts/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ feePaymentId: payment.id, schoolId }),
            });
            if (!res.ok) throw new Error('Failed to generate receipt');
            const data = await res.json();
            const rd = data.receipt.receiptData;

            // Transform API response into ReceiptTemplate props
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
                `Receipt_${payment.receiptNumber || rd.receiptNumber || 'Payment'}.pdf`,
                action
            );

            toast.dismiss(loadingToast);
            toast.success(action === 'print' ? 'Print dialog opened!' : 'Receipt downloaded!');
        } catch (err) {
            console.error(err);
            toast.dismiss(loadingToast);
            toast.error('Failed to generate receipt. Please try again.');
        } finally {
            setGeneratingReceiptId(null);
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

    const { data: studentFee, isLoading } = useQuery({
        queryKey: ['student-fee', studentId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ 
                academicYearId,
                feeSessionId: activeYear?.id || academicYearId // Pass current session for ledger
            });
            const res = await fetch(`/api/schools/fee/students/${studentId}?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!studentId && !!academicYearId,
    });

    // Fetch student subscribed services
    const { data: studentServicesResponse } = useQuery({
        queryKey: ['student-services', studentId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/fee/student-services?studentId=${studentId}`);
            if (!res.ok) throw new Error('Failed to fetch services');
            return res.json();
        },
        enabled: !!studentId,
    });
    
    const studentServices = studentServicesResponse?.services || [];

    // Fetch ledger audit logs
    const { data: auditLogsResponse } = useQuery({
        queryKey: ['ledger-audit', studentId, activeYear?.id || academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({
                studentId,
                feeSessionId: activeYear?.id || academicYearId
            });
            const res = await fetch(`/api/schools/fee/ledger/audit?${params}`);
            if (!res.ok) throw new Error('Failed to fetch audit logs');
            return res.json();
        },
        enabled: !!studentId && !!academicYearId,
    });

    const auditLogs = auditLogsResponse?.logs || [];


    // Apply discount mutation
    const applyDiscountMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/schools/fee/discounts', {
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
            toast.success('Discount applied successfully');
            queryClient.invalidateQueries(['student-fee']);
            setDiscountOpen(false);
            setDiscountValue('');
            setDiscountReason('');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleApplyDiscount = () => {
        if (!discountValue || !discountReason) {
            toast.error('Please fill all fields');
            return;
        }

        applyDiscountMutation.mutate({
            studentFeeId: studentFee.id,
            discountType,
            value: parseFloat(discountValue),
            reason: discountReason,
            approvedBy: fullUser?.id,
        });
    };

    // Adjust/Waive Ledger Entry Mutation
    const adjustLedgerMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/schools/fee/ledger', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to adjust ledger');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Ledger adjusted successfully');
            queryClient.invalidateQueries(['student-fee']);
            setAdjustOpen(false);
            setAdjustEntry(null);
            setAdjustValue('');
            setAdjustReason('');
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleAdjustLedger = () => {
        if (!adjustEntry) return;
        if (adjustAction === 'discount' && !adjustValue) {
            toast.error('Please enter a discount amount');
            return;
        }
        if (!adjustReason) {
            toast.error('Please enter a reason');
            return;
        }

        adjustLedgerMutation.mutate({
            action: adjustAction,
            ledgerEntryId: adjustEntry.id,
            discountAmount: adjustAction === 'discount' ? parseFloat(adjustValue) : undefined,
            reason: adjustReason,
            userId: fullUser?.id,
        });
    };

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

    const getStatusColor = (status) => {
        const colors = {
            PAID: 'bg-green-100 text-green-800',
            PENDING: 'bg-blue-100 text-blue-800',
            PARTIAL: 'bg-yellow-100 text-yellow-800',
            OVERDUE: 'bg-red-100 text-red-800',
        };
        return colors[status] || colors.PENDING;
    };

    // Computed UX helpers
    const feeMetrics = useMemo(() => {
        if (!studentFee) return {};
        const paid = studentFee.paidAmount || 0;
        const total = studentFee.finalAmount || studentFee.originalAmount || 1;
        const balance = studentFee.balanceAmount || 0;
        const progressPercent = Math.min(Math.round((paid / total) * 100), 100);

        const overdueEntries = studentFee.ledger?.filter(l => l.status !== 'PAID' && l.dueDate && new Date(l.dueDate) < new Date()) || [];
        const overdueCount = overdueEntries.length;
        const hasOverdue = overdueCount > 0;

        // Balance card color logic
        let balanceColor = 'text-green-600';
        let balanceBg = 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800';
        let balanceIconColor = 'text-green-500';
        if (hasOverdue) {
            balanceColor = 'text-red-600';
            balanceBg = 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
            balanceIconColor = 'text-red-500';
        } else if (balance > 0 && progressPercent >= 70) {
            balanceColor = 'text-orange-600';
            balanceBg = 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
            balanceIconColor = 'text-orange-500';
        } else if (balance > 0) {
            balanceColor = 'text-red-600';
            balanceBg = 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
            balanceIconColor = 'text-red-500';
        }

        return { progressPercent, overdueCount, hasOverdue, balanceColor, balanceBg, balanceIconColor };
    }, [studentFee]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }

    if (!studentFee) return null;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">
                            {studentFee.student?.name || 'Unknown Student'}
                        </h1>
                        {studentFee.student && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {studentFee.student.admissionNo} • {studentFee.student.class?.className} •
                                Roll: {studentFee.student.rollNumber}
                            </p>
                        )}
                    </div>
                </div>
                {!studentFee.isUnassigned && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline">
                            <Send className="w-4 h-4 mr-2" />
                            Send Reminder
                        </Button>

                        <Button
                            onClick={() => setStatementDialogOpen(true)}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Download Statement
                        </Button>
                    </div>
                )}
            </div>

            {studentFee.isUnassigned ? (
                <div className="p-8 mt-12 text-center rounded-2xl border bg-muted/20">
                    <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h2 className="text-2xl font-bold mb-2">No Fee Assigned</h2>
                    <p className="text-muted-foreground">This student doesn't have a fee structure assigned yet.</p>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Fee</p>
                                <p className="text-2xl font-bold">{formatCurrency(studentFee.originalAmount)}</p>
                                {studentFee.discountAmount > 0 && (
                                    <p className="text-xs text-muted-foreground mt-1">After discount: {formatCurrency(studentFee.finalAmount)}</p>
                                )}
                            </div>
                            <DollarSign className="w-10 h-10 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Paid</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(studentFee.paidAmount)}</p>
                            </div>
                            <CheckCircle className="w-10 h-10 text-green-500 opacity-20" />
                        </div>
                        {/* Progress Bar */}
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>{feeMetrics.progressPercent}% paid</span>
                                <span>{formatCurrency(studentFee.finalAmount || studentFee.originalAmount)}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${feeMetrics.progressPercent === 100 ? 'bg-green-500' :
                                        feeMetrics.progressPercent >= 70 ? 'bg-emerald-500' :
                                            feeMetrics.progressPercent >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                        }`}
                                    style={{ width: `${feeMetrics.progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className={`border ${feeMetrics.balanceBg}`}>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Balance</p>
                                <p className={`text-2xl font-bold ${feeMetrics.balanceColor}`}>
                                    {formatCurrency(studentFee.balanceAmount)}
                                </p>
                                {feeMetrics.hasOverdue && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <AlertTriangle className="w-3 h-3 text-red-500" />
                                        <span className="text-xs text-red-600 font-medium">
                                            {feeMetrics.overdueCount} overdue entr{feeMetrics.overdueCount > 1 ? 'ies' : 'y'}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <AlertCircle className={`w-10 h-10 ${feeMetrics.balanceIconColor} opacity-20`} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Discount</p>
                                <p className="text-2xl font-bold text-purple-600">{formatCurrency(studentFee.discountAmount)}</p>
                            </div>
                            <Percent className="w-10 h-10 text-purple-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="ledger" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="ledger">Ledger</TabsTrigger>
                    <TabsTrigger value="particulars">Fee Particulars</TabsTrigger>
                    <TabsTrigger value="services">Services</TabsTrigger>
                    <TabsTrigger value="payments">Payment History</TabsTrigger>
                    <TabsTrigger value="discounts">Discounts</TabsTrigger>
                    <TabsTrigger value="audit">Audit Log</TabsTrigger>
                </TabsList>

                <TabsContent value="ledger">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Financial Ledger</CardTitle>
                                    <CardDescription>
                                        Detailed breakdown of all charges and payments for this session.
                                    </CardDescription>
                                </div>
                                {studentFee.walletBalance > 0 && (
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                        Wallet Balance: {formatCurrency(studentFee.walletBalance)}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Charge Month</TableHead>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead className="text-right">Net Amount</TableHead>
                                            <TableHead className="text-right">Late/Fine</TableHead>
                                            <TableHead className="text-right">Paid</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {studentFee.ledger?.length > 0 ? (
                                            studentFee.ledger.map((entry) => {
                                                const dtMonth = entry.month ? new Date(entry.month) : null;
                                                const monthLabel = dtMonth ? dtMonth.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'One-Time';
                                                
                                                return (
                                                    <TableRow key={entry.id} className={entry.isFrozen ? "opacity-80 bg-muted/20" : ""}>
                                                        <TableCell className="font-medium">{monthLabel}</TableCell>
                                                        <TableCell>
                                                            {entry.feeComponent?.name}
                                                            {entry.isFrozen && <Clock className="inline w-3 h-3 ml-2 text-muted-foreground" title="Frozen (Paid)" />}
                                                        </TableCell>
                                                        <TableCell>{entry.dueDate ? formatDate(entry.dueDate) : '-'}</TableCell>
                                                        <TableCell className="text-right font-medium">{formatCurrency(entry.netAmount)}</TableCell>
                                                        <TableCell className="text-right text-red-500">{entry.lateFeeAmount > 0 ? formatCurrency(entry.lateFeeAmount) : '-'}</TableCell>
                                                        <TableCell className="text-right text-green-600 font-medium">{formatCurrency(entry.paidAmount)}</TableCell>
                                                        <TableCell className="text-right font-bold">{formatCurrency(entry.balanceAmount)}</TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={getStatusColor(entry.status)}>
                                                                {entry.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {!entry.isFrozen && entry.status !== 'PAID' && entry.status !== 'WAIVED' && entry.status !== 'CANCELLED' && (
                                                                <Button variant="ghost" size="sm" className="h-8 shadow-none" onClick={() => {
                                                                    setAdjustEntry(entry);
                                                                    setAdjustAction('discount');
                                                                    setAdjustValue('');
                                                                    setAdjustReason('');
                                                                    setAdjustOpen(true);
                                                                }}>
                                                                    Adjust
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-24 text-center">
                                                    No ledger entries generated yet.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                
                <TabsContent value="services">
                    <Card>
                        <CardHeader>
                            <CardTitle>Subscribed Services</CardTitle>
                            <CardDescription>Manage optional services like Transport and Activities for this student.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {studentServices.length > 0 ? (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead>Service Name</TableHead>
                                                    <TableHead>Module</TableHead>
                                                    <TableHead>Default Price</TableHead>
                                                    <TableHead>Override Amount</TableHead>
                                                    <TableHead className="text-center">Status</TableHead>
                                                    <TableHead></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {studentServices.map((sub) => (
                                                    <TableRow key={sub.id}>
                                                        <TableCell className="font-medium">{sub.service?.name}</TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{sub.service?.module}</Badge>
                                                        </TableCell>
                                                        <TableCell>{formatCurrency(sub.service?.defaultPrice)}</TableCell>
                                                        <TableCell>
                                                            {sub.overrideAmount !== null ? (
                                                                <span className="font-medium">{formatCurrency(sub.overrideAmount)}</span>
                                                            ) : (
                                                                <span className="text-muted-foreground italic">None</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Badge className={sub.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                                                                {sub.isActive ? "Active" : "Inactive"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="outline" size="sm" className="h-8 shadow-none">
                                                                Manage
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 border border-dashed rounded-lg bg-muted/20">
                                        <p className="text-muted-foreground">This student is not subscribed to any optional services yet.</p>
                                        <Button variant="outline" className="mt-4 shadow-none">
                                            Assign Service
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="particulars">
                    <Card>
                        <CardHeader>
                            <CardTitle>Fee Particulars</CardTitle>
                            <CardDescription>Breakdown of fee components</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {studentFee.particulars?.map((particular) => (
                                    <div
                                        key={particular.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-semibold">{particular.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Paid: {formatCurrency(particular.paidAmount)} •
                                                Due: {formatCurrency(particular.amount - particular.paidAmount)}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{formatCurrency(particular.amount)}</p>
                                            <Badge className={getStatusColor(particular.status)}>
                                                {particular.status}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payments">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payment History</CardTitle>
                            <CardDescription>
                                {studentFee.payments?.length || 0} payments recorded
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {studentFee.payments?.map((payment) => (
                                    <div
                                        key={payment.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="w-4 h-4" />
                                                <span className="font-semibold">{payment.receiptNumber}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {formatDate(payment.paymentDate)} • {payment.paymentMethod}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{formatCurrency(payment.amount)}</p>
                                            <div className="flex items-center gap-1 mt-1 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={generatingReceiptId === payment.id}
                                                    onClick={() => handleReceipt(payment, 'download')}
                                                >
                                                    {generatingReceiptId === payment.id ? (
                                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                                    ) : (
                                                        <Download className="w-4 h-4 mr-1" />
                                                    )}
                                                    PDF
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={generatingReceiptId === payment.id}
                                                    onClick={() => handleReceipt(payment, 'print')}
                                                >
                                                    <Printer className="w-4 h-4 mr-1" />
                                                    Print
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="discounts">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Discounts Applied</CardTitle>
                                    <CardDescription>
                                        Total: {formatCurrency(studentFee.discountAmount)}
                                    </CardDescription>
                                </div>
                                <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
                                    <DialogTrigger asChild>
                                        <Button>
                                            <Percent className="w-4 h-4 mr-2" />
                                            Apply Discount
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Apply Discount</DialogTitle>
                                            <DialogDescription>
                                                Apply a discount to this student's fee
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Discount Type</Label>
                                                <Select value={discountType} onValueChange={setDiscountType}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                                                        <SelectItem value="FIXED">Fixed Amount</SelectItem>
                                                        <SelectItem value="SCHOLARSHIP">Scholarship</SelectItem>
                                                        <SelectItem value="SIBLING">Sibling Discount</SelectItem>
                                                        <SelectItem value="STAFF_WARD">Staff Ward</SelectItem>
                                                        <SelectItem value="MERIT">Merit Based</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Value *</Label>
                                                <Input
                                                    type="number"
                                                    placeholder={discountType === 'PERCENTAGE' ? '10 (%)' : '5000 (₹)'}
                                                    value={discountValue}
                                                    onChange={(e) => setDiscountValue(e.target.value)}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Reason *</Label>
                                                <Input
                                                    placeholder="Reason for discount"
                                                    value={discountReason}
                                                    onChange={(e) => setDiscountReason(e.target.value)}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => setDiscountOpen(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    className="flex-1"
                                                    onClick={handleApplyDiscount}
                                                    disabled={applyDiscountMutation.isPending}
                                                >
                                                    {applyDiscountMutation.isPending ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                            Applying...
                                                        </>
                                                    ) : (
                                                        'Apply Discount'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {studentFee.discounts?.map((discount) => (
                                    <div
                                        key={discount.id}
                                        className="flex items-center justify-between p-4 border rounded-lg"
                                    >
                                        <div>
                                            <p className="font-semibold">{discount.reason}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {discount.discountType} •
                                                Approved by {discount.approver?.name} on {formatDate(discount.approvedDate)}
                                            </p>
                                        </div>
                                        <p className="font-bold text-lg text-green-600">
                                            -{formatCurrency(discount.amount)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ledger Audit Log</CardTitle>
                            <CardDescription>Comprehensive history of all automated and manual changes to the ledger.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {auditLogs.length > 0 ? (
                                    <div className="rounded-md border overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead>Date & Time</TableHead>
                                                    <TableHead>Ledger Entry</TableHead>
                                                    <TableHead>Action</TableHead>
                                                    <TableHead>Reason</TableHead>
                                                    <TableHead>Performed By</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {auditLogs.map((log) => (
                                                    <TableRow key={log.id}>
                                                        <TableCell className="text-sm">
                                                            {new Date(log.createdAt).toLocaleString('en-IN', {
                                                                day: 'numeric', month: 'short', year: 'numeric',
                                                                hour: '2-digit', minute: '2-digit'
                                                            })}
                                                        </TableCell>
                                                        <TableCell className="font-medium">
                                                            {log.ledgerEntry?.feeComponent?.name} ({log.ledgerEntry?.monthLabel})
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">{log.action}</Badge>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs truncate text-muted-foreground">
                                                            {log.remarks || '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {log.user?.name || 'System Auto'}
                                                            {log.user?.email && <span className="block text-xs text-muted-foreground">{log.user.email}</span>}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-muted-foreground border rounded-lg">
                                        No audit logs found for this session.
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Adjust/Waive Ledger Entry Dialog */}
            <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Adjust Ledger Entry</DialogTitle>
                        <DialogDescription>
                            Waive or apply a discount to a specific ledger component ({adjustEntry?.feeComponent?.name} - {adjustEntry?.monthLabel}).
                        </DialogDescription>
                    </DialogHeader>
                    {adjustEntry && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg text-sm mb-2 flex justify-between items-center">
                                <div>
                                    <p className="font-medium">{adjustEntry.feeComponent?.name} ({adjustEntry.monthLabel})</p>
                                    <p className="text-muted-foreground mt-0.5">Net Amount: {formatCurrency(adjustEntry.netAmount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{formatCurrency(adjustEntry.balanceAmount)}</p>
                                    <p className="text-xs text-muted-foreground">Current Balance</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Action</Label>
                                <Select value={adjustAction} onValueChange={setAdjustAction}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                        <SelectContent>
                                        <SelectItem value="discount">Apply Partial Discount</SelectItem>
                                        <SelectItem value="waive">Waive Full Balance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {adjustAction === 'discount' && (
                                <div className="space-y-2">
                                    <Label>Discount Amount (₹) *</Label>
                                    <Input
                                        type="number"
                                        placeholder="e.g. 500"
                                        value={adjustValue}
                                        onChange={(e) => setAdjustValue(e.target.value)}
                                        max={adjustEntry.balanceAmount}
                                    />
                                    <p className="text-xs text-muted-foreground">Maximum allowed: {formatCurrency(adjustEntry.balanceAmount)}</p>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Reason *</Label>
                                <Input
                                    placeholder="Enter reason for this adjustment"
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setAdjustOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleAdjustLedger}
                                    disabled={adjustLedgerMutation.isPending}
                                >
                                    {adjustLedgerMutation.isPending ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : adjustAction === 'waive' ? (
                                        'Waive Balance'
                                    ) : (
                                        'Apply Discount'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Statement Download Dialog */}
            <Dialog open={statementDialogOpen} onOpenChange={setStatementDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Download Fee Statement
                        </DialogTitle>
                        <DialogDescription>
                            Choose a period for the fee statement of {studentFee.student.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Statement Period</Label>
                            <Select value={statementPeriod} onValueChange={setStatementPeriod}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="full_year">Full Year</SelectItem>
                                    <SelectItem value="last_month">Last Month</SelectItem>
                                    <SelectItem value="till_date">Till Current Date</SelectItem>
                                    <SelectItem value="custom">Custom Range</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {statementPeriod === 'custom' && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>From Date</Label>
                                    <Input
                                        type="date"
                                        value={customDateFrom}
                                        onChange={(e) => setCustomDateFrom(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>To Date</Label>
                                    <Input
                                        type="date"
                                        value={customDateTo}
                                        onChange={(e) => setCustomDateTo(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Period description */}
                        <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                            {statementPeriod === 'full_year' && 'Generates a statement with all ledger entries for the full academic year.'}
                            {statementPeriod === 'last_month' && `Generates a statement for ledger entries due in the last 30 days (up to ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}).`}
                            {statementPeriod === 'till_date' && `Generates a statement with ledger entries due up to today (${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}).`}
                            {statementPeriod === 'custom' && (customDateFrom && customDateTo
                                ? `Generates a statement for ledger entries due between ${new Date(customDateFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} and ${new Date(customDateTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
                                : 'Please select both From and To dates.')}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => setStatementDialogOpen(false)}
                            >Cancel</Button>
                            <Button
                                variant="outline"
                                className="flex-1"
                                disabled={!token || isGenerating || (statementPeriod === 'custom' && (!customDateFrom || !customDateTo))}
                                onClick={async () => {
                                    if (statementPeriod === 'custom') {
                                        if (!customDateFrom || !customDateTo) {
                                            toast.error('Please select both From and To dates');
                                            return;
                                        }
                                        if (new Date(customDateFrom) > new Date(customDateTo)) {
                                            toast.error('From date must be before To date');
                                            return;
                                        }
                                    }

                                    setIsGenerating(true);
                                    const loadingToast = toast.loading('Preparing to print...');

                                    try {
                                        const queryParams = new URLSearchParams({
                                            studentId,
                                            schoolId,
                                            period: statementPeriod,
                                        });
                                        if (statementPeriod === 'custom') {
                                            queryParams.set('fromDate', customDateFrom);
                                            queryParams.set('toDate', customDateTo);
                                        }

                                        const res = await fetch(`/api/statements/ledger?${queryParams}`, {
                                            headers: { 'Authorization': `Bearer ${token}` },
                                        });
                                        if (!res.ok) throw new Error('Failed to fetch ledger');
                                        const statementData = await res.json();

                                        await generateDocument(
                                            FeeStatementTemplate,
                                            statementData,
                                            `Fee_Statement_${studentFee.student.name || 'Student'}.pdf`,
                                            'print'
                                        );

                                        toast.dismiss(loadingToast);
                                        toast.success('Print dialog opened!');
                                        setStatementDialogOpen(false);
                                    } catch (err) {
                                        console.log(err);
                                        toast.dismiss(loadingToast);
                                        toast.error('Failed to generate statement.');
                                    } finally {
                                        setIsGenerating(false);
                                    }
                                }}
                            >
                                <Printer className="w-4 h-4 mr-2" /> Print
                            </Button>
                            <Button
                                className="flex-1"
                                disabled={!token || isGenerating || (statementPeriod === 'custom' && (!customDateFrom || !customDateTo))}
                                onClick={async () => {
                                    if (statementPeriod === 'custom') {
                                        if (!customDateFrom || !customDateTo) {
                                            toast.error('Please select both From and To dates');
                                            return;
                                        }
                                        if (new Date(customDateFrom) > new Date(customDateTo)) {
                                            toast.error('From date must be before To date');
                                            return;
                                        }
                                    }

                                    setIsGenerating(true);
                                    const loadingToast = toast.loading('Generating Fee Statement...');

                                    try {
                                        const queryParams = new URLSearchParams({
                                            studentId,
                                            schoolId,
                                            period: statementPeriod,
                                        });
                                        if (statementPeriod === 'custom') {
                                            queryParams.set('fromDate', customDateFrom);
                                            queryParams.set('toDate', customDateTo);
                                        }

                                        const res = await fetch(`/api/statements/ledger?${queryParams}`, {
                                            headers: { 'Authorization': `Bearer ${token}` },
                                        });
                                        if (!res.ok) throw new Error('Failed to fetch ledger');
                                        const statementData = await res.json();

                                        await generateDocument(
                                            FeeStatementTemplate,
                                            statementData,
                                            `Fee_Statement_${studentFee.student.name || 'Student'}_${statementPeriod === 'full_year' ? 'Full_Year' : statementPeriod === 'till_date' ? 'Till_Date' : 'Custom'}.pdf`,
                                            'download'
                                        );

                                        toast.dismiss(loadingToast);
                                        toast.success('Statement downloaded successfully!');
                                        setStatementDialogOpen(false);
                                    } catch (err) {
                                        console.log(err);
                                        toast.dismiss(loadingToast);
                                        toast.error('Failed to generate statement.');
                                    } finally {
                                        setIsGenerating(false);
                                    }
                                }}
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                                ) : (
                                    <><Download className="w-4 h-4 mr-2" /> Download</>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            </>
            )}
        </div>
    );
}