'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Mail, Phone, User, Calendar, MessageSquare,
    ChevronLeft, ChevronRight, Search, RefreshCcw,
    Inbox, UserCheck, CalendarClock, CheckCircle2, XCircle, ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const STATUSES = ['New', 'Contacted', 'Scheduled', 'Converted', 'Closed'];
const ITEMS_PER_PAGE = 10;

const getStatusVariant = (status) => {
    switch (status) {
        case 'New': return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800';
        case 'Contacted': return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800';
        case 'Scheduled': return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-300 dark:border-purple-800';
        case 'Converted': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800';
        case 'Closed': return 'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-700';
        default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
};

const statCardConfig = [
    { key: 'total', label: 'Total Inquiries', icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/20' },
    { key: 'New', label: 'New', icon: ArrowUpRight, color: 'text-sky-600', bg: 'bg-sky-50 dark:bg-sky-950/20' },
    { key: 'Contacted', label: 'Contacted', icon: Phone, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/20' },
    { key: 'Scheduled', label: 'Scheduled', icon: CalendarClock, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/20' },
    { key: 'Converted', label: 'Converted', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
];

export default function AdmissionInquiries() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [selectedInquiry, setSelectedInquiry] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState('');
    const [notes, setNotes] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['school-inquiries', fullUser?.schoolId, statusFilter, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: ITEMS_PER_PAGE.toString(),
                ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
            });
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/inquiries?${params}`);
            if (!response.ok) throw new Error('Failed to fetch inquiries');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
        staleTime: 1000 * 60 * 2,
    });

    // Fetch ALL inquiries once (without pagination) for accurate stat counts
    const { data: allData } = useQuery({
        queryKey: ['school-inquiries-all', fullUser?.schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/inquiries?limit=9999`);
            if (!response.ok) throw new Error('Failed to fetch inquiries');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
        staleTime: 1000 * 60 * 5,
    });

    const statCounts = useMemo(() => {
        const all = allData?.inquiries || [];
        return {
            total: allData?.pagination?.total || all.length,
            New: all.filter(i => i.status === 'New').length,
            Contacted: all.filter(i => i.status === 'Contacted').length,
            Scheduled: all.filter(i => i.status === 'Scheduled').length,
            Converted: all.filter(i => i.status === 'Converted').length,
            Closed: all.filter(i => i.status === 'Closed').length,
        };
    }, [allData]);

    // Client-side search filtering on current page data
    const filteredInquiries = useMemo(() => {
        if (!data?.inquiries) return [];
        if (!searchQuery.trim()) return data.inquiries;
        const q = searchQuery.toLowerCase();
        return data.inquiries.filter(i =>
            i.studentName?.toLowerCase().includes(q) ||
            i.parentName?.toLowerCase().includes(q) ||
            i.parentEmail?.toLowerCase().includes(q) ||
            i.parentPhone?.includes(q) ||
            i.preferredGrade?.toLowerCase().includes(q)
        );
    }, [data?.inquiries, searchQuery]);

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
            queryClient.invalidateQueries(['school-inquiries-all']);
            queryClient.invalidateQueries(['school-explorer-analytics']);
            setSelectedInquiry(null);
            setNotes('');
            toast.success('Inquiry updated successfully');
        },
        onError: () => {
            toast.error('Failed to update inquiry');
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

    const pagination = data?.pagination;
    const totalPages = pagination?.totalPages || 1;

    const renderPaginationButtons = () => {
        const pages = [];
        const maxVisible = 5;
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(
                <Button
                    key={i}
                    variant={page === i ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPage(i)}
                >
                    {i}
                </Button>
            );
        }
        return pages;
    };

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Admission Inquiries</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage and track parent inquiries from your public profile
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        queryClient.invalidateQueries(['school-inquiries']);
                        queryClient.invalidateQueries(['school-inquiries-all']);
                    }}
                >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {isLoading ? (
                    [...Array(5)].map((_, i) => (
                        <Card key={i}>
                            <CardContent className="pt-6">
                                <Skeleton className="h-4 w-20 mb-2" />
                                <Skeleton className="h-8 w-16" />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    statCardConfig.map(({ key, label, icon: Icon, color, bg }) => (
                        <Card
                            key={key}
                            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === key && key !== 'total' ? 'ring-2 ring-primary' : ''}`}
                            onClick={() => {
                                if (key === 'total') {
                                    setStatusFilter('');
                                } else {
                                    setStatusFilter(prev => prev === key ? '' : key);
                                }
                                setPage(1);
                            }}
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                                <div className={`p-2 rounded-lg ${bg}`}>
                                    <Icon className={`h-4 w-4 ${color}`} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{statCounts[key] || 0}</div>
                                {key === 'total' && statCounts.New > 0 && (
                                    <p className="text-xs text-blue-600 mt-1 font-medium">
                                        {statCounts.New} new
                                    </p>
                                )}
                                {key === 'Converted' && statCounts.total > 0 && (
                                    <p className="text-xs text-emerald-600 mt-1 font-medium">
                                        {((statCounts.Converted / statCounts.total) * 100).toFixed(0)}% rate
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Search & Filter Bar */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by student name, parent, email, or phone..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select
                            value={statusFilter || 'all'}
                            onValueChange={(val) => {
                                setStatusFilter(val === 'all' ? '' : val);
                                setPage(1);
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-44">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                {STATUSES.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Inquiries Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                            Inquiries
                            {pagination && (
                                <span className="text-sm font-normal text-muted-foreground ml-2">
                                    ({pagination.total} total)
                                </span>
                            )}
                        </CardTitle>
                        {statusFilter && statusFilter !== 'all' && (
                            <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(''); setPage(1); }}>
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Clear filter
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-3">
                            {[...Array(5)].map((_, i) => (
                                <Skeleton key={i} className="h-14 w-full" />
                            ))}
                        </div>
                    ) : filteredInquiries.length > 0 ? (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="px-4 py-3">Student</TableHead>
                                        <TableHead className="px-4 py-3">Parent</TableHead>
                                        <TableHead className="px-4 py-3">Contact</TableHead>
                                        <TableHead className="px-4 py-3 text-center">Grade</TableHead>
                                        <TableHead className="px-4 py-3 text-center">Status</TableHead>
                                        <TableHead className="px-4 py-3">Date</TableHead>
                                        <TableHead className="px-4 py-3 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInquiries.map((inquiry) => (
                                        <TableRow
                                            key={inquiry.id}
                                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => {
                                                setSelectedInquiry(inquiry);
                                                setNotes(inquiry.notes || '');
                                            }}
                                        >
                                            <TableCell className="px-4 py-3">
                                                <div className="font-medium">{inquiry.studentName}</div>
                                                {inquiry.studentAge && (
                                                    <div className="text-xs text-muted-foreground">{inquiry.studentAge} yrs</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                                                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </div>
                                                    <span className="text-sm">{inquiry.parentName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="text-sm space-y-1">
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Mail className="h-3.5 w-3.5 shrink-0" />
                                                        <span className="truncate max-w-[180px]">{inquiry.parentEmail}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                                        {inquiry.parentPhone}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-center">
                                                <Badge variant="outline">{inquiry.preferredGrade}</Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-center">
                                                <Badge className={`${getStatusVariant(inquiry.status)} border text-xs font-medium`}>
                                                    {inquiry.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-4 py-3">
                                                <div className="text-sm text-muted-foreground">
                                                    {format(new Date(inquiry.createdAt), 'MMM dd, yyyy')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedInquiry(inquiry);
                                                        setNotes(inquiry.notes || '');
                                                    }}
                                                >
                                                    View
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Inbox className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <p className="text-lg font-medium text-muted-foreground mb-1">No inquiries found</p>
                            <p className="text-sm text-muted-foreground">
                                {statusFilter ? 'Try changing the filter or search query' : 'Inquiries will appear here when parents contact you'}
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination && (
                        <div className="flex items-center justify-between px-6 py-4 border-t">
                            <p className="text-sm text-muted-foreground">
                                Showing {((page - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(page * ITEMS_PER_PAGE, pagination.total)} of {pagination.total}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                {renderPaginationButtons()}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Inquiry Detail Dialog */}
            <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg">Inquiry Details</DialogTitle>
                        <DialogDescription>
                            Review and update the inquiry status
                        </DialogDescription>
                    </DialogHeader>

                    {selectedInquiry && (
                        <div className="space-y-5">
                            {/* Student & Parent Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Student</h4>
                                    <div>
                                        <div className="font-semibold text-lg">{selectedInquiry.studentName}</div>
                                        <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                                            <div>Grade: <span className="font-medium text-foreground">{selectedInquiry.preferredGrade}</span></div>
                                            {selectedInquiry.studentAge && (
                                                <div>Age: <span className="font-medium text-foreground">{selectedInquiry.studentAge} years</span></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Parent/Guardian</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">{selectedInquiry.parentName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Mail className="h-4 w-4" />
                                            <a href={`mailto:${selectedInquiry.parentEmail}`} className="hover:underline text-blue-600">{selectedInquiry.parentEmail}</a>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Phone className="h-4 w-4" />
                                            <a href={`tel:${selectedInquiry.parentPhone}`} className="hover:underline text-blue-600">{selectedInquiry.parentPhone}</a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Message */}
                            {selectedInquiry.message && (
                                <div>
                                    <Label className="text-sm font-semibold mb-2 block">Message</Label>
                                    <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg border">
                                        {selectedInquiry.message}
                                    </div>
                                </div>
                            )}

                            {/* Meta Info */}
                            <div className="flex flex-wrap gap-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    Received: {format(new Date(selectedInquiry.createdAt), 'PPpp')}
                                </div>
                                <Badge className={`${getStatusVariant(selectedInquiry.status)} border text-xs`}>
                                    {selectedInquiry.status}
                                </Badge>
                                {selectedInquiry.source && (
                                    <Badge variant="outline" className="text-xs">Source: {selectedInquiry.source}</Badge>
                                )}
                            </div>

                            {/* Notes */}
                            <div>
                                <Label htmlFor="notes" className="text-sm font-semibold mb-2 block">Internal Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add notes about this inquiry..."
                                    rows={3}
                                />
                            </div>

                            {/* Status Update */}
                            <div>
                                <Label className="text-sm font-semibold mb-3 block">Update Status</Label>
                                <div className="flex flex-wrap gap-2">
                                    {STATUSES.map(status => (
                                        <Button
                                            key={status}
                                            variant={selectedInquiry.status === status ? 'default' : 'outline'}
                                            size="sm"
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
