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
import { Loader2, Plus, Search, MapPin, Route, Clock, Edit2, Trash2, ChevronLeft, ChevronRight, Navigation } from "lucide-react";
import nextDynamic from 'next/dynamic';

// Dynamically import the Google Maps component to avoid SSR issues
const GoogleMapsLocationPicker = nextDynamic(
    () => import('@/components/maps/GoogleMapsLocationPicker'),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center h-[300px] bg-muted rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }
);

async function fetchStops({ schoolId, search, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    params.append("page", page);
    params.append("limit", limit);
    const response = await fetch(`/api/schools/transport/stops?${params}`);
    if (!response.ok) throw new Error("Failed to fetch stops");
    return response.json();
}

async function fetchRoutes({ schoolId }) {
    const response = await fetch(`/api/schools/transport/routes?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch routes");
    return response.json();
}

async function createStop(data) {
    const response = await fetch("/api/schools/transport/stops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create stop");
    }
    return response.json();
}

async function updateStop({ id, ...data }) {
    const response = await fetch(`/api/schools/transport/stops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update stop");
    return response.json();
}

async function deleteStop(id) {
    const response = await fetch(`/api/schools/transport/stops/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete stop");
    return true;
}

export default function BusStopManagement() {
    const { fullUser } = useAuth();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedStop, setSelectedStop] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const limit = 10;

    const { data: { stops = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["stops", schoolId, search, page],
        queryFn: () => fetchStops({ schoolId, search, page, limit }),
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        enabled: !!schoolId,
    });

    const createMutation = useMutation({
        mutationFn: createStop,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["stops"]);
            setDialogOpen(false);
            toast.success("Stop added successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateStop,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["stops"]);
            setDialogOpen(false);
            toast.success("Stop updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update stop"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStop,
        onSuccess: () => {
            queryClient.invalidateQueries(["stops"]);
            setDeleteDialogOpen(false);
            toast.success("Stop deleted");
        },
        onError: () => toast.error("Failed to delete stop"),
    });

    const validateForm = () => {
        const errors = {};
        if (!formData.name?.trim()) errors.name = "Stop name is required";
        if (!formData.routeId) errors.routeId = "Route is required";
        if (formData.orderIndex === undefined || formData.orderIndex === "") errors.orderIndex = "Order is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        const payload = {
            ...formData,
            schoolId,
            orderIndex: parseInt(formData.orderIndex),
            latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
            longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
        };
        if (selectedStop) {
            updateMutation.mutate({ id: selectedStop.id, ...payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const handleAdd = () => {
        setSelectedStop(null);
        setFormData({ orderIndex: 1 });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleEdit = (stop) => {
        setSelectedStop(stop);
        setFormData({
            name: stop.name,
            routeId: stop.routeId,
            orderIndex: stop.orderIndex,
            latitude: stop.latitude,
            longitude: stop.longitude,
            pickupTime: stop.pickupTime,
            dropTime: stop.dropTime,
        });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleDeleteClick = (stop) => {
        setSelectedStop(stop);
        setDeleteDialogOpen(true);
    };

    // Handle location change from map
    const handleLocationChange = (lat, lng, address) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            // Optionally set the name from the address if empty
            ...(address && !prev.name && { name: address.split(',')[0] })
        }));
    };

    const stopsWithCoords = stops.filter(s => s.latitude && s.longitude).length;
    const totalPages = Math.ceil(total / limit);

    // Open in Google Maps
    const openInGoogleMaps = (lat, lng) => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Bus Stop Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage route stops and schedules</p>
                </div>
                <Button onClick={handleAdd} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> Add Stop
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Stops</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Routes</CardTitle>
                        <Route className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-blue-600">{routes.length}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">With Coordinates</CardTitle>
                        <MapPin className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{stopsWithCoords}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">No Coordinates</CardTitle>
                        <MapPin className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-yellow-600">{stops.length - stopsWithCoords}</div></CardContent>
                </Card>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search stops..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 bg-white dark:bg-muted" />
            </div>

            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className={'bg-white dark:bg-muted'}>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">Order</TableHead>
                                <TableHead>Stop Name</TableHead>
                                <TableHead>Route</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Pickup Time</TableHead>
                                <TableHead>Drop Time</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <TableRow key={i}>{Array(7).fill(0).map((_, j) => (<TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>))}</TableRow>
                                ))
                            ) : stops.length > 0 ? (
                                stops.map((stop) => (
                                    <TableRow key={stop.id} className="hover:bg-muted/30">
                                        <TableCell>
                                            <Badge variant="outline">{stop.orderIndex}</Badge>
                                        </TableCell>
                                        <TableCell className="font-semibold">{stop.name}</TableCell>
                                        <TableCell>
                                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                {stop.route?.name || "N/A"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {stop.latitude && stop.longitude ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 p-0 px-2"
                                                    onClick={() => openInGoogleMaps(stop.latitude, stop.longitude)}
                                                >
                                                    <Navigation className="h-3.5 w-3.5 mr-1" />
                                                    <span className="font-mono text-xs">
                                                        {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                                                    </span>
                                                </Button>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">Not set</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {stop.pickupTime ? (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />{stop.pickupTime}
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            {stop.dropTime ? (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />{stop.dropTime}
                                                </span>
                                            ) : "-"}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => handleEdit(stop)}><Edit2 className="h-4 w-4" /></Button>
                                                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteClick(stop)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-12">
                                        <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No stops found</p>
                                        <Button variant="link" onClick={handleAdd} className="mt-2">Add your first stop</Button>
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

            {/* Add/Edit Dialog with Google Maps */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedStop ? "Edit Stop" : "Add New Stop"}</DialogTitle>
                        <DialogDescription>{selectedStop ? "Update stop details and location" : "Add a new bus stop to a route"}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Stop Name <span className="text-destructive">*</span></Label>
                                <Input
                                    placeholder="e.g., Main Gate, Sector 15"
                                    value={formData.name || ""}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className={formErrors.name ? "border-destructive" : ""}
                                />
                                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Route <span className="text-destructive">*</span></Label>
                                    <Select value={formData.routeId || ""} onValueChange={(val) => setFormData({ ...formData, routeId: val })}>
                                        <SelectTrigger className={formErrors.routeId ? "border-destructive" : ""}>
                                            <SelectValue placeholder="Select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {routes.map((route) => (
                                                <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {formErrors.routeId && <p className="text-xs text-destructive">{formErrors.routeId}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label>Order <span className="text-destructive">*</span></Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.orderIndex || ""}
                                        onChange={(e) => setFormData({ ...formData, orderIndex: e.target.value })}
                                        className={formErrors.orderIndex ? "border-destructive" : ""}
                                    />
                                    {formErrors.orderIndex && <p className="text-xs text-destructive">{formErrors.orderIndex}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Google Maps Location Picker */}
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-red-500" />
                                Location (Click on map or search)
                            </Label>
                            <GoogleMapsLocationPicker
                                latitude={formData.latitude}
                                longitude={formData.longitude}
                                onLocationChange={handleLocationChange}
                                placeholder="Search for a location in India..."
                            />
                        </div>

                        {/* Coordinates Display (read-only) */}
                        {(formData.latitude || formData.longitude) && (
                            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Latitude</Label>
                                    <p className="font-mono text-sm">{formData.latitude?.toFixed(6) || 'Not set'}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Longitude</Label>
                                    <p className="font-mono text-sm">{formData.longitude?.toFixed(6) || 'Not set'}</p>
                                </div>
                            </div>
                        )}

                        {/* Timing */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    Pickup Time
                                </Label>
                                <Input
                                    type="time"
                                    value={formData.pickupTime || ""}
                                    onChange={(e) => setFormData({ ...formData, pickupTime: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-orange-500" />
                                    Drop Time
                                </Label>
                                <Input
                                    type="time"
                                    value={formData.dropTime || ""}
                                    onChange={(e) => setFormData({ ...formData, dropTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : selectedStop ? "Update Stop" : "Add Stop"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Stop</DialogTitle>
                        <DialogDescription>Are you sure you want to delete <span className="font-semibold">{selectedStop?.name}</span>?</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedStop?.id)} disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
