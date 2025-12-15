'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Search, Car, Users, AlertTriangle, CheckCircle, Edit2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

async function fetchVehicles({ schoolId, search, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
    const response = await fetch(`/api/schools/transport/vehicle?${params}`);
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    return response.json();
}

async function createVehicle(data) {
    const response = await fetch("/api/schools/transport/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create vehicle");
    }
    return response.json();
}

async function updateVehicle({ id, ...data }) {
    const response = await fetch(`/api/schools/transport/vehicle/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update vehicle");
    }
    return response.json();
}

async function deleteVehicle(id) {
    const response = await fetch(`/api/schools/transport/vehicle/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete vehicle");
    return true;
}

export default function VehicleManagement() {
    const { fullUser } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [formErrors, setFormErrors] = useState({});
    const [saving, setSaving] = useState(false);

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const limit = 10;

    const { data: { vehicles = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["vehicles", schoolId, search, page],
        queryFn: () => fetchVehicles({ schoolId, search, page, limit }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createVehicle,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["vehicles"]);
            setDialogOpen(false);
            toast.success("Vehicle added successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateVehicle,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["vehicles"]);
            setDialogOpen(false);
            toast.success("Vehicle updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteVehicle,
        onSuccess: () => {
            queryClient.invalidateQueries(["vehicles"]);
            setDeleteDialogOpen(false);
            setSelectedVehicle(null);
            toast.success("Vehicle deleted successfully");
        },
        onError: () => toast.error("Failed to delete vehicle"),
    });

    const validateForm = () => {
        const errors = {};
        if (!formData.licensePlate?.trim()) errors.licensePlate = "License plate is required";
        if (!formData.model?.trim()) errors.model = "Model is required";
        if (!formData.capacity || formData.capacity < 1) errors.capacity = "Valid capacity is required";
        if (!formData.status) errors.status = "Status is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        const payload = { ...formData, schoolId, capacity: parseInt(formData.capacity) };
        if (selectedVehicle) {
            updateMutation.mutate({ id: selectedVehicle.id, ...payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleAdd = () => {
        setSelectedVehicle(null);
        setFormData({ status: "active" });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleEdit = (vehicle) => {
        setSelectedVehicle(vehicle);
        setFormData({
            licensePlate: vehicle.licensePlate,
            model: vehicle.model,
            capacity: vehicle.capacity,
            status: vehicle.status,
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleDeleteClick = (vehicle) => {
        setSelectedVehicle(vehicle);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (selectedVehicle) deleteMutation.mutate(selectedVehicle.id);
    };

    // Stats
    const activeCount = vehicles.filter(v => v.status === "active").length;
    const maintenanceCount = vehicles.filter(v => v.status === "maintenance").length;
    const avgCapacity = vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0) / vehicles.length) : 0;
    const totalPages = Math.ceil(total / limit);

    const statusConfig = {
        active: { label: "Active", variant: "default", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
        maintenance: { label: "Maintenance", variant: "warning", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
        inactive: { label: "Inactive", variant: "secondary", className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" },
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Vehicle Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage your school transport fleet</p>
                </div>
                <Button onClick={handleAdd} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> Add Vehicle
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{maintenanceCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Capacity</CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{avgCapacity} seats</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground bg-white dark:bg-muted" />
                <Input
                    placeholder="Search by license plate or model..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="pl-10 bg-white dark:bg-muted"
                />
            </div>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className={'bg-white dark:bg-muted'}>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>License Plate</TableHead>
                                <TableHead>Model</TableHead>
                                <TableHead className="text-center">Capacity</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-6" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell className="text-center"><Skeleton className="h-5 w-8 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : vehicles.length > 0 ? (
                                vehicles.map((vehicle, index) => (
                                    <TableRow key={vehicle.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium text-muted-foreground">
                                            {(page - 1) * limit + index + 1}
                                        </TableCell>
                                        <TableCell className="font-semibold">{vehicle.licensePlate}</TableCell>
                                        <TableCell>{vehicle.model}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline">{vehicle.capacity}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[vehicle.status]?.className || ''}`}>
                                                {statusConfig[vehicle.status]?.label || vehicle.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(vehicle)}>
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(vehicle)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <Car className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No vehicles found</p>
                                        <Button variant="link" onClick={handleAdd} className="mt-2">Add your first vehicle</Button>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
                        <p className="text-sm text-muted-foreground">
                            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
                        <DialogDescription>
                            {selectedVehicle ? "Update vehicle details below" : "Enter vehicle details to add to your fleet"}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="licensePlate">License Plate <span className="text-destructive">*</span></Label>
                            <Input
                                id="licensePlate"
                                placeholder="e.g., MH 01 AB 1234"
                                value={formData.licensePlate || ""}
                                onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                                className={formErrors.licensePlate ? "border-destructive" : ""}
                            />
                            {formErrors.licensePlate && <p className="text-xs text-destructive">{formErrors.licensePlate}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model">Model / Make <span className="text-destructive">*</span></Label>
                            <Input
                                id="model"
                                placeholder="e.g., Tata Starbus"
                                value={formData.model || ""}
                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                className={formErrors.model ? "border-destructive" : ""}
                            />
                            {formErrors.model && <p className="text-xs text-destructive">{formErrors.model}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="capacity">Seating Capacity <span className="text-destructive">*</span></Label>
                            <Input
                                id="capacity"
                                type="number"
                                min="1"
                                placeholder="e.g., 40"
                                value={formData.capacity || ""}
                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                className={formErrors.capacity ? "border-destructive" : ""}
                            />
                            {formErrors.capacity && <p className="text-xs text-destructive">{formErrors.capacity}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status <span className="text-destructive">*</span></Label>
                            <Select value={formData.status || "active"} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                <SelectTrigger className={formErrors.status ? "border-destructive" : ""}>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-green-500" />
                                            Active
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="maintenance">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-yellow-500" />
                                            Under Maintenance
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-gray-400" />
                                            Inactive
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                            {formErrors.status && <p className="text-xs text-destructive">{formErrors.status}</p>}
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : selectedVehicle ? "Update Vehicle" : "Add Vehicle"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Vehicle</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold">{selectedVehicle?.licensePlate}</span>? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
