"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Loader2,
    DollarSign,
    CheckCircle2,
    Clock,
    Filter,
    Download,
    Settings,
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LibraryFinesPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [statusFilter, setStatusFilter] = useState("ALL");
    const [dateRange, setDateRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [fineSettings, setFineSettings] = useState({
        finePerDay: 5,
        maxBooksStudent: 3,
        maxBooksTeacher: 5,
        issueDaysStudent: 14,
        issueDaysTeacher: 30,
    });

    // Fetch Fines Data
    const { data, isLoading, isError } = useQuery({
        queryKey: ["library-fines", schoolId, statusFilter, dateRange],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (statusFilter !== "ALL") params.append("status", statusFilter);
            if (dateRange.startDate) params.append("startDate", dateRange.startDate);
            if (dateRange.endDate) params.append("endDate", dateRange.endDate);

            const res = await axios.get(
                `/api/schools/${schoolId}/library/fines?${params.toString()}`
            );
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Settings Data
    const { data: settingsData, isLoading: isSettingsLoading } = useQuery({
        queryKey: ["library-settings", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/library/settings`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Update local settings state when data is fetched
    React.useEffect(() => {
        if (settingsData) {
            setFineSettings({
                finePerDay: settingsData.finePerDay || 5,
                maxBooksStudent: settingsData.maxBooksStudent || 3,
                maxBooksTeacher: settingsData.maxBooksTeacher || 5,
                issueDaysStudent: settingsData.issueDaysStudent || 14,
                issueDaysTeacher: settingsData.issueDaysTeacher || 30,
            });
        }
    }, [settingsData]);

    // Update Settings Mutation
    const updateSettingsMutation = useMutation({
        mutationFn: async (newSettings) => {
            await axios.put(`/api/schools/${schoolId}/library/settings`, newSettings);
        },
        onSuccess: () => {
            toast.success("Library settings updated successfully");
            queryClient.invalidateQueries(["library-settings"]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || "Failed to update settings");
        },
    });

    // Mark as Paid Mutation
    const markAsPaidMutation = useMutation({
        mutationFn: async (transactionId) => {
            await axios.put(`/api/schools/${schoolId}/library/fines`, {
                transactionId,
            });
        },
        onSuccess: () => {
            toast.success("Fine marked as paid");
            queryClient.invalidateQueries(["library-fines"]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || "Failed to update fine status");
        },
    });

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="p-6 text-center text-red-500">
                Failed to load fines data. Please try again.
            </div>
        );
    }

    const stats = data?.stats || { total: 0, collected: 0, pending: 0 };
    const transactions = data?.transactions || [];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Fines & Reports</h1>
                    <p className="text-muted-foreground mt-2">
                        Track library fines, payments, and configure settings
                    </p>
                </div>
                <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                </Button>
            </div>

            <Tabs defaultValue="reports" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="reports">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Fines & Reports
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings className="h-4 w-4 mr-2" />
                        Fine Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="reports" className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Fines Generated
                                </CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ₹{stats.total.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Collected Fines
                                </CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    ₹{stats.collected.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Pending Fines</CardTitle>
                                <Clock className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-red-600">
                                    ₹{stats.pending.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="space-y-2 flex-1">
                                    <Label>Status</Label>
                                    <Select
                                        value={statusFilter}
                                        onValueChange={setStatusFilter}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Transactions</SelectItem>
                                            <SelectItem value="PAID">Paid</SelectItem>
                                            <SelectItem value="UNPAID">Unpaid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label>Start Date</Label>
                                    <Input
                                        type="date"
                                        value={dateRange.startDate}
                                        onChange={(e) =>
                                            setDateRange({ ...dateRange, startDate: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label>End Date</Label>
                                    <Input
                                        type="date"
                                        value={dateRange.endDate}
                                        onChange={(e) =>
                                            setDateRange({ ...dateRange, endDate: e.target.value })
                                        }
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setStatusFilter("ALL");
                                        setDateRange({ startDate: "", endDate: "" });
                                    }}
                                >
                                    Reset Filters
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Transactions Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Fine Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="text-center text-muted-foreground py-8">
                                    No fine records found matching your filters
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date</TableHead>
                                            <TableHead>User</TableHead>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Fine Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((tx) => (
                                            <TableRow key={tx.id}>
                                                <TableCell>
                                                    {tx.returnDate
                                                        ? format(new Date(tx.returnDate), "MMM dd, yyyy")
                                                        : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">ID: {tx.userId}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {tx.userType}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {tx.copy?.book?.title}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Acc: {tx.copy?.accessionNumber}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    ₹{tx.fineAmount}
                                                </TableCell>
                                                <TableCell>
                                                    {tx.finePaid ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-green-50 text-green-700 border-green-200"
                                                        >
                                                            Paid
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="bg-red-50 text-red-700 border-red-200"
                                                        >
                                                            Unpaid
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {!tx.finePaid && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => markAsPaidMutation.mutate(tx.id)}
                                                            disabled={markAsPaidMutation.isPending}
                                                        >
                                                            {markAsPaidMutation.isPending ? (
                                                                <Loader2 className="h-3 w-3 animate-spin" />
                                                            ) : (
                                                                "Mark Paid"
                                                            )}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings">
                    <Card>
                        <CardHeader>
                            <CardTitle>Library Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isSettingsLoading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Fine Amount Per Day (₹)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={fineSettings.finePerDay}
                                                onChange={(e) =>
                                                    setFineSettings({
                                                        ...fineSettings,
                                                        finePerDay: parseFloat(e.target.value),
                                                    })
                                                }
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Amount charged per day for overdue books
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Max Books (Student)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={fineSettings.maxBooksStudent}
                                                onChange={(e) =>
                                                    setFineSettings({
                                                        ...fineSettings,
                                                        maxBooksStudent: parseInt(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Max Books (Teacher)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={fineSettings.maxBooksTeacher}
                                                onChange={(e) =>
                                                    setFineSettings({
                                                        ...fineSettings,
                                                        maxBooksTeacher: parseInt(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Issue Duration (Student - Days)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={fineSettings.issueDaysStudent}
                                                onChange={(e) =>
                                                    setFineSettings({
                                                        ...fineSettings,
                                                        issueDaysStudent: parseInt(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Issue Duration (Teacher - Days)</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={fineSettings.issueDaysTeacher}
                                                onChange={(e) =>
                                                    setFineSettings({
                                                        ...fineSettings,
                                                        issueDaysTeacher: parseInt(e.target.value),
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => updateSettingsMutation.mutate(fineSettings)}
                                        disabled={updateSettingsMutation.isPending}
                                    >
                                        {updateSettingsMutation.isPending && (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        Save Settings
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
