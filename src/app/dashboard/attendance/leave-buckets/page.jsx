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
    Calendar
} from "lucide-react";
import { toast } from "sonner";

const leaveTypes = [
    { value: "CASUAL_LEAVE", label: "Casual Leave", color: "bg-blue-500" },
    { value: "SICK_LEAVE", label: "Sick Leave", color: "bg-red-500" },
    { value: "EARNED_LEAVE", label: "Earned Leave", color: "bg-green-500" },
    { value: "MATERNITY_LEAVE", label: "Maternity Leave", color: "bg-pink-500" },
    { value: "PATERNITY_LEAVE", label: "Paternity Leave", color: "bg-purple-500" },
    { value: "COMPENSATORY_OFF", label: "Compensatory Off", color: "bg-orange-500" },
    { value: "LEAVE_WITHOUT_PAY", label: "Leave Without Pay", color: "bg-gray-500" },
    { value: "OTHER", label: "Other", color: "bg-slate-500" },
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
    const [selectedAcademicYear, setSelectedAcademicYear] = useState("");

    // Fetch academic years
    const { data: academicYears } = useQuery({
        queryKey: ["academic-years", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/academic-years`);
            if (!res.ok) throw new Error("Failed to fetch academic years");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Set default academic year
    const currentAcademicYear = academicYears?.find(y => y.isCurrent);
    if (currentAcademicYear && !selectedAcademicYear) {
        setSelectedAcademicYear(currentAcademicYear.id);
    }

    // Fetch leave buckets
    const { data: buckets, isLoading, refetch } = useQuery({
        queryKey: ["leave-buckets", schoolId, selectedAcademicYear],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedAcademicYear) params.set("academicYearId", selectedAcademicYear);
            const res = await fetch(`/api/schools/${schoolId}/attendance/leave-buckets?${params}`);
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
        const formData = new FormData(e.target);

        saveMutation.mutate({
            academicYearId: formData.get("academicYearId") || selectedAcademicYear,
            leaveType: formData.get("leaveType"),
            yearlyLimit: parseInt(formData.get("yearlyLimit")) || 0,
            monthlyLimit: formData.get("monthlyLimit") ? parseInt(formData.get("monthlyLimit")) : null,
            carryForwardLimit: parseInt(formData.get("carryForwardLimit")) || 0,
            encashmentLimit: parseInt(formData.get("encashmentLimit")) || 0,
            encashmentPerDayRate: formData.get("encashmentPerDayRate") ? parseFloat(formData.get("encashmentPerDayRate")) : null,
            applicableToTeaching: formData.get("applicableToTeaching") === "on",
            applicableToNonTeaching: formData.get("applicableToNonTeaching") === "on",
        });
    };

    const openEdit = (bucket) => {
        setEditBucket(bucket);
        setShowDialog(true);
    };

    const openCreate = () => {
        setEditBucket(null);
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Leave Buckets</h1>
                    <p className="text-muted-foreground">Configure leave limits for each leave type per academic year</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                        <SelectTrigger className="w-48">
                            <SelectValue placeholder="Academic Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {academicYears?.map(year => (
                                <SelectItem key={year.id} value={year.id}>
                                    {year.name} {year.isCurrent && "(Current)"}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button onClick={openCreate}>
                        <Plus className="mr-2 h-4 w-4" /> Add Bucket
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {leaveTypes.slice(0, 4).map(type => {
                    const bucket = buckets?.find(b => b.leaveType === type.value);
                    return (
                        <Card key={type.value} className="bg-muted border-none">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${type.color}`} />
                                    <div>
                                        <p className="text-sm text-muted-foreground">{type.label}</p>
                                        <p className="text-xl font-bold">
                                            {bucket ? `${bucket.yearlyLimit} days/yr` : "Not set"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Buckets Table */}
            <Card className="bg-muted border-none">
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
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Leave Type</TableHead>
                                    <TableHead>Yearly Limit</TableHead>
                                    <TableHead>Monthly Limit</TableHead>
                                    <TableHead>Carry Forward</TableHead>
                                    <TableHead>Encashment</TableHead>
                                    <TableHead>Applicable To</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {buckets.map(bucket => (
                                    <TableRow key={bucket.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${getLeaveTypeColor(bucket.leaveType)}`} />
                                                <span className="font-medium">{getLeaveTypeLabel(bucket.leaveType)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{bucket.yearlyLimit} days</TableCell>
                                        <TableCell>{bucket.monthlyLimit ? `${bucket.monthlyLimit} days` : "-"}</TableCell>
                                        <TableCell>{bucket.carryForwardLimit > 0 ? `${bucket.carryForwardLimit} days` : "-"}</TableCell>
                                        <TableCell>
                                            {bucket.encashmentLimit > 0 ? (
                                                <span>{bucket.encashmentLimit} days @ ₹{bucket.encashmentPerDayRate || 0}/day</span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                {bucket.applicableToTeaching && <Badge variant="outline" className="text-xs">Teaching</Badge>}
                                                {bucket.applicableToNonTeaching && <Badge variant="outline" className="text-xs">Non-Teaching</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={bucket.isActive ? "success" : "secondary"}>
                                                {bucket.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(bucket)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive"
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
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            <Calendar className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <h3 className="text-lg font-medium mb-2">No Leave Buckets</h3>
                            <p className="mb-4">Configure leave limits for the selected academic year</p>
                            <Button onClick={openCreate}>
                                <Plus className="mr-2 h-4 w-4" /> Add Leave Bucket
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editBucket ? "Edit Leave Bucket" : "Add Leave Bucket"}</DialogTitle>
                        <DialogDescription>
                            Configure leave limits and rules for a leave type
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 py-4">
                            {!editBucket && (
                                <>
                                    <input type="hidden" name="academicYearId" value={selectedAcademicYear} />
                                    <div>
                                        <Label>Leave Type *</Label>
                                        <Select name="leaveType" required>
                                            <SelectTrigger>
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
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Yearly Limit (days) *</Label>
                                    <Input
                                        name="yearlyLimit"
                                        type="number"
                                        min="0"
                                        defaultValue={editBucket?.yearlyLimit || 12}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Monthly Limit (days)</Label>
                                    <Input
                                        name="monthlyLimit"
                                        type="number"
                                        min="0"
                                        placeholder="Optional"
                                        defaultValue={editBucket?.monthlyLimit || ""}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Carry Forward Limit</Label>
                                    <Input
                                        name="carryForwardLimit"
                                        type="number"
                                        min="0"
                                        defaultValue={editBucket?.carryForwardLimit || 0}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Max days that can be carried to next year</p>
                                </div>
                                <div>
                                    <Label>Encashment Limit</Label>
                                    <Input
                                        name="encashmentLimit"
                                        type="number"
                                        min="0"
                                        defaultValue={editBucket?.encashmentLimit || 0}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Max days that can be encashed</p>
                                </div>
                            </div>

                            <div>
                                <Label>Encashment Rate (₹ per day)</Label>
                                <Input
                                    name="encashmentPerDayRate"
                                    type="number"
                                    step="0.01"
                                    placeholder="Optional"
                                    defaultValue={editBucket?.encashmentPerDayRate || ""}
                                />
                            </div>

                            <div className="space-y-3">
                                <Label>Applicable To</Label>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Teaching Staff</span>
                                    <Switch
                                        name="applicableToTeaching"
                                        defaultChecked={editBucket?.applicableToTeaching ?? true}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Non-Teaching Staff</span>
                                    <Switch
                                        name="applicableToNonTeaching"
                                        defaultChecked={editBucket?.applicableToNonTeaching ?? true}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
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
