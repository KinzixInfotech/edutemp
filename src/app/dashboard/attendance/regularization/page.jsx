'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    FileText, CheckCircle, XCircle, Clock, AlertCircle, Eye,
    Download, Filter, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function AttendanceRegularization() {
    const schoolId = 'your-school-id';
    const adminId = 'admin-user-id';
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState('PENDING');
    const [selectedRequests, setSelectedRequests] = useState([]);
    const [approvalRemarks, setApprovalRemarks] = useState('');

    const { data, isLoading, refetch } = useQuery({
        queryKey: ['regularization', schoolId, statusFilter],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/admin/regularization?status=${statusFilter}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    });

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
            refetch();
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const requests = data?.requests || [];

    const toggleSelection = (id) => {
        setSelectedRequests(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedRequests(requests.map(r => r.id));
    };

    const clearSelection = () => {
        setSelectedRequests([]);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });
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
                        <FileText className="w-8 h-8 text-blue-600" />
                        Attendance Regularization
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Review and approve attendance correction requests
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Status Filter Tabs */}
            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="PENDING">
                        Pending <Badge variant="secondary" className="ml-2">{data?.requests?.length || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="APPROVED">Approved</TabsTrigger>
                    <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
                </TabsList>

                {/* Action Bar */}
                {statusFilter === 'PENDING' && requests.length > 0 && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" onClick={selectAll}>
                                        Select All ({requests.length})
                                    </Button>
                                    {selectedRequests.length > 0 && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={clearSelection}>
                                                Clear Selection
                                            </Button>
                                            <Badge variant="secondary">
                                                {selectedRequests.length} selected
                                            </Badge>
                                        </>
                                    )}
                                </div>

                                {selectedRequests.length > 0 && (
                                    <div className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button variant="default" size="sm">
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Approve ({selectedRequests.length})
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Approve Requests</DialogTitle>
                                                    <DialogDescription>
                                                        Approve {selectedRequests.length} attendance regularization request(s)
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-2">Admin Remarks (Optional)</label>
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
                                                    Reject ({selectedRequests.length})
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Reject Requests</DialogTitle>
                                                    <DialogDescription>
                                                        Reject {selectedRequests.length} attendance regularization request(s)
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium mb-2">Rejection Reason (Required)</label>
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
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Requests List */}
                <TabsContent value={statusFilter}>
                    {requests.length === 0 ? (
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center py-12">
                                    <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">
                                        No {statusFilter.toLowerCase()} requests found
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-4">
                            {requests.map((request) => (
                                <Card key={request.id} className={`
                  ${selectedRequests.includes(request.id) ? 'ring-2 ring-blue-500' : ''}
                  hover:shadow-lg transition-all cursor-pointer
                `}>
                                    <CardContent className="pt-6">
                                        <div className="flex items-start gap-4">
                                            {/* Checkbox */}
                                            {statusFilter === 'PENDING' && (
                                                <div className="mt-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRequests.includes(request.id)}
                                                        onChange={() => toggleSelection(request.id)}
                                                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </div>
                                            )}

                                            {/* Profile */}
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl font-bold text-blue-600">
                                                {request.user.name.charAt(0)}
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="font-semibold">{request.user.name}</h4>
                                                    <Badge variant="outline">{request.user.role.name}</Badge>
                                                    {request.isPastDate && (
                                                        <Badge variant="destructive">
                                                            {request.daysOld} days old
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                                                    <div>
                                                        <p className="text-muted-foreground">Date</p>
                                                        <p className="font-medium">{formatDate(request.date)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Requested Status</p>
                                                        <Badge variant={request.status === 'PRESENT' ? 'default' : 'destructive'}>
                                                            {request.status}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <p className="text-muted-foreground">Submitted</p>
                                                        <p className="font-medium">{formatTime(request.markedAt)}</p>
                                                    </div>
                                                </div>

                                                {/* Reason */}
                                                {request.remarks && (
                                                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                                        <p className="text-sm font-medium mb-1">Reason:</p>
                                                        <p className="text-sm text-muted-foreground">{request.remarks}</p>
                                                    </div>
                                                )}

                                                {/* Documents */}
                                                {request.documents && request.documents.length > 0 && (
                                                    <div className="flex gap-2">
                                                        {request.documents.map((doc, idx) => (
                                                            <Button key={idx} variant="outline" size="sm" asChild>
                                                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                                                                    <Download className="w-3 h-3 mr-1" />
                                                                    {doc.fileName}
                                                                </a>
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Approval Info (for approved/rejected) */}
                                                {request.approvalStatus !== 'PENDING' && (
                                                    <div className="mt-3 pt-3 border-t">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <p className="text-muted-foreground">
                                                                {request.approvalStatus === 'APPROVED' ? 'Approved' : 'Rejected'} by {request.approver?.name}
                                                            </p>
                                                            <Badge variant={request.approvalStatus === 'APPROVED' ? 'default' : 'destructive'}>
                                                                {formatDate(request.approvedAt)}
                                                            </Badge>
                                                        </div>
                                                        {request.approvalRemarks && (
                                                            <p className="text-sm text-muted-foreground mt-2">
                                                                Remarks: {request.approvalRemarks}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Student Info (if applicable) */}
                                            {request.user.student && (
                                                <div className="text-right text-sm">
                                                    <p className="text-muted-foreground">Class</p>
                                                    <p className="font-medium">{request.user.student.class?.className}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {request.user.student.admissionNo}
                                                    </p>
                                                </div>
                                            )}
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