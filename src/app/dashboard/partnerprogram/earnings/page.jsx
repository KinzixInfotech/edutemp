// app/partnerprogram/earnings/page.jsx
'use client';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
    DollarSign, TrendingUp, CreditCard,
    History, ArrowUpRight, Wallet, AlertCircle
} from "lucide-react";
import { motion } from "framer-motion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PartnerEarnings() {
    const { fullUser } = useAuth();
    const [partnerId] = useState(fullUser?.id); // Handle both cases

    // Fetch earnings data
    const { data: earningsData, isLoading: loading } = useQuery({
        queryKey: ['partner-earnings', partnerId],
        queryFn: async () => {
            const res = await axios.get(`/api/partners/earnings?partnerId=${partnerId}`);
            return res.data;
        },
        enabled: !!partnerId,
    });

    const stats = earningsData || {};
    const transactions = stats.transactions || [];

    const handleRequestPayout = () => {
        // Placeholder for payout request logic
        if ((stats.availableBalance || 0) < 1000) {
            toast.error("Minimum withdrawal amount is ₹1,000");
            return;
        }
        toast.success("Payout Requested", {
            description: "Your request has been submitted for processing."
        });
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Earnings & Payouts</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your revenue and withdrawal history
                    </p>
                </div>
                <Button onClick={handleRequestPayout} className="gap-2">
                    <Wallet className="h-4 w-4" />
                    Request Payout
                </Button>
            </motion.div>

            {/* Stats Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-4 md:grid-cols-3"
            >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    ₹{(stats.totalEarnings || 0).toLocaleString('en-IN')}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Lifetime earnings
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available for Payout</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold text-green-600">
                                    ₹{(stats.availableBalance || 0).toLocaleString('en-IN')}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Min. withdrawal: ₹1,000
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Last Payout</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Skeleton className="h-8 w-20" />
                        ) : (
                            <>
                                <div className="text-2xl font-bold">
                                    {stats.lastPayout ? `₹${stats.lastPayout.amount.toLocaleString('en-IN')}` : '₹0'}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {stats.lastPayout
                                        ? `Processed on ${format(new Date(stats.lastPayout.date), 'MMM d, yyyy')}`
                                        : 'No payouts yet'}
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </motion.div>

            {/* Transaction History */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Transaction History</CardTitle>
                                <CardDescription>
                                    Recent commissions and payouts
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="gap-2">
                                <History className="h-4 w-4" />
                                View All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">
                                            Loading transactions...
                                        </TableCell>
                                    </TableRow>
                                ) : transactions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                            No transactions found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(new Date(tx.date), 'MMM d, yyyy')}</TableCell>
                                            <TableCell className="font-medium">{tx.description}</TableCell>
                                            <TableCell>
                                                <Badge variant={tx.type === 'PAYOUT' ? 'secondary' : 'outline'}>
                                                    {tx.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        tx.status === 'COMPLETED' || tx.status === 'PAID' || tx.status === 'PROCESSED'
                                                            ? 'text-green-600 border-green-600'
                                                            : 'text-yellow-600 border-yellow-600'
                                                    }
                                                >
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className={`text-right font-bold ${tx.type === 'PAYOUT' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {tx.type === 'PAYOUT' ? '-' : '+'}₹{tx.amount.toLocaleString('en-IN')}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}
