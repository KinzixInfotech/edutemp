'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText, CheckCircle, XCircle, Clock, AlertCircle,
    Download, RefreshCw, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

const ITEMS_PER_PAGE = 10;

export default function AttendanceRegularization() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const adminId = fullUser?.id;
    const queryClient = useQueryClient();

    // Filters (client-side)
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Actions
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [approvalRemarks, setApprovalRemarks] = useState('');

    // Fetch ALL requests once (no status in queryKey)
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['regularization', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/regularization?status=PENDING,APPROVED,REJECTED`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 2,
    });

    // Client-side filtering
    const filteredRequests = useMemo(() => {
        const allRequests = data?.requests || [];
        return allRequests.filter(request => {
            const matchesStatus = request.approvalStatus === statusFilter;
            const matchesSearch = !searchQuery ||
                request.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                request.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesSearch;
        });
    }, [data?.requests, statusFilter, searchQuery]);

    // Status counts for badges
    const statusCounts = useMemo(() => {
        const allRequests = data?.requests || [];
        return {
            PENDING: allRequests.filter(r => r.approvalStatus === 'PENDING').length,
            APPROVED: allRequests.filter(r => r.approvalStatus === 'APPROVED').length,
            REJECTED: allRequests.filter(r => r.approvalStatus === 'REJECTED').length,
        };
    }, [data?.requests]);

    // Pagination
    const totalPages = Math.ceil(filteredRequests.length / ITEMS_PER_PAGE);
    const paginatedRequests = filteredRequests.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when filters change
    const handleStatusChange = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
        setSelectedRequests([]);
    };

    const approveMutation = useMutation({
        mutationFn: async ({ action }) => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/regularization`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    attendanceIds: selectedRequests,
                    action,
                    approvedBy: adminId,
                    remarks: approvalRemarks
                })
            });
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        onSuccess: (data, variables) => {
            toast.success(`${variables.action === 'APPROVE' ? 'Approved' : 'Rejected'} ${data.summary.approved + data.summary.rejected} requests`);
            setSelectedRequests([]);
            setApprovalRemarks('');
            queryClient.invalidateQueries(['regularization']);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const toggleSelection = (id) => {
        setSelectedRequests(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedRequests.length === paginatedRequests.length) {
            setSelectedRequests([]);
        } else {
            setSelectedRequests(paginatedRequests.map(r => r.id));
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
            case 'REJECTED': return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
            default: return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
        }
    };

    const getRequestedStatusBadge = (status) => {
        switch (status) {
            case 'PRESENT': return <Badge className="bg-green-100 text-green-700">Present</Badge>;
            case 'HALF_DAY': return <Badge className="bg-orange-100 text-orange-700">Half Day</Badge>;
            case 'ON_LEAVE': return <Badge className="bg-purple-100 text-purple-700">On Leave</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // Show minimal loading only on first load
    if (!schoolId) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <Skeleton className="h-96 rounded-xl" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        Attendance Regularization
                    </h1>
                    <p className="text-muted-foreground">Review and approve attendance correction requests</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statusCounts.PENDING}</div>
                        <p className="text-xs text-muted-foreground">Awaiting review</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statusCounts.APPROVED}</div>
                        <p className="text-xs text-muted-foreground">This period</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{statusCounts.REJECTED}</div>
                        <p className="text-xs text-muted-foreground">This period</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col gap-3 md:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by employee name..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Tabs */}
            <Tabs value={statusFilter} onValueChange={handleStatusChange}>
                <TabsList>
                    <TabsTrigger value="PENDING">
                        Pending <Badge variant="secondary" className="ml-2">{statusCounts.PENDING}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="APPROVED">
                        Approved <Badge variant="secondary" className="ml-2">{statusCounts.APPROVED}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="REJECTED">
                        Rejected <Badge variant="secondary" className="ml-2">{statusCounts.REJECTED}</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Bulk Actions */}
                {statusFilter === 'PENDING' && selectedRequests.length > 0 && (
                    <Card className="mt-4">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary">{selectedRequests.length} selected</Badge>
                                <div className="flex gap-2">
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button size="sm">
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Approve
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Approve Requests</DialogTitle>
                                                <DialogDescription>
                                                    Approve {selectedRequests.length} regularization request(s)
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Remarks (Optional)</label>
                                                    <Textarea
                                                        placeholder="Add any remarks..."
                                                        value={approvalRemarks}
                                                        onChange={(e) => setApprovalRemarks(e.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full bg-green-600 hover:bg-green-700"
                                                    onClick={() => approveMutation.mutate({ action: 'APPROVE' })}
                                                    disabled={approveMutation.isPending}
                                                >
                                                    {approveMutation.isPending ? 'Processing...' : 'Confirm Approval'}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <XCircle className="w-4 h-4 mr-2" />
                                                Reject
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Reject Requests</DialogTitle>
                                                <DialogDescription>
                                                    Reject {selectedRequests.length} regularization request(s)
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Reason (Required)</label>
                                                    <Textarea
                                                        placeholder="Explain why you're rejecting..."
                                                        value={approvalRemarks}
                                                        onChange={(e) => setApprovalRemarks(e.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full bg-red-600 hover:bg-red-700"
                                                    onClick={() => approveMutation.mutate({ action: 'REJECT' })}
                                                    disabled={approveMutation.isPending || !approvalRemarks}
                                                >
                                                    {approveMutation.isPending ? 'Processing...' : 'Confirm Rejection'}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button variant="outline" size="sm" onClick={() => setSelectedRequests([])}>
                                        Clear
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Table Content */}
                <TabsContent value={statusFilter} className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Regularization Requests</CardTitle>
                            <CardDescription>
                                {filteredRequests.length} {statusFilter.toLowerCase()} request(s) found
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                    <p className="text-sm text-muted-foreground">Loading requests...</p>
                                </div>
                            ) : paginatedRequests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-8">
                                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium">No requests found</h3>
                                    <p className="text-sm text-muted-foreground">
                                        No {statusFilter.toLowerCase()} regularization requests match your filters.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {statusFilter === 'PENDING' && (
                                                    <TableHead className="w-12">
                                                        <Checkbox
                                                            checked={selectedRequests.length === paginatedRequests.length && paginatedRequests.length > 0}
                                                            onCheckedChange={toggleSelectAll}
                                                        />
                                                    </TableHead>
                                                )}
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Requested Status</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead>Days Old</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedRequests.map((request) => (
                                                <TableRow key={request.id} className={selectedRequests.includes(request.id) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                    {statusFilter === 'PENDING' && (
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedRequests.includes(request.id)}
                                                                onCheckedChange={() => toggleSelection(request.id)}
                                                            />
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                                                                {request.user?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{request.user?.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {request.user?.role?.name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium">{formatDate(request.date)}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getRequestedStatusBadge(request.status)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm line-clamp-2 max-w-[200px]">{request.remarks || '-'}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        {request.daysOld > 0 ? (
                                                            <Badge variant="outline" className="text-orange-600">
                                                                {request.daysOld} days
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">Today</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(request.approvalStatus)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <p className="text-sm text-muted-foreground">
                                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredRequests.length)} of {filteredRequests.length}
                                            </p>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => p - 1)}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                    Previous
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => p + 1)}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Next
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}