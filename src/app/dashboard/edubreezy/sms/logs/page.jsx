'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
    Loader2,
    Search,
    RefreshCw,
    Download,
    Filter,
    CheckCircle,
    XCircle,
    Clock,
    MessageSquare,
} from 'lucide-react';

const STATUS_CONFIG = {
    PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    SENT: { label: 'Sent', color: 'bg-blue-100 text-blue-800', icon: MessageSquare },
    DELIVERED: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function SmsLogsPage() {
    const [filters, setFilters] = useState({
        search: '',
        status: 'all',
        school: 'all',
        template: 'all',
        dateFrom: '',
        dateTo: '',
    });
    const [page, setPage] = useState(1);

    // Fetch logs
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['sms-admin-logs', filters, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '50',
                ...(filters.status !== 'all' && { status: filters.status }),
                ...(filters.school !== 'all' && { schoolId: filters.school }),
                ...(filters.template !== 'all' && { templateId: filters.template }),
                ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
                ...(filters.dateTo && { dateTo: filters.dateTo }),
                ...(filters.search && { search: filters.search }),
            });
            const res = await fetch(`/api/sms/admin/logs?${params}`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
        },
    });

    // Fetch schools for filter
    const { data: schools } = useQuery({
        queryKey: ['schools-list'],
        queryFn: async () => {
            const res = await fetch('/api/schools?limit=100');
            if (!res.ok) return [];
            return res.json();
        },
    });

    // Fetch templates for filter
    const { data: templates } = useQuery({
        queryKey: ['sms-templates'],
        queryFn: async () => {
            const res = await fetch('/api/sms/templates?activeOnly=false');
            if (!res.ok) return [];
            return res.json();
        },
    });

    const handleExport = () => {
        // Simple CSV export
        if (!data?.logs?.length) return;

        const headers = ['Date', 'School', 'Template', 'Recipients', 'Status', 'Cost', 'Message'];
        const rows = data.logs.map(log => [
            new Date(log.createdAt).toLocaleString(),
            log.schoolName || '-',
            log.templateName || '-',
            log.recipients?.length || 0,
            log.status,
            log.cost,
            log.message?.substring(0, 50) + '...',
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sms-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const logs = data?.logs || [];
    const totalPages = data?.totalPages || 1;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">SMS Logs</h1>
                    <p className="text-muted-foreground mt-2">
                        View all SMS activity across schools
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => refetch()}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={!logs.length}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <div className="space-y-2">
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Phone or message..."
                                    value={filters.search}
                                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="SENT">Sent</SelectItem>
                                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                                    <SelectItem value="FAILED">Failed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>School</Label>
                            <Select value={filters.school} onValueChange={(v) => setFilters({ ...filters, school: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Schools</SelectItem>
                                    {schools?.schools?.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Template</Label>
                            <Select value={filters.template} onValueChange={(v) => setFilters({ ...filters, template: v })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Templates</SelectItem>
                                    {templates?.map((t) => (
                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>From Date</Label>
                            <Input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>To Date</Label>
                            <Input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setFilters({
                                search: '',
                                status: 'all',
                                school: 'all',
                                template: 'all',
                                dateFrom: '',
                                dateTo: '',
                            })}
                        >
                            Clear Filters
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{data?.stats?.total?.toLocaleString() || 0}</div>
                        <p className="text-sm text-muted-foreground">Total SMS</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">{data?.stats?.delivered?.toLocaleString() || 0}</div>
                        <p className="text-sm text-muted-foreground">Delivered</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-blue-600">{data?.stats?.sent?.toLocaleString() || 0}</div>
                        <p className="text-sm text-muted-foreground">Sent</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">{data?.stats?.failed?.toLocaleString() || 0}</div>
                        <p className="text-sm text-muted-foreground">Failed</p>
                    </CardContent>
                </Card>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>SMS Log Entries</CardTitle>
                    <CardDescription>
                        Showing {logs.length} of {data?.total || 0} records
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No SMS logs found
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>School</TableHead>
                                            <TableHead>Template</TableHead>
                                            <TableHead className="text-right">Recipients</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Message Preview</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => {
                                            const statusConfig = STATUS_CONFIG[log.status] || STATUS_CONFIG.PENDING;
                                            const StatusIcon = statusConfig.icon;

                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="whitespace-nowrap">
                                                        <div>
                                                            <p className="font-medium">{new Date(log.createdAt).toLocaleDateString()}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {new Date(log.createdAt).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="font-medium truncate max-w-[150px]">{log.schoolName || '-'}</p>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{log.templateName || '-'}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">{log.recipients?.length || 0}</TableCell>
                                                    <TableCell className="text-right font-medium">{log.cost}</TableCell>
                                                    <TableCell>
                                                        <Badge className={statusConfig.color}>
                                                            <StatusIcon className="h-3 w-3 mr-1" />
                                                            {statusConfig.label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <p className="truncate max-w-[200px] text-sm text-muted-foreground">
                                                            {log.message?.substring(0, 50)}...
                                                        </p>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-muted-foreground">
                                    Page {page} of {totalPages}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                    >
                                        Next
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
