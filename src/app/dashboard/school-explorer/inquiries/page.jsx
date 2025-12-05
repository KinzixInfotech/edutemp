'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Mail, Phone, User, Calendar, MessageSquare,
    ChevronLeft, ChevronRight, Filter, RefreshCcw
} from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['New', 'Contacted', 'Scheduled', 'Converted', 'Closed'];

const getStatusColor = (status) => {
    switch (status) {
        case 'New': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
        case 'Contacted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'Scheduled': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        case 'Converted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'Closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export default function AdmissionInquiries() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState('');
    const [notes, setNotes] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['school-inquiries', fullUser?.schoolId, statusFilter, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20',
                ...(statusFilter && { status: statusFilter }),
            });
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/inquiries?${params}`);
            if (!response.ok) throw new Error('Failed to fetch inquiries');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
    });

    const updateMutation = useMutation({
        mutationFn: async ({ inquiryId, status, notes }) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/inquiries`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inquiryId, status, notes }),
            });
            if (!response.ok) throw new Error('Failed to update');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-inquiries']);
            queryClient.invalidateQueries(['school-explorer-analytics']);
            setSelectedInquiry(null);
            setNotes('');
        },
    });

    const handleStatusChange = (status) => {
        setUpdatingStatus(status);
        updateMutation.mutate({
            inquiryId: selectedInquiry.id,
            status,
            notes,
        });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <Card key={i} className="p-6">
                            <Skeleton className="h-20 w-full" />
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Admission Inquiries</h1>
                    <p className="text-muted-foreground">
                        Manage and track parent inquiries from your public profile
                    </p>
                </div>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries(['school-inquiries'])}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Filters & Stats */}
            <div className="flex gap-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="All Status">
                            {statusFilter || 'All Status'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {STATUSES.map(status => (
                            <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex-1" />

                <div className="flex gap-2">
                    {STATUSES.map(status => {
                        const count = data?.inquiries?.filter(i => i.status === status).length || 0;
                        return (
                            <Badge key={status} variant="outline" className={getStatusColor(status)}>
                                {status}: {count}
                            </Badge>
                        );
                    })}
                </div>
            </div>

            {/* Inquiries List */}
            {data?.inquiries && data.inquiries.length > 0 ? (
                <div className="space-y-3">
                    {data.inquiries.map((inquiry) => (
                        <Card
                            key={inquiry.id}
                            className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => {
                                setSelectedInquiry(inquiry);
                                setNotes(inquiry.notes || '');
                            }}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-lg">{inquiry.studentName}</h3>
                                        <Badge className={getStatusColor(inquiry.status)}>
                                            {inquiry.status}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            {inquiry.parentName}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-4 w-4" />
                                            {inquiry.parentEmail}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            {inquiry.parentPhone}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        {format(new Date(inquiry.createdAt), 'MMM dd, yyyy')}
                                    </div>
                                    <div className="mt-1">Grade: {inquiry.preferredGrade}</div>
                                </div>
                            </div>

                            {inquiry.message && (
                                <div className="mt-3 pt-3 border-t">
                                    <div className="flex items-start gap-2 text-sm">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <p className="text-muted-foreground line-clamp-2">{inquiry.message}</p>
                                    </div>
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <Card className="p-12 text-center">
                    <p className="text-xl text-muted-foreground mb-2">No inquiries found</p>
                    <p className="text-sm text-muted-foreground">
                        {statusFilter ? 'Try changing the filter' : 'Inquiries will appear here when parents contact you'}
                    </p>
                </Card>
            )}

            {/* Pagination */}
            {data?.pagination && data.pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                        Page {page} of {data.pagination.totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                        disabled={page === data.pagination.totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Inquiry Detail Dialog */}
            <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Inquiry Details</DialogTitle>
                        <DialogDescription>
                            Review and update the inquiry status
                        </DialogDescription>
                    </DialogHeader>

                    {selectedInquiry && (
                        <div className="space-y-4">
                            {/* Student Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Student Name</div>
                                    <div className="font-semibold">{selectedInquiry.studentName}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Preferred Grade</div>
                                    <div className="font-semibold">{selectedInquiry.preferredGrade}</div>
                                </div>
                                {selectedInquiry.studentAge && (
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Age</div>
                                        <div className="font-semibold">{selectedInquiry.studentAge} years</div>
                                    </div>
                                )}
                            </div>

                            {/* Parent Info */}
                            <div className="grid grid-cols-1 gap-3">
                                <div><strong>Parent:</strong> {selectedInquiry.parentName}</div>
                                <div><strong>Email:</strong> {selectedInquiry.parentEmail}</div>
                                <div><strong>Phone:</strong> {selectedInquiry.parentPhone}</div>
                            </div>

                            {/* Message */}
                            {selectedInquiry.message && (
                                <div>
                                    <Label className="text-sm font-medium">Message</Label>
                                    <p className="text-sm text-muted-foreground mt-2 p-3 bg-muted rounded">
                                        {selectedInquiry.message}
                                    </p>
                                </div>
                            )}

                            {/* Source & Date */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><strong>Source:</strong> {selectedInquiry.source || 'Website'}</div>
                                <div><strong>Received:</strong> {format(new Date(selectedInquiry.createdAt), 'PPpp')}</div>
                            </div>

                            {/* Notes */}
                            <div>
                                <Label htmlFor="notes">Internal Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes about this inquiry..."
                                    rows={3}
                                    className="mt-2"
                                />
                            </div>

                            {/* Status Update */}
                            <div>
                                <Label>Update Status</Label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                                    {STATUSES.map(status => (
                                        <Button
                                            key={status}
                                            variant={selectedInquiry.status === status ? 'default' : 'outline'}
                                            onClick={() => handleStatusChange(status)}
                                            disabled={updateMutation.isPending && updatingStatus === status}
                                        >
                                            {updateMutation.isPending && updatingStatus === status ? 'Updating...' : status}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Save Notes */}
                            <Button
                                onClick={() => updateMutation.mutate({
                                    inquiryId: selectedInquiry.id,
                                    status: selectedInquiry.status,
                                    notes,
                                })}
                                disabled={updateMutation.isPending}
                                className="w-full"
                            >
                                {updateMutation.isPending ? 'Saving...' : 'Save Notes'}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
