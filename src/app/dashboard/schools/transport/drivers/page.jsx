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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Search, Car, Users, UserCheck } from "lucide-react";

async function fetchDrivers({ schoolId, search, isActive }) {
    const params = new URLSearchParams({ schoolId, role: 'DRIVER' });
    if (search) params.append("search", search);
    if (isActive !== undefined) params.append("isActive", isActive);
    const response = await fetch(`/api/schools/transport/staff?${params}`);
    if (!response.ok) throw new Error("Failed to fetch drivers");
    return response.json();
}

async function fetchVehicles({ schoolId }) {
    const response = await fetch(`/api/schools/transport/vehicle?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    return response.json();
}

async function createDriver(data) {
    const response = await fetch("/api/schools/transport/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "DRIVER" }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create driver");
    }
    return response.json();
}

async function updateDriver({ id, ...data }) {
    const response = await fetch(`/api/schools/transport/staff/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update driver");
    return response.json();
}

async function deleteDriver(id) {
    const response = await fetch(`/api/schools/transport/staff/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete driver");
    return response.json();
}

export default function DriverManagement() {
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { staff: drivers = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["drivers", schoolId, search],
        queryFn: () => fetchDrivers({ schoolId, search }),
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
        mutationFn: createDriver,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["drivers"]);
            setDrawerMode(null);
            toast.success("Driver added successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const updateMutation = useMutation({
        mutationFn: updateDriver,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["drivers"]);
            setDrawerMode(null);
            toast.success("Driver updated successfully");
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to update driver"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteDriver,
        onSuccess: () => {
            queryClient.invalidateQueries(["drivers"]);
            toast.success("Driver deactivated");
        },
        onError: () => toast.error("Failed to deactivate driver"),
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
    const handleEdit = (driver) => { setFormData(driver); setDrawerMode("edit"); };

    const activeDrivers = drivers.filter(d => d.isActive);
    const assignedDrivers = drivers.filter(d => d.vehicleAssignments?.length > 0);

    return (
        <div className="p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Drivers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{activeDrivers.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Assigned to Vehicles</CardTitle>
                        <Car className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{assignedDrivers.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search drivers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" /> Add Driver
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[900px]">
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead>#</TableHead>
                            <TableHead>Employee ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>License</TableHead>
                            <TableHead>Assigned Vehicle</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(5).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    {Array(8).fill(0).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-6 w-20" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : drivers.length > 0 ? (
                            drivers.map((driver, index) => (
                                <TableRow key={driver.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell className="font-mono">{driver.employeeId}</TableCell>
                                    <TableCell className="font-medium">{driver.name}</TableCell>
                                    <TableCell>{driver.contactNumber}</TableCell>
                                    <TableCell>{driver.licenseNumber || "-"}</TableCell>
                                    <TableCell>
                                        {driver.vehicleAssignments?.length > 0
                                            ? driver.vehicleAssignments.map(va => va.vehicle?.licensePlate).join(", ")
                                            : <span className="text-muted-foreground">Not assigned</span>}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={driver.isActive ? "default" : "secondary"}>
                                            {driver.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(driver)}>Edit</Button>
                                        {driver.isActive && (
                                            <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(driver.id)}>
                                                Deactivate
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No drivers found. Add your first driver to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Drawer */}
            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[450px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>{drawerMode === "add" ? "Add Driver" : "Edit Driver"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {formError && <p className="text-red-500 text-sm">{formError}</p>}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Employee ID*</Label>
                                <Input name="employeeId" value={formData.employeeId || ""} onChange={handleChange} disabled={drawerMode === "edit"} />
                            </div>
                            <div className="col-span-2">
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
                                <Label>License Number</Label>
                                <Input name="licenseNumber" value={formData.licenseNumber || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label>License Expiry</Label>
                                <Input name="licenseExpiry" type="date" value={formData.licenseExpiry?.split("T")[0] || ""} onChange={handleChange} />
                            </div>
                            <div className="col-span-2">
                                <Label>Address</Label>
                                <Input name="address" value={formData.address || ""} onChange={handleChange} />
                            </div>
                            <div className="col-span-2">
                                <Label>Emergency Contact</Label>
                                <Input name="emergencyContact" value={formData.emergencyContact || ""} onChange={handleChange} />
                            </div>
                            {drawerMode === "add" && (
                                <div className="col-span-2">
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
