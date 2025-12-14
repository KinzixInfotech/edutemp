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
import { Loader2, Plus, Calendar, Bus, PlayCircle, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

async function fetchTrips({ schoolId, date, status }) {
    const params = new URLSearchParams({ schoolId });
    if (date) params.append("date", date);
    if (status) params.append("status", status);
    const response = await fetch(`/api/schools/transport/trips?${params}`);
    if (!response.ok) throw new Error("Failed to fetch trips");
    return response.json();
}

async function fetchRoutes({ schoolId }) {
    const response = await fetch(`/api/schools/transport/routes?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch routes");
    return response.json();
}

async function fetchVehicles({ schoolId }) {
    const response = await fetch(`/api/schools/transport/vehicle?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch vehicles");
    return response.json();
}

async function fetchDrivers({ schoolId }) {
    const params = new URLSearchParams({ schoolId, role: 'DRIVER', isActive: 'true' });
    const response = await fetch(`/api/schools/transport/staff?${params}`);
    if (!response.ok) throw new Error("Failed to fetch drivers");
    return response.json();
}

async function fetchConductors({ schoolId }) {
    const params = new URLSearchParams({ schoolId, role: 'CONDUCTOR', isActive: 'true' });
    const response = await fetch(`/api/schools/transport/staff?${params}`);
    if (!response.ok) throw new Error("Failed to fetch conductors");
    return response.json();
}

async function createTrip(data) {
    const response = await fetch("/api/schools/transport/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create trip");
    }
    return response.json();
}

export default function TripManagement() {
    const { fullUser } = useAuth();
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({});
    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [statusFilter, setStatusFilter] = useState("");
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { trips = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["trips", schoolId, selectedDate, statusFilter],
        queryFn: () => fetchTrips({ schoolId, date: selectedDate, status: statusFilter }),
        enabled: !!schoolId,
        staleTime: 60 * 1000,
    });

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        enabled: !!schoolId,
    });

    const { data: { vehicles = [] } = {} } = useQuery({
        queryKey: ["vehicles", schoolId],
        queryFn: () => fetchVehicles({ schoolId }),
        enabled: !!schoolId,
    });

    const { data: { staff: drivers = [] } = {} } = useQuery({
        queryKey: ["drivers", schoolId],
        queryFn: () => fetchDrivers({ schoolId }),
        enabled: !!schoolId,
    });

    const { data: { staff: conductors = [] } = {} } = useQuery({
        queryKey: ["conductors", schoolId],
        queryFn: () => fetchConductors({ schoolId }),
        enabled: !!schoolId,
    });

    const createMutation = useMutation({
        mutationFn: createTrip,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["trips"]);
            setDrawerMode(null);
            toast.success("Trip scheduled successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const handleSubmit = () => {
        setFormError("");
        if (!formData.vehicleId || !formData.routeId || !formData.driverId || !formData.tripType || !formData.date) {
            setFormError("Vehicle, Route, Driver, Type, and Date are required");
            return;
        }
        createMutation.mutate(formData);
    };

    const handleAdd = () => { setFormData({ date: selectedDate }); setDrawerMode("add"); };

    const statusColors = {
        SCHEDULED: "secondary",
        IN_PROGRESS: "default",
        COMPLETED: "success",
        CANCELLED: "destructive"
    };

    const StatusIcon = ({ status }) => {
        switch (status) {
            case "SCHEDULED": return <Calendar className="h-4 w-4" />;
            case "IN_PROGRESS": return <PlayCircle className="h-4 w-4 text-blue-500" />;
            case "COMPLETED": return <CheckCircle className="h-4 w-4 text-green-500" />;
            case "CANCELLED": return <XCircle className="h-4 w-4 text-red-500" />;
            default: return null;
        }
    };

    const scheduledTrips = trips.filter(t => t.status === "SCHEDULED").length;
    const inProgressTrips = trips.filter(t => t.status === "IN_PROGRESS").length;
    const completedTrips = trips.filter(t => t.status === "COMPLETED").length;

    return (
        <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                        <Bus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                        <Calendar className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{scheduledTrips}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                        <PlayCircle className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{inProgressTrips}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Completed</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{completedTrips}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
                <div className="flex gap-4">
                    <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[160px]" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="COMPLETED">Completed</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="h-4 w-4 mr-2" /> Schedule Trip
                </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[1000px]">
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Route</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Driver</TableHead>
                            <TableHead>Conductor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Started</TableHead>
                            <TableHead>Attendance</TableHead>
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
                        ) : trips.length > 0 ? (
                            trips.map((trip, index) => (
                                <TableRow key={trip.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                                    <TableCell>{format(new Date(trip.date), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell>
                                        <Badge variant={trip.tripType === "PICKUP" ? "default" : "outline"}>
                                            {trip.tripType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">{trip.route?.name}</TableCell>
                                    <TableCell>{trip.vehicle?.licensePlate}</TableCell>
                                    <TableCell>{trip.driver?.name}</TableCell>
                                    <TableCell>{trip.conductor?.name || "-"}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <StatusIcon status={trip.status} />
                                            <Badge variant={statusColors[trip.status]}>{trip.status}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {trip.startedAt ? format(new Date(trip.startedAt), 'HH:mm') : "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{trip._count?.attendanceRecords || 0}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                    No trips found for selected date. Schedule a new trip.
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
                        <DrawerTitle>Schedule Trip</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto space-y-4">
                        {formError && <p className="text-red-500 text-sm">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label>Date*</Label>
                                <Input type="date" name="date" value={formData.date || ""} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                            </div>
                            <div>
                                <Label>Trip Type*</Label>
                                <Select value={formData.tripType || ""} onValueChange={(v) => setFormData({ ...formData, tripType: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PICKUP">PICKUP (Morning)</SelectItem>
                                        <SelectItem value="DROP">DROP (Afternoon)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
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
                                <Label>Vehicle*</Label>
                                <Select value={formData.vehicleId || ""} onValueChange={(v) => setFormData({ ...formData, vehicleId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                                    <SelectContent>
                                        {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.licensePlate} - {v.model}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Driver*</Label>
                                <Select value={formData.driverId || ""} onValueChange={(v) => setFormData({ ...formData, driverId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Select Driver" /></SelectTrigger>
                                    <SelectContent>
                                        {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name} ({d.employeeId})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Conductor (optional)</Label>
                                <Select value={formData.conductorId || ""} onValueChange={(v) => setFormData({ ...formData, conductorId: v || null })}>
                                    <SelectTrigger><SelectValue placeholder="Select Conductor" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None</SelectItem>
                                        {conductors.map(c => <SelectItem key={c.id} value={c.id}>{c.name} ({c.employeeId})</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Input name="notes" value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                            </div>
                        </div>
                        <Button onClick={handleSubmit} disabled={saving} className="w-full mt-4">
                            {saving ? <><Loader2 className="animate-spin mr-2" size={18} /> Scheduling...</> : "Schedule Trip"}
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
