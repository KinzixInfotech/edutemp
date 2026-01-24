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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Plus, Search, Bus, Calendar, PlayCircle, CheckCircle, Clock, Edit2, Trash2, ChevronLeft, ChevronRight, Eye, UserCheck, RefreshCw, MapPin } from "lucide-react";

async function fetchTrips({ schoolId, search, date, status, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    if (date) params.append("date", date);
    if (status) params.append("status", status);
    params.append("page", page);
    params.append("limit", limit);
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

async function fetchStaff({ schoolId, role }) {
    const response = await fetch(`/api/schools/transport/staff?schoolId=${schoolId}&role=${role}`);
    if (!response.ok) throw new Error("Failed to fetch staff");
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

async function deleteTrip(id) {
    const response = await fetch(`/api/schools/transport/trips/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete trip");
    return true;
}

// Route Assignment API functions
async function fetchRouteAssignments({ schoolId }) {
    const response = await fetch(`/api/schools/transport/route-assignments?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch route assignments");
    return response.json();
}

async function createRouteAssignment(data) {
    const response = await fetch("/api/schools/transport/route-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create assignment");
    }
    return response.json();
}

async function deleteRouteAssignment(routeId) {
    const response = await fetch(`/api/schools/transport/route-assignments?routeId=${routeId}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete assignment");
    return true;
}

async function generateTripsFromAssignments({ schoolId, date, senderId }) {
    const response = await fetch("/api/schools/transport/route-assignments/generate-trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, date, senderId }),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate trips");
    }
    return response.json();
}

export default function TripManagement() {
    const { fullUser } = useAuth();
    const [activeTab, setActiveTab] = useState("trips");
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [formData, setFormData] = useState({});
    const [search, setSearch] = useState("");
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [saving, setSaving] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    // Assignment state
    const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
    const [deleteAssignmentDialogOpen, setDeleteAssignmentDialogOpen] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentFormData, setAssignmentFormData] = useState({});
    const [generateDate, setGenerateDate] = useState(new Date().toISOString().split('T')[0]);

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const limit = 10;

    const { data: { trips = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["trips", schoolId, search, dateFilter, statusFilter, page],
        queryFn: () => fetchTrips({ schoolId, search, date: dateFilter, status: statusFilter, page, limit }),
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
        queryFn: () => fetchStaff({ schoolId, role: 'DRIVER' }),
        enabled: !!schoolId,
    });

    const { data: { staff: conductors = [] } = {} } = useQuery({
        queryKey: ["conductors", schoolId],
        queryFn: () => fetchStaff({ schoolId, role: 'CONDUCTOR' }),
        enabled: !!schoolId,
    });

    const createMutation = useMutation({
        mutationFn: createTrip,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["trips"]);
            setDialogOpen(false);
            toast.success("Trip scheduled successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteTrip,
        onSuccess: () => {
            queryClient.invalidateQueries(["trips"]);
            setDeleteDialogOpen(false);
            toast.success("Trip deleted");
        },
        onError: () => toast.error("Failed to delete trip"),
    });

    // Route Assignments Query and Mutations
    const { data: { assignments = [] } = {}, isLoading: assignmentsLoading } = useQuery({
        queryKey: ["routeAssignments", schoolId],
        queryFn: () => fetchRouteAssignments({ schoolId }),
        enabled: !!schoolId,
    });

    const assignmentMutation = useMutation({
        mutationFn: createRouteAssignment,
        onMutate: () => setSaving(true),
        onSuccess: (data) => {
            queryClient.invalidateQueries(["routeAssignments"]);
            setAssignmentDialogOpen(false);
            setAssignmentFormData({});
            toast.success(data.message || "Driver assigned successfully");
        },
        onSettled: () => setSaving(false),
        onError: (error) => toast.error(error.message),
    });

    const deleteAssignmentMutation = useMutation({
        mutationFn: deleteRouteAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries(["routeAssignments"]);
            setDeleteAssignmentDialogOpen(false);
            toast.success("Assignment removed");
        },
        onError: () => toast.error("Failed to remove assignment"),
    });

    const generateTripsMutation = useMutation({
        mutationFn: generateTripsFromAssignments,
        onSuccess: (data) => {
            queryClient.invalidateQueries(["trips"]);
            toast.success(`${data.message}. Created: ${data.created}, Skipped: ${data.skipped}`);
        },
        onError: (error) => toast.error(error.message),
    });

    const validateForm = () => {
        const errors = {};
        if (!formData.routeId) errors.routeId = "Route is required";
        if (!formData.vehicleId) errors.vehicleId = "Vehicle is required";
        if (!formData.driverId) errors.driverId = "Driver is required";
        if (!formData.tripDate) errors.tripDate = "Date is required";
        if (!formData.tripType) errors.tripType = "Trip type is required";
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;
        // Convert tripDate to date for API
        const { tripDate, ...rest } = formData;
        createMutation.mutate({ ...rest, date: tripDate, schoolId });
    };

    const handleAdd = () => {
        setFormData({ tripDate: new Date().toISOString().split('T')[0], tripType: 'PICKUP' });
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleDeleteClick = (trip) => {
        setSelectedTrip(trip);
        setDeleteDialogOpen(true);
    };

    const handleViewDetails = (trip) => {
        setSelectedTrip(trip);
        setDetailsDialogOpen(true);
    };

    // Assignment handlers
    const handleAddAssignment = () => {
        setAssignmentFormData({});
        setAssignmentDialogOpen(true);
    };

    const handleAssignmentSubmit = () => {
        if (!assignmentFormData.routeId || !assignmentFormData.vehicleId || !assignmentFormData.driverId) {
            toast.error("Route, vehicle, and driver are required");
            return;
        }
        assignmentMutation.mutate({
            ...assignmentFormData,
            schoolId,
            senderId: fullUser?.id
        });
    };

    const handleDeleteAssignment = (assignment) => {
        setSelectedAssignment(assignment);
        setDeleteAssignmentDialogOpen(true);
    };

    const handleGenerateTrips = () => {
        generateTripsMutation.mutate({
            schoolId,
            date: generateDate,
            senderId: fullUser?.id
        });
    };

    // Get routes without assignments for the dropdown
    const assignedRouteIds = assignments.map(a => a.routeId);
    const availableRoutes = routes.filter(r => !assignedRouteIds.includes(r.id) || r.id === assignmentFormData.routeId);

    // Stats
    const scheduledTrips = trips.filter(t => t.status === 'SCHEDULED').length;
    const inProgressTrips = trips.filter(t => t.status === 'IN_PROGRESS').length;
    const completedTrips = trips.filter(t => t.status === 'COMPLETED').length;
    const totalPages = Math.ceil(total / limit);

    const statusConfig = {
        SCHEDULED: { label: "Scheduled", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
        IN_PROGRESS: { label: "In Progress", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
        COMPLETED: { label: "Completed", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
        CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Trip Management</h1>
                    <p className="text-muted-foreground text-sm mt-1">Schedule trips and manage permanent route assignments</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="trips" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> Daily Trips
                    </TabsTrigger>
                    <TabsTrigger value="assignments" className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4" /> Permanent Assignments
                    </TabsTrigger>
                </TabsList>

                {/* Daily Trips Tab */}
                <TabsContent value="trips" className="space-y-6 mt-6">
                    <div className="flex justify-end">
                        <Button onClick={handleAdd}>
                            <Plus className="h-4 w-4 mr-2" /> Schedule Trip
                        </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
                                <Bus className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                                <Clock className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-blue-600">{scheduledTrips}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                                <PlayCircle className="h-4 w-4 text-yellow-600" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-yellow-600">{inProgressTrips}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-green-600">{completedTrips}</div></CardContent>
                        </Card>
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 dark:bg-muted bg-white" />
                        </div>
                        <Input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }} className="w-auto dark:bg-muted bg-white" />
                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === "all" ? "" : val); setPage(1); }}>
                            <SelectTrigger className="w-[150px] dark:bg-muted bg-white">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-muted bg-white">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                <SelectItem value="COMPLETED">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-lg border overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table className={'bg-white dark:bg-muted'}>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead>Vehicle</TableHead>
                                        <TableHead>Driver</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        Array(5).fill(0).map((_, i) => (
                                            <TableRow key={i}>{Array(8).fill(0).map((_, j) => (<TableCell key={j}><Skeleton className="h-5 w-20" /></TableCell>))}</TableRow>
                                        ))
                                    ) : trips.length > 0 ? (
                                        trips.map((trip, index) => (
                                            <TableRow key={trip.id} className="hover:bg-muted/30">
                                                <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                                                <TableCell className="font-semibold">{trip.route?.name || "N/A"}</TableCell>
                                                <TableCell><Badge variant="outline">{trip.vehicle?.licensePlate || "N/A"}</Badge></TableCell>
                                                <TableCell>{trip.driver?.name || "N/A"}</TableCell>
                                                <TableCell>
                                                    <Badge variant={trip.tripType === 'PICKUP' ? 'default' : 'secondary'}>
                                                        {trip.tripType === 'PICKUP' ? '🌅 Pickup' : '🌆 Drop'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{new Date(trip.date).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[trip.status]?.className || ''}`}>
                                                        {statusConfig[trip.status]?.label || trip.status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex justify-end gap-1">
                                                        <Button size="sm" variant="ghost" onClick={() => handleViewDetails(trip)}><Eye className="h-4 w-4" /></Button>
                                                        {trip.status === 'SCHEDULED' && (
                                                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteClick(trip)}><Trash2 className="h-4 w-4" /></Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12">
                                                <Bus className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                                <p className="text-muted-foreground">No trips found for selected date</p>
                                                <Button variant="link" onClick={handleAdd} className="mt-2">Schedule a trip</Button>
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

                    {/* Schedule Trip Dialog */}
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Schedule New Trip</DialogTitle>
                                <DialogDescription>Create a new bus trip for a route</DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Route <span className="text-destructive">*</span></Label>
                                        <Select value={formData.routeId || ""} onValueChange={(val) => setFormData({ ...formData, routeId: val })}>
                                            <SelectTrigger className={formErrors.routeId ? "border-destructive" : ""}>
                                                <SelectValue placeholder="Select route" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {routes.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.routeId && <p className="text-xs text-destructive">{formErrors.routeId}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Vehicle <span className="text-destructive">*</span></Label>
                                        <Select value={formData.vehicleId || ""} onValueChange={(val) => setFormData({ ...formData, vehicleId: val })}>
                                            <SelectTrigger className={formErrors.vehicleId ? "border-destructive" : ""}>
                                                <SelectValue placeholder="Select vehicle" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {vehicles.filter(v => v.status === 'active').map((v) => (<SelectItem key={v.id} value={v.id}>{v.licensePlate}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.vehicleId && <p className="text-xs text-destructive">{formErrors.vehicleId}</p>}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Driver <span className="text-destructive">*</span></Label>
                                        <Select value={formData.driverId || ""} onValueChange={(val) => setFormData({ ...formData, driverId: val })}>
                                            <SelectTrigger className={formErrors.driverId ? "border-destructive" : ""}>
                                                <SelectValue placeholder="Select driver" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {drivers.filter(d => d.isActive).map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                        {formErrors.driverId && <p className="text-xs text-destructive">{formErrors.driverId}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Conductor</Label>
                                        <Select value={formData.conductorId || "none"} onValueChange={(val) => setFormData({ ...formData, conductorId: val === "none" ? null : val })}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select conductor" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">No conductor</SelectItem>
                                                {conductors.filter(c => c.isActive).map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Date <span className="text-destructive">*</span></Label>
                                        <Input type="date" value={formData.tripDate || ""} onChange={(e) => setFormData({ ...formData, tripDate: e.target.value })} className={formErrors.tripDate ? "border-destructive" : ""} />
                                        {formErrors.tripDate && <p className="text-xs text-destructive">{formErrors.tripDate}</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Trip Type <span className="text-destructive">*</span></Label>
                                        <Select value={formData.tripType || "PICKUP"} onValueChange={(val) => setFormData({ ...formData, tripType: val })}>
                                            <SelectTrigger className={formErrors.tripType ? "border-destructive" : ""}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="PICKUP">🌅 Morning Pickup</SelectItem>
                                                <SelectItem value="DROP">🌆 Afternoon Drop</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {formErrors.tripType && <p className="text-xs text-destructive">{formErrors.tripType}</p>}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={saving}>
                                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Scheduling...</> : "Schedule Trip"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Trip Details Dialog */}
                    <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                        <DialogContent className="sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>Trip Details</DialogTitle>
                            </DialogHeader>
                            {selectedTrip && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><p className="text-sm text-muted-foreground">Route</p><p className="font-medium">{selectedTrip.route?.name}</p></div>
                                        <div><p className="text-sm text-muted-foreground">Vehicle</p><p className="font-medium">{selectedTrip.vehicle?.licensePlate}</p></div>
                                        <div><p className="text-sm text-muted-foreground">Driver</p><p className="font-medium">{selectedTrip.driver?.name}</p></div>
                                        <div><p className="text-sm text-muted-foreground">Conductor</p><p className="font-medium">{selectedTrip.conductor?.name || "N/A"}</p></div>
                                        <div><p className="text-sm text-muted-foreground">Date</p><p className="font-medium">{new Date(selectedTrip.date).toLocaleDateString()}</p></div>
                                        <div><p className="text-sm text-muted-foreground">Type</p><Badge>{selectedTrip.tripType}</Badge></div>
                                        <div><p className="text-sm text-muted-foreground">Status</p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedTrip.status]?.className || ''}`}>{statusConfig[selectedTrip.status]?.label}</span></div>
                                        {selectedTrip.startTime && <div><p className="text-sm text-muted-foreground">Started</p><p className="font-medium">{new Date(selectedTrip.startTime).toLocaleTimeString()}</p></div>}
                                        {selectedTrip.endTime && <div><p className="text-sm text-muted-foreground">Ended</p><p className="font-medium">{new Date(selectedTrip.endTime).toLocaleTimeString()}</p></div>}
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>

                    {/* Delete Trip Confirmation */}
                    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Cancel Trip</DialogTitle>
                                <DialogDescription>Are you sure you want to cancel this trip?</DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Keep Trip</Button>
                                <Button variant="destructive" onClick={() => deleteMutation.mutate(selectedTrip?.id)} disabled={deleteMutation.isPending}>
                                    {deleteMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Cancelling...</> : "Cancel Trip"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* Permanent Assignments Tab */}
                <TabsContent value="assignments" className="space-y-6 mt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="generateDate" className="whitespace-nowrap">Generate trips for:</Label>
                                <Input
                                    type="date"
                                    id="generateDate"
                                    value={generateDate}
                                    onChange={(e) => setGenerateDate(e.target.value)}
                                    className="w-40"
                                />
                            </div>
                            <Button onClick={handleGenerateTrips} disabled={generateTripsMutation.isPending || assignments.length === 0} variant="outline">
                                {generateTripsMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : <><RefreshCw className="h-4 w-4 mr-2" />Generate Trips</>}
                            </Button>
                        </div>
                        <Button onClick={handleAddAssignment}>
                            <Plus className="h-4 w-4 mr-2" /> Assign Driver
                        </Button>
                    </div>

                    {/* On-Demand Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="shrink-0">
                                <Bus className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium text-blue-900 dark:text-blue-200">On-Demand Trips Enabled</p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                    Drivers can now start trips directly from their app without pre-scheduled trips.
                                    Trips are created automatically when drivers tap "Start Trip".
                                </p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                                    <strong>Generate Trips</strong> is optional - use it only if you want to pre-schedule trips for a specific date.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{assignments.length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Active Assignments</CardTitle>
                                <CheckCircle className="h-4 w-4 text-green-600" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-green-600">{assignments.filter(a => a.isActive).length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Routes</CardTitle>
                                <MapPin className="h-4 w-4 text-blue-600" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-blue-600">{routes.length}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium">Unassigned Routes</CardTitle>
                                <Clock className="h-4 w-4 text-yellow-600" />
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold text-yellow-600">{routes.length - assignments.length}</div></CardContent>
                        </Card>
                    </div>

                    {/* Assignments Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Permanent Route Assignments</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {assignmentsLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : assignments.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-40" />
                                    <p>No permanent assignments yet</p>
                                    <p className="text-sm">Assign drivers to routes to generate trips automatically</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Route</TableHead>
                                                <TableHead>Vehicle</TableHead>
                                                <TableHead>Driver</TableHead>
                                                <TableHead>Conductor</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {assignments.map((assignment) => (
                                                <TableRow key={assignment.id}>
                                                    <TableCell className="font-medium">{assignment.route?.name}</TableCell>
                                                    <TableCell>{assignment.vehicle?.licensePlate}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {assignment.driver?.profilePicture ? (
                                                                <img src={assignment.driver.profilePicture} alt="" className="h-8 w-8 rounded-full object-cover" />
                                                            ) : (
                                                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                                    {assignment.driver?.name?.charAt(0)}
                                                                </div>
                                                            )}
                                                            <span>{assignment.driver?.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{assignment.conductor?.name || <span className="text-muted-foreground">None</span>}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={assignment.isActive ? "default" : "secondary"}>
                                                            {assignment.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setAssignmentFormData({
                                                                        routeId: assignment.routeId,
                                                                        vehicleId: assignment.vehicleId,
                                                                        driverId: assignment.driverId,
                                                                        conductorId: assignment.conductorId
                                                                    });
                                                                    setAssignmentDialogOpen(true);
                                                                }}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteAssignment(assignment)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Assign Driver Dialog */}
            <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Assign Driver to Route</DialogTitle>
                        <DialogDescription>Permanently assign a driver and vehicle to this route. Driver will be notified.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label>Route <span className="text-destructive">*</span></Label>
                            <Select value={assignmentFormData.routeId || ""} onValueChange={(val) => setAssignmentFormData({ ...assignmentFormData, routeId: val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select route" />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoutes.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Vehicle <span className="text-destructive">*</span></Label>
                                <Select value={assignmentFormData.vehicleId || ""} onValueChange={(val) => setAssignmentFormData({ ...assignmentFormData, vehicleId: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select vehicle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {vehicles.filter(v => v.status === 'active').map((v) => (<SelectItem key={v.id} value={v.id}>{v.licensePlate} ({v.model})</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Driver <span className="text-destructive">*</span></Label>
                                <Select value={assignmentFormData.driverId || ""} onValueChange={(val) => setAssignmentFormData({ ...assignmentFormData, driverId: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select driver" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {drivers.filter(d => d.isActive).map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Conductor (Optional)</Label>
                            <Select value={assignmentFormData.conductorId || "none"} onValueChange={(val) => setAssignmentFormData({ ...assignmentFormData, conductorId: val === "none" ? null : val })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select conductor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No conductor</SelectItem>
                                    {conductors.filter(c => c.isActive).map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button onClick={handleAssignmentSubmit} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Assigning...</> : "Assign Driver"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Assignment Confirmation */}
            <Dialog open={deleteAssignmentDialogOpen} onOpenChange={setDeleteAssignmentDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Remove Assignment</DialogTitle>
                        <DialogDescription>Are you sure you want to remove this permanent assignment? The driver will be notified.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setDeleteAssignmentDialogOpen(false)}>Keep Assignment</Button>
                        <Button variant="destructive" onClick={() => deleteAssignmentMutation.mutate(selectedAssignment?.routeId)} disabled={deleteAssignmentMutation.isPending}>
                            {deleteAssignmentMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Removing...</> : "Remove Assignment"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

