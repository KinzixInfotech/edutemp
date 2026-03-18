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
    ArrowLeft, Download, DollarSign, CheckCircle, Clock, AlertCircle,
    CreditCard, Percent, FileText, Send, Loader2, AlertTriangle,
    Printer, Plus, X, Edit2, Save, Bus, Zap, Shield, Tag,
    RefreshCw, TrendingDown, Info,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReceiptTemplate from '@/components/receipts/ReceiptTemplate';
import { supabase } from '@/lib/supabase';

const INR = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const MODULE_ICONS = { SERVICE_TRANSPORT: Bus, SERVICE_ACTIVITY: Zap, SERVICE_HOSTEL: Shield, SERVICE_CUSTOM: Tag };
const MODULE_COLORS = {
    SERVICE_TRANSPORT: 'bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-100 dark:border-blue-900',
    SERVICE_ACTIVITY: 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 border-purple-100 dark:border-purple-900',
    SERVICE_HOSTEL: 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-900',
    SERVICE_CUSTOM: 'bg-slate-50 dark:bg-slate-900 text-slate-600 border-slate-100 dark:border-slate-800',
};
const STATUS_COLORS = {
    LEDGER_PAID: 'bg-green-100 text-green-800', LEDGER_PARTIAL: 'bg-yellow-100 text-yellow-800',
    LEDGER_UNPAID: 'bg-slate-100 text-slate-700', LEDGER_WAIVED: 'bg-purple-100 text-purple-800',
    LEDGER_CANCELLED: 'bg-gray-100 text-gray-500',
    PAID: 'bg-green-100 text-green-800', PARTIAL: 'bg-yellow-100 text-yellow-800',
    PENDING: 'bg-blue-100 text-blue-800', OVERDUE: 'bg-red-100 text-red-800',
};
const STATUS_LABELS = {
    LEDGER_PAID: 'Paid', LEDGER_PARTIAL: 'Partial', LEDGER_UNPAID: 'Unpaid',
    LEDGER_WAIVED: 'Waived', LEDGER_CANCELLED: 'Cancelled',
    PAID: 'Paid', PARTIAL: 'Partial', PENDING: 'Pending', OVERDUE: 'Overdue',
};

export default function StudentFeeDetails({ params }) {
    const { fullUser } = useAuth();
    const [token, setToken] = useState('');
    supabase.auth.onAuthStateChange((_e, s) => setToken(s?.access_token || ''));
    const router = useRouter();
    const qc = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const { studentId } = use(params);

    const [discountOpen, setDiscountOpen] = useState(false);
    const [discountType, setDiscountType] = useState('PERCENTAGE');
    const [discountValue, setDiscountValue] = useState('');
    const [discountReason, setDiscountReason] = useState('');
    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustEntry, setAdjustEntry] = useState(null);
    const [adjustAction, setAdjustAction] = useState('discount');
    const [adjustValue, setAdjustValue] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [statementOpen, setStatementOpen] = useState(false);
    const [statementPeriod, setStatementPeriod] = useState('full_year');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatingId, setGeneratingId] = useState(null);
    const [addServiceOpen, setAddServiceOpen] = useState(false);
    const [serviceToAdd, setServiceToAdd] = useState('');
    const [serviceOverride, setServiceOverride] = useState('');
    const [editingOverrideId, setEditingOverrideId] = useState(null);
    const [overrideDraft, setOverrideDraft] = useState('');

    // ── Queries ───────────────────────────────────────────────────────
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => { const r = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`); return r.json(); },
        enabled: !!schoolId,
    });
    // ✅ FIX: single declaration, no activeYear
    const academicYearId = academicYears?.find(y => y.isActive)?.id;

    const { data: studentFee, isLoading, refetch: refetchFee } = useQuery({
        queryKey: ['student-fee', studentId, academicYearId],
        queryFn: async () => {
            const p = new URLSearchParams({ academicYearId, feeSessionId: academicYearId });
            const r = await fetch(`/api/schools/fee/students/${studentId}?${p}`);
            if (!r.ok) throw new Error('Failed');
            return r.json();
        },
        enabled: !!studentId && !!academicYearId,
    });

    const derivedSchoolId = studentFee?.student?.schoolId || schoolId;

    const { data: servicesRes, refetch: refetchServices } = useQuery({
        queryKey: ['student-services', studentId],
        queryFn: async () => { const r = await fetch(`/api/schools/fee/student-services?studentId=${studentId}`); return r.json(); },
        enabled: !!studentId,
    });
    const studentServices = servicesRes?.services || [];
    const subscribedIds = new Set(studentServices.map(s => s.serviceId));

    const { data: allServicesRes } = useQuery({
        queryKey: ['all-services', schoolId],
        queryFn: async () => { const r = await fetch(`/api/schools/fee/services?schoolId=${schoolId}`); return r.json(); },
        enabled: !!schoolId && addServiceOpen,
    });
    const allServices = allServicesRes?.services || [];
    const availableToAdd = allServices.filter(s => !subscribedIds.has(s.id) && s.isActive);

    // ✅ FIX: uses academicYearId not activeYear?.id
    const { data: auditRes } = useQuery({
        queryKey: ['ledger-audit', studentId, academicYearId],
        queryFn: async () => {
            const p = new URLSearchParams({ studentId, feeSessionId: academicYearId });
            const r = await fetch(`/api/schools/fee/ledger/audit?${p}`);
            return r.json();
        },
        enabled: !!studentId && !!academicYearId,
    });
    const auditLogs = auditRes?.logs || [];

    // ── Mutations ─────────────────────────────────────────────────────
    const inv = (...keys) => keys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));

    const applyDiscountMutation = useMutation({
        mutationFn: async (d) => { const r = await fetch('/api/schools/fee/discounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; },
        onSuccess: () => { toast.success('Discount applied'); inv('student-fee'); setDiscountOpen(false); setDiscountValue(''); setDiscountReason(''); },
        onError: e => toast.error(e.message),
    });

    const adjustLedgerMutation = useMutation({
        mutationFn: async (d) => { const r = await fetch('/api/schools/fee/ledger', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); return j; },
        onSuccess: () => { toast.success('Ledger adjusted'); inv('student-fee'); setAdjustOpen(false); setAdjustEntry(null); setAdjustValue(''); setAdjustReason(''); },
        onError: e => toast.error(e.message),
    });

    const addServiceMutation = useMutation({
        mutationFn: async ({ serviceId, overrideAmount }) => {
            const r = await fetch('/api/schools/fee/student-services', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'subscribe', studentId, serviceId, schoolId: derivedSchoolId, academicYearId, feeSessionId: academicYearId, userId: fullUser?.id, overrideAmount: overrideAmount || null }),
            });
            const j = await r.json(); if (!r.ok) throw new Error(j.error); return j;
        },
        onSuccess: () => { toast.success('Service added — ledger entries generated'); refetchServices(); refetchFee(); setAddServiceOpen(false); setServiceToAdd(''); setServiceOverride(''); },
        onError: e => toast.error(e.message),
    });

    const updateServiceMutation = useMutation({
        mutationFn: async ({ subscriptionId, overrideAmount, isActive }) => {
            const r = await fetch('/api/schools/fee/student-services', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriptionId, overrideAmount, isActive }),
            });
            const j = await r.json(); if (!r.ok) throw new Error(j.error); return j;
        },
        onSuccess: () => { toast.success('Service updated'); refetchServices(); refetchFee(); setEditingOverrideId(null); },
        onError: e => toast.error(e.message),
    });

    const removeServiceMutation = useMutation({
        mutationFn: async (subscriptionId) => {
            const r = await fetch(`/api/schools/fee/student-services?subscriptionId=${subscriptionId}`, { method: 'DELETE' });
            const j = await r.json(); if (!r.ok) throw new Error(j.error); return j;
        },
        onSuccess: (d) => { toast.success(`Removed${d.deletedLedgers > 0 ? ` — ${d.deletedLedgers} future entries cancelled` : ''}`); refetchServices(); refetchFee(); },
        onError: e => toast.error(e.message),
    });

    const regenerateMutation = useMutation({
        mutationFn: async () => {
            const r = await fetch('/api/schools/fee/ledger', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'regenerate', studentId, feeSessionId: academicYearId, feeStructureId: studentFee?.globalFeeStructureId, userId: fullUser?.id }),
            });
            const j = await r.json(); if (!r.ok) throw new Error(j.error); return j;
        },
        onSuccess: (d) => { toast.success(`Ledger regenerated — ${d.created || 0} entries`); refetchFee(); },
        onError: e => toast.error(e.message),
    });

    // ── Helpers ───────────────────────────────────────────────────────
    const fd = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const generateDocument = async (Component, props, fileName, action) => {
        const el = document.createElement('div');
        el.style.cssText = 'position:fixed;top:0;left:0;width:8.5in;z-index:-9999;background:#fff;color:#000';
        document.body.appendChild(el);
        const root = createRoot(el);
        root.render(<Component {...props} />);
        await new Promise(r => setTimeout(r, 2000));
        const img = await toJpeg(el, { quality: 0.98, pixelRatio: 2, backgroundColor: '#ffffff' });
        const pdf = new jsPDF('p', 'pt', 'letter');
        const w = pdf.internal.pageSize.getWidth();
        const p = pdf.getImageProperties(img);
        pdf.addImage(img, 'JPEG', 0, 0, w, (p.height * w) / p.width);
        if (action === 'print') {
            const url = URL.createObjectURL(pdf.output('blob'));
            const win = window.open(url, '_blank');
            win?.addEventListener('load', () => { win.focus(); win.print(); });
        } else { pdf.save(fileName); }
        root.unmount(); document.body.removeChild(el);
    };

    const handleReceipt = async (payment, action) => {
        setGeneratingId(payment.id);
        const t = toast.loading(action === 'print' ? 'Preparing…' : 'Generating receipt…');
        try {
            const res = await fetch('/api/receipts/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feePaymentId: payment.id, schoolId }) });
            if (!res.ok) throw new Error('Failed');
            const { receipt: { receiptData: rd } } = await res.json();
            await generateDocument(ReceiptTemplate, {
                schoolData: { name: rd.schoolName, profilePicture: rd.schoolLogo, location: rd.schoolAddress, contactNumber: rd.schoolContact, email: rd.schoolEmail || '' },
                receiptData: { receiptNumber: rd.receiptNumber, receiptDate: rd.receiptDate, studentName: rd.studentName, fatherName: rd.parentName, degree: rd.studentClass, admissionNo: rd.admissionNo, financialYear: rd.academicYear, feeItems: rd.feeItems || [], total: rd.totalPaid, balanceAfterPayment: rd.balanceAfterPayment || 0, paymentMode: rd.paymentMethod, transactionId: rd.transactionId },
                settings: { showSchoolLogo: rd.showSchoolLogo ?? true, showBalanceDue: rd.showBalanceDue ?? true, showPaymentMode: rd.showPaymentMode ?? true, showSignatureLine: rd.showSignatureLine ?? true, paperSize: rd.paperSize || 'a4', receiptFooterText: rd.footerText || '' },
            }, `Receipt_${rd.receiptNumber}.pdf`, action);
            toast.dismiss(t); toast.success(action === 'print' ? 'Print dialog opened!' : 'Downloaded!');
        } catch { toast.dismiss(t); toast.error('Failed to generate receipt'); }
        finally { setGeneratingId(null); }
    };

    const feeMetrics = useMemo(() => {
        if (!studentFee) return {};
        const paid = studentFee.paidAmount || 0;
        const total = studentFee.finalAmount || studentFee.originalAmount || 1;
        const pct = Math.min(Math.round((paid / total) * 100), 100);
        const overdue = (studentFee.ledger || []).filter(l => !['PAID', 'LEDGER_PAID', 'WAIVED', 'LEDGER_WAIVED', 'CANCELLED', 'LEDGER_CANCELLED'].includes(l.status) && l.dueDate && new Date(l.dueDate) < new Date());
        const hasOverdue = overdue.length > 0;
        const hasBalance = studentFee.balanceAmount > 0;
        return {
            pct,
            overdueCount: overdue.length,
            hasOverdue,
            balanceColor: hasOverdue || hasBalance ? 'text-red-600' : 'text-green-600',
            balanceBg: hasOverdue || hasBalance ? 'bg-red-50 dark:bg-red-950/20 border-red-200' : 'bg-green-50 dark:bg-green-950/20 border-green-200',
        };
    }, [studentFee]);

    if (isLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-12 w-12 animate-spin" /></div>;
    if (!studentFee) return null;

    return (
        <TooltipProvider>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="w-4 h-4" /></Button>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold">{studentFee.student?.name || 'Unknown'}</h1>
                            {studentFee.student && <p className="text-sm text-muted-foreground mt-1">{studentFee.student.admissionNo} · {studentFee.student.class?.className} · Roll {studentFee.student.rollNumber}</p>}
                        </div>
                    </div>
                    {!studentFee.isUnassigned && (
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm"><Send className="w-4 h-4 mr-2" />Send Reminder</Button>
                            <Button size="sm" onClick={() => setStatementOpen(true)}><FileText className="w-4 h-4 mr-2" />Statement</Button>
                        </div>
                    )}
                </div>

                {studentFee.isUnassigned ? (
                    <div className="p-12 text-center rounded-2xl border bg-muted/20">
                        <AlertCircle className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                        <h2 className="text-2xl font-bold mb-2">No Fee Assigned</h2>
                        <p className="text-muted-foreground">This student doesn't have a fee structure assigned yet.</p>
                    </div>
                ) : (<>

                    {/* Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card><CardContent className="pt-5">
                            <p className="text-sm text-muted-foreground">Total Fee</p>
                            <p className="text-2xl font-bold mt-1">{INR(studentFee.originalAmount)}</p>
                            {studentFee.discountAmount > 0 && <p className="text-xs text-muted-foreground mt-1">After discount: {INR(studentFee.finalAmount)}</p>}
                        </CardContent></Card>
                        <Card><CardContent className="pt-5">
                            <p className="text-sm text-muted-foreground">Paid</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">{INR(studentFee.paidAmount)}</p>
                            <div className="mt-2"><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className={`h-full rounded-full transition-all ${feeMetrics.pct === 100 ? 'bg-green-500' : feeMetrics.pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${feeMetrics.pct}%` }} /></div><p className="text-xs text-muted-foreground mt-1">{feeMetrics.pct}% paid</p></div>
                        </CardContent></Card>
                        <Card className={`border ${feeMetrics.balanceBg}`}><CardContent className="pt-5">
                            <p className="text-sm text-muted-foreground">Balance</p>
                            <p className={`text-2xl font-bold mt-1 ${feeMetrics.balanceColor}`}>{INR(studentFee.balanceAmount)}</p>
                            {feeMetrics.hasOverdue && <div className="flex items-center gap-1 mt-1"><AlertTriangle className="w-3 h-3 text-red-500" /><span className="text-xs text-red-600 font-medium">{feeMetrics.overdueCount} overdue</span></div>}
                        </CardContent></Card>
                        <Card><CardContent className="pt-5">
                            <p className="text-sm text-muted-foreground">Discount</p>
                            <p className="text-2xl font-bold text-purple-600 mt-1">{INR(studentFee.discountAmount)}</p>
                            {studentFee.walletBalance > 0 && <p className="text-xs text-blue-600 mt-1">Wallet: {INR(studentFee.walletBalance)}</p>}
                        </CardContent></Card>
                    </div>

                    {/* Tabs */}
                    <Tabs defaultValue="ledger" className="space-y-4">
                        <TabsList className="flex-wrap h-auto">
                            <TabsTrigger value="ledger">Ledger</TabsTrigger>
                            <TabsTrigger value="particulars">Particulars</TabsTrigger>
                            <TabsTrigger value="services">Services {studentServices.length > 0 && <span className="ml-1 bg-primary/10 text-primary text-[10px] px-1.5 rounded-full">{studentServices.length}</span>}</TabsTrigger>
                            <TabsTrigger value="payments">Payments</TabsTrigger>
                            <TabsTrigger value="discounts">Discounts</TabsTrigger>
                            <TabsTrigger value="audit">Audit Log</TabsTrigger>
                        </TabsList>

                        {/* LEDGER */}
                        <TabsContent value="ledger">
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div><CardTitle>Financial Ledger</CardTitle><CardDescription>Month-wise breakdown with late fee calculation</CardDescription></div>
                                        <div className="flex items-center gap-2">
                                            {studentFee.walletBalance > 0 && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Wallet: {INR(studentFee.walletBalance)}</Badge>}
                                            <Tooltip><TooltipTrigger asChild>
                                                <Button variant="outline" size="sm" onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending}>
                                                    {regenerateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                                </Button>
                                            </TooltipTrigger><TooltipContent>Regenerate ledger</TooltipContent></Tooltip>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="rounded-md border overflow-x-auto">
                                        <Table>
                                            <TableHeader><TableRow className="bg-muted/50">
                                                <TableHead>Month</TableHead><TableHead>Component</TableHead><TableHead>Due Date</TableHead>
                                                <TableHead className="text-right">Net Amt</TableHead><TableHead className="text-right">Late Fee</TableHead>
                                                <TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Balance</TableHead>
                                                <TableHead className="text-center">Status</TableHead><TableHead />
                                            </TableRow></TableHeader>
                                            <TableBody>
                                                {studentFee.ledger?.length > 0 ? studentFee.ledger.map(e => {
                                                    const monthLabel = e.month ? new Date(e.month).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : (e.monthLabel || 'One-Time');
                                                    const isOverdue = !['PAID', 'LEDGER_PAID', 'WAIVED', 'LEDGER_WAIVED', 'CANCELLED', 'LEDGER_CANCELLED'].includes(e.status) && e.dueDate && new Date(e.dueDate) < new Date();
                                                    return (
                                                        <TableRow key={e.id} className={`${e.isFrozen ? 'opacity-70 bg-muted/20' : ''} ${isOverdue ? 'bg-red-50/40 dark:bg-red-950/10' : ''}`}>
                                                            <TableCell className="font-medium text-sm whitespace-nowrap">{monthLabel}</TableCell>
                                                            <TableCell>
                                                                <span className="text-sm">{e.feeComponent?.name}</span>
                                                                {e.feeComponent?.isOptional && <span className="ml-1.5 text-[10px] text-orange-500 bg-orange-50 dark:bg-orange-950/20 px-1.5 py-0.5 rounded">Optional</span>}
                                                                {e.isFrozen && <Clock className="inline w-3 h-3 ml-1.5 text-muted-foreground" />}
                                                            </TableCell>
                                                            <TableCell className="text-sm whitespace-nowrap">
                                                                {e.dueDate ? fd(e.dueDate) : '—'}
                                                                {isOverdue && <span className="ml-1 text-[10px] text-red-500 font-medium">Overdue</span>}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium tabular-nums">{INR(e.netAmount)}</TableCell>
                                                            <TableCell className="text-right tabular-nums">
                                                                {e.lateFeeAmount > 0 ? <span className="text-red-500 font-medium">+{INR(e.lateFeeAmount)}</span> : <span className="text-muted-foreground">—</span>}
                                                            </TableCell>
                                                            <TableCell className="text-right text-green-600 font-medium tabular-nums">{INR(e.paidAmount)}</TableCell>
                                                            <TableCell className="text-right font-bold tabular-nums">{INR(e.balanceAmount)}</TableCell>
                                                            <TableCell className="text-center"><Badge className={`text-[10px] ${STATUS_COLORS[e.status] || 'bg-slate-100 text-slate-700'}`}>{STATUS_LABELS[e.status] || e.status}</Badge></TableCell>
                                                            <TableCell>
                                                                {!e.isFrozen && !['PAID', 'LEDGER_PAID', 'WAIVED', 'LEDGER_WAIVED', 'CANCELLED', 'LEDGER_CANCELLED'].includes(e.status) && (
                                                                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setAdjustEntry(e); setAdjustAction('discount'); setAdjustValue(''); setAdjustReason(''); setAdjustOpen(true); }}>Adjust</Button>
                                                                )}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                }) : (
                                                    <TableRow><TableCell colSpan={9} className="h-32 text-center">
                                                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                            <FileText className="w-8 h-8 opacity-30" /><p>No ledger entries yet</p>
                                                            <Button variant="outline" size="sm" onClick={() => regenerateMutation.mutate()} disabled={regenerateMutation.isPending}>
                                                                {regenerateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}Generate Ledger
                                                            </Button>
                                                        </div>
                                                    </TableCell></TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* SERVICES */}
                        <TabsContent value="services">
                            <Card>
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div><CardTitle>Optional Services</CardTitle><CardDescription>Bus, Activity, Hostel — each generates its own ledger entries automatically</CardDescription></div>
                                        <Button onClick={() => setAddServiceOpen(true)} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Service</Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {studentServices.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed rounded-xl text-center">
                                            <Bus className="w-12 h-12 text-muted-foreground/30 mb-3" />
                                            <p className="font-medium text-muted-foreground">No services assigned</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1 mb-4">Assign transport, activity or hostel — charges appear in the ledger automatically</p>
                                            <Button variant="outline" size="sm" onClick={() => setAddServiceOpen(true)}><Plus className="w-4 h-4 mr-1.5" />Add First Service</Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {studentServices.map(sub => {
                                                const Icon = MODULE_ICONS[sub.service?.module] || Tag;
                                                const colorCls = MODULE_COLORS[sub.service?.module] || MODULE_COLORS.SERVICE_CUSTOM;
                                                const isEditing = editingOverrideId === sub.id;
                                                const effAmt = sub.overrideAmount != null ? sub.overrideAmount : (sub.service?.monthlyFee ?? 0);
                                                const hasOverride = sub.overrideAmount != null;
                                                return (
                                                    <div key={sub.id} className={`border rounded-xl overflow-hidden ${sub.isActive ? 'bg-white dark:bg-slate-950' : 'bg-muted/20 opacity-60'}`}>
                                                        <div className="flex items-center gap-4 p-4">
                                                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${colorCls}`}><Icon className="w-5 h-5" /></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <p className="font-semibold">{sub.service?.name}</p>
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">{sub.service?.module?.replace('SERVICE_', '')}</Badge>
                                                                    {!sub.isActive && <Badge variant="outline" className="text-[10px] h-4 text-orange-600 border-orange-200">Paused</Badge>}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground mt-0.5">Default: {INR(sub.service?.monthlyFee)}/mo · Started {fd(sub.startDate)}</p>
                                                            </div>
                                                            {/* Override editor */}
                                                            <div className="shrink-0">
                                                                {isEditing ? (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="relative"><span className="absolute left-2.5 top-1.5 text-muted-foreground text-sm">₹</span>
                                                                            <Input type="number" value={overrideDraft} onChange={e => setOverrideDraft(e.target.value)} className="w-28 h-8 pl-6 text-sm" placeholder={String(sub.service?.monthlyFee || '')} autoFocus />
                                                                        </div>
                                                                        <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white px-2.5"
                                                                            onClick={() => updateServiceMutation.mutate({ subscriptionId: sub.id, overrideAmount: overrideDraft !== '' ? parseFloat(overrideDraft) : null })}
                                                                            disabled={updateServiceMutation.isPending}>
                                                                            {updateServiceMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                                        </Button>
                                                                        <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setEditingOverrideId(null)}><X className="w-3 h-3" /></Button>
                                                                    </div>
                                                                ) : (
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-right">
                                                                            <p className="font-bold">{INR(effAmt)}<span className="text-xs font-normal text-muted-foreground">/mo</span></p>
                                                                            {hasOverride && <p className="text-[10px] text-orange-500 font-medium flex items-center gap-0.5 justify-end"><TrendingDown className="w-2.5 h-2.5" />Custom</p>}
                                                                        </div>
                                                                        <Tooltip><TooltipTrigger asChild>
                                                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                                                onClick={() => { setEditingOverrideId(sub.id); setOverrideDraft(sub.overrideAmount != null ? String(sub.overrideAmount) : ''); }}>
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </Button>
                                                                        </TooltipTrigger><TooltipContent>Override monthly rate</TooltipContent></Tooltip>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {/* Toggle */}
                                                            <div className="flex flex-col items-center gap-1 shrink-0">
                                                                <Switch checked={sub.isActive} onCheckedChange={v => updateServiceMutation.mutate({ subscriptionId: sub.id, isActive: v })} disabled={updateServiceMutation.isPending} />
                                                                <span className="text-[10px] text-muted-foreground">{sub.isActive ? 'Active' : 'Paused'}</span>
                                                            </div>
                                                            {/* Remove */}
                                                            <Tooltip><TooltipTrigger asChild>
                                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                                                                    onClick={() => { if (confirm(`Remove "${sub.service?.name}"? Future ledger entries will be cancelled.`)) removeServiceMutation.mutate(sub.id); }}
                                                                    disabled={removeServiceMutation.isPending}><X className="w-3.5 h-3.5" /></Button>
                                                            </TooltipTrigger><TooltipContent>Remove service</TooltipContent></Tooltip>
                                                        </div>
                                                        <div className="flex items-center gap-6 px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground">
                                                            <span>Monthly: <span className="font-medium text-foreground">{INR(effAmt)}</span></span>
                                                            <span>Annual: <span className="font-medium text-foreground">{INR(effAmt * 12)}</span></span>
                                                            {sub.endDate && <span>Ends: {fd(sub.endDate)}</span>}
                                                            {hasOverride && <span className="ml-auto flex items-center gap-1 text-orange-500"><Info className="w-3 h-3" />Overrides default {INR(sub.service?.monthlyFee)}/mo</span>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* PARTICULARS */}
                        <TabsContent value="particulars">
                            <Card><CardHeader><CardTitle>Fee Particulars</CardTitle><CardDescription>Component-wise from the fee structure</CardDescription></CardHeader>
                                <CardContent><div className="space-y-2">
                                    {studentFee.particulars?.map(p => (
                                        <div key={p.id} className="flex items-center justify-between p-4 border rounded-xl">
                                            <div><p className="font-semibold">{p.name}</p><p className="text-sm text-muted-foreground mt-0.5">Paid: {INR(p.paidAmount)} · Due: {INR(p.amount - p.paidAmount)}</p></div>
                                            <div className="text-right"><p className="font-bold text-lg">{INR(p.amount)}</p><Badge className={`text-[10px] ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-700'}`}>{STATUS_LABELS[p.status] || p.status}</Badge></div>
                                        </div>
                                    ))}
                                </div></CardContent></Card>
                        </TabsContent>

                        {/* PAYMENTS */}
                        <TabsContent value="payments">
                            <Card><CardHeader><CardTitle>Payment History</CardTitle><CardDescription>{studentFee.payments?.length || 0} payments</CardDescription></CardHeader>
                                <CardContent><div className="space-y-2">
                                    {!studentFee.payments?.length && <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">No payments yet</div>}
                                    {studentFee.payments?.map(pay => (
                                        <div key={pay.id} className="flex items-center justify-between p-4 border rounded-xl">
                                            <div><div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-muted-foreground" /><span className="font-semibold">{pay.receiptNumber}</span></div><p className="text-sm text-muted-foreground mt-1">{fd(pay.paymentDate)} · {pay.paymentMethod}</p></div>
                                            <div className="text-right">
                                                <p className="font-bold text-lg">{INR(pay.amount)}</p>
                                                <div className="flex gap-1 mt-1">
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={generatingId === pay.id} onClick={() => handleReceipt(pay, 'download')}>{generatingId === pay.id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}PDF</Button>
                                                    <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={generatingId === pay.id} onClick={() => handleReceipt(pay, 'print')}><Printer className="w-3 h-3 mr-1" />Print</Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div></CardContent></Card>
                        </TabsContent>

                        {/* DISCOUNTS */}
                        <TabsContent value="discounts">
                            <Card><CardHeader>
                                <div className="flex items-center justify-between">
                                    <div><CardTitle>Discounts Applied</CardTitle><CardDescription>Total: {INR(studentFee.discountAmount)}</CardDescription></div>
                                    <Dialog open={discountOpen} onOpenChange={setDiscountOpen}>
                                        <DialogTrigger asChild><Button><Percent className="w-4 h-4 mr-2" />Apply Discount</Button></DialogTrigger>
                                        <DialogContent><DialogHeader><DialogTitle>Apply Discount</DialogTitle><DialogDescription>Apply a discount to this student's total fee</DialogDescription></DialogHeader>
                                            <div className="space-y-4">
                                                <div className="space-y-1.5"><Label>Type</Label>
                                                    <Select value={discountType} onValueChange={setDiscountType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['PERCENTAGE', 'FIXED', 'SCHOLARSHIP', 'SIBLING', 'STAFF_WARD', 'MERIT'].map(t => <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase().replace('_', ' ')}</SelectItem>)}</SelectContent></Select>
                                                </div>
                                                <div className="space-y-1.5"><Label>Value *</Label><Input type="number" placeholder={discountType === 'PERCENTAGE' ? '10 (%)' : '5000 (₹)'} value={discountValue} onChange={e => setDiscountValue(e.target.value)} /></div>
                                                <div className="space-y-1.5"><Label>Reason *</Label><Input placeholder="Reason" value={discountReason} onChange={e => setDiscountReason(e.target.value)} /></div>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" className="flex-1" onClick={() => setDiscountOpen(false)}>Cancel</Button>
                                                    <Button className="flex-1" disabled={applyDiscountMutation.isPending} onClick={() => { if (!discountValue || !discountReason) { toast.error('Fill all fields'); return; } applyDiscountMutation.mutate({ studentFeeId: studentFee.id, discountType, value: parseFloat(discountValue), reason: discountReason, approvedBy: fullUser?.id }); }}>
                                                        {applyDiscountMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying…</> : 'Apply Discount'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader><CardContent><div className="space-y-2">
                                {!studentFee.discounts?.length && <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl">No discounts applied</div>}
                                {studentFee.discounts?.map(d => (
                                    <div key={d.id} className="flex items-center justify-between p-4 border rounded-xl">
                                        <div><p className="font-semibold">{d.reason}</p><p className="text-sm text-muted-foreground">{d.discountType} · {d.approver?.name || 'Admin'} · {fd(d.approvedDate)}</p></div>
                                        <p className="font-bold text-lg text-green-600">-{INR(d.amount)}</p>
                                    </div>
                                ))}
                            </div></CardContent></Card>
                        </TabsContent>

                        {/* AUDIT */}
                        <TabsContent value="audit">
                            <Card><CardHeader><CardTitle>Ledger Audit Log</CardTitle><CardDescription>All automated and manual changes</CardDescription></CardHeader>
                                <CardContent>
                                    {auditLogs.length > 0 ? (
                                        <div className="rounded-md border overflow-hidden"><Table>
                                            <TableHeader><TableRow className="bg-muted/50"><TableHead>Date</TableHead><TableHead>Entry</TableHead><TableHead>Action</TableHead><TableHead>Reason</TableHead><TableHead>By</TableHead></TableRow></TableHeader>
                                            <TableBody>{auditLogs.map(log => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="text-sm whitespace-nowrap">{new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</TableCell>
                                                    <TableCell className="font-medium text-sm">{log.ledgerEntry?.feeComponent?.name} ({log.ledgerEntry?.monthLabel})</TableCell>
                                                    <TableCell><Badge variant="outline" className="text-[10px]">{(log.action || '').replace('LEDGER_', '')}</Badge></TableCell>
                                                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">{log.remarks || '—'}</TableCell>
                                                    <TableCell className="text-sm">{log.user?.name || 'System'}{log.user?.email && <span className="block text-xs text-muted-foreground">{log.user.email}</span>}</TableCell>
                                                </TableRow>
                                            ))}</TableBody>
                                        </Table></div>
                                    ) : <div className="text-center p-10 text-muted-foreground border-2 border-dashed rounded-xl">No audit logs found.</div>}
                                </CardContent></Card>
                        </TabsContent>
                    </Tabs>

                    {/* Add Service Dialog */}
                    <Dialog open={addServiceOpen} onOpenChange={setAddServiceOpen}>
                        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Add Service</DialogTitle><DialogDescription>Assign an optional service — ledger entries generated from current month</DialogDescription></DialogHeader>
                            <div className="space-y-4 py-2">
                                <div className="space-y-1.5"><Label>Service *</Label>
                                    <Select value={serviceToAdd} onValueChange={setServiceToAdd}><SelectTrigger><SelectValue placeholder="Select service…" /></SelectTrigger><SelectContent>
                                        {availableToAdd.length === 0 && <div className="px-3 py-4 text-sm text-muted-foreground text-center">All services already assigned</div>}
                                        {availableToAdd.map(s => { const I = MODULE_ICONS[s.module] || Tag; return (<SelectItem key={s.id} value={s.id}><div className="flex items-center gap-2"><I className="w-3.5 h-3.5" /><span>{s.name}</span><span className="text-muted-foreground text-xs">· {INR(s.monthlyFee)}/mo</span></div></SelectItem>); })}
                                    </SelectContent></Select>
                                </div>
                                {serviceToAdd && (
                                    <div className="space-y-1.5"><Label>Custom Rate <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                                        <div className="relative"><span className="absolute left-3 top-2.5 text-muted-foreground text-sm">₹</span>
                                            <Input type="number" className="pl-7" placeholder={String(allServices.find(s => s.id === serviceToAdd)?.monthlyFee || 'Default rate')} value={serviceOverride} onChange={e => setServiceOverride(e.target.value)} />
                                        </div>
                                        <p className="text-xs text-muted-foreground">Leave empty to use default. Ledger entries will use this rate.</p>
                                    </div>
                                )}
                                <div className="flex gap-2 pt-1">
                                    <Button variant="outline" className="flex-1" onClick={() => setAddServiceOpen(false)}>Cancel</Button>
                                    <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => addServiceMutation.mutate({ serviceId: serviceToAdd, overrideAmount: serviceOverride ? parseFloat(serviceOverride) : null })} disabled={!serviceToAdd || addServiceMutation.isPending}>
                                        {addServiceMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding…</> : <><Plus className="w-4 h-4 mr-2" />Add & Generate Entries</>}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Adjust Ledger Dialog */}
                    <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
                        <DialogContent><DialogHeader><DialogTitle>Adjust Ledger Entry</DialogTitle><DialogDescription>Waive or apply a discount to a specific entry</DialogDescription></DialogHeader>
                            {adjustEntry && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-muted rounded-xl flex justify-between items-center">
                                        <div><p className="font-medium">{adjustEntry.feeComponent?.name}</p><p className="text-xs text-muted-foreground mt-0.5">{adjustEntry.monthLabel || new Date(adjustEntry.month).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p></div>
                                        <div className="text-right"><p className="font-bold">{INR(adjustEntry.balanceAmount)}</p><p className="text-xs text-muted-foreground">Balance due</p></div>
                                    </div>
                                    <div className="space-y-1.5"><Label>Action</Label><Select value={adjustAction} onValueChange={setAdjustAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="discount">Apply Partial Discount</SelectItem><SelectItem value="waive">Waive Full Balance</SelectItem></SelectContent></Select></div>
                                    {adjustAction === 'discount' && <div className="space-y-1.5"><Label>Amount (₹) *</Label><Input type="number" value={adjustValue} onChange={e => setAdjustValue(e.target.value)} max={adjustEntry.balanceAmount} placeholder="e.g. 500" /><p className="text-xs text-muted-foreground">Max: {INR(adjustEntry.balanceAmount)}</p></div>}
                                    <div className="space-y-1.5"><Label>Reason *</Label><Input placeholder="Enter reason" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} /></div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" className="flex-1" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                                        <Button className="flex-1" disabled={adjustLedgerMutation.isPending} onClick={() => { if (!adjustReason) { toast.error('Enter a reason'); return; } if (adjustAction === 'discount' && !adjustValue) { toast.error('Enter amount'); return; } adjustLedgerMutation.mutate({ action: adjustAction, ledgerEntryId: adjustEntry.id, discountAmount: adjustAction === 'discount' ? parseFloat(adjustValue) : undefined, reason: adjustReason, userId: fullUser?.id }); }}>
                                            {adjustLedgerMutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</> : adjustAction === 'waive' ? 'Waive Balance' : 'Apply Discount'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Statement Dialog */}
                    <Dialog open={statementOpen} onOpenChange={setStatementOpen}>
                        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5" />Fee Statement</DialogTitle><DialogDescription>Select period for {studentFee.student?.name}</DialogDescription></DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-1.5"><Label>Period</Label><Select value={statementPeriod} onValueChange={setStatementPeriod}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="full_year">Full Year</SelectItem><SelectItem value="last_month">Last Month</SelectItem><SelectItem value="till_date">Till Today</SelectItem><SelectItem value="custom">Custom Range</SelectItem></SelectContent></Select></div>
                                {statementPeriod === 'custom' && <div className="grid grid-cols-2 gap-3"><div className="space-y-1.5"><Label>From</Label><Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></div><div className="space-y-1.5"><Label>To</Label><Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} /></div></div>}
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => setStatementOpen(false)}>Cancel</Button>
                                    <Button variant="outline" className="flex-1" disabled={!token || isGenerating}><Printer className="w-4 h-4 mr-2" />Print</Button>
                                    <Button className="flex-1" disabled={!token || isGenerating}>{isGenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</> : <><Download className="w-4 h-4 mr-2" />Download</>}</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                </>)}
            </div>
        </TooltipProvider>
    );
}