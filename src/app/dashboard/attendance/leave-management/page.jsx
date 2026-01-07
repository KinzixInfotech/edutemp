'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar, CheckCircle, XCircle, Clock, AlertCircle, Download,
    RefreshCw, Filter, User, FileText, Phone
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export default function LeaveManagement() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const adminId = fullUser?.id;

    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
    const [selectedLeaves, setSelectedLeaves] = useState([]);
    const [adminRemarks, setAdminRemarks] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['leave-management', schoolId, statusFilter, leaveTypeFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                status: statusFilter,
                ...(leaveTypeFilter && { leaveType: leaveTypeFilter })
            });
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/leave-management?${params}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    });

    // Fetch permission settings to check if admin can approve
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
            refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const leaves = data?.leaves || [];

    const toggleSelection = (id) => {
        setSelectedLeaves(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedLeaves(leaves.map(l => l.id));
    };

    const clearSelection = () => {
        setSelectedLeaves([]);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getLeaveTypeBadge = (type) => {
        const colors = {
            CASUAL: 'bg-blue-100 text-blue-700',
            SICK: 'bg-red-100 text-red-700',
            EARNED: 'bg-green-100 text-green-700',
            MATERNITY: 'bg-purple-100 text-purple-700',
            EMERGENCY: 'bg-orange-100 text-orange-700'
        };
        return colors[type] || 'bg-gray-100 text-gray-700';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        Leave Management
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Review and approve leave requests
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Permission Restricted Banner */}
            {!canApprove && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                        <p className="font-medium text-amber-800 dark:text-amber-200">View Only Mode</p>
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                            Leave approval has been restricted by Director/Principal. You can view requests but cannot approve or reject them.
                        </p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-4">
                        <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="All Leave Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="CASUAL">Casual Leave</SelectItem>
                                <SelectItem value="SICK">Sick Leave</SelectItem>
                                <SelectItem value="EARNED">Earned Leave</SelectItem>
                                <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                                <SelectItem value="EMERGENCY">Emergency Leave</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Status Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="PENDING">
                        Pending <Badge variant="secondary" className="ml-2">{leaves.length}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                    <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                    <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
                </TabsList>

                {/* Action Bar */}
                {statusFilter === 'PENDING' && leaves.length > 0 && canApprove && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAll}>
                                        Select All ({leaves.length})
                                    </Button>
                                    {selectedLeaves.length > 0 && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={clearSelection}>
                                                Clear
                                            </Button>
                                            <Badge variant="secondary">
                                                {selectedLeaves.length} selected
                                            </Badge>
                                        </>
                                    )}
                                </div>

                                {selectedLeaves.length > 0 && (
                                    <div className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="default" size="sm">
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Approve ({selectedLeaves.length})
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
                                                        <label className="block text-sm font-medium mb-2">
                                                            Admin Remarks (Optional)
                                                        </label>
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
                                                    Reject ({selectedLeaves.length})
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
                                                        <label className="block text-sm font-medium mb-2">
                                                            Rejection Reason (Required)
                                                        </label>
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
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Leave Requests List */}
                <TabsContent value={statusFilter}>
                    {leaves.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-12">
                                    <Calendar className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        No {statusFilter.toLowerCase()} leave requests found
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {leaves.map((leave) => (
                                <Card key={leave.id} className={`
                  ${selectedLeaves.includes(leave.id) ? 'ring-2 ring-blue-500' : ''}
                  hover:shadow-lg transition-all
                `}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            {statusFilter === 'PENDING' && (
                                                <div className="mt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedLeaves.includes(leave.id)}
                                                        onChange={() => toggleSelection(leave.id)}
                                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </div>
                                            )}

                                            {/* Profile */}
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                                                {leave.user.name.charAt(0)}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold">{leave.user.name}</h4>
                                                    <Badge variant="outline">{leave.user.role.name}</Badge>
                                                    <Badge className={getLeaveTypeBadge(leave.leaveType)}>
                                                        {leave.leaveType}
                                                    </Badge>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm mb-3">
                                                    <div>
                                                        <p className="text-muted-foreground">From - To</p>
                                                        <p className="font-medium">
                                                            {formatDate(leave.startDate)} → {formatDate(leave.endDate)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Duration</p>
                                                        <p className="font-medium">{leave.totalDays} day(s)</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Submitted</p>
                                                        <p className="font-medium">{formatDate(leave.submittedAt)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Status</p>
                                                        <Badge variant={
                                                            leave.status === 'APPROVED' ? 'default' :
                                                                leave.status === 'REJECTED' ? 'destructive' : 'secondary'
                                                        }>
                                                            {leave.status}
                                                        </Badge>
                                                    </div>
                                                </div>

                                                {/* Reason */}
                                                <div className="bg-gray-50 dark:bg-muted border rounded-lg p-3 mb-3">
                                                    <p className="text-sm font-medium mb-1">Reason:</p>
                                                    <p className="text-sm text-muted-foreground">{leave.reason}</p>
                                                </div>

                                                {/* Emergency Contact */}
                                                {leave.emergencyContact && (
                                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-4 h-4" />
                                                            <span>Emergency: {leave.emergencyContact}</span>
                                                        </div>
                                                        {leave.emergencyContactPhone && (
                                                            <div className="flex items-center gap-1">
                                                                <Phone className="w-4 h-4" />
                                                                <span>{leave.emergencyContactPhone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Documents */}
                                                {leave.documents && leave.documents.length > 0 && (
                                                    <div className="flex gap-2 mb-3">
                                                        {leave.documents.map((doc, idx) => (
                                                            <Button key={idx} variant="outline" size="sm" asChild>
                                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                    <Download className="w-3 h-3 mr-1" />
                                                                    {doc.fileName}
                                                                </a>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Leave Balance */}
                                                {leave.balance && (
                                                    <div className="border-t pt-3">
                                                        <p className="text-sm font-medium mb-2">Leave Balance:</p>
                                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                                            <div>
                                                                <p className="text-muted-foreground">Casual Leave</p>
                                                                <p className="font-medium">
                                                                    {leave.balance.casualLeave.balance}/{leave.balance.casualLeave.total}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Sick Leave</p>
                                                                <p className="font-medium">
                                                                    {leave.balance.sickLeave.balance}/{leave.balance.sickLeave.total}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-muted-foreground">Earned Leave</p>
                                                                <p className="font-medium">
                                                                    {leave.balance.earnedLeave.balance}/{leave.balance.earnedLeave.total}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Review Info */}
                                                {leave.status !== 'PENDING' && leave.reviewer && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <p className="text-muted-foreground">
                                                                {leave.status === 'APPROVED' ? 'Approved' : 'Rejected'} by {leave.reviewer.name}
                                                            </p>
                                                            <Badge variant="outline">
                                                                {formatDate(leave.reviewedAt)}
                                                            </Badge>
                                                        </div>
                                                        {leave.reviewRemarks && (
                                                            <p className="text-sm text-muted-foreground mt-2">
                                                                Remarks: {leave.reviewRemarks}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* User Info (Right Side) */}
                                            {leave.user.student ? (
                                                <div className="text-right text-sm">
                                                    <p className="text-muted-foreground">Student</p>
                                                    <p className="font-medium">{leave.user.student.class?.className}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {leave.user.student.admissionNo}
                                                    </p>
                                                </div>
                                            ) : leave.user.teacher ? (
                                                <div className="text-right text-sm">
                                                    <p className="text-muted-foreground">Teacher</p>
                                                    <p className="font-medium">{leave.user.teacher.designation}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {leave.user.teacher.employeeId}
                                                    </p>
                                                </div>
                                            ) : null}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}