"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import {
    Plus,
    RefreshCw,
    Bucket,
    Edit,
    Trash2,
    Calendar,
    FileText,
    Clock,
    CheckCircle,
    Users
} from "lucide-react";
import { toast } from "sonner";

const leaveTypes = [
    { value: "CASUAL", label: "Casual Leave", color: "bg-blue-500" },
    { value: "SICK", label: "Sick Leave", color: "bg-red-500" },
    { value: "EARNED", label: "Earned Leave", color: "bg-green-500" },
    { value: "MATERNITY", label: "Maternity Leave", color: "bg-pink-500" },
    { value: "PATERNITY", label: "Paternity Leave", color: "bg-purple-500" },
    { value: "EMERGENCY", label: "Emergency Leave", color: "bg-orange-500" },
    { value: "UNPAID", label: "Unpaid Leave", color: "bg-gray-500" },
    { value: "COMPENSATORY", label: "Compensatory Off", color: "bg-cyan-500" },
];

const getLeaveTypeLabel = (type) => {
    return leaveTypes.find(l => l.value === type)?.label || type;
};

const getLeaveTypeColor = (type) => {
    return leaveTypes.find(l => l.value === type)?.color || "bg-gray-500";
};

export default function LeaveBucketsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [showDialog, setShowDialog] = useState(false);
    const [editBucket, setEditBucket] = useState(null);
    const [formData, setFormData] = useState({
        leaveType: "",
        yearlyLimit: 12,
        monthlyLimit: "",
        carryForwardLimit: 0,
        encashmentLimit: 0,
        encashmentPerDayRate: "",
        applicableToTeaching: true,
        applicableToNonTeaching: true,
    });

    // Fetch leave buckets (API auto-fetches current academic year)
    const { data: buckets, isLoading, refetch } = useQuery({
        queryKey: ["leave-buckets", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/leave-buckets`);
            if (!res.ok) throw new Error("Failed to fetch leave buckets");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Create/Update mutation
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/leave-buckets`, {
                method: editBucket ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editBucket ? { id: editBucket.id, ...data } : data)
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save bucket");
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success(editBucket ? "Bucket updated" : "Bucket created");
            queryClient.invalidateQueries(["leave-buckets"]);
            setShowDialog(false);
            setEditBucket(null);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/schools/${schoolId}/attendance/leave-buckets?id=${id}`, {
                method: "DELETE"
            });
            if (!res.ok) throw new Error("Failed to delete bucket");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Bucket deleted");
            queryClient.invalidateQueries(["leave-buckets"]);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();

        saveMutation.mutate({
            ...formData,
            yearlyLimit: parseInt(formData.yearlyLimit) || 0,
            monthlyLimit: formData.monthlyLimit ? parseInt(formData.monthlyLimit) : null,
            carryForwardLimit: parseInt(formData.carryForwardLimit) || 0,
            encashmentLimit: parseInt(formData.encashmentLimit) || 0,
            encashmentPerDayRate: formData.encashmentPerDayRate ? parseFloat(formData.encashmentPerDayRate) : null,
        });
    };

    const openEdit = (bucket) => {
        setEditBucket(bucket);
        setFormData({
            leaveType: bucket.leaveType,
            yearlyLimit: bucket.yearlyLimit,
            monthlyLimit: bucket.monthlyLimit || "",
            carryForwardLimit: bucket.carryForwardLimit || 0,
            encashmentLimit: bucket.encashmentLimit || 0,
            encashmentPerDayRate: bucket.encashmentPerDayRate || "",
            applicableToTeaching: bucket.applicableToTeaching,
            applicableToNonTeaching: bucket.applicableToNonTeaching,
        });
        setShowDialog(true);
    };

    const openCreate = () => {
        setEditBucket(null);
        setFormData({
            leaveType: "",
            yearlyLimit: 12,
            monthlyLimit: "",
            carryForwardLimit: 0,
            encashmentLimit: 0,
            encashmentPerDayRate: "",
            applicableToTeaching: true,
            applicableToNonTeaching: true,
        });
        setShowDialog(true);
    };

    if (!schoolId) {
        return (
            <div className="p-6">
                <Card><CardContent className="p-6"><p className="text-muted-foreground">Loading...</p></CardContent></Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header - Consistent with Noticeboard */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Calendar className="w-6 h-6 text-primary" />
                        Leave Buckets
                    </h1>
                    <p className="text-muted-foreground">Configure leave limits for each leave type</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Bucket
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Consistent with Noticeboard */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Buckets</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{buckets?.length || 0}</div>
                        <p className="text-xs text-muted-foreground">Configured leave types</p>
                    </CardContent>
                </Card>
                {leaveTypes.slice(0, 3).map(type => {
                    const bucket = buckets?.find(b => b.leaveType === type.value);
                    return (
                        <Card key={type.value}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{type.label}</CardTitle>
                                <div className={`w-3 h-3 rounded-full ${type.color}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {bucket ? bucket.yearlyLimit : 12}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {bucket ? 'days per year' : 'days (default)'}
                                </p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Buckets Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Leave Bucket Configuration</CardTitle>
                    <CardDescription>Define yearly and monthly limits for each leave type</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                        </div>
                    ) : buckets?.length > 0 ? (
                        <div className="border rounded-xl overflow-hidden bg-white dark:bg-card shadow-sm">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="px-4 font-semibold text-foreground">Leave Type</TableHead>
                                        <TableHead className="font-semibold text-foreground">Yearly Limit</TableHead>
                                        <TableHead className="font-semibold text-foreground">Monthly Limit</TableHead>
                                        <TableHead className="font-semibold text-foreground text-center">Carry Forward</TableHead>
                                        <TableHead className="font-semibold text-foreground">Encashment</TableHead>
                                        <TableHead className="font-semibold text-foreground">Applicable To</TableHead>
                                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                                        <TableHead className="text-right px-4 font-semibold text-foreground">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {buckets.map(bucket => (
                                        <TableRow key={bucket.id} className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                                            <TableCell className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${getLeaveTypeColor(bucket.leaveType)} shadow-sm`} />
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-sm text-foreground">{getLeaveTypeLabel(bucket.leaveType)}</span>
                                                        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">System Type</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-sm text-foreground">{bucket.yearlyLimit} days</span>
                                                    <span className="text-[10px] text-muted-foreground font-medium uppercase">per academic year</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {bucket.monthlyLimit ? (
                                                    <Badge variant="secondary" className="bg-muted/50 text-foreground font-bold border-none px-2 py-0.5 text-[10px]">
                                                        {bucket.monthlyLimit} days/mo
                                                    </Badge>
                                                ) : <span className="text-muted-foreground text-xs italic">No cap</span>}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {bucket.carryForwardLimit > 0 ? (
                                                    <span className="font-bold text-sm text-primary">{bucket.carryForwardLimit} <span className="text-[10px] text-muted-foreground font-medium">days</span></span>
                                                ) : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                {bucket.encashmentLimit > 0 ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-foreground">{bucket.encashmentLimit} days max</span>
                                                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">₹{bucket.encashmentPerDayRate || 0}/day</span>
                                                    </div>
                                                ) : <span className="text-muted-foreground text-xs">—</span>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1.5 min-w-[120px]">
                                                    {bucket.applicableToTeaching && (
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-primary/5 border-primary/20 text-primary px-1.5 py-0">
                                                            Teaching
                                                        </Badge>
                                                    )}
                                                    {bucket.applicableToNonTeaching && (
                                                        <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider bg-orange-50 border-orange-200 text-orange-700 px-1.5 py-0">
                                                            Staff
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`${bucket.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"} text-[10px] font-bold uppercase px-2 py-0.5`}>
                                                    {bucket.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right px-4">
                                                <div className="flex gap-1 justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" onClick={() => openEdit(bucket)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 transition-colors"
                                                        onClick={() => deleteMutation.mutate(bucket.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <Calendar className="mx-auto h-12 w-12 mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No Leave Buckets Configured</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                                System is using default values. Create custom buckets to override these defaults.
                            </p>

                            {/* Default Configuration Table */}
                            <div className="border rounded-lg max-w-md mx-auto mb-6 text-left">
                                <div className="bg-muted/50 px-4 py-2 font-medium text-sm">Default Leave Limits</div>
                                <div className="divide-y">
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span className="text-sm">Casual Leave</span>
                                        </div>
                                        <span className="font-medium">12 days/year</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <span className="text-sm">Sick Leave</span>
                                        </div>
                                        <span className="font-medium">10 days/year</span>
                                    </div>
                                    <div className="flex items-center justify-between px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <span className="text-sm">Earned Leave</span>
                                        </div>
                                        <span className="font-medium">15 days/year</span>
                                    </div>
                                </div>
                            </div>

                            <Button onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" /> Add Custom Bucket
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editBucket ? "Edit Leave Bucket" : "Add Leave Bucket"}</DialogTitle>
                        <DialogDescription>
                            Configure leave limits and rules for a leave type
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6 py-4">
                            {!editBucket && (
                                <div className="space-y-2">
                                    <Label>Leave Type *</Label>
                                    <Select
                                        value={formData.leaveType}
                                        onValueChange={(val) => setFormData(prev => ({ ...prev, leaveType: val }))}
                                        required
                                    >
                                        <SelectTrigger className="mt-1.5 focus:ring-primary/20 transition-all">
                                            <SelectValue placeholder="Select leave type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {leaveTypes.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${type.color}`} />
                                                        {type.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Yearly Limit (days) *</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="mt-1.5 focus:ring-primary/20 transition-all"
                                        value={formData.yearlyLimit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, yearlyLimit: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Monthly Limit (days)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="Optional"
                                        className="mt-1.5 focus:ring-primary/20 transition-all"
                                        value={formData.monthlyLimit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, monthlyLimit: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Carry Forward Limit</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="mt-1.5 focus:ring-primary/20 transition-all"
                                        value={formData.carryForwardLimit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, carryForwardLimit: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-1">Max days to carry forward</p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Encashment Limit</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        className="mt-1.5 focus:ring-primary/20 transition-all"
                                        value={formData.encashmentLimit}
                                        onChange={(e) => setFormData(prev => ({ ...prev, encashmentLimit: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-1">Max days encashable</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Encashment Rate (₹ per day)</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Optional"
                                    className="mt-1.5 focus:ring-primary/20 transition-all"
                                    value={formData.encashmentPerDayRate}
                                    onChange={(e) => setFormData(prev => ({ ...prev, encashmentPerDayRate: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-5 pt-4 border-t border-border/50">
                                <div className="flex flex-col gap-1">
                                    <Label className="text-sm">Applicable To</Label>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight">Select staff categories eligible for this leave</p>
                                </div>
                                <div className="flex items-center justify-between py-2 border rounded-lg px-4 bg-muted/20">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground">Teaching Staff</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">Teachers & Academic Staff</span>
                                    </div>
                                    <Switch
                                        checked={formData.applicableToTeaching}
                                        onCheckedChange={(val) => setFormData(prev => ({ ...prev, applicableToTeaching: val }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-2 border rounded-lg px-4 bg-muted/20">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground">Non-Teaching Staff</span>
                                        <span className="text-[10px] text-muted-foreground font-medium">Admin & Support Staff</span>
                                    </div>
                                    <Switch
                                        checked={formData.applicableToNonTeaching}
                                        onCheckedChange={(val) => setFormData(prev => ({ ...prev, applicableToNonTeaching: val }))}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
                            <Button type="submit" disabled={saveMutation.isPending}>
                                {saveMutation.isPending ? "Saving..." : editBucket ? "Update" : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
