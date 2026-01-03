'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Loader2,
    GraduationCap,
    CreditCard,
    Calendar,
    CheckCircle,
    AlertCircle,
    Clock,
    Download,
    LogOut,
    ChevronRight,
    Receipt,
    Wallet,
    FileText,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import FeeStatementTemplate from '@/components/receipts/FeeStatementTemplate';
import { createRoot } from 'react-dom/client';
import { toJpeg } from 'html-to-image';

import jsPDF from 'jspdf';

export default function PayDashboardPage() {
    const router = useRouter();
    const [session, setSession] = useState(null);
    const [selectedInstallments, setSelectedInstallments] = useState([]);
    const [upiId, setUpiId] = useState(''); // For ICICI UPI collection

    // Check session on mount
    useEffect(() => {
        const storedSession = sessionStorage.getItem('paySession');
        if (!storedSession) {
            router.push('/pay');
            return;
        }

        const parsed = JSON.parse(storedSession);
        if (new Date(parsed.expiresAt) < new Date()) {
            sessionStorage.removeItem('paySession');
            router.push('/pay');
            return;
        }

        setSession(parsed);
    }, [router]);

    // Fetch fee data
    const { data, isLoading, error } = useQuery({
        queryKey: ['pay-fees', session?.token],
        queryFn: async () => {
            const res = await fetch('/api/pay/student-fees', {
                headers: {
                    'Authorization': `Bearer ${session.token}`,
                },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to fetch');
            }
            const data = await res.json();
            console.log('🔍 Payment Portal Data:', data);
            console.log('🔍 Payment Options:', data?.paymentOptions);
            return data;
        },
        enabled: !!session?.token,
        staleTime: 60 * 1000, // 1 minute
    });

    const handleLogout = () => {
        sessionStorage.removeItem('paySession');
        router.push('/pay');
    };

    const toggleInstallment = (installmentId) => {
        setSelectedInstallments(prev => {
            if (prev.includes(installmentId)) {
                return prev.filter(id => id !== installmentId);
            }
            return [...prev, installmentId];
        });
    };

    const getSelectedTotal = () => {
        if (!data?.installments) return 0;
        return data.installments
            .filter(i => selectedInstallments.includes(i.id))
            .reduce((sum, i) => sum + (i.amount - i.paidAmount + (i.lateFee || 0)), 0);
    };

    const [processingPayment, setProcessingPayment] = useState(false);

    const handleProceedToCheckout = async () => {
        if (selectedInstallments.length === 0) {
            toast.error('Please select at least one installment to pay');
            return;
        }

        try {
            setProcessingPayment(true);
            const amountToPay = getSelectedTotal();

            // Map selected installments to format expected by API
            const installmentPayload = data.installments
                .filter(i => selectedInstallments.includes(i.id))
                .map(i => ({
                    id: i.id,
                    amount: (i.amount - i.paidAmount + (i.lateFee || 0))
                }));

            const res = await fetch('/api/payment/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentFeeId: fee.id,
                    studentId: student.id,
                    schoolId: school.id,
                    amount: amountToPay,
                    itemType: 'INSTALLMENT',
                    installments: installmentPayload,
                    paymentMode: 'ONLINE',
                    upiId: upiId // For ICICI UPI collection
                })
            });

            const result = await res.json();

            console.log('🔍 Payment Initiate Response:', result);

            if (!res.ok) {
                toast.error(result.error || 'Failed to initiate payment');
                setProcessingPayment(false);
                return;
            }

            if (result.success) {
                // Check payment flow type
                if (result.type === 'UPI_COLLECT') {
                    // UPI Collection Flow (ICICI)
                    toast.success(result.message || 'Payment request sent to your UPI app');
                    console.log('📱 UPI Collection:', result);

                    // Show message and user needs to approve in UPI app
                    setTimeout(() => {
                        toast.info('Please approve the payment in your UPI app', {
                            duration: 10000
                        });
                        // TODO: Show polling UI or redirect to status page
                        setProcessingPayment(false);
                    }, 2000);

                } else if (result.redirectUrl) {
                    // Redirect-based payment flow (SBI, HDFC, etc)
                    toast.success('Redirecting to secure payment gateway...');

                    console.log('📋 Params to send:', result.params);
                    console.log('🔗 Redirect URL:', result.redirectUrl);
                    console.log('📮 Method:', result.method);

                    const method = result.method || 'POST';

                    if (method === 'GET') {
                        // For GET, append params to URL and redirect
                        const params = new URLSearchParams(result.params);
                        const fullUrl = `${result.redirectUrl}?${params.toString()}`;
                        console.log('🚀 Redirecting via GET to:', fullUrl);
                        window.location.href = fullUrl;
                    } else {
                        // For POST, create and auto-submit form
                        const form = document.createElement('form');
                        form.method = 'POST';
                        form.action = result.redirectUrl;

                        // Add all parameters as hidden inputs
                        if (result.params) {
                            Object.entries(result.params).forEach(([key, value]) => {
                                console.log(`  ➕ Adding param: ${key} = ${value?.substring(0, 50)}...`);
                                const input = document.createElement('input');
                                input.type = 'hidden';
                                input.name = key;
                                input.value = value;
                                form.appendChild(input);
                            });
                        } else {
                            console.error('❌ No params returned from API!');
                        }

                        // Add form to body and submit
                        document.body.appendChild(form);
                        console.log('✅ Form created, submitting...');
                        form.submit();
                    }
                } else {
                    toast.error('Invalid response from gateway');
                    setProcessingPayment(false);
                }
            } else {
                toast.error('Invalid response from gateway');
                setProcessingPayment(false);
            }

        } catch (error) {
            console.error(error);
            toast.error('An error occurred. Please try again.');
            setProcessingPayment(false);
        }
    };

    // Get relative due date text
    const getRelativeDueDate = (dueDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-500', urgent: true };
        if (diffDays === 0) return { text: 'Due today', color: 'text-orange-500', urgent: true };
        if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-orange-500', urgent: true };
        if (diffDays <= 7) return { text: `Due in ${diffDays} days`, color: 'text-yellow-600', urgent: false };
        if (diffDays <= 30) return { text: `Due in ${diffDays} days`, color: 'text-gray-500', urgent: false };

        const dateStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        return { text: `Due on ${dateStr} (~${Math.floor(diffDays / 30)} months left)`, color: 'text-gray-400', urgent: false };
    };

    const getStatusBadge = (status, isOverdue) => {
        if (status === 'PAID') {
            return <Badge className="bg-green-100 text-green-700 border-0 gap-1"><CheckCircle className="w-3 h-3" />Paid</Badge>;
        }
        if (isOverdue) {
            return <Badge className="bg-red-100 text-red-700 border-0 gap-1"><AlertCircle className="w-3 h-3" />Overdue</Badge>;
        }
        if (status === 'PARTIAL') {
            return <Badge className="bg-yellow-100 text-yellow-700 border-0 gap-1"><Clock className="w-3 h-3" />Partial</Badge>;
        }
        return <Badge className="bg-gray-100 text-gray-700 border-0 gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
    };

    if (!session || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
                            <AlertCircle className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Failed to Load</h2>
                            <p className="text-gray-500 mt-2">{error.message}</p>
                        </div>
                        <Button onClick={handleLogout} variant="outline" className="w-full">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const { student, school, fee, installments, payments, summary, bankDetails, paymentOptions } = data || {};

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">

            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {school?.profilePicture ? (
                            <img src={school.profilePicture} alt={school.name} className="h-10 w-auto rounded-lg" />
                        ) : (
                            <div className="w-10 h-10 bg-[#0168fb] rounded-lg flex items-center justify-center">
                                <GraduationCap className="w-6 h-6 text-white" />
                            </div>
                        )}
                        <div>
                            <h1 className="font-semibold text-gray-900 dark:text-white">{school?.name}</h1>
                            <p className="text-xs text-gray-500">Fee Payment Portal</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-500">
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </header>


            <main className="container mx-auto px-4 py-8  max-w-6xl">

                {/* Student Info Card */}
                <Card className="mb-6 bg-gradient-to-br from-[#0168fb] via-[#0855d4] to-indigo-600 text-white border-0 shadow-xl overflow-hidden relative">
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 rounded-full" />
                    <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-white/5 rounded-full" />

                    <CardContent className="p-5 sm:p-6 relative z-10">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 text-center sm:text-left">
                                <div className="relative">
                                    {student?.profilePicture && student.profilePicture !== 'default.png' ? (
                                        <img
                                            src={student.profilePicture}
                                            alt={student.name}
                                            className="w-24 h-24 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white/40 shadow-xl ring-4 ring-white/10"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/40 shadow-xl ring-4 ring-white/10">
                                            <span className="text-3xl sm:text-2xl font-bold text-white">
                                                {student?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ST'}
                                            </span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
                                </div>

                                <div className="pr-16 sm:pr-0">
                                    <h2 className="text-2xl sm:text-xl font-bold">{student?.name}</h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2 text-blue-100 text-sm">
                                        <span className="bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
                                            Adm. No: {student?.admissionNo}
                                        </span>
                                        <span className="bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
                                            Class: {student?.class} - {student?.section}
                                        </span>
                                    </div>
                                    {student?.fatherName && (
                                        <p className="text-blue-100 text-sm mt-2">
                                            Father: {student.fatherName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {school?.profilePicture && (
                                <div className="hidden sm:block">
                                    <div className="bg-white rounded-xl p-1.5 shadow-lg">
                                        <img
                                            src={school.profilePicture}
                                            alt={school.name}
                                            className="h-12 w-12 object-contain rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>

                    {school?.profilePicture && (
                        <div className="sm:hidden absolute bottom-3 right-3 z-20">
                            <div className="bg-white rounded-xl p-1.5 shadow-lg">
                                <img
                                    src={school.profilePicture}
                                    alt={school.name}
                                    className="h-10 w-10 object-contain rounded-lg"
                                />
                            </div>
                        </div>
                    )}
                </Card>
                {data?.paymentOptions && !data.paymentOptions.onlineEnabled && (
                    <div className="p-3 mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 dark:text-amber-200">
                                <p className="font-semibold mb-1">Online Payment Not Enabled</p>
                                <p>You can pay fees by visiting the school directly. Contact the school office for payment.</p>
                            </div>
                        </div>
                    </div>
                )}
                {/* Progress Bar */}
                {fee && (
                    <Card className="mb-6 bg-white dark:bg-slate-900 overflow-hidden">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Payment Progress</h3>
                                    <p className="text-sm text-gray-500">
                                        ₹{fee.paidAmount?.toLocaleString()} of ₹{fee.finalAmount?.toLocaleString()} paid
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="text-3xl font-bold text-[#0168fb]">
                                        {fee.finalAmount > 0 ? Math.round((fee.paidAmount / fee.finalAmount) * 100) : 0}%
                                    </span>
                                    <p className="text-xs text-gray-500">Complete</p>
                                </div>
                            </div>
                            <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-[#0168fb] to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${fee.finalAmount > 0 ? Math.min((fee.paidAmount / fee.finalAmount) * 100, 100) : 0}%` }}
                                />
                            </div>
                            {fee.balanceAmount > 0 && (
                                <div className="mt-4 flex items-center justify-between">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        <span className="font-semibold text-orange-500">₹{fee.balanceAmount?.toLocaleString()}</span> remaining to pay
                                    </p>
                                    <Button
                                        onClick={() => {
                                            const unpaidIds = installments?.filter(i => i.status !== 'PAID').map(i => i.id) || [];
                                            setSelectedInstallments(unpaidIds);
                                            toast.success(`Selected all ${unpaidIds.length} pending installments`);
                                        }}
                                        variant="outline"
                                        size="sm"
                                        className="text-[#0168fb] border-[#0168fb] hover:bg-[#0168fb]/10"
                                    >
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        Quick Pay All
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Fee Summary Cards */}
                {fee && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-white dark:bg-slate-900">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                                        <Wallet className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Total Fee</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">₹{fee.finalAmount?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-slate-900">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Paid</p>
                                        <p className="text-xl font-bold text-green-600">₹{fee.paidAmount?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-slate-900">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Balance</p>
                                        <p className="text-xl font-bold text-orange-600">₹{fee.balanceAmount?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-slate-900">
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${summary?.overdueCount > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        <AlertCircle className={`w-5 h-5 ${summary?.overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Overdue</p>
                                        <p className={`text-xl font-bold ${summary?.overdueCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                            {summary?.overdueCount || 0}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {!fee && (
                    <Card className="mb-6">
                        <CardContent className="p-8 text-center">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No Fee Assigned</h3>
                            <p className="text-gray-500 mt-2">No fee structure has been assigned for this academic year. Please contact your school administration.</p>
                        </CardContent>
                    </Card>
                )}

                {/* Main Content */}
                {fee && (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Installments List */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-lg flex items-center gap-2">
                                                <Calendar className="w-5 h-5 text-[#0168fb]" />
                                                Fee Installments
                                            </CardTitle>
                                            <CardDescription>Select installments to pay</CardDescription>
                                        </div>
                                        <Badge variant="outline">{fee.structureName}</Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {installments?.map((installment) => {
                                        const isPaid = installment.status === 'PAID';
                                        const balance = installment.amount - installment.paidAmount;
                                        const totalDue = balance + (installment.lateFee || 0);

                                        return (
                                            <div
                                                key={installment.id}
                                                className={`p-4 rounded-xl border-1 transition-all ${isPaid
                                                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                                    : selectedInstallments.includes(installment.id)
                                                        ? 'bg-blue-50 dark:bg-blue-900/10 border-[#0168fb] '
                                                        : installment.isOverdue
                                                            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                                                            : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-gray-300 '
                                                    } cursor-pointer`}
                                                onClick={() => !isPaid && toggleInstallment(installment.id)}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        {!isPaid && (
                                                            <Checkbox
                                                                checked={selectedInstallments.includes(installment.id)}
                                                                onCheckedChange={() => toggleInstallment(installment.id)}
                                                                className="data-[state=checked]:bg-[#0168fb]"
                                                            />
                                                        )}
                                                        {isPaid && (
                                                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                                                <CheckCircle className="w-4 h-4 text-white" />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                                {installment.name}
                                                            </p>
                                                            {!isPaid ? (
                                                                <p className={`text-sm font-medium ${getRelativeDueDate(installment.dueDate).color}`}>
                                                                    {getRelativeDueDate(installment.dueDate).text}
                                                                </p>
                                                            ) : (
                                                                <p className="text-sm text-gray-500">
                                                                    Paid on {installment.paidDate ? new Date(installment.paidDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'N/A'}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="flex items-center gap-2 justify-end flex-wrap">
                                                            {getStatusBadge(installment.status, installment.isOverdue)}
                                                            {installment.isEarlyPaymentEligible && data?.discountSettings?.earlyPaymentDiscount?.enabled && (
                                                                <div className="flex flex-col items-end">
                                                                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs">
                                                                        🌱 Early Pay -{data.discountSettings.earlyPaymentDiscount.percentage}%
                                                                    </Badge>
                                                                    <span className="text-[10px] text-green-600 mt-0.5">
                                                                        Valid until {(() => {
                                                                            const d = new Date(installment.dueDate);
                                                                            d.setDate(d.getDate() - (installment.earlyPaymentDays || 10));
                                                                            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                                                                        })()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className={`text-lg font-bold mt-1 ${isPaid ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                                            ₹{isPaid ? installment.paidAmount?.toLocaleString() : totalDue?.toLocaleString()}
                                                        </p>
                                                        {installment.lateFee > 0 && !isPaid && (
                                                            <p className="text-xs text-red-500">+ ₹{installment.lateFee} late fee</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* Recent Payments */}
                            {payments?.length > 0 && (
                                <Card>
                                    <CardHeader className="pb-4">
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            <Receipt className="w-5 h-5 text-green-600" />
                                            Recent Payments
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-3">
                                            {payments.slice(0, 5).map((payment) => (
                                                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                                    <div>
                                                        <p className="font-medium text-gray-900 dark:text-white">
                                                            ₹{payment.amount?.toLocaleString()}
                                                        </p>
                                                        <p className="text-sm text-gray-500">
                                                            {new Date(payment.paymentDate).toLocaleDateString('en-IN')} • {payment.paymentMethod}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-green-100 text-green-700 border-0">
                                                            <CheckCircle className="w-3 h-3 mr-1" />
                                                            Paid
                                                        </Badge>
                                                        <Button variant="ghost" size="sm">
                                                            <Download className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Payment Summary Sidebar */}
                        <div className="space-y-4">
                            <Card className="sticky top-24">
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <CreditCard className="w-5 h-5 text-[#0168fb]" />
                                        Payment Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Fee Statement Download */}
                                    <Button
                                        variant="outline"
                                        className="w-full flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 mb-2"
                                        disabled={!data?.student?.id || !data?.school?.id}
                                        onClick={async () => {
                                            // Show loading toast
                                            const loadingToast = toast.loading("Generating Fee Statement...");

                                            try {
                                                // 1. Fetch Data
                                                const res = await fetch(`/api/statements/ledger?studentId=${data.student.id}&schoolId=${data.school.id}`, {
                                                    headers: {
                                                        'Authorization': `Bearer ${session.token}`,
                                                    },
                                                });
                                                if (!res.ok) throw new Error('Failed to fetch ledger');
                                                const statementData = await res.json();

                                                // 2. Create Hidden Container
                                                const container = document.createElement('div');
                                                container.id = 'pdf-gen-container';
                                                container.style.position = 'fixed';
                                                container.style.top = '0';
                                                container.style.left = '0'; // Move to visible area but behind content
                                                container.style.width = '8.5in';
                                                container.style.zIndex = '-9999';
                                                container.style.background = '#ffffff'; // Ensure white background
                                                container.style.color = '#000000';

                                                document.body.appendChild(container);

                                                // 3. Render Template
                                                const root = createRoot(container);
                                                root.render(<FeeStatementTemplate {...statementData} />);

                                                // 4. Wait for Render (Need sufficient time for styles/images)
                                                await new Promise(resolve => setTimeout(resolve, 2000));

                                                // 5. Capture with html-to-image (Use JPEG for strictly opaque background)
                                                // Note: fontEmbedCSS: '' prevents the SecurityError from external Google Fonts
                                                const imgData = await toJpeg(container, {
                                                    quality: 0.98,
                                                    pixelRatio: 2, // Higher resolution
                                                    backgroundColor: '#ffffff',
                                                    style: { background: 'white' },
                                                    fontEmbedCSS: '', // DISABLE FONT INLINING TO FIX CRASH
                                                });

                                                // 6. Generate PDF
                                                // 'p', 'pt', 'letter' -> points, letter size
                                                const pdf = new jsPDF('p', 'pt', 'letter');

                                                const pdfWidth = pdf.internal.pageSize.getWidth();
                                                const pdfHeight = pdf.internal.pageSize.getHeight();

                                                const imgProps = pdf.getImageProperties(imgData);
                                                const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

                                                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeight);

                                                // 7. Save File
                                                const fileName = `Fee_Statement_${statementData.studentData?.studentName || 'Student'}.pdf`;
                                                pdf.save(fileName);

                                                // 8. Cleanup
                                                root.unmount();
                                                document.body.removeChild(container);

                                                toast.dismiss(loadingToast);
                                                toast.success("Statement downloaded successfully!");

                                            } catch (err) {
                                                console.error(err);
                                                toast.dismiss(loadingToast);
                                                toast.error("Failed to generate statement. Please try again.");
                                            }
                                        }}
                                    >
                                        <FileText className="w-4 h-4" />
                                        Download Fee Statement (PDF)
                                    </Button>

                                    {/* Online Payment Disabled Notice */}

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Selected Installments</span>
                                            <span className="font-medium">{selectedInstallments.length}</span>
                                        </div>

                                        {/* Subtotal before discounts */}
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Subtotal</span>
                                            <span className="font-medium">₹{getSelectedTotal().toLocaleString()}</span>
                                        </div>

                                        {/* Display Applicable Discounts - only show for selected installments */}
                                        {(() => {
                                            // Calculate early payment discount ONLY for selected installments that are eligible
                                            const selectedEligibleForEarlyPay = data?.installments?.filter(i =>
                                                selectedInstallments.includes(i.id) && i.isEarlyPaymentEligible
                                            ) || [];

                                            const earlyPaymentEnabled = data?.discountSettings?.earlyPaymentDiscount?.enabled;
                                            const earlyPaymentPercentage = data?.discountSettings?.earlyPaymentDiscount?.percentage || 0;

                                            // Calculate discount only on eligible selected installments
                                            const eligibleAmount = selectedEligibleForEarlyPay.reduce((sum, i) =>
                                                sum + (i.amount - i.paidAmount + (i.lateFee || 0)), 0
                                            );
                                            const earlyPaymentDiscount = earlyPaymentEnabled && selectedEligibleForEarlyPay.length > 0
                                                ? Math.round(eligibleAmount * (earlyPaymentPercentage / 100))
                                                : 0;

                                            // Other discounts (sibling, staff ward) apply to total
                                            const otherDiscounts = data?.applicableDiscounts?.filter(d => d.type !== 'EARLY_PAYMENT') || [];
                                            const otherDiscountPercentage = otherDiscounts.reduce((sum, d) => sum + (d.percentage || 0), 0);
                                            const subtotal = getSelectedTotal();
                                            const otherDiscountAmount = Math.round(subtotal * (otherDiscountPercentage / 100));

                                            const totalDiscount = earlyPaymentDiscount + otherDiscountAmount;
                                            const finalAmount = subtotal - totalDiscount;

                                            const hasDiscounts = totalDiscount > 0;

                                            return (
                                                <>
                                                    {/* Show other discounts (sibling, staff ward) */}
                                                    {otherDiscounts.map((discount, idx) => (
                                                        <div key={idx} className="flex justify-between text-sm">
                                                            <span className="text-green-600 flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" />
                                                                {discount.name} ({discount.percentage}%)
                                                            </span>
                                                            <span className="text-green-600 font-medium">
                                                                -₹{Math.round(subtotal * (discount.percentage / 100)).toLocaleString()}
                                                            </span>
                                                        </div>
                                                    ))}

                                                    {/* Show early payment discount ONLY if selected installments qualify */}
                                                    {earlyPaymentEnabled && selectedEligibleForEarlyPay.length > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-green-600 flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" />
                                                                Early Payment Discount ({earlyPaymentPercentage}%)
                                                            </span>
                                                            <span className="text-green-600 font-medium">
                                                                -₹{earlyPaymentDiscount.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <Separator />

                                                    {/* Final Total with Discounts */}
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-900 dark:text-white font-medium">
                                                            {hasDiscounts ? 'Final Amount' : 'Total Amount'}
                                                        </span>
                                                        <span className="text-2xl font-bold text-[#0168fb]">
                                                            ₹{finalAmount.toLocaleString()}
                                                        </span>
                                                    </div>

                                                    {/* Show savings if discounts applied */}
                                                    {hasDiscounts && (
                                                        <div className="text-center text-sm text-green-600 font-medium">
                                                            You save ₹{totalDiscount.toLocaleString()}!
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>

                                    {/* UPI ID Input for ICICI - Only show if online payments enabled */}
                                    {data?.paymentOptions?.onlineEnabled && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                UPI ID (for ICICI payments)
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="yourname@paytm"
                                                value={upiId}
                                                onChange={(e) => setUpiId(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#0168fb] focus:border-transparent bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                            />
                                            <p className="text-xs text-gray-500">
                                                Enter your UPI ID (e.g., name@paytm, name@phonepe)
                                            </p>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleProceedToCheckout}
                                        disabled={selectedInstallments.length === 0 || processingPayment || !data?.paymentOptions?.onlineEnabled}
                                        className="w-full h-12 bg-[#0168fb] hover:bg-blue-700 text-white font-medium rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {!data?.paymentOptions?.onlineEnabled ? (
                                            <>
                                                <AlertCircle className="w-4 h-4 mr-2" />
                                                Payment Not Enabled
                                            </>
                                        ) : processingPayment ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="w-4 h-4 mr-2" />
                                                Proceed to Pay
                                                <ChevronRight className="w-4 h-4 ml-2" />
                                            </>
                                        )}
                                    </Button>

                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">
                                            Secure Banking Gateway
                                        </p>
                                    </div>

                                    {/* Payment Methods */}
                                    <div className="pt-4 border-t">
                                        <p className="text-xs text-gray-500 mb-3">Accepted Payment Methods</p>
                                        <div className="flex flex-wrap gap-2">
                                            <Badge variant="outline" className="text-xs">UPI</Badge>
                                            <Badge variant="outline" className="text-xs">Credit Card</Badge>
                                            <Badge variant="outline" className="text-xs">Debit Card</Badge>
                                            <Badge variant="outline" className="text-xs">Net Banking</Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Help Card */}
                            <Card className="bg-gray-50 dark:bg-slate-800/50 border-dashed">
                                <CardContent className="p-4 text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Need help with payment?
                                    </p>
                                    <p className="text-sm font-medium text-[#0168fb] mt-1">
                                        Contact: {school?.contactNumber || school?.contactEmail || 'School Office'}
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Bank Details Card - Show if enabled */}
                            {bankDetails && (
                                <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-300">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            Bank Transfer Details
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-xs space-y-1.5">
                                        {bankDetails.bankName && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Bank:</span>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{bankDetails.bankName}</span>
                                            </div>
                                        )}
                                        {bankDetails.accountNumber && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">A/C No:</span>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{bankDetails.accountNumber}</span>
                                            </div>
                                        )}
                                        {bankDetails.ifscCode && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">IFSC:</span>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{bankDetails.ifscCode}</span>
                                            </div>
                                        )}
                                        {bankDetails.accountHolderName && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Name:</span>
                                                <span className="font-medium text-gray-700 dark:text-gray-300">{bankDetails.accountHolderName}</span>
                                            </div>
                                        )}
                                        {bankDetails.upiId && (
                                            <div className="flex justify-between pt-1 border-t">
                                                <span className="text-gray-500">UPI:</span>
                                                <span className="font-medium text-blue-600">{bankDetails.upiId}</span>
                                            </div>
                                        )}
                                        <p className="text-[10px] text-gray-400 pt-2">
                                            For direct bank transfers, share receipt with school after payment
                                        </p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-gray-800 py-6 mt-8">
                <div className="container mx-4 px-4 text-center">
                    <p className="text-sm text-gray-500">
                        © {new Date().getFullYear()} EduBreezy. Secure Fee Payment Portal.
                    </p>
                </div>
            </footer>
        </div>
    );
}

