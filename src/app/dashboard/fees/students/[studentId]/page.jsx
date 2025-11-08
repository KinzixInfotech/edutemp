'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
    Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function StudentFeeDetails({ params }) {
    const { fullUser } = useAuth();
    const router = useRouter();
    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const studentId = params?.studentId; // From URL params

    const [discountOpen, setDiscountOpen] = useState(false);
    const [discountType, setDiscountType] = useState('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [discountReason, setDiscountReason] = useState('');

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

    // Fetch student fee details
    const { data: studentFee, isLoading } = useQuery({
        queryKey: ['student-fee', studentId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ academicYearId });
            const res = await fetch(`/api/schools/fee/students/${studentId}?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!studentId && !!academicYearId,
    });

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }

    if (!studentFee) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">No Fee Assigned</h2>
                <p className="text-muted-foreground">This student doesn't have a fee structure assigned yet.</p>
            </div>
        );
    }

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
                            {studentFee.student.name}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {studentFee.student.admissionNo} • {studentFee.student.class?.className} •
                            Roll: {studentFee.student.rollNumber}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Send className="w-4 h-4 mr-2" />
                        Send Reminder
                    </Button>
                    <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Download Report
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Fee</p>
                                <p className="text-2xl font-bold">{formatCurrency(studentFee.originalAmount)}</p>
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
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Balance</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(studentFee.balanceAmount)}</p>
                            </div>
                            <AlertCircle className="w-10 h-10 text-red-500 opacity-20" />
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
            <Tabs defaultValue="installments" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="installments">Installments</TabsTrigger>
                    <TabsTrigger value="particulars">Fee Particulars</TabsTrigger>
                    <TabsTrigger value="payments">Payment History</TabsTrigger>
                    <TabsTrigger value="discounts">Discounts</TabsTrigger>
                </TabsList>

                <TabsContent value="installments">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Payment Schedule</CardTitle>
                                    <CardDescription>
                                        {studentFee.globalFeeStructure?.mode} installments
                                    </CardDescription>
                                </div>
                                {studentFee.nextDueInstallment && (
                                    <Badge variant="outline">
                                        Next Due: {formatDate(studentFee.nextDueInstallment.dueDate)}
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {studentFee.installments?.map((inst) => (
                                    <div
                                        key={inst.id}
                                        className={`p-4 border rounded-lg ${inst.status === 'PAID' ? 'bg-green-50 border-green-200' :
                                            inst.isOverdue ? 'bg-red-50 border-red-200' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${inst.status === 'PAID' ? 'bg-green-500' :
                                                    inst.isOverdue ? 'bg-red-500' : 'bg-blue-500'
                                                    } text-white font-bold`}>
                                                    {inst.installmentNumber}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">Installment {inst.installmentNumber}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Due: {formatDate(inst.dueDate)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{formatCurrency(inst.amount)}</p>
                                                <Badge className={getStatusColor(inst.status)}>
                                                    {inst.status}
                                                </Badge>
                                            </div>
                                        </div>
                                        {inst.paidAmount > 0 && inst.status !== 'PAID' && (
                                            <div className="mt-2 text-sm text-muted-foreground">
                                                Paid: {formatCurrency(inst.paidAmount)} •
                                                Balance: {formatCurrency(inst.amount - inst.paidAmount)}
                                            </div>
                                        )}
                                        {inst.paidDate && (
                                            <div className="mt-2 text-sm text-green-600">
                                                Paid on {formatDate(inst.paidDate)}
                                            </div>
                                        )}
                                    </div>
                                ))}
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
                                                Balance: {formatCurrency(particular.amount - particular.paidAmount)}
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
                                            <Button variant="ghost" size="sm" className="mt-1">
                                                <Download className="w-4 h-4 mr-1" />
                                                Receipt
                                            </Button>
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
            </Tabs>
        </div>
    );
}