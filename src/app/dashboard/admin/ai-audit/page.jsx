'use client';

/**
 * AI Audit Page
 * Admin-only page to view AI usage logs and costs
 */

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Sparkles, Download, RefreshCw, ChevronLeft, ChevronRight, DollarSign, Cpu, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import LoaderPage from '@/components/loader-page';

const supabase = createClientComponentClient();

// Fetch AI usage logs
async function fetchAiUsage({ schoolId, limit, offset, startDate, endDate }) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('Not authenticated');
    }

    const params = new URLSearchParams({
        schoolId,
        limit: limit.toString(),
        offset: offset.toString(),
    });

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`/api/admin/ai-usage?${params}`, {
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
        },
    });

    if (!response.ok) {
        throw new Error('Failed to fetch AI usage logs');
    }

    return response.json();
}

export default function AiAuditPage() {
    const { fullUser, loading } = useAuth();
    const [limit] = useState(20);
    const [offset, setOffset] = useState(0);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const schoolId = fullUser?.schoolId;

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['aiUsage', schoolId, limit, offset, startDate, endDate],
        queryFn: () => fetchAiUsage({ schoolId, limit, offset, startDate, endDate }),
        enabled: !!schoolId,
        staleTime: 60 * 1000, // 1 minute
    });

    // Check authorization
    if (loading) return <LoaderPage />;

    const allowedRoles = ['ADMIN', 'SUPER_ADMIN'];
    if (!fullUser || !allowedRoles.includes(fullUser.role?.name)) {
        return (
            <div className="p-6">
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="pt-6">
                        <p className="text-red-600 dark:text-red-400">
                            Access denied. Admin role required.
                        </p>
                        <Link href="/dashboard">
                            <Button variant="outline" className="mt-4">
                                Back to Dashboard
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const handleExportCSV = () => {
        if (!data?.logs) return;

        const headers = ['Date', 'Feature', 'Model', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Cost (USD)', 'User', 'Cached'];
        const rows = data.logs.map(log => [
            new Date(log.date).toLocaleString(),
            log.feature,
            log.model,
            log.inputTokens || 0,
            log.outputTokens || 0,
            log.totalTokens || 0,
            log.costUsd?.toFixed(6) || '0',
            log.userName,
            log.cached ? 'Yes' : 'No',
        ]);

        const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-usage-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50">
                        <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Audit</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Monitor AI usage and costs</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data?.logs?.length}>
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-purple-200 dark:border-purple-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">Total Calls</CardTitle>
                        <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {isLoading ? '...' : data?.summary?.totalCalls || 0}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Tokens</CardTitle>
                        <Cpu className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {isLoading ? '...' : (data?.summary?.totalTokens || 0).toLocaleString()}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Total Cost</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                            ${isLoading ? '...' : (data?.summary?.totalCost || 0).toFixed(4)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">Filters</CardTitle>
                </CardHeader>
                <CardContent className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">From:</label>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => { setStartDate(e.target.value); setOffset(0); }}
                            className="w-40"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">To:</label>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => { setEndDate(e.target.value); setOffset(0); }}
                            className="w-40"
                        />
                    </div>
                    {(startDate || endDate) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setStartDate(''); setEndDate(''); setOffset(0); }}
                        >
                            Clear Filters
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Usage Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Usage Logs</CardTitle>
                    <CardDescription>
                        Showing {data?.logs?.length || 0} of {data?.pagination?.total || 0} records
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                        </div>
                    ) : error ? (
                        <p className="text-red-500 text-center py-8">{error.message}</p>
                    ) : !data?.logs?.length ? (
                        <p className="text-gray-500 text-center py-8">No AI usage logs found.</p>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Feature</TableHead>
                                            <TableHead>Model</TableHead>
                                            <TableHead className="text-right">Tokens</TableHead>
                                            <TableHead className="text-right">Cost</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.logs.map((log) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-sm">
                                                    {new Date(log.date).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                        {log.feature}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500">{log.model}</TableCell>
                                                <TableCell className="text-right font-mono text-sm">
                                                    {(log.totalTokens || 0).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-sm text-green-600 dark:text-green-400">
                                                    ${(log.costUsd || 0).toFixed(6)}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <div className="flex flex-col">
                                                        <span>{log.userName}</span>
                                                        <span className="text-xs text-gray-400">{log.userRole}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {log.cached ? (
                                                        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                                            Cached
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                                            Fresh
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm text-gray-500">
                                    Page {Math.floor(offset / limit) + 1} of {Math.ceil((data.pagination?.total || 0) / limit)}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOffset(Math.max(0, offset - limit))}
                                        disabled={offset === 0}
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setOffset(offset + limit)}
                                        disabled={!data.pagination?.hasMore}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4" />
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
