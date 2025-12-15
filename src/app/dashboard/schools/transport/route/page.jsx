'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
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
import { Loader2, Plus, Search, Route, MapPin, Car, Users, Edit2, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";

async function fetchRoutes({ schoolId, search, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
    const response = await fetch(`/api/schools/transport/routes?${params}`);
    if (!response.ok) throw new Error("Failed to fetch routes");
    return response.json();
}

async function fetchVehicles({ schoolId }) {
    const response = await fetch(`/api/schools/transport/vehicle?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    return response.json();
}

async function createRoute(data) {
    const response = await fetch("/api/schools/transport/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create route");
    }
    return response.json();
}

async function updateRoute({ id, ...data }) {
    const response = await fetch(`/api/schools/transport/routes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update route");
    return response.json();
}

async function deleteRoute(id) {
    const response = await fetch(`/api/schools/transport/routes/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete route");
    return true;
}

export default function RoutePlanning() {
    const { fullUser } = useAuth();
    const router = useRouter();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const limit = 10;

    const { data: { routes = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["routes", schoolId, search, page],
        queryFn: () => fetchRoutes({ schoolId, search, page, limit }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const { data: { vehicles = [] } = {} } = useQuery({
        queryKey: ["vehicles", schoolId],
        queryFn: () => fetchVehicles({ schoolId }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createRoute,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["routes"]);
            setDialogOpen(false);
            toast.success("Route added successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateRoute,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["routes"]);
            setDialogOpen(false);
            toast.success("Route updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update route"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRoute,
        onSuccess: () => {
            queryClient.invalidateQueries(["routes"]);
            setDeleteDialogOpen(false);
            toast.success("Route deleted successfully");
        },
        onError: () => toast.error("Failed to delete route"),
    });

    const validateForm = () => {
        const errors = {};
        if (!formData.name?.trim()) errors.name = "Route name is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        const payload = { ...formData, schoolId };
        if (selectedRoute) {
            updateMutation.mutate({ id: selectedRoute.id, ...payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleAdd = () => {
        setSelectedRoute(null);
        setFormData({});
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleEdit = (route) => {
        setSelectedRoute(route);
        setFormData({
            name: route.name,
            assignedVehicleId: route.assignedVehicleId || "",
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleDeleteClick = (route) => {
        setSelectedRoute(route);
        setDeleteDialogOpen(true);
    };

    const handleViewAssignments = (route) => {
        router.push(`/dashboard/schools/transport/route/${route.id}/assignments`);
    };

    const handleManageStops = (route) => {
        router.push(`/dashboard/schools/transport/stops?routeId=${route.id}`);
    };

    // Stats
    const routesWithVehicle = routes.filter(r => r.assignedVehicleId).length;
    const routesWithoutVehicle = routes.length - routesWithVehicle;
    const totalPages = Math.ceil(total / limit);

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Route Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Plan and manage transport routes</p>
                </div>
                <Button onClick={handleAdd} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> Add Route
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Routes</CardTitle>
                        <Route className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">With Vehicle</CardTitle>
                        <Car className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{routesWithVehicle}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
                        <Car className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{routesWithoutVehicle}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Vehicles Available</CardTitle>
                        <Car className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{vehicles.filter(v => v.status === 'active').length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search routes..."
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
                                <TableHead>Route Name</TableHead>
                                <TableHead>Vehicle</TableHead>
                                <TableHead className="text-center">Stops</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                        <TableCell><Skeleton className="h-6 w-16 mx-auto" /></TableCell>
                                        <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : routes.length > 0 ? (
                                routes.map((route, index) => (
                                    <TableRow key={route.id} className="hover:bg-muted/30">
                                        <TableCell className="font-medium text-muted-foreground">
                                            {(page - 1) * limit + index + 1}
                                        </TableCell>
                                        <TableCell className="font-semibold">{route.name}</TableCell>
                                        <TableCell>
                                            {route.vehicle?.licensePlate ? (
                                                <Badge variant="outline">{route.vehicle.licensePlate}</Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Not assigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge
                                                className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 cursor-pointer hover:bg-orange-200"
                                                onClick={() => handleManageStops(route)}
                                            >
                                                <MapPin className="h-3 w-3 mr-1" />
                                                {route.stops?.length || route._count?.stops || 0} stops
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => handleViewAssignments(route)} title="View Students">
                                                    <Users className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(route)} title="Edit">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteClick(route)} title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12">
                                        <Route className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No routes found</p>
                                        <Button variant="link" onClick={handleAdd} className="mt-2">Add your first route</Button>
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

            {/* Add/Edit Dialog - Simplified without stops */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{selectedRoute ? "Edit Route" : "Add New Route"}</DialogTitle>
                        <DialogDescription>
                            {selectedRoute ? "Update route details" : "Create a new transport route. You can add stops from the Bus Stops page."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Route Name <span className="text-destructive">*</span></Label>
                            <Input
                                placeholder="e.g., Route A - North"
                                value={formData.name || ""}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={formErrors.name ? "border-destructive" : ""}
                            />
                            {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Assigned Vehicle</Label>
                            <Select value={formData.assignedVehicleId || "none"} onValueChange={(val) => setFormData({ ...formData, assignedVehicleId: val === "none" ? null : val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No vehicle assigned</SelectItem>
                                    {vehicles.filter(v => v.status === 'active').map((vehicle) => (
                                        <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate} - {vehicle.model}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                💡 Tip: Add stops from the <strong>Bus Stops</strong> page after creating the route.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : selectedRoute ? "Update Route" : "Add Route"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Route</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold">{selectedRoute?.name}</span>?
                            This will also remove all stops and student assignments for this route.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedRoute?.id)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
