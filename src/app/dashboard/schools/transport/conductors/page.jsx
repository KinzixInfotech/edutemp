'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Search, Users, UserCheck, ClipboardCheck } from "lucide-react";

async function fetchConductors({ schoolId, search }) {
    const params = new URLSearchParams({ schoolId, role: 'CONDUCTOR' });
    if (search) params.append("search", search);
    const response = await fetch(`/api/schools/transport/staff?${params}`);
    if (!response.ok) throw new Error("Failed to fetch conductors");
    return response.json();
}

async function createConductor(data) {
    const response = await fetch("/api/schools/transport/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "CONDUCTOR" }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create conductor");
    }
    return response.json();
}

async function updateConductor({ id, ...data }) {
    const response = await fetch(`/api/schools/transport/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update conductor");
    return response.json();
}

async function deleteConductor(id) {
    const response = await fetch(`/api/schools/transport/staff/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete conductor");
    return response.json();
}

export default function ConductorManagement() {
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { staff: conductors = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["conductors", schoolId, search],
        queryFn: () => fetchConductors({ schoolId, search }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createConductor,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["conductors"]);
            setDrawerMode(null);
            toast.success("Conductor added successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateConductor,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["conductors"]);
            setDrawerMode(null);
            toast.success("Conductor updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update conductor"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteConductor,
        onSuccess: () => {
            queryClient.invalidateQueries(["conductors"]);
            toast.success("Conductor deactivated");
        },
        onError: () => toast.error("Failed to deactivate conductor"),
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = () => {
        setFormError("");
        if (!formData.name || !formData.email || !formData.contactNumber || !formData.employeeId) {
            setFormError("Name, Email, Contact, and Employee ID are required");
            return;
        }
        formData.schoolId = schoolId;
        if (drawerMode === "add") {
            createMutation.mutate(formData);
        } else {
            updateMutation.mutate({ id: formData.id, ...formData });
        }
    };

    const handleAdd = () => { setFormData({}); setDrawerMode("add"); };
    const handleEdit = (conductor) => { setFormData(conductor); setDrawerMode("edit"); };

    const activeConductors = conductors.filter(c => c.isActive);

    return (
        <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Conductors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Conductors</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activeConductors.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Attendance Role</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">Mark student attendance on bus</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search conductors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" /> Add Conductor
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead>#</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(4).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    {Array(7).fill(0).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-6 w-20" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : conductors.length > 0 ? (
                            conductors.map((conductor, index) => (
                                <TableRow key={conductor.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono">{conductor.employeeId}</TableCell>
                                    <TableCell className="font-medium">{conductor.name}</TableCell>
                                    <TableCell>{conductor.email}</TableCell>
                                    <TableCell>{conductor.contactNumber}</TableCell>
                                    <TableCell>
                                        <Badge variant={conductor.isActive ? "default" : "secondary"}>
                                            {conductor.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(conductor)}>Edit</Button>
                                        {conductor.isActive && (
                                            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(conductor.id)}>
                                                Deactivate
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                    No conductors found. Add your first conductor to get started.
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
                        <DrawerTitle>{drawerMode === "add" ? "Add Conductor" : "Edit Conductor"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {formError && <p className="text-red-500 text-sm">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label>Employee ID*</Label>
                                <Input name="employeeId" value={formData.employeeId || ""} onChange={handleChange} disabled={drawerMode === "edit"} />
                            </div>
                            <div>
                                <Label>Full Name*</Label>
                                <Input name="name" value={formData.name || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Email*</Label>
                                <Input name="email" type="email" value={formData.email || ""} onChange={handleChange} disabled={drawerMode === "edit"} />
                            </div>
                            <div>
                                <Label>Contact Number*</Label>
                                <Input name="contactNumber" value={formData.contactNumber || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Address</Label>
                                <Input name="address" value={formData.address || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Emergency Contact</Label>
                                <Input name="emergencyContact" value={formData.emergencyContact || ""} onChange={handleChange} />
                            </div>
                            {drawerMode === "add" && (
                                <div>
                                    <Label>Password (optional)</Label>
                                    <Input name="password" type="password" value={formData.password || ""} onChange={handleChange} placeholder="Leave blank for auto-generated" />
                                </div>
                            )}
                        </div>
                        <Button onClick={handleSubmit} disabled={saving} className="w-full mt-4">
                            {saving ? <><Loader2 className="animate-spin mr-2" size={18} /> Saving...</> : "Save"}
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
