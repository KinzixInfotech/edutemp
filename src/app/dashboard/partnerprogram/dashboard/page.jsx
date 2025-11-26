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
    AlertCircle, Calendar, ArrowUpRight, Target,
    Plus
} from "lucide-react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import EmptyState from "./EmptyState";

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

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-8 space-y-8">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/5 via-primary/10 to-transparent p-6 rounded-2xl border border-primary/10"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                        Partner Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1 text-lg">
                        Welcome back, <span className="font-medium text-foreground">{fullUser?.name}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-sm px-4 py-1.5 border-primary/20 bg-primary/5">
                        ID: {partnerId?.slice(-6).toUpperCase()}
                    </Badge>
                    <Badge className="text-sm px-4 py-1.5 shadow-lg shadow-primary/20">
                        {stats.partner?.level || 'SILVER'} Partner
                    </Badge>
                </div>
            </motion.div>
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-8"
            >
                {/* Stats Overview */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <StatsCard
                        title="Total Leads"
                        icon={Users}
                        loading={statsLoading}
                        value={stats.overview?.totalLeads || 0}
                        subtext={`${stats.overview?.conversionRate || 0}% conversion rate`}
                        trend="neutral"
                    />
                    <StatsCard
                        title="Schools Onboarded"
                        icon={School}
                        loading={statsLoading}
                        value={stats.overview?.schoolsOnboarded || 0}
                        subtext={`${stats.overview?.upcomingRenewals || 0} renewals this month`}
                        trend="up"
                        trendColor="text-green-600"
                    />
                    <StatsCard
                        title="Total Earnings"
                        icon={DollarSign}
                        loading={statsLoading}
                        value={`₹${(stats.financial?.totalCommission || 0).toLocaleString('en-IN')}`}
                        subtext={`₹${(stats.financial?.recentEarnings || 0).toLocaleString('en-IN')} last 30 days`}
                        trend="up"
                    />
                    <StatsCard
                        title="Pending Payout"
                        icon={TrendingUp}
                        loading={statsLoading}
                        value={`₹${(stats.financial?.pendingPayout || 0).toLocaleString('en-IN')}`}
                        subtext={`${stats.partner?.commissionRate || 0}% commission rate`}
                        trend="neutral"
                        valueColor="text-orange-600"
                    />
                </div>

                {/* Performance Graph */}
                <motion.div variants={item}>
                    <Card className="overflow-hidden border-muted/40 shadow-sm">
                        <CardHeader>
                            <CardTitle>Monthly Performance</CardTitle>
                            <CardDescription>
                                Commission earnings over the last 6 months
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {statsLoading ? (
                                <Skeleton className="h-[300px] w-full" />
                            ) : (stats.performanceGraph && stats.performanceGraph.length > 0) ? (
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={stats.performanceGraph}>
                                            <defs>
                                                <linearGradient id="colorCommission" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                            <XAxis
                                                dataKey="month"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                                                tickFormatter={(value) => `₹${value}`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--background))',
                                                    borderColor: 'hsl(var(--border))',
                                                    borderRadius: '8px'
                                                }}
                                                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Commission']}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="commission"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorCommission)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Performance Data"
                                    description="Start referring schools to see your earnings growth here."
                                    icon={TrendingUp}
                                />
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Leads & Actions Grid */}
                <div className="grid gap-8 md:grid-cols-2">
                    {/* Leads Summary */}
                    <motion.div variants={item}>
                        <Card className="h-full border-muted/40 shadow-sm flex flex-col">
                            <CardHeader>
                                <CardTitle>Leads by Status</CardTitle>
                                <CardDescription>Current lead distribution</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                {statsLoading ? (
                                    <div className="space-y-2">
                                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Always show these rows to keep dashboard filled, merging with actual data */}
                                        {[
                                            { status: 'PENDING', label: 'Pending', color: 'bg-yellow-500 shadow-yellow-500/50' },
                                            { status: 'DEMO_SCHEDULED', label: 'Demo Scheduled', color: 'bg-blue-500 shadow-blue-500/50' },
                                            { status: 'CONVERTED', label: 'Converted', color: 'bg-green-500 shadow-green-500/50' },
                                            { status: 'REJECTED', label: 'Rejected', color: 'bg-red-500 shadow-red-500/50' }
                                        ].map((item) => {
                                            const count = stats.leads?.byStatus?.[item.status] || 0;
                                            return (
                                                <div key={item.status} className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors border border-transparent hover:border-muted">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-2.5 w-2.5 rounded-full shadow-sm ${item.color}`} />
                                                        <span className="font-medium">{item.label}</span>
                                                    </div>
                                                    <Badge variant="secondary" className="font-mono">{count}</Badge>
                                                </div>
                                            );
                                        })}

                                        {/* Show 'Add Lead' button below the list if total is 0, as a helper but not replacing the list */}
                                        {(!stats.leads?.byStatus || Object.values(stats.leads.byStatus).reduce((a, b) => a + b, 0) === 0) && (
                                            <div className="pt-2">
                                                <a href="/dashboard/partnerprogram/leads" className="block">
                                                    <div className="flex items-center justify-center p-3 border-2 border-dashed border-muted-foreground/20 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                                                        <span className="text-sm font-medium text-muted-foreground group-hover:text-primary flex items-center gap-2">
                                                            <Plus className="h-4 w-4" />
                                                            Add Your First Lead
                                                        </span>
                                                    </div>
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div variants={item}>
                        <Card className="h-full border-muted/40 shadow-sm">
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                                <CardDescription>Get started with common tasks</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <QuickActionCard
                                        href="/dashboard/partnerprogram/leads"
                                        icon={Users}
                                        title="Add New Lead"
                                        description="Register a new prospect"
                                        color="text-blue-500"
                                        bgColor="bg-blue-500/10"
                                    />
                                    <QuickActionCard
                                        href="/dashboard/partnerprogram/schools"
                                        icon={School}
                                        title="View Schools"
                                        description="Manage onboarded schools"
                                        color="text-purple-500"
                                        bgColor="bg-purple-500/10"
                                    />
                                    <QuickActionCard
                                        href="/dashboard/partnerprogram/earnings"
                                        icon={DollarSign}
                                        title="Request Payout"
                                        description="Withdraw your earnings"
                                        color="text-green-500"
                                        bgColor="bg-green-500/10"
                                    />
                                    <QuickActionCard
                                        href="/dashboard/partnerprogram/resources"
                                        icon={Target}
                                        title="Marketing Tools"
                                        description="Access promotional assets"
                                        color="text-orange-500"
                                        bgColor="bg-orange-500/10"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
}

function StatsCard({ title, icon: Icon, loading, value, subtext, trend, trendColor, valueColor }) {
    return (
        <Card className="border-muted/40 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <div className="p-2 bg-primary/5 rounded-lg">
                    <Icon className="h-4 w-4 text-primary" />
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                ) : (
                    <>
                        <div className={`text-2xl font-bold ${valueColor || ''}`}>{value}</div>
                        <p className={`text-xs mt-1 ${trendColor || 'text-muted-foreground'}`}>
                            {subtext}
                        </p>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function QuickActionCard({ href, icon: Icon, title, description, color, bgColor }) {
    return (
        <a href={href} className="block group">
            <div className="h-full p-4 rounded-xl border border-transparent bg-muted/30 hover:bg-muted/50 hover:border-muted transition-all duration-200">
                <div className="flex items-start gap-4">
                    <div className={`p-2.5 rounded-lg ${bgColor} ${color} group-hover:scale-110 transition-transform duration-200`}>
                        <Icon className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">
                            {title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                            {description}
                        </p>
                    </div>
                </div>
            </div>
        </a>
    );
}