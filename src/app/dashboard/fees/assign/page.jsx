'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useAcademicYear } from '@/context/AcademicYearContext';
import { useFeeAssignJob } from '@/context/FeeAssignJobContext';
import { toast } from 'sonner';
import {
    Users, CheckCircle, Loader2, Search,
    ChevronLeft, ChevronRight, FileText,
    ArrowRight, Tag, Sparkles, GraduationCap,
    CircleDot, Filter, AlertTriangle, History, Download,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const PER_PAGE = 25;
const INR = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// ── Avatar initials ───────────────────────────────────────────
const AVATAR_COLORS = [
    ['#e0f2fe', '#0284c7'], // sky
    ['#dcfce7', '#16a34a'], // green
    ['#fef9c3', '#ca8a04'], // yellow
    ['#fce7f3', '#db2777'], // pink
    ['#ede9fe', '#7c3aed'], // violet
    ['#ffedd5', '#ea580c'], // orange
    ['#f0fdf4', '#15803d'], // emerald
    ['#e0f2fe', '#0369a1'], // blue
];

function Avatar({ name, size = 36 }) {
    const initials = name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
    const idx = name ? name.charCodeAt(0) % AVATAR_COLORS.length : 0;
    const [bg, fg] = AVATAR_COLORS[idx];
    return (
        <div
            style={{
                width: size, height: size, borderRadius: '50%',
                background: bg, color: fg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: size * 0.36, fontWeight: 700, flexShrink: 0,
                border: `1.5px solid ${fg}22`,
                letterSpacing: '-0.02em',
            }}
        >
            {initials}
        </div>
    );
}

export default function AssignFeesToStudents() {
    const { fullUser } = useAuth();
    const { selectedYear } = useAcademicYear();
    const sidebarAcademicYearId = selectedYear?.id;
    const schoolId = fullUser?.schoolId;
    const { startJob } = useFeeAssignJob();
    const queryClient = useQueryClient();

    const [selectedStructure, setSelectedStructure] = useState('');
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedSection, setSelectedSection] = useState('');
    const [applyToAll, setApplyToAll] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [assigning, setAssigning] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all'); // all | pending | assigned
    const [ackMissingJoiningDate, setAckMissingJoiningDate] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);

    // ── Queries ───────────────────────────────────────────────────
    const { data: academicYears } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => { const r = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`); if (!r.ok) throw new Error(); return r.json(); },
        enabled: !!schoolId, staleTime: 1000 * 60 * 10, refetchOnWindowFocus: false,
    });
    const academicYearId = academicYears?.find(y => y.isActive)?.id;

    const { data: structures } = useQuery({
        queryKey: ['fee-structures', schoolId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ schoolId, academicYearId });
            const r = await fetch(`/api/schools/fee/global-structures?${params}`);
            if (!r.ok) throw new Error();
            return r.json();
        },
        enabled: !!schoolId && !!academicYearId, staleTime: 1000 * 60 * 5, refetchOnWindowFocus: false,
    });

    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId, sidebarAcademicYearId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (sidebarAcademicYearId) params.append('academicYearId', sidebarAcademicYearId);
            const r = await fetch(`/api/schools/${schoolId}/classes?${params}`);
            if (!r.ok) throw new Error(); return r.json();
        },
        enabled: !!schoolId, staleTime: 1000 * 60 * 10, refetchOnWindowFocus: false,
    });

    const { data: students, isLoading: studentsLoading } = useQuery({
        queryKey: ['students-assign', schoolId, selectedClass, selectedSection, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({
                schoolId,
                ...(academicYearId && { academicYearId }),
                ...(selectedClass && { classId: selectedClass }),
                ...(selectedSection && selectedSection !== 'all' && { sectionId: selectedSection }),
            });
            const r = await fetch(`/api/students?${params}`);
            if (!r.ok) throw new Error();
            return r.json();
        },
        enabled: !!schoolId && !!selectedClass, staleTime: 1000 * 60 * 2, refetchOnWindowFocus: false,
    });

    const { data: assignmentHistory } = useQuery({
        queryKey: ['fee-assignment-history', schoolId, academicYearId],
        queryFn: async () => {
            const params = new URLSearchParams({ schoolId, ...(academicYearId && { academicYearId }) });
            const r = await fetch(`/api/schools/fee/assign/history?${params}`);
            if (!r.ok) throw new Error();
            return r.json();
        },
        enabled: !!schoolId && !!academicYearId && historyOpen,
        staleTime: 1000 * 30,
    });

    // ── Derived ───────────────────────────────────────────────────
    const sections = classes?.find(c => c.id.toString() === selectedClass)?.sections || [];
    const structureData = structures?.find(s => s.id === selectedStructure);

    const allStudents = useMemo(() => students || [], [students]);

    const filteredStudents = useMemo(() => {
        const q = search.toLowerCase();
        return allStudents.filter(s => {
            const matchesSearch = !q || s.name.toLowerCase().includes(q) || s.admissionNo?.toLowerCase().includes(q);
            const isAssigned = s.studentFees?.some(f => f.academicYearId === academicYearId);
            const matchesFilter = filterStatus === 'all' || (filterStatus === 'assigned' ? isAssigned : !isAssigned);
            return matchesSearch && matchesFilter;
        });
    }, [allStudents, search, filterStatus, academicYearId]);

    const unassigned = useMemo(() => allStudents.filter(s => !s.studentFees?.some(f => f.academicYearId === academicYearId)), [allStudents, academicYearId]);
    const missingJoiningDateStudents = useMemo(() => allStudents.filter(s => s.missingJoiningDate || s.profileStatus === 'MISSING_JOIN_DATE' || !s.admissionDate), [allStudents]);
    const eligibleUnassigned = useMemo(() => unassigned.filter(s => !missingJoiningDateStudents.some(m => m.userId === s.userId)), [unassigned, missingJoiningDateStudents]);
    const assignedCount = allStudents.length - unassigned.length;
    const pct = allStudents.length > 0 ? Math.round(assignedCount / allStudents.length * 100) : 0;

    const totalPages = Math.ceil(filteredStudents.length / PER_PAGE);
    const pagedStudents = filteredStudents.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    const allPageUnassigned = pagedStudents
        .filter(s => !s.studentFees?.some(f => f.academicYearId === academicYearId) && !(s.missingJoiningDate || s.profileStatus === 'MISSING_JOIN_DATE' || !s.admissionDate))
        .map(s => s.userId);
    const allPageSelected = allPageUnassigned.length > 0 && allPageUnassigned.every(id => selectedStudents.includes(id));

    // ── Actions ───────────────────────────────────────────────────
    const toggleStudent = id => setSelectedStudents(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

    const selectPageUnassigned = () => {
        if (allPageSelected) setSelectedStudents(prev => prev.filter(id => !allPageUnassigned.includes(id)));
        else setSelectedStudents(prev => [...new Set([...prev, ...allPageUnassigned])]);
    };

    const selectAllUnassigned = () => {
        const all = eligibleUnassigned.map(s => s.userId);
        if (selectedStudents.length === all.length) setSelectedStudents([]);
        else setSelectedStudents(all);
    };

    const exportMissingReport = (rows = []) => {
        const header = ['Reason', 'Name', 'Admission No', 'Class', 'Section'];
        const lines = [
            header.join(','),
            ...rows.map((row) => [
                row.reason,
                row.name,
                row.admissionNo,
                row.className,
                row.sectionName,
            ].map(value => `"${String(value || '').replaceAll('"', '""')}"`).join(','))
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'fee-assignment-skipped-students.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleAssign = async () => {
        if (!selectedStructure) return toast.error('Select a fee structure');
        if (!applyToAll && !selectedStudents.length) return toast.error('Select at least one student');
        if (!selectedClass) return toast.error('Select a class');
        if (missingJoiningDateStudents.length && !ackMissingJoiningDate) {
            return toast.error('Acknowledge that students missing joining date will be skipped.');
        }

        setAssigning(true);
        try {
            const res = await fetch('/api/schools/fee/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    globalFeeStructureId: selectedStructure,
                    studentIds: applyToAll ? undefined : selectedStudents,
                    applyToClass: applyToAll,
                    classId: selectedClass,
                    sectionId: selectedSection && selectedSection !== 'all' ? selectedSection : undefined,
                    academicYearId,
                    schoolId,
                    assignedBy: fullUser?.id,
                    acknowledgeMissingJoiningDate: ackMissingJoiningDate,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.code === 'MISSING_JOINING_DATE_ACK_REQUIRED') setAckMissingJoiningDate(false);
                throw new Error(data.error);
            }

            if (!data.jobId) {
                toast.info(data.message || 'All students already assigned');
                return;
            }

            const cls = classes?.find(c => c.id.toString() === selectedClass);
            startJob({
                jobId: data.jobId,
                total: data.total,
                structureName: structureData?.name || 'Fee Structure',
                className: cls?.className || 'Selected Class',
            });

            if (data.skipped > 0) toast.info(`${data.skipped} students skipped (already assigned)`);
            if (data.skippedMissingJoiningDate > 0) toast.warning(`${data.skippedMissingJoiningDate} students skipped (missing joining date)`);
            setSelectedStudents([]);
            setApplyToAll(false);
            setAckMissingJoiningDate(false);
            queryClient.invalidateQueries({ queryKey: ['students-assign'] });
            queryClient.invalidateQueries({ queryKey: ['fee-assignment-history'] });
        } catch (err) {
            toast.error(err.message || 'Failed to start assignment');
        } finally {
            setAssigning(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen bg-[#f9fafb] dark:bg-black">

            {/* ── Page header ── */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">

                        <GraduationCap className="w-9 h-9 text-green-600" />

                        Assign Fee Structure
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1.5 ml-11">
                        Runs in background — navigate away freely after starting
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
                    <History className="mr-2 h-4 w-4" />
                    History
                </Button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">

                {/* ══ LEFT PANEL ══════════════════════════════════════════ */}
                <div className="space-y-4">

                    {/* Config */}
                    <Card className="border  bg-white dark:bg-muted">
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Filter className="w-3.5 h-3.5" />
                                Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Fee Structure <span className="text-red-500">*</span></Label>
                                <Select value={selectedStructure} onValueChange={setSelectedStructure}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Select structure…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {!structures?.length && (
                                            <div className="px-3 py-4 text-xs text-muted-foreground text-center">No structures found</div>
                                        )}
                                        {structures?.map(s => (
                                            <SelectItem key={s.id} value={s.id}>
                                                <span className="font-medium">{s.name}</span>
                                                <span className="text-muted-foreground ml-1.5 text-xs">· {INR(s.totalAmount)}</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Class <span className="text-red-500">*</span></Label>
                                    <Select value={selectedClass} onValueChange={v => { setSelectedClass(v); setSelectedSection(''); setSelectedStudents([]); setPage(1); }}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                                        <SelectContent>
                                            {classes?.filter(c => c?.id && c?.className).map(c => (
                                                <SelectItem key={c.id} value={String(c.id)}>{c.className}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Section</Label>
                                    <Select
                                        value={selectedSection || 'all'}
                                        onValueChange={v => { setSelectedSection(v === 'all' ? '' : v); setSelectedStudents([]); setPage(1); }}
                                        disabled={!sections.length}
                                    >
                                        <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All sections</SelectItem>
                                            {sections.filter(s => s?.id && s?.name).map(s => (
                                                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Apply to all */}
                            <label className={cn(
                                'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                                applyToAll
                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                                    : 'bg-muted/30 hover:bg-muted/50 border-border'
                            )}>
                                <Checkbox
                                    id="applyToAll"
                                    checked={applyToAll}
                                    onCheckedChange={v => { setApplyToAll(v); if (v) setSelectedStudents([]); }}
                                    className="mt-0.5 shrink-0"
                                />
                                <div>
                                    <p className={cn('text-sm font-medium', applyToAll && 'text-green-700 dark:text-green-400')}>
                                        Apply to entire {selectedSection ? 'section' : 'class'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">Skips already-assigned students</p>
                                </div>
                            </label>

                            {missingJoiningDateStudents.length > 0 && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-100">
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <div className="space-y-2">
                                            <p className="text-sm font-semibold">{missingJoiningDateStudents.length} student(s) missing joining date</p>
                                            <p className="text-xs">These students will not receive this fee structure until their joining date is assigned.</p>
                                            <label className="flex items-start gap-2 text-xs font-medium">
                                                <Checkbox
                                                    checked={ackMissingJoiningDate}
                                                    onCheckedChange={value => setAckMissingJoiningDate(Boolean(value))}
                                                    className="mt-0.5"
                                                />
                                                <span>I understand students missing joining date will be skipped and listed in the assignment report.</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-semibold "
                                onClick={handleAssign}
                                disabled={assigning || !selectedStructure || !selectedClass}
                            >
                                {assigning ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting…</>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4 mr-2" />
                                        Assign Fee Structure
                                        {selectedStudents.length > 0 && !applyToAll && (
                                            <span className="ml-2 bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                                                {selectedStudents.length}
                                            </span>
                                        )}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Structure preview */}
                    {structureData && (
                        <Card className="border  bg-white dark:bg-muted">
                            <CardHeader className="pb-3 border-b">
                                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    Structure Preview
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-100 dark:border-green-900">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Annual Total</p>
                                        <p className="text-2xl font-bold text-green-700 dark:text-green-400 tabular-nums">{INR(structureData.totalAmount)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Components</p>
                                        <p className="text-xl font-bold">{structureData.particulars?.length || 0}</p>
                                    </div>
                                </div>
                                <div className="rounded-xl border overflow-hidden divide-y">
                                    {structureData.particulars?.map(p => (
                                        <div key={p.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/30 transition-colors">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Tag className="w-3 h-3 text-muted-foreground shrink-0" />
                                                <span className="truncate">{p.name}</span>
                                                {p.isOptional && (
                                                    <span className="text-[10px] bg-orange-50 text-orange-500 border border-orange-100 px-1.5 rounded-full shrink-0">opt</span>
                                                )}
                                            </div>
                                            <span className="font-semibold tabular-nums shrink-0 ml-3">{INR(p.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Stats */}
                    {selectedClass && !studentsLoading && allStudents.length > 0 && (
                        <Card className="border  bg-white dark:bg-muted">
                            <CardContent className="pt-4 pb-4 space-y-3">
                                <div className="grid grid-cols-4 gap-2 text-center">
                                    {[
                                        { label: 'Total', value: allStudents.length, color: 'text-foreground' },
                                        { label: 'Assigned', value: assignedCount, color: 'text-green-600' },
                                        { label: 'Pending', value: unassigned.length, color: 'text-amber-600' },
                                        { label: 'Blocked', value: missingJoiningDateStudents.length, color: 'text-red-600' },
                                    ].map(s => (
                                        <div key={s.label} className="p-2.5 rounded-xl bg-muted/40">
                                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Progress</span>
                                        <span className="font-medium">{pct}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* ══ RIGHT PANEL — Students table ════════════════════════ */}
                <Card className="border  bg-white dark:bg-muted overflow-hidden">
                    {/* Table header toolbar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b">
                        <div className="flex items-center gap-3">
                            <div>
                                <h2 className="font-semibold text-base">
                                    Students
                                    {filteredStudents.length > 0 && (
                                        <span className="text-muted-foreground font-normal text-sm ml-2">
                                            {filteredStudents.length}
                                        </span>
                                    )}
                                </h2>
                                {selectedStudents.length > 0 && !applyToAll && (
                                    <p className="text-xs text-green-600 font-medium mt-0.5">
                                        {selectedStudents.length} selected
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            {/* Filter tabs */}
                            <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border">
                                {[
                                    { key: 'all', label: 'All' },
                                    { key: 'pending', label: 'Pending' },
                                    { key: 'assigned', label: 'Assigned' },
                                ].map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => { setFilterStatus(f.key); setPage(1); }}
                                        className={cn(
                                            'px-3 py-1 text-xs font-medium rounded-md transition-all',
                                            filterStatus === f.key
                                                ? 'bg-white dark:bg-black text-foreground'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            {/* Bulk select buttons */}
                            {!applyToAll && filteredStudents.length > 0 && (
                                <>
                                    <Button variant="outline" size="sm" onClick={selectPageUnassigned} className="h-8 text-xs">
                                        {allPageSelected ? 'Deselect page' : 'Select page'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={selectAllUnassigned}
                                        disabled={!eligibleUnassigned.length}
                                        className={cn(
                                            'h-8 text-xs',
                                            selectedStudents.length === eligibleUnassigned.length && eligibleUnassigned.length > 0
                                                ? 'bg-muted text-foreground hover:bg-muted/80 border'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                        )}
                                    >
                                        {selectedStudents.length === eligibleUnassigned.length && eligibleUnassigned.length > 0
                                            ? 'Deselect all'
                                            : `All eligible (${eligibleUnassigned.length})`}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Search bar */}
                    <div className="px-5 py-3 border-b bg-muted/20">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or admission number…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="pl-9 h-8 text-sm bg-white dark:b-muted border-border"
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {studentsLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading students…</p>
                        </div>
                    ) : !selectedClass ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <Users className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <p className="font-medium text-muted-foreground">Select a class to view students</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Students will appear here once you choose a class</p>
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                                <Search className="w-8 h-8 text-muted-foreground/50" />
                            </div>
                            <p className="font-medium text-muted-foreground">No students found</p>
                            {search && <p className="text-xs text-muted-foreground/60 mt-1">Try a different search term</p>}
                        </div>
                    ) : (
                        <>
                            {/* Column headers */}
                            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-2 bg-muted/30 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                <div className="w-5" />
                                <div>Student</div>
                                <div className="text-center w-20">Roll No.</div>
                                <div className="text-center w-20">Section</div>
                                <div className="text-right w-24">Status</div>
                            </div>

                            {/* Rows */}
                            <div className="divide-y divide-border/50">
                                {pagedStudents.map((student, idx) => {
                                    const isAssigned = student.studentFees?.some(f => f.academicYearId === academicYearId);
                                    const missingJoin = student.missingJoiningDate || student.profileStatus === 'MISSING_JOIN_DATE' || !student.admissionDate;
                                    const isSelected = selectedStudents.includes(student.userId);
                                    const isDisabled = isAssigned || applyToAll || missingJoin;

                                    return (
                                        <div
                                            key={student.userId}
                                            onClick={() => !isDisabled && toggleStudent(student.userId)}
                                            className={cn(
                                                'grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-5 py-3 transition-all duration-150',
                                                isSelected && !applyToAll
                                                    ? 'bg-green-50 dark:bg-green-950/20'
                                                    : isAssigned
                                                        ? 'bg-slate-50/50 dark:bg-slate-900/30'
                                                        : 'hover:bg-muted/40',
                                                !isDisabled && 'cursor-pointer',
                                                isDisabled && 'cursor-default',
                                                missingJoin && 'bg-red-50/60 dark:bg-red-950/20',
                                            )}
                                        >
                                            {/* Checkbox */}
                                            <div className="w-5 flex items-center justify-center">
                                                {!applyToAll && !isAssigned && !missingJoin ? (
                                                    <Checkbox
                                                        checked={isSelected}
                                                        onCheckedChange={() => toggleStudent(student.userId)}
                                                        onClick={e => e.stopPropagation()}
                                                        className={cn(
                                                            'transition-all',
                                                            isSelected && 'border-green-600 data-[state=checked]:bg-green-600'
                                                        )}
                                                    />
                                                ) : isAssigned ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : missingJoin ? (
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                ) : (
                                                    <div className="w-4 h-4" />
                                                )}
                                            </div>

                                            {/* Student info */}
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar name={student.name} size={34} />
                                                <div className="min-w-0">
                                                    <p className={cn(
                                                        'text-sm font-semibold truncate leading-tight',
                                                        isAssigned && 'text-muted-foreground'
                                                    )}>
                                                        {student.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                                                        {student.admissionNo}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Roll No */}
                                            <div className="w-20 text-center">
                                                <span className="text-sm text-muted-foreground tabular-nums">
                                                    {student.rollNumber ? `#${student.rollNumber}` : '—'}
                                                </span>
                                            </div>

                                            {/* Section */}
                                            <div className="w-20 text-center">
                                                {student.section?.name ? (
                                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-md font-medium">
                                                        {student.section.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </div>

                                            {/* Status */}
                                            <div className="w-24 flex justify-end">
                                                {missingJoin ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-2.5 py-1 rounded-full">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Missing Date
                                                    </span>
                                                ) : isAssigned ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Assigned
                                                    </span>
                                                ) : isSelected ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-full">
                                                        <CircleDot className="w-3 h-3" />
                                                        Selected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-full">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                        Pending
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/20">
                                    <p className="text-xs text-muted-foreground tabular-nums">
                                        {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredStudents.length)} of {filteredStudents.length}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </Button>
                                        <span className="text-xs px-3 font-medium tabular-nums">{page} / {totalPages}</span>
                                        <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </Card>
            </div>

            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Fee Assignment History
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        {(assignmentHistory?.history || []).length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">No fee assignment history found.</div>
                        ) : (
                            assignmentHistory.history.map((item) => {
                                const skippedRows = item.report?.missingJoiningDateStudents || [];
                                return (
                                    <div key={item.id} className="rounded-lg border p-4 space-y-3">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-semibold">{item.structureName || 'Fee Structure'}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(item.createdAt).toLocaleString()} · Class {item.classId || 'All'}{item.sectionId ? ` / Section ${item.sectionId}` : ''}
                                                </p>
                                            </div>
                                            {skippedRows.length > 0 && (
                                                <Button variant="outline" size="sm" onClick={() => exportMissingReport(skippedRows)}>
                                                    <Download className="mr-2 h-4 w-4" />
                                                    Skipped Report
                                                </Button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                                            {[
                                                ['Requested', item.totalRequested],
                                                ['Assigned', item.assignedCount],
                                                ['Already', item.skippedAlreadyAssigned],
                                                ['Missing Date', item.skippedMissingJoiningDate],
                                                ['Failed', item.failedCount],
                                            ].map(([label, value]) => (
                                                <div key={label} className="rounded-md bg-muted/50 p-2">
                                                    <p className="text-lg font-bold">{value || 0}</p>
                                                    <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
} 
