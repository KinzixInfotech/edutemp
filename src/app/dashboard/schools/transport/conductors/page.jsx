'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Search, Users, UserCheck, Clipboard, Edit2, Trash2, ChevronLeft, ChevronRight, Wand2 } from "lucide-react";

async function fetchConductors({ schoolId, search, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId, role: 'CONDUCTOR' });
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
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
    if (!response.ok) throw new Error("Failed to deactivate conductor");
    return response.json();
}

async function checkDuplicate(schoolId, field, value) {
    const response = await fetch(`/api/schools/transport/staff/check-duplicate?schoolId=${schoolId}&field=${field}&value=${encodeURIComponent(value)}`);
    if (!response.ok) return { exists: false };
    return response.json();
}

export default function ConductorManagement() {
    const { fullUser } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedConductor, setSelectedConductor] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [saving, setSaving] = useState(false);
    const [generatingId, setGeneratingId] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const limit = 10;

    const { data: { staff: conductors = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["conductors", schoolId, search, page],
        queryFn: () => fetchConductors({ schoolId, search, page, limit }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createConductor,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["conductors"]);
            setDialogOpen(false);
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
            setDialogOpen(false);
            toast.success("Conductor updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update conductor"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteConductor,
        onSuccess: () => {
            queryClient.invalidateQueries(["conductors"]);
            setDeleteDialogOpen(false);
            toast.success("Conductor deactivated");
        },
        onError: () => toast.error("Failed to deactivate conductor"),
    });

    const generateEmployeeId = async () => {
        try {
            setGeneratingId(true);
            const res = await fetch(`/api/schools/${schoolId}/settings/next-id?type=employee`);
            if (!res.ok) throw new Error("Failed to generate ID");
            const data = await res.json();
            setFormData({ ...formData, employeeId: data.nextId });
            toast.success("Employee ID generated");
        } catch (error) {
            console.error(error);
            toast.error("Could not generate ID");
        } finally {
            setGeneratingId(false);
        }
    };

    const validateForm = async () => {
        const errors = {};
        if (!formData.name?.trim()) errors.name = "Name is required";
        if (!formData.email?.trim()) errors.email = "Email is required";
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = "Invalid email";
        if (!formData.contactNumber?.trim()) errors.contactNumber = "Contact is required";
        if (!formData.employeeId?.trim()) errors.employeeId = "Employee ID is required";

        // Check duplicates only for new conductors
        if (!selectedConductor && Object.keys(errors).length === 0) {
            const emailCheck = await checkDuplicate(schoolId, 'email', formData.email);
            if (emailCheck.exists) errors.email = "Email already exists";

            const phoneCheck = await checkDuplicate(schoolId, 'contactNumber', formData.contactNumber);
            if (phoneCheck.exists) errors.contactNumber = "Contact number already exists";

            const idCheck = await checkDuplicate(schoolId, 'employeeId', formData.employeeId);
            if (idCheck.exists) errors.employeeId = "Employee ID already exists";
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        setSaving(true);
        const isValid = await validateForm();
        if (!isValid) {
            setSaving(false);
            return;
        }
        const payload = { ...formData, schoolId };
        if (selectedConductor) {
            updateMutation.mutate({ id: selectedConductor.id, ...payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleAdd = () => {
        setSelectedConductor(null);
        setFormData({});
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleEdit = (conductor) => {
        setSelectedConductor(conductor);
        setFormData({
            employeeId: conductor.employeeId,
            name: conductor.name,
            email: conductor.email,
            contactNumber: conductor.contactNumber,
            address: conductor.address,
            emergencyContact: conductor.emergencyContact,
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleDeleteClick = (conductor) => {
        setSelectedConductor(conductor);
        setDeleteDialogOpen(true);
    };

    const activeConductors = conductors.filter(c => c.isActive).length;
    const assignedConductors = conductors.filter(c => c.vehicleAssignments?.length > 0).length;
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Conductor Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your transport conductors</p>
                </div>
                <Button onClick={handleAdd} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> Add Conductor
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Conductors</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{activeConductors}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Assigned</CardTitle>
                        <Clipboard className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{assignedConductors}</div></CardContent>
                </Card>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search conductors..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 bg-white dark:bg-muted" />
            </div>

            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="bg-white dark:bg-muted">
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>{Array(6).fill(0).map((_, j) => (<TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>))}</TableRow>
                                ))
                            ) : conductors.length > 0 ? (
                                conductors.map((conductor, index) => (
                                    <TableRow key={conductor.id} className="hover:bg-muted/30">
                                        <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                                        <TableCell className="font-mono text-sm">{conductor.employeeId}</TableCell>
                                        <TableCell className="font-semibold">{conductor.name}</TableCell>
                                        <TableCell>{conductor.contactNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant={conductor.isActive ? "default" : "secondary"}>
                                                {conductor.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(conductor)}><Edit2 className="h-4 w-4" /></Button>
                                                {conductor.isActive && (
                                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteClick(conductor)}><Trash2 className="h-4 w-4" /></Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No conductors found</p>
                                        <Button variant="link" onClick={handleAdd} className="mt-2">Add your first conductor</Button>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}</p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedConductor ? "Edit Conductor" : "Add New Conductor"}</DialogTitle>
                        <DialogDescription>{selectedConductor ? "Update conductor details" : "Add a new conductor to your team"}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-2">
                                <Label>Employee ID <span className="text-destructive">*</span></Label>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="e.g., EMP001"
                                        value={formData.employeeId || ""}
                                        onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                        disabled={!!selectedConductor}
                                        className={formErrors.employeeId ? "border-destructive" : ""}
                                    />
                                    {!selectedConductor && (
                                        <Button type="button" variant="outline" size="icon" onClick={generateEmployeeId} disabled={generatingId} title="Auto-generate ID">
                                            {generatingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                                        </Button>
                                    )}
                                </div>
                                {formErrors.employeeId && <p className="text-xs text-destructive">{formErrors.employeeId}</p>}
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Full Name <span className="text-destructive">*</span></Label>
                                <Input placeholder="Enter full name" value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={formErrors.name ? "border-destructive" : ""} />
                                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Email <span className="text-destructive">*</span></Label>
                                <Input type="email" placeholder="conductor@email.com" value={formData.email || ""} onChange={(e) => setFormData({ ...formData, email: e.target.value })} disabled={!!selectedConductor} className={formErrors.email ? "border-destructive" : ""} />
                                {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label>Contact <span className="text-destructive">*</span></Label>
                                <Input placeholder="+91 9876543210" value={formData.contactNumber || ""} onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })} className={formErrors.contactNumber ? "border-destructive" : ""} />
                                {formErrors.contactNumber && <p className="text-xs text-destructive">{formErrors.contactNumber}</p>}
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Address</Label>
                                <Input placeholder="Enter address" value={formData.address || ""} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Emergency Contact</Label>
                                <Input placeholder="Emergency number" value={formData.emergencyContact || ""} onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })} />
                            </div>
                            {!selectedConductor && (
                                <div className="col-span-2 space-y-2">
                                    <Label>Password (optional)</Label>
                                    <Input type="password" placeholder="Leave blank for auto-generated" value={formData.password || ""} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                                    <p className="text-xs text-muted-foreground">Default: {formData.employeeId || "EmployeeID"}@temp123</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : selectedConductor ? "Update" : "Add Conductor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Deactivate Conductor</DialogTitle>
                        <DialogDescription>Are you sure you want to deactivate <span className="font-semibold">{selectedConductor?.name}</span>?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedConductor?.id)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : "Deactivate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
