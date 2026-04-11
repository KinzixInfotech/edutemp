'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Shield, Search, CheckCircle2, XCircle, Clock,
    ChevronLeft, ChevronRight, Eye, BadgeCheck,
    FileText, AlertCircle, Filter
} from 'lucide-react';

const STATUS_BADGES = {
    PENDING: { label: 'Pending', variant: 'outline', className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700' },
    APPROVED: { label: 'Approved', variant: 'outline', className: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-300 dark:border-green-700' },
    REJECTED: { label: 'Rejected', variant: 'outline', className: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950/30 dark:text-red-300 dark:border-red-700' },
};

const TYPE_LABELS = {
    PROFILE_UPDATE: 'Profile Update',
    VERIFICATION_REQUEST: 'Verification',
};

const FIELD_LABELS = {
    tagline: 'Tagline', description: 'Description', vision: 'Vision', mission: 'Mission',
    coverImage: 'Cover Image', logoImage: 'Logo Image', videoUrl: 'Video URL',
    publicEmail: 'Email', publicPhone: 'Phone', website: 'Website',
    minFee: 'Min Fee', maxFee: 'Max Fee', feeStructureUrl: 'Fee PDF',
    detailedFeeStructure: 'Fee Breakdown', establishedYear: 'Est. Year',
    totalStudents: 'Students', totalTeachers: 'Teachers', studentTeacherRatio: 'Ratio',
    isPubliclyVisible: 'Visible', isFeatured: 'Featured', isVerified: 'Verified',
    boards: 'Educational Boards', genderType: 'Gender Focus',
    religiousAffiliation: 'Religious Affiliation', socials: 'Social Links',
    leadership: 'Leadership Team',
};

function formatValue(val) {
    if (val === null || val === undefined || val === '') return '—';
    if (typeof val === 'boolean') return val ? 'Yes' : 'No';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });
}

export default function ProfileReviewsPage() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [reviewRemarks, setReviewRemarks] = useState('');
    const [dialogMode, setDialogMode] = useState(null); // 'view' | 'approve' | 'reject'

    const schoolId = fullUser?.schoolId || 'all';

    const { data, isLoading } = useQuery({
        queryKey: ['profile-changes', schoolId, page, statusFilter, typeFilter, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: String(page),
                limit: '10',
                ...(statusFilter !== 'all' && { status: statusFilter }),
                ...(typeFilter !== 'all' && { type: typeFilter }),
                ...(search && { search }),
            });
            const res = await fetch(`/api/schools/${schoolId}/explorer/profile-changes?${params}`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: !!fullUser,
    });

    const reviewMutation = useMutation({
        mutationFn: async ({ changeRequestId, action, remarks }) => {
            const res = await fetch(`/api/schools/${schoolId}/explorer/profile-changes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    changeRequestId,
                    action,
                    remarks,
                    reviewerId: fullUser.id,
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to process');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['profile-changes']);
            setSelectedRequest(null);
            setDialogMode(null);
            setReviewRemarks('');
        },
    });

    const openDialog = useCallback((request, mode) => {
        setSelectedRequest(request);
        setDialogMode(mode);
        setReviewRemarks('');
    }, []);

    const handleAction = useCallback((action) => {
        if (!selectedRequest) return;
        if (action === 'reject' && !reviewRemarks.trim()) return;
        reviewMutation.mutate({
            changeRequestId: selectedRequest.id,
            action,
            remarks: reviewRemarks || undefined,
        });
    }, [selectedRequest, reviewRemarks, reviewMutation]);

    const items = data?.items || [];
    const summary = data?.summary || { total: 0, pending: 0, approved: 0, rejected: 0 };
    const totalPages = data?.totalPages || 1;

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
                </div>
                <Skeleton className="h-96" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="bg-gradient-to-br from-violet-500 to-indigo-600 p-2.5 rounded-xl">
                        <Shield className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Profile Reviews</h1>
                        <p className="text-muted-foreground text-sm">
                            Review and approve profile changes and verification requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border-slate-200 dark:border-slate-700">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{summary.total}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-amber-700 dark:text-amber-300">Pending</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{summary.pending}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">Approved</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-700 dark:text-green-300">{summary.approved}</div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300">Rejected</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-700 dark:text-red-300">{summary.rejected}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by school name..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-[160px]">
                            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="PENDING">Pending</SelectItem>
                            <SelectItem value="APPROVED">Approved</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-[180px]">
                            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="PROFILE_UPDATE">Profile Update</SelectItem>
                            <SelectItem value="VERIFICATION_REQUEST">Verification</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </Card>

            {/* Table */}
            <Card>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>School</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Submitted By</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <div className="flex flex-col items-center gap-2">
                                            <FileText className="h-10 w-10 text-muted-foreground/50" />
                                            <p>No profile change requests found</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((request) => {
                                    const statusBadge = STATUS_BADGES[request.status] || STATUS_BADGES.PENDING;
                                    const changesCount = request.type === 'VERIFICATION_REQUEST'
                                        ? null
                                        : Object.keys(request.changes || {}).length;

                                    return (
                                        <TableRow key={request.id} className="group">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {request.school?.profilePicture ? (
                                                        <img
                                                            src={request.school.profilePicture}
                                                            alt=""
                                                            className="h-9 w-9 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                                                            {(request.school?.name || '?')[0]}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-medium text-sm">{request.school?.name || 'Unknown'}</p>
                                                        {request.school?.location && (
                                                            <p className="text-xs text-muted-foreground">{request.school.location}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    {request.type === 'VERIFICATION_REQUEST' ? (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-700 gap-1">
                                                            <BadgeCheck className="h-3 w-3" />
                                                            Verification
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="gap-1">
                                                            <FileText className="h-3 w-3" />
                                                            {changesCount} change{changesCount !== 1 ? 's' : ''}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm">{request.requestedBy?.name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">{request.requestedBy?.email}</p>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatDate(request.createdAt)}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={statusBadge.variant} className={statusBadge.className}>
                                                    {request.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                                                    {request.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                    {request.status === 'REJECTED' && <XCircle className="h-3 w-3 mr-1" />}
                                                    {statusBadge.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="gap-1"
                                                        onClick={() => openDialog(request, 'view')}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                        View
                                                    </Button>
                                                    {request.status === 'PENDING' && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1 text-green-700 border-green-300 hover:bg-green-50 dark:text-green-300 dark:border-green-700 dark:hover:bg-green-950/30"
                                                                onClick={() => openDialog(request, 'approve')}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="gap-1 text-red-700 border-red-300 hover:bg-red-50 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-950/30"
                                                                onClick={() => openDialog(request, 'reject')}
                                                            >
                                                                <XCircle className="h-4 w-4" />
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {totalPages} ({data?.total || 0} total)
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Review Dialog */}
            <Dialog open={!!dialogMode} onOpenChange={() => { setDialogMode(null); setSelectedRequest(null); setReviewRemarks(''); }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    {selectedRequest && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    {dialogMode === 'view' && <Eye className="h-5 w-5" />}
                                    {dialogMode === 'approve' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                                    {dialogMode === 'reject' && <XCircle className="h-5 w-5 text-red-600" />}
                                    {dialogMode === 'view' ? 'Change Request Details' :
                                        dialogMode === 'approve' ? 'Approve Changes' : 'Reject Changes'}
                                </DialogTitle>
                                <DialogDescription>
                                    {selectedRequest.school?.name} — {TYPE_LABELS[selectedRequest.type] || selectedRequest.type}
                                    <span className="ml-2 text-xs">({formatDate(selectedRequest.createdAt)})</span>
                                </DialogDescription>
                            </DialogHeader>

                            {/* Request Info */}
                            <div className="space-y-1 text-sm bg-muted/50 p-3 rounded-lg">
                                <p><span className="text-muted-foreground">Submitted by:</span> {selectedRequest.requestedBy?.name} ({selectedRequest.requestedBy?.email})</p>
                                <p><span className="text-muted-foreground">Status:</span> {selectedRequest.status}</p>
                                {selectedRequest.reviewedBy && (
                                    <p><span className="text-muted-foreground">Reviewed by:</span> {selectedRequest.reviewedBy.name} on {formatDate(selectedRequest.reviewedAt)}</p>
                                )}
                                {selectedRequest.reviewRemarks && (
                                    <p><span className="text-muted-foreground">Remarks:</span> {selectedRequest.reviewRemarks}</p>
                                )}
                            </div>

                            {/* Changes Diff */}
                            <div className="space-y-3">
                                <h4 className="font-medium text-sm">Proposed Changes</h4>
                                {selectedRequest.type === 'VERIFICATION_REQUEST' ? (
                                    <div className="flex items-center gap-2 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                                        <BadgeCheck className="h-6 w-6 text-blue-500" />
                                        <div>
                                            <p className="font-medium text-blue-800 dark:text-blue-200">Verified Badge Request</p>
                                            <p className="text-sm text-blue-600 dark:text-blue-300">This school is requesting a verified profile badge (blue tick)</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {Object.entries(selectedRequest.changes || {}).map(([field, diff]) => (
                                            <div key={field} className="p-3 rounded-lg border bg-card">
                                                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                                    {FIELD_LABELS[field] || field}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <span className="text-xs text-red-500 font-medium block mb-1">Current Value</span>
                                                        <div className="bg-red-50 dark:bg-red-950/20 p-2 rounded text-xs break-all text-red-700 dark:text-red-300 max-h-32 overflow-y-auto">
                                                            <pre className="whitespace-pre-wrap font-mono">{formatValue(diff.old)}</pre>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-xs text-green-500 font-medium block mb-1">Proposed Value</span>
                                                        <div className="bg-green-50 dark:bg-green-950/20 p-2 rounded text-xs break-all text-green-700 dark:text-green-300 max-h-32 overflow-y-auto">
                                                            <pre className="whitespace-pre-wrap font-mono">{formatValue(diff.new)}</pre>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Action Section */}
                            {(dialogMode === 'approve' || dialogMode === 'reject') && (
                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="text-sm font-medium">
                                            {dialogMode === 'reject' ? 'Rejection Reason *' : 'Remarks (optional)'}
                                        </label>
                                        <Textarea
                                            value={reviewRemarks}
                                            onChange={(e) => setReviewRemarks(e.target.value)}
                                            placeholder={dialogMode === 'reject'
                                                ? 'Please provide a reason for rejection...'
                                                : 'Add any comments (optional)...'
                                            }
                                            rows={3}
                                            className="mt-1.5"
                                        />
                                        {dialogMode === 'reject' && !reviewRemarks.trim() && (
                                            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                Rejection remarks are required
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {reviewMutation.isError && (
                                <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/30 p-2 rounded">
                                    {reviewMutation.error?.message || 'Failed to process request'}
                                </div>
                            )}

                            <DialogFooter>
                                <Button variant="outline" onClick={() => { setDialogMode(null); setSelectedRequest(null); }}>
                                    {dialogMode === 'view' ? 'Close' : 'Cancel'}
                                </Button>
                                {dialogMode === 'approve' && (
                                    <Button
                                        onClick={() => handleAction('approve')}
                                        disabled={reviewMutation.isPending}
                                        className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        {reviewMutation.isPending ? 'Approving...' : 'Approve Changes'}
                                    </Button>
                                )}
                                {dialogMode === 'reject' && (
                                    <Button
                                        onClick={() => handleAction('reject')}
                                        disabled={reviewMutation.isPending || !reviewRemarks.trim()}
                                        variant="destructive"
                                        className="gap-1"
                                    >
                                        <XCircle className="h-4 w-4" />
                                        {reviewMutation.isPending ? 'Rejecting...' : 'Reject Changes'}
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
