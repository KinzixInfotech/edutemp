"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, Clock, AlertCircle, Plus, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AccountantDashboard() {
    const [stats, setStats] = useState({
        totalCollected: 0,
        pendingPayments: 0,
        overdueFees: 0,
        monthlyRevenue: 0,
    });

    const [recentTransactions, setRecentTransactions] = useState([]);

    useEffect(() => {
        // TODO: Fetch actual stats from API
        setStats({
            totalCollected: 125000,
            pendingPayments: 45,
            overdueFees: 12,
            monthlyRevenue: 85000,
        });

        setRecentTransactions([
            { id: 1, student: "John Doe", amount: 5000, type: "Tuition Fee", time: "10 minutes ago", status: "completed" },
            { id: 2, student: "Jane Smith", amount: 3500, type: "Transport Fee", time: "1 hour ago", status: "completed" },
            { id: 3, student: "Mike Johnson", amount: 2000, type: "Library Fee", time: "2 hours ago", status: "pending" },
        ]);
    }, []);

    const StatCard = ({ title, value, icon: Icon, color, prefix = "" }) => (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className={`h-4 w-4 ${color}`} />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Accountant Dashboard</h1>
                    <p className="text-muted-foreground">Manage school finances and fee collection</p>
                </div>
                <Link href="/dashboard/fees/payments">
                    <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Payment
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Collected"
                    value={stats.totalCollected}
                    icon={DollarSign}
                    color="text-green-600"
                    prefix="₹"
                />
                <StatCard
                    title="Pending Payments"
                    value={stats.pendingPayments}
                    icon={Clock}
                    color="text-yellow-600"
                />
                <StatCard
                    title="Overdue Fees"
                    value={stats.overdueFees}
                    icon={AlertCircle}
                    color="text-red-600"
                />
                <StatCard
                    title="Monthly Revenue"
                    value={stats.monthlyRevenue}
                    icon={TrendingUp}
                    color="text-blue-600"
                    prefix="₹"
                />
            </div>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Link href="/dashboard/fees/payments">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <DollarSign className="h-6 w-6" />
                            <span>Record Payment</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/fees/manage-fee-structure">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <Receipt className="h-6 w-6" />
                            <span>Fee Structure</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/fees/reports">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <TrendingUp className="h-6 w-6" />
                            <span>View Reports</span>
                        </Button>
                    </Link>
                    <Link href="/dashboard/fees/overdue">
                        <Button variant="outline" className="w-full h-20 flex flex-col gap-2">
                            <AlertCircle className="h-6 w-6" />
                            <span>Overdue Fees</span>
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentTransactions.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="flex items-start justify-between border-b pb-4 last:border-0"
                            >
                                <div className="space-y-1 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{transaction.student}</span>
                                        <Badge variant={transaction.status === "completed" ? "default" : "secondary"}>
                                            {transaction.status}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{transaction.type}</p>
                                </div>
                                <div className="text-right space-y-1">
                                    <p className="font-semibold">₹{transaction.amount.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">{transaction.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
