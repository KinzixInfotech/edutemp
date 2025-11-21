// app/partnerprogram/schools/page.jsx
'use client';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import {
    School, Calendar, DollarSign, TrendingUp,
    AlertCircle, CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";

export default function PartnerSchools() {
    const { fullUser } = useAuth();
    const [partnerId] = useState(fullUser?.partner?.id);

    // Fetch schools
    const { data: schoolsData, isLoading: loading } = useQuery({
        queryKey: ['partner-schools', partnerId],
        queryFn: async () => {
            const res = await axios.get(`/api/partners/schools?partnerId=${partnerId}`);
            return res.data;
        },
        enabled: !!partnerId,
    });

    const schools = schoolsData?.schools || [];

    const isNearRenewal = (renewalDate) => {
        const renewal = new Date(renewalDate);
        const today = new Date();
        const daysUntilRenewal = Math.floor((renewal - today) / (1000 * 60 * 60 * 24));
        return daysUntilRenewal <= 30 && daysUntilRenewal >= 0;
    };

    return (
        <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold tracking-tight">Schools Onboarded</h1>
                <p className="text-muted-foreground mt-1">
                    Schools you have successfully referred
                </p>
            </motion.div>

            {/* Summary Cards */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid gap-4 md:grid-cols-3"
            >
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Schools</CardTitle>
                        <School className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{schools.length}</div>
                        <p className="text-xs text-muted-foreground">
                            Active partnerships
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ₹{schools.reduce((acc, s) => acc + (s.subscriptionAmount || 0), 0).toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Generated revenue
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commission Earned</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            ₹{schools.reduce((acc, s) => acc + (s.commissionAmount || 0), 0).toLocaleString('en-IN')}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total earned
                        </p>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Schools Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>School Details</CardTitle>
                        <CardDescription>
                            View all schools onboarded through your referrals
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>School Name</TableHead>
                                        <TableHead>Onboarded Date</TableHead>
                                        <TableHead>Subscription Plan</TableHead>
                                        <TableHead>Revenue</TableHead>
                                        <TableHead>Commission</TableHead>
                                        <TableHead>Renewal Date</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array(5).fill(0).map((_, index) => (
                                            <TableRow key={index}>
                                                <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                                            </TableRow>
                                        ))
                                    ) : schools.length > 0 ? (
                                        schools.map((school, index) => (
                                            <motion.tr
                                                key={school.id}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className="group hover:bg-muted/50 transition-colors"
                                            >
                                                <TableCell className="font-medium">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{school.school?.name || 'N/A'}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(school.onboardedAt).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{school.subscriptionPlan}</Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    ₹{(school.subscriptionAmount || 0).toLocaleString('en-IN')}
                                                </TableCell>
                                                <TableCell className="font-medium text-green-600">
                                                    ₹{(school.commissionAmount || 0).toLocaleString('en-IN')}
                                                    <div className="text-xs text-muted-foreground">
                                                        ({school.commissionRate}%)
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-muted-foreground" />
                                                        {new Date(school.renewalDate).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    {isNearRenewal(school.renewalDate) && (
                                                        <Badge variant="destructive" className="mt-1 text-xs">
                                                            Due Soon
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {school.isActive ? (
                                                        <Badge className="bg-green-500 text-white gap-1">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="destructive">
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12">
                                                <div className="flex flex-col items-center gap-2">
                                                    <AlertCircle className="h-12 w-12 text-muted-foreground" />
                                                    <p className="text-muted-foreground">No schools onboarded yet</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Start adding leads to build your portfolio
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}