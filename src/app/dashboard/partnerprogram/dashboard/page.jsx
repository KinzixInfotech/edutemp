// app/partnerprogram/dashboard/page.jsx
'use client';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
    TrendingUp, Users, DollarSign, School,
    AlertCircle, Calendar, ArrowUpRight, Target
} from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PartnerDashboard() {
    const { fullUser } = useAuth();
    const [partnerId, setPartnerId] = useState(fullUser?.partner?.id);

    // Fetch dashboard stats
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['partner-stats', partnerId],
        queryFn: async () => {
            const res = await axios.get(`/api/partners/stats?partnerId=${partnerId}`);
            return res.data.stats;
        },
        enabled: !!partnerId,
    });

    const stats = statsData || {};

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col gap-4"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Partner Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Welcome back, {fullUser?.name}
                        </p>
                    </div>
                    <Badge className="text-sm px-4 py-2">
                        {stats.partner?.level || 'SILVER'} Partner
                    </Badge>
                </div>
            </motion.div>

            {/* Stats Overview */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">{stats.overview?.totalLeads || 0}</div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.overview?.conversionRate || 0}% conversion rate
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Schools Onboarded</CardTitle>
                        <School className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-green-600">
                                    {stats.overview?.schoolsOnboarded || 0}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.overview?.upcomingRenewals || 0} renewals this month
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    ₹{(stats.financial?.totalCommission || 0).toLocaleString('en-IN')}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    ₹{(stats.financial?.recentEarnings || 0).toLocaleString('en-IN')} last 30 days
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-orange-600">
                                    ₹{(stats.financial?.pendingPayout || 0).toLocaleString('en-IN')}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.partner?.commissionRate || 0}% commission rate
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Performance Graph */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Monthly Performance</CardTitle>
                        <CardDescription>
                            Commission earnings over the last 6 months
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <Skeleton className="h-[300px] w-full" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={stats.performanceGraph || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip
                                        formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="commission"
                                        stroke="#8884d8"
                                        strokeWidth={2}
                                        name="Commission"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        stroke="#82ca9d"
                                        strokeWidth={2}
                                        name="Revenue"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Leads Summary */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid gap-4 md:grid-cols-2"
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Leads by Status</CardTitle>
                        <CardDescription>Current lead distribution</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {statsLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(stats.leads?.byStatus || {}).map(([status, count]) => (
                                    <div key={status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-2 w-2 rounded-full ${status === 'CONVERTED' ? 'bg-green-500' :
                                                    status === 'REJECTED' ? 'bg-red-500' :
                                                        status === 'DEMO_SCHEDULED' ? 'bg-blue-500' :
                                                            'bg-yellow-500'
                                                }`} />
                                            <span className="font-medium">{status.replace('_', ' ')}</span>
                                        </div>
                                        <Badge variant="secondary">{count}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Get started with common tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <a href="/partnerprogram/leads" className="flex items-center justify-between p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Add New Lead</span>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-primary" />
                            </a>

                            <a href="/partnerprogram/schools" className="flex items-center justify-between p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <School className="h-5 w-5 text-primary" />
                                    <span className="font-medium">View Schools</span>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-primary" />
                            </a>

                            <a href="/partnerprogram/earnings" className="flex items-center justify-between p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <DollarSign className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Request Payout</span>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-primary" />
                            </a>

                            <a href="/partnerprogram/resources" className="flex items-center justify-between p-3 bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <Target className="h-5 w-5 text-primary" />
                                    <span className="font-medium">Marketing Tools</span>
                                </div>
                                <ArrowUpRight className="h-4 w-4 text-primary" />
                            </a>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}