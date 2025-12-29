'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
    Loader2,
    MessageSquare,
    TrendingUp,
    Users,
    CreditCard,
    CheckCircle,
    XCircle,
    ArrowUpRight,
} from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const COST_PER_CREDIT = 0.20;

export default function SmsDashboardPage() {
    // Fetch global SMS stats
    const { data: stats, isLoading } = useQuery({
        queryKey: ['sms-admin-dashboard'],
        queryFn: async () => {
            const res = await fetch('/api/sms/admin/dashboard');
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const deliveryRate = stats?.totalSent > 0
        ? ((stats?.delivered || 0) / stats.totalSent * 100).toFixed(1)
        : 0;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">SMS Dashboard</h1>
                <p className="text-muted-foreground mt-2">
                    Global SMS statistics across all schools
                </p>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total SMS Sent</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.totalSent?.toLocaleString() || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">All time</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{deliveryRate}%</div>
                        <Progress value={parseFloat(deliveryRate)} className="mt-2 h-2" />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Schools</CardTitle>
                        <Users className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{stats?.activeSchools || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Schools using SMS</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <CreditCard className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600">
                            ₹{((stats?.totalCreditsUsed || 0) * COST_PER_CREDIT).toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">From SMS usage</p>
                    </CardContent>
                </Card>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Credits Purchased</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stats?.totalCreditsPurchased?.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            ≈ ₹{((stats?.totalCreditsPurchased || 0) * COST_PER_CREDIT).toLocaleString()} collected
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Credits Used</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">
                            {stats?.totalCreditsUsed?.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats?.totalCreditsPurchased > 0
                                ? `${((stats?.totalCreditsUsed / stats.totalCreditsPurchased) * 100).toFixed(0)}% utilized`
                                : '0% utilized'
                            }
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Failed SMS</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">Delivery failures</p>
                    </CardContent>
                </Card>
            </div>

            {/* Top Schools Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Top Sending Schools</CardTitle>
                    <CardDescription>Schools with highest SMS usage this month</CardDescription>
                </CardHeader>
                <CardContent>
                    {stats?.topSchools?.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            No SMS activity yet
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>School</TableHead>
                                    <TableHead className="text-right">SMS Sent</TableHead>
                                    <TableHead className="text-right">Credits Used</TableHead>
                                    <TableHead className="text-right">Balance</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats?.topSchools?.map((school, idx) => (
                                    <TableRow key={school.id || idx}>
                                        <TableCell className="font-medium">{school.name}</TableCell>
                                        <TableCell className="text-right">{school.smsSent?.toLocaleString() || 0}</TableCell>
                                        <TableCell className="text-right">{school.creditsUsed?.toLocaleString() || 0}</TableCell>
                                        <TableCell className="text-right">
                                            <span className={school.balance < 10 ? 'text-red-600 font-bold' : ''}>
                                                {school.balance?.toLocaleString() || 0}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={school.balance > 0 ? 'default' : 'destructive'}>
                                                {school.balance > 0 ? 'Active' : 'Low Balance'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
