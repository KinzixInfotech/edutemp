'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
    DollarSign,
    Search,
    Filter,
    Download,
    Eye,
    CreditCard,
    Calendar,
    CheckCircle,
    Clock,
    XCircle,
    Loader2,
    RefreshCw,
    FileText
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';

export default function PaymentTracking() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedClass, setSelectedClass] = useState('all');
    const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [remarks, setRemarks] = useState('');

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

    // Fetch students with fee details
    const { data: students, isLoading, refetch } = useQuery({
        queryKey: ['students-fees', schoolId, academicYearId, selectedClass, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                schoolId,
                academicYearId,
                ...(selectedClass !== 'all' && { classId: selectedClass }),
            });

            const res = await fetch(`/api/schools/fee/students/list?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId && !!academicYearId,
    });

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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        const variants = {
            PAID: { variant: 'default', icon: CheckCircle, color: 'text-green-600' },
            PARTIAL: { variant: 'secondary', icon: Clock, color: 'text-yellow-600' },
            UNPAID: { variant: 'outline', icon: XCircle, color: 'text-blue-600' },
            OVERDUE: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
        };

        const config = variants[status] || variants.UNPAID;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="flex items-center gap-1">
                <Icon className="w-3 h-3" />
                {status}
            </Badge>
        );
    };

    const filteredStudents = students?.filter(student => {
        const matchesSearch = search === '' ||
            student.name.toLowerCase().includes(search.toLowerCase()) ||
            student.admissionNo.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'all' || student.fee?.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin" />
            </div>
        );
    }

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

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search student..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
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
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
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
                        <Link href="/dashboard/fees/reports">
                            <Button variant="outline" className="w-full">
                                <FileText className="w-4 h-4 mr-2" />
                                View Reports
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Students List */}
            <Card>
                <CardHeader>
                    <CardTitle>Students ({filteredStudents?.length || 0})</CardTitle>
                    <CardDescription>Fee payment status and history</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {filteredStudents?.map((student) => (
                            <div
                                key={student.userId}
                                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{student.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                            {student.class?.className}
                                        </Badge>
                                        {student.fee && getStatusBadge(student.fee.status)}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {student.admissionNo} • Roll: {student.rollNumber}
                                    </p>
                                    {student.fee && (
                                        <div className="flex items-center gap-4 mt-2 text-sm">
                                            <span>Total: {formatCurrency(student.fee.finalAmount)}</span>
                                            <span className="text-green-600">Paid: {formatCurrency(student.fee.paidAmount)}</span>
                                            <span className="text-red-600">Balance: {formatCurrency(student.fee.balanceAmount)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Link href={`/dashboard/fees/students/${student.userId}`}>
                                        <Button variant="outline" size="sm">
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
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
                                            <DollarSign className="w-4 h-4 mr-1" />
                                            Record Payment
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
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