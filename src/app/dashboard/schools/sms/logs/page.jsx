'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
    Loader2,
    History,
    CheckCircle,
    XCircle,
    Clock,
    Send,
    MessageSquare,
} from 'lucide-react';

export default function SmsLogsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [statusFilter, setStatusFilter] = useState('all');

    // Fetch logs
    const { data: logsData, isLoading } = useQuery({
        queryKey: ['sms-logs', schoolId, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: '100' });
            if (statusFilter !== 'all') params.set('status', statusFilter);
            const res = await fetch(`/api/schools/${schoolId}/sms/logs?${params}`);
            if (!res.ok) throw new Error('Failed to fetch logs');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const getStatusIcon = (status) => {
        switch (status) {
            case 'SENT':
            case 'DELIVERED':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'FAILED':
                return <XCircle className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'SENT':
            case 'DELIVERED':
                return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
            case 'FAILED':
                return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
            default:
                return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
        }
    };

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SMS Logs</h1>
                <p className="text-muted-foreground mt-2">
                    View all sent SMS messages and their delivery status
                </p>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
                        <Send className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{logsData?.total || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {logsData?.logs?.filter(l => l.status === 'SENT' || l.status === 'DELIVERED').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Failed</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {logsData?.logs?.filter(l => l.status === 'FAILED').length || 0}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                            {logsData?.logs?.reduce((sum, l) => sum + (l.cost || 0), 0).toFixed(2) || 0}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="DELIVERED">Delivered</SelectItem>
                        <SelectItem value="FAILED">Failed</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Message History</CardTitle>
                    <CardDescription>All SMS messages sent from this school</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : logsData?.logs?.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <History className="h-12 w-12 mb-4 opacity-50" />
                            <p>No SMS messages sent yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50">
                                        <th className="px-4 py-3 text-left font-medium">Template</th>
                                        <th className="px-4 py-3 text-left font-medium">Recipients</th>
                                        <th className="px-4 py-3 text-left font-medium">Status</th>
                                        <th className="px-4 py-3 text-left font-medium">Cost</th>
                                        <th className="px-4 py-3 text-left font-medium">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logsData?.logs?.map((log) => (
                                        <tr key={log.id} className="border-b hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{log.template}</div>
                                                <div className="text-xs text-muted-foreground">{log.category}</div>
                                            </td>
                                            <td className="px-4 py-3">{log.recipientCount}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(log.status)}`}>
                                                    {getStatusIcon(log.status)}
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{log.cost}</td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {new Date(log.createdAt).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
