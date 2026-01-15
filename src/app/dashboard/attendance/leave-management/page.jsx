'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar, CheckCircle, XCircle, Clock, AlertCircle, Download,
    RefreshCw, Search, User, FileText, Phone, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const leaveTypes = [
    { value: 'CASUAL', label: 'Casual', color: 'bg-blue-500' },
    { value: 'SICK', label: 'Sick', color: 'bg-red-500' },
    { value: 'EARNED', label: 'Earned', color: 'bg-green-500' },
    { value: 'MATERNITY', label: 'Maternity', color: 'bg-pink-500' },
    { value: 'PATERNITY', label: 'Paternity', color: 'bg-purple-500' },
    { value: 'EMERGENCY', label: 'Emergency', color: 'bg-orange-500' },
    { value: 'UNPAID', label: 'Unpaid', color: 'bg-gray-500' },
    { value: 'COMPENSATORY', label: 'Compensatory', color: 'bg-cyan-500' },
];

export default function LeaveManagement() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const adminId = fullUser?.id;
    const queryClient = useQueryClient();

    // Filters (client-side)
    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // Actions
    const [selectedLeaves, setSelectedLeaves] = useState([]);
    const [adminRemarks, setAdminRemarks] = useState('');

    // Fetch ALL leave requests once (no status in queryKey)
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['leave-management', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/leave-management?status=PENDING,APPROVED,REJECTED,CANCELLED`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    });

    // Fetch permission settings
    const { data: permissions } = useQuery({
        queryKey: ['leave-permissions', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/leave-permissions?viewerRole=ADMIN`);
            if (!res.ok) return { viewer: { canApprove: true } };
            return res.json();
        },
        enabled: !!schoolId
    });

    const canApprove = permissions?.viewer?.canApprove !== false;

    // Client-side filtering
    const filteredLeaves = useMemo(() => {
        const allLeaves = data?.leaves || [];
        return allLeaves.filter(leave => {
            const matchesStatus = leave.status === statusFilter;
            const matchesType = leaveTypeFilter === 'all' || leave.leaveType === leaveTypeFilter;
            const matchesSearch = !searchQuery ||
                leave.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                leave.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesStatus && matchesType && matchesSearch;
        });
    }, [data?.leaves, statusFilter, leaveTypeFilter, searchQuery]);

    // Status counts for badges
    const statusCounts = useMemo(() => {
        const allLeaves = data?.leaves || [];
        return {
            PENDING: allLeaves.filter(l => l.status === 'PENDING').length,
            APPROVED: allLeaves.filter(l => l.status === 'APPROVED').length,
            REJECTED: allLeaves.filter(l => l.status === 'REJECTED').length,
            CANCELLED: allLeaves.filter(l => l.status === 'CANCELLED').length,
        };
    }, [data?.leaves]);

    // Pagination
    const totalPages = Math.ceil(filteredLeaves.length / ITEMS_PER_PAGE);
    const paginatedLeaves = filteredLeaves.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    // Reset page when filters change
    const handleStatusChange = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
        setSelectedLeaves([]);
    };

    const actionMutation = useMutation({
        mutationFn: async ({ action }) => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/leave-management`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leaveRequestIds: selectedLeaves,
                    action,
                    adminRemarks,
                    reviewedBy: adminId
                })
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error);
            }
            return res.json();
        },
        onSuccess: (data, variables) => {
            toast.success(`${variables.action} ${data.summary[variables.action.toLowerCase()]} leave request(s)`);
            setSelectedLeaves([]);
            setAdminRemarks('');
            queryClient.invalidateQueries(['leave-management']);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const toggleSelection = (id) => {
        setSelectedLeaves(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedLeaves.length === paginatedLeaves.length) {
            setSelectedLeaves([]);
        } else {
            setSelectedLeaves(paginatedLeaves.map(l => l.id));
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getLeaveTypeColor = (type) => {
        return leaveTypes.find(l => l.value === type)?.color || 'bg-gray-500';
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED': return <Badge className="bg-green-100 text-green-700">Approved</Badge>;
            case 'REJECTED': return <Badge className="bg-red-100 text-red-700">Rejected</Badge>;
            case 'CANCELLED': return <Badge className="bg-gray-100 text-gray-700">Cancelled</Badge>;
            default: return <Badge className="bg-yellow-100 text-yellow-700">Pending</Badge>;
        }
    };

    // Show minimal loading only on first load (no school data yet)
    if (!schoolId) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
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
                        <Calendar className="w-6 h-6 text-primary" />
                        Leave Management
                    </h1>
                    <p className="text-muted-foreground">Review and approve leave requests</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Permission Restricted Banner */}
            {!canApprove && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">View Only Mode</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            Leave approval has been restricted. You can view requests but cannot approve or reject them.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data?.leaves?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">All time</p>
                    </CardContent>
                </Card>
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
                        <Select value={leaveTypeFilter} onValueChange={(v) => { setLeaveTypeFilter(v); setCurrentPage(1); }}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Leave Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                {leaveTypes.map(type => (
                                    <SelectItem key={type.value} value={type.value}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${type.color}`} />
                                            {type.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Status Tabs - No refetch on change */}
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
                    <TabsTrigger value="CANCELLED">
                        Cancelled <Badge variant="secondary" className="ml-2">{statusCounts.CANCELLED}</Badge>
                    </TabsTrigger>
                </TabsList>

                {/* Bulk Actions */}
                {statusFilter === 'PENDING' && selectedLeaves.length > 0 && canApprove && (
                    <Card className="mt-4">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <Badge variant="secondary">{selectedLeaves.length} selected</Badge>
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
                                                <DialogTitle>Approve Leave Requests</DialogTitle>
                                                <DialogDescription>
                                                    Approve {selectedLeaves.length} leave request(s)
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Remarks (Optional)</label>
                                                    <Textarea
                                                        placeholder="Add any remarks..."
                                                        value={adminRemarks}
                                                        onChange={(e) => setAdminRemarks(e.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full bg-green-600 hover:bg-green-700"
                                                    onClick={() => actionMutation.mutate({ action: 'APPROVED' })}
                                                    disabled={actionMutation.isPending}
                                                >
                                                    {actionMutation.isPending ? 'Processing...' : 'Confirm Approval'}
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
                                                <DialogTitle>Reject Leave Requests</DialogTitle>
                                                <DialogDescription>
                                                    Reject {selectedLeaves.length} leave request(s)
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium mb-2">Reason (Required)</label>
                                                    <Textarea
                                                        placeholder="Explain why you're rejecting..."
                                                        value={adminRemarks}
                                                        onChange={(e) => setAdminRemarks(e.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                                <Button
                                                    className="w-full bg-red-600 hover:bg-red-700"
                                                    onClick={() => actionMutation.mutate({ action: 'REJECTED' })}
                                                    disabled={actionMutation.isPending || !adminRemarks}
                                                >
                                                    {actionMutation.isPending ? 'Processing...' : 'Confirm Rejection'}
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>

                                    <Button variant="outline" size="sm" onClick={() => setSelectedLeaves([])}>
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
                            <CardTitle>Leave Requests</CardTitle>
                            <CardDescription>
                                {filteredLeaves.length} {statusFilter.toLowerCase()} request(s) found
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                                    <p className="text-sm text-muted-foreground">Loading requests...</p>
                                </div>
                            ) : paginatedLeaves.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[200px] text-center p-8">
                                    <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                                    <h3 className="text-lg font-medium">No requests found</h3>
                                    <p className="text-sm text-muted-foreground">
                                        No {statusFilter.toLowerCase()} leave requests match your filters.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {statusFilter === 'PENDING' && canApprove && (
                                                    <TableHead className="w-12">
                                                        <Checkbox
                                                            checked={selectedLeaves.length === paginatedLeaves.length && paginatedLeaves.length > 0}
                                                            onCheckedChange={toggleSelectAll}
                                                        />
                                                    </TableHead>
                                                )}
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Leave Type</TableHead>
                                                <TableHead>Duration</TableHead>
                                                <TableHead>Dates</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedLeaves.map((leave) => (
                                                <TableRow key={leave.id} className={selectedLeaves.includes(leave.id) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}>
                                                    {statusFilter === 'PENDING' && canApprove && (
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedLeaves.includes(leave.id)}
                                                                onCheckedChange={() => toggleSelection(leave.id)}
                                                            />
                                                        </TableCell>
                                                    )}
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                                                                {leave.user?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-medium">{leave.user?.name}</p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {leave.user?.teacher?.designation || leave.user?.role?.name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={`${getLeaveTypeColor(leave.leaveType)} text-white`}>
                                                            {leave.leaveType}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-medium">{leave.totalDays}</span>
                                                        <span className="text-muted-foreground"> day(s)</span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm">{formatDate(leave.startDate)}</p>
                                                        <p className="text-xs text-muted-foreground">to {formatDate(leave.endDate)}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="text-sm line-clamp-2 max-w-[200px]">{leave.reason}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        {getStatusBadge(leave.status)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t">
                                            <p className="text-sm text-muted-foreground">
                                                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeaves.length)} of {filteredLeaves.length}
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