
// app/transport/vehicles.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

async function fetchVehicles({ schoolId, search }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    const response = await fetch(`/api/schools/transport/vehicle?${params} `);
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    return response.json();
}

async function createVehicle(data) {
    const response = await fetch("/api/schools/transport/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create vehicle");
    return response.json();
}

async function updateVehicle({ id, ...data }) {
    const response = await fetch(`/api/schools/transport/vehicle/${id} `, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update vehicle");
    return response.json();
}

async function deleteVehicle(id) {
    const response = await fetch(`/api/schools/transport/vehicle/${id} `, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete vehicle");
    return true;
}

export default function VehicleManagement() {
    const [saving, setSaving] = useState(false);
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { vehicles = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["vehicles", schoolId, search],
        queryFn: () => fetchVehicles({ schoolId, search }),
        staleTime: 5 * 60 * 1000,
    });

    const createMutation = useMutation({
        mutationFn: createVehicle,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["vehicles"]);
            setDrawerMode(null);
            toast.success("Vehicle added successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to add vehicle"),
    });

    const updateMutation = useMutation({
        mutationFn: updateVehicle,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["vehicles"]);
            setDrawerMode(null);
            toast.success("Vehicle updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update vehicle"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteVehicle,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["vehicles"]);
            toast.success("Vehicle deleted successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to delete vehicle"),
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name, val) => {
        setFormData({ ...formData, [name]: val });
    };

    const handleSubmit = () => {
        if (!formData.licensePlate || !formData.model || !formData.capacity || !formData.status) {
            setFormError("Required fields missing");
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
        setFormData({});
        setDrawerMode("add");
    };

    const handleEdit = (vehicle) => {
        setFormData(vehicle);
        setDrawerMode("edit");
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    return (
        <div className="p-6">
            <Button onClick={handleAdd} className="mb-4">Add Vehicle</Button>
            <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>License Plate</TableHead>
                            <TableHead>Model</TableHead>
                            <TableHead>Capacity</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : vehicles.length > 0 ? (
                            vehicles.map((vehicle, index) => (
                                <TableRow key={vehicle.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{vehicle.licensePlate}</TableCell>
                                    <TableCell>{vehicle.model}</TableCell>
                                    <TableCell>{vehicle.capacity}</TableCell>
                                    <TableCell>
                                        <span
                                            className={`px-2 py-1 rounded-sm capitalize text-sm font-medium ${vehicle.status === "active" ? "bg-green-100 text-green-800" :
                                                vehicle.status === "maintenance" ? "bg-yellow-100 text-yellow-800" :
                                                    "bg-red-100 text-red-800"
                                                } `}
                                        >
                                            {vehicle.status}
                                        </span>
                                    </TableCell>
                                    <TableCell className="flex flex-row gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(vehicle)}>
                                            Edit
                                        </Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(vehicle.id)}>
                                            Delete
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No vehicles found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>{drawerMode === "add" ? "Add Vehicle" : "Edit Vehicle"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {formError && <p className="text-red-500 mb-4">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="licensePlate" className="mb-2 text-muted-foreground">License Plate*</Label>
                                <Input id="licensePlate" name="licensePlate" value={formData.licensePlate || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="model" className="mb-2 text-muted-foreground">Model*</Label>
                                <Input id="model" name="model" value={formData.model || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="capacity" className="mb-2 text-muted-foreground">Capacity*</Label>
                                <Input id="capacity" name="capacity" type="number" value={formData.capacity || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="maintenanceDue" className="mb-2 text-muted-foreground">Maintenance Due</Label>
                                <Input id="maintenanceDue" name="maintenanceDue" type="date" value={formData.maintenanceDue || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="status" className="mb-2 text-muted-foreground">Status*</Label>
                                <Select value={formData.status || "active"} onValueChange={(val) => handleSelectChange("status", val)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="maintenance">Maintenance</SelectItem>
                                        <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`mt-6 w-full ${saving ? "opacity-50 cursor-not-allowed" : ""} `}
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
