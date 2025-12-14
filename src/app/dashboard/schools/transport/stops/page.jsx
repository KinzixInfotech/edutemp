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
import { Loader2, Plus, MapPin, Navigation, Users } from "lucide-react";

async function fetchStops({ schoolId, routeId }) {
    const params = new URLSearchParams({ schoolId });
    if (routeId) params.append("routeId", routeId);
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
    return response.json();
}

export default function StopManagement() {
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [selectedRoute, setSelectedRoute] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        enabled: !!schoolId,
    });

    const { data: { stops = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["bus-stops", schoolId, selectedRoute],
        queryFn: () => fetchStops({ schoolId, routeId: selectedRoute }),
        enabled: !!schoolId,
    });

    const createMutation = useMutation({
        mutationFn: createStop,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["bus-stops"]);
            setDrawerMode(null);
            toast.success("Stop added successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateStop,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["bus-stops"]);
            setDrawerMode(null);
            toast.success("Stop updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update stop"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteStop,
        onSuccess: () => {
            queryClient.invalidateQueries(["bus-stops"]);
            toast.success("Stop deactivated");
        },
        onError: () => toast.error("Failed to deactivate stop"),
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = () => {
        setFormError("");
        if (!formData.routeId || !formData.name || !formData.latitude || !formData.longitude || formData.orderIndex === undefined) {
            setFormError("Route, Name, Latitude, Longitude, and Order are required");
            return;
        }
        if (drawerMode === "add") {
            createMutation.mutate(formData);
        } else {
            updateMutation.mutate({ id: formData.id, ...formData });
        }
    };

    const handleAdd = () => { setFormData({ routeId: selectedRoute }); setDrawerMode("add"); };
    const handleEdit = (stop) => { setFormData(stop); setDrawerMode("edit"); };

    // Group stops by route
    const stopsByRoute = routes.map(route => ({
        route,
        stops: stops.filter(s => s.routeId === route.id).sort((a, b) => a.orderIndex - b.orderIndex)
    })).filter(r => r.stops.length > 0 || selectedRoute === r.route.id);

    return (
        <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Stops</CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Routes with Stops</CardTitle>
                        <Navigation className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{new Set(stops.map(s => s.routeId)).size}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Students Assigned</CardTitle>
                        <Users className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {stops.reduce((sum, s) => sum + (s._count?.studentAssignments || 0), 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filter & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                    <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="All Routes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Routes</SelectItem>
                        {routes.map(route => (
                            <SelectItem key={route.id} value={route.id}>{route.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleAdd} disabled={!routes.length}>
                    <Plus className="h-4 w-4 mr-2" /> Add Stop
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[900px]">
                    <TableHeader>
                        <TableRow className="bg-white dark:bg-muted">
                            <TableHead>Order</TableHead>
                            <TableHead>Stop Name</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Pickup Time</TableHead>
                            <TableHead>Drop Time</TableHead>
                            <TableHead>Coordinates</TableHead>
                            <TableHead>Students</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(4).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    {Array(9).fill(0).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-6 w-16" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : stops.length > 0 ? (
                            stops.sort((a, b) => a.orderIndex - b.orderIndex).map((stop, index) => (
                                <TableRow key={stop.id} className={index % 2 === 0 ? "bg-white/50 dark:bg-muted/50" : ""}>
                                    <TableCell className="font-bold">{stop.orderIndex}</TableCell>
                                    <TableCell className="font-medium">{stop.name}</TableCell>
                                    <TableCell>{stop.route?.name}</TableCell>
                                    <TableCell>{stop.pickupTime || "-"}</TableCell>
                                    <TableCell>{stop.dropTime || "-"}</TableCell>
                                    <TableCell className="font-mono text-xs">
                                        {stop.latitude?.toFixed(4)}, {stop.longitude?.toFixed(4)}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{stop._count?.studentAssignments || 0}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={stop.isActive ? "default" : "secondary"}>
                                            {stop.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(stop)}>Edit</Button>
                                        {stop.isActive && (
                                            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(stop.id)}>
                                                Remove
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    {routes.length === 0 ? "Create a route first, then add stops." : "No stops found. Add your first stop."}
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
                        <DrawerTitle>{drawerMode === "add" ? "Add Stop" : "Edit Stop"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {formError && <p className="text-red-500 text-sm">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label>Route*</Label>
                                <Select value={formData.routeId || ""} onValueChange={(v) => setFormData({ ...formData, routeId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Route" /></SelectTrigger>
                                    <SelectContent>
                                        {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Stop Name*</Label>
                                <Input name="name" value={formData.name || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Order Index*</Label>
                                <Input name="orderIndex" type="number" value={formData.orderIndex ?? ""} onChange={handleChange} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Latitude*</Label>
                                    <Input name="latitude" type="number" step="any" value={formData.latitude || ""} onChange={handleChange} />
                                </div>
                                <div>
                                    <Label>Longitude*</Label>
                                    <Input name="longitude" type="number" step="any" value={formData.longitude || ""} onChange={handleChange} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Pickup Time</Label>
                                    <Input name="pickupTime" type="time" value={formData.pickupTime || ""} onChange={handleChange} />
                                </div>
                                <div>
                                    <Label>Drop Time</Label>
                                    <Input name="dropTime" type="time" value={formData.dropTime || ""} onChange={handleChange} />
                                </div>
                            </div>
                            <div>
                                <Label>Address</Label>
                                <Input name="address" value={formData.address || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>Landmark</Label>
                                <Input name="landmark" value={formData.landmark || ""} onChange={handleChange} />
                            </div>
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
