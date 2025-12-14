'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, CreditCard, DollarSign, Users } from "lucide-react";

async function fetchFees({ schoolId }) {
    const response = await fetch(`/api/schools/transport/fees?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch fees");
    return response.json();
}

async function fetchRoutes({ schoolId }) {
    const response = await fetch(`/api/schools/transport/routes?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch routes");
    return response.json();
}

async function fetchAcademicYears({ schoolId }) {
    const response = await fetch(`/api/schools/${schoolId}/academic-years`);
    if (!response.ok) throw new Error("Failed to fetch academic years");
    return response.json();
}

async function createFee(data) {
    const response = await fetch("/api/schools/transport/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create fee");
    }
    return response.json();
}

export default function TransportFeeManagement() {
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { fees = [] } = {}, isLoading } = useQuery({
        queryKey: ["transport-fees", schoolId],
        queryFn: () => fetchFees({ schoolId }),
        enabled: !!schoolId,
    });

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        enabled: !!schoolId,
    });

    const { data: academicYears = [] } = useQuery({
        queryKey: ["academic-years", schoolId],
        queryFn: () => fetchAcademicYears({ schoolId }),
        enabled: !!schoolId,
    });

    const createMutation = useMutation({
        mutationFn: createFee,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["transport-fees"]);
            setDrawerMode(null);
            toast.success("Fee structure created successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = () => {
        setFormError("");
        if (!formData.name || formData.amount === undefined || !formData.frequency) {
            setFormError("Name, Amount, and Frequency are required");
            return;
        }
        formData.schoolId = schoolId;
        createMutation.mutate(formData);
    };

    const handleAdd = () => { setFormData({}); setDrawerMode("add"); };

    const totalRevenue = fees.reduce((sum, f) => sum + (f.amount * (f._count?.studentFees || 0)), 0);
    const activeStudents = fees.reduce((sum, f) => sum + (f._count?.studentFees || 0), 0);

    const frequencyLabels = {
        MONTHLY: "Monthly",
        QUARTERLY: "Quarterly",
        HALF_YEARLY: "Half-Yearly",
        YEARLY: "Yearly"
    };

    return (
        <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Fee Structures</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{fees.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Students Assigned</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{activeStudents}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Expected Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">₹{totalRevenue.toLocaleString()}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="flex justify-end">
                <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" /> Add Fee Structure
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Frequency</TableHead>
                            <TableHead>Academic Year</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(3).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    {Array(8).fill(0).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-6 w-16" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : fees.length > 0 ? (
                            fees.map((fee, index) => (
                                <TableRow key={fee.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-medium">{fee.name}</TableCell>
                                    <TableCell>{fee.route?.name || "All Routes"}</TableCell>
                                    <TableCell className="font-mono">₹{fee.amount.toLocaleString()}</TableCell>
                                    <TableCell>{frequencyLabels[fee.frequency]}</TableCell>
                                    <TableCell>{fee.academicYear?.name || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{fee._count?.studentFees || 0}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={fee.isActive ? "default" : "secondary"}>
                                            {fee.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No fee structures found. Create one to start collecting transport fees.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Drawer */}
            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>Add Fee Structure</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {formError && <p className="text-red-500 text-sm">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label>Fee Name*</Label>
                                <Input name="name" value={formData.name || ""} onChange={handleChange} placeholder="e.g., Monthly Transport Fee" />
                            </div>
                            <div>
                                <Label>Amount (₹)*</Label>
                                <Input name="amount" type="number" value={formData.amount || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Frequency*</Label>
                                <Select value={formData.frequency || ""} onValueChange={(v) => setFormData({ ...formData, frequency: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Frequency" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                        <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
                                        <SelectItem value="YEARLY">Yearly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Route (optional)</Label>
                                <Select value={formData.routeId || ""} onValueChange={(v) => setFormData({ ...formData, routeId: v || null })}>
                                    <SelectTrigger><SelectValue placeholder="All Routes" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">All Routes</SelectItem>
                                        {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Academic Year (optional)</Label>
                                <Select value={formData.academicYearId || ""} onValueChange={(v) => setFormData({ ...formData, academicYearId: v || null })}>
                                    <SelectTrigger><SelectValue placeholder="Select Year" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input name="description" value={formData.description || ""} onChange={handleChange} />
                            </div>
                        </div>
                        <Button onClick={handleSubmit} disabled={saving} className="w-full mt-4">
                            {saving ? <><Loader2 className="animate-spin mr-2" size={18} /> Creating...</> : "Create Fee Structure"}
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
