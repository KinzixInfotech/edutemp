
// app/transport/routes.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

async function fetchRoutes({ schoolId, search }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
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
    if (!response.ok) throw new Error("Failed to create route");
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
    const response = await fetch(`/api/schools/transport/routes/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete route");
    return true;
}

async function fetchRouteAssignments(routeId, schoolId) {
    console.log(true, routeId, schoolId);

    const response = await fetch(
        `/api/schools/transport/student-routes?schoolId=${schoolId}&routeId=${routeId}`
    );
    console.log("fetching assignment");

    if (!response.ok) throw new Error("Failed to fetch route assignments");

    const data = await response.json();
    console.log(data); // <- now you’ll see the object
    return data;
}

export default function RoutePlanning() {
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({ stops: [] });
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false)
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { routes = [], total = 0 } = {}, isLoading: routesLoading } = useQuery({
        queryKey: ["routes", schoolId, search],
        queryFn: () => fetchRoutes({ schoolId, search }),
        staleTime: 5 * 60 * 1000,
    });

    const { data: { vehicles = [] } = {} } = useQuery({
        queryKey: ["vehicles", schoolId],
        queryFn: () => fetchVehicles({ schoolId }),
        staleTime: 5 * 60 * 1000,
    });

    const { data: assignments, isLoading: assignmentsLoading } = useQuery({
        queryKey: ["routeAssignments", selectedRoute?.id],
        queryFn: () => fetchRouteAssignments(selectedRoute?.id, schoolId),
        enabled: !!selectedRoute?.id,
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createRoute,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["routes"]);
            setDrawerMode(null);
            toast.success("Route added successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to add route"),
    });

    const updateMutation = useMutation({
        mutationFn: updateRoute,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["routes"]);
            setDrawerMode(null);
            toast.success("Route updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update route"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRoute,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["routes"]);
            toast.success("Route deleted successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to delete route"),
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleStopsChange = (index, field, value) => {
        const newStops = [...formData.stops];
        newStops[index] = { ...newStops[index], [field]: value };
        setFormData({ ...formData, stops: newStops });
    };

    const addStop = () => {
        setFormData({ ...formData, stops: [...(formData.stops || []), { name: "", lat: "", lng: "" }] });
    };

    const removeStop = (index) => {
        setFormData({ ...formData, stops: formData.stops.filter((_, i) => i !== index) });
    };

    const handleSelectChange = (name, val) => {
        setFormData({ ...formData, [name]: val });
    };

    const handleSubmit = () => {
        if (!formData.name || !formData.stops || formData.stops.length === 0) {
            setFormError("Name and at least one stop are required");
            return;
        }
        formData.schoolId = schoolId;
        if (drawerMode === "add") {
            createMutation.mutate(formData);
        } else {
            updateMutation.mutate({ id: formData.id, ...formData });
        }
    };

    const handleAdd = () => {
        setFormData({ stops: [] });
        setDrawerMode("add");
    };

    const handleEdit = (route) => {
        setFormData(route);
        setDrawerMode("edit");
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    return (
        <div className="p-6">
            <Button onClick={handleAdd} className="mb-4">Add Route</Button>
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Assigned Vehicle</TableHead>
                            <TableHead>Stops</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {routesLoading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : routes.length > 0 ? (
                            routes.map((route, index) => (
                                <TableRow key={route.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{route.name}</TableCell>
                                    <TableCell>{route.vehicle?.licensePlate || "None"}</TableCell>
                                    <TableCell>{route.stops.length} stops</TableCell>
                                    <TableCell className="flex flex-row gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedRoute(route)}>
                                                    View Assignments
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl">
                                                <DialogHeader>
                                                    <DialogTitle>Assignments - {selectedRoute?.name}</DialogTitle>
                                                </DialogHeader>
                                                {assignmentsLoading ? (
                                                    <div className="flex flex-col gap-1 py-4 items-center justify-center">
                                                        <Loader2 className="animate-spin" size={30} />
                                                        <p className="text-center my-2.5">Loading assignments...</p>
                                                    </div>
                                                ) : assignments?.assignments?.length > 0 ? (
                                                    <div className="overflow-x-auto rounded-lg border">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow className="bg-muted">
                                                                    <TableHead>Student</TableHead>
                                                                    <TableHead>Assigned At</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {assignments.assignments.map((assignment, idx) => (
                                                                    <TableRow key={idx} className={idx % 2 === 0 ? "bg-muted" : "bg-background"}>
                                                                        <TableCell>{assignment.student?.name || "N/A"}</TableCell>
                                                                        <TableCell>{assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : "N/A"}</TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                ) : (
                                                    <p className="text-center py-4">No assignments found.</p>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(route)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(route.id)}>
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">No routes found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>{drawerMode === "add" ? "Add Route" : "Edit Route"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {formError && <p className="text-red-500 mb-4">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name" className="mb-2 text-muted-foreground">Route Name*</Label>
                                <Input id="name" name="name" value={formData.name || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="assignedVehicleId" className="mb-2 text-muted-foreground">Assigned Vehicle</Label>
                                <Select value={formData.assignedVehicleId || ""} onValueChange={(val) => handleSelectChange("assignedVehicleId", val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {vehicles.map((vehicle) => (
                                            <SelectItem key={vehicle.id} value={vehicle.id}>{vehicle.licensePlate}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-2 text-muted-foreground">Stops*</Label>
                                {formData.stops?.map((stop, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <Input
                                            placeholder="Stop Name"
                                            value={stop.name}
                                            onChange={(e) => handleStopsChange(index, "name", e.target.value)}
                                        />
                                        <Input
                                            placeholder="Latitude"
                                            type="number"
                                            value={stop.lat}
                                            onChange={(e) => handleStopsChange(index, "lat", parseFloat(e.target.value))}
                                        />
                                        <Input
                                            placeholder="Longitude"
                                            type="number"
                                            value={stop.lng}
                                            onChange={(e) => handleStopsChange(index, "lng", parseFloat(e.target.value))}
                                        />
                                        <Button variant="destructive" size="sm" onClick={() => removeStop(index)}>Remove</Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addStop}>Add Stop</Button>
                            </div>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`mt-6 w-full ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {saving ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Saving</span>
                                </div>
                            ) : "Save"}
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
