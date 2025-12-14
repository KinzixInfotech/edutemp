'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

async function fetchRequests({ schoolId, status }) {
    const params = new URLSearchParams({ schoolId });
    if (status) params.append("status", status);
    const response = await fetch(`/api/schools/transport/requests?${params}`);
    if (!response.ok) throw new Error("Failed to fetch requests");
    return response.json();
}

async function fetchRoutes({ schoolId }) {
    const response = await fetch(`/api/schools/transport/routes?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch routes");
    return response.json();
}

async function fetchStops({ schoolId, routeId }) {
    const params = new URLSearchParams({ schoolId });
    if (routeId) params.append("routeId", routeId);
    const response = await fetch(`/api/schools/transport/stops?${params}`);
    if (!response.ok) throw new Error("Failed to fetch stops");
    return response.json();
}

async function processRequest({ id, ...data }) {
    const response = await fetch(`/api/schools/transport/requests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to process request");
    return response.json();
}

export default function BusRequestManagement() {
    const { fullUser } = useAuth();
    const [statusFilter, setStatusFilter] = useState("PENDING");
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [formData, setFormData] = useState({});

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const { data: { requests = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["bus-requests", schoolId, statusFilter],
        queryFn: () => fetchRequests({ schoolId, status: statusFilter }),
        enabled: !!schoolId,
    });

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        enabled: !!schoolId,
    });

    const { data: { stops = [] } = {} } = useQuery({
        queryKey: ["bus-stops", schoolId, formData.routeId],
        queryFn: () => fetchStops({ schoolId, routeId: formData.routeId }),
        enabled: !!schoolId && !!formData.routeId,
    });

    const processMutation = useMutation({
        mutationFn: processRequest,
        onMutate: () => setProcessing(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["bus-requests"]);
            setSelectedRequest(null);
            toast.success("Request processed successfully");
        },
        onSettled: () => setProcessing(false),
        onError: () => toast.error("Failed to process request"),
    });

    const handleProcess = (status) => {
        processMutation.mutate({
            id: selectedRequest.id,
            status,
            adminNotes: formData.adminNotes,
            routeId: formData.routeId,
            stopId: formData.stopId,
            processedById: fullUser?.id,
        });
    };

    const handleViewRequest = (request) => {
        setSelectedRequest(request);
        setFormData({
            routeId: request.routeId,
            stopId: request.stopId,
            adminNotes: request.adminNotes || "",
        });
    };

    const pendingCount = requests.filter(r => r.status === "PENDING").length;
    const approvedCount = requests.filter(r => r.status === "APPROVED").length;

    const statusColors = { PENDING: "warning", APPROVED: "success", REJECTED: "destructive", IN_REVIEW: "secondary" };
    const typeLabels = { NEW: "New Service", CHANGE_STOP: "Change Stop", CHANGE_ROUTE: "Change Route", CANCEL: "Cancel Service" };

    return (
        <div className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{total}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                            {requests.filter(r => r.status === "REJECTED").length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex justify-between">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[900px]">
                    <TableHeader>
                        <TableRow className="bg-muted">
                            <TableHead>Request Date</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Class</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Request Type</TableHead>
                            <TableHead>Preferred Stop</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            Array(4).fill(0).map((_, i) => (
                                <TableRow key={i}>
                                    {Array(8).fill(0).map((_, j) => (
                                        <TableCell key={j}><Skeleton className="h-6 w-16" /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : requests.length > 0 ? (
                            requests.map((request, index) => (
                                <TableRow key={request.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                                    <TableCell>{format(new Date(request.createdAt), 'MMM dd, yyyy')}</TableCell>
                                    <TableCell className="font-medium">{request.student?.name}</TableCell>
                                    <TableCell>{request.student?.class?.className}</TableCell>
                                    <TableCell>{request.parent?.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{typeLabels[request.requestType]}</Badge>
                                    </TableCell>
                                    <TableCell>{request.preferredStop || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={statusColors[request.status]}>{request.status}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" onClick={() => handleViewRequest(request)}>
                                            {request.status === "PENDING" ? "Process" : "View"}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                    No bus requests found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Process Drawer */}
            <Drawer open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)} direction="right">
                <DrawerContent className="w-[450px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>Process Bus Request</DrawerTitle>
                    </DrawerHeader>
                    {selectedRequest && (
                        <div className="p-4 flex-1 overflow-y-auto space-y-4">
                            <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                                <div><Label className="text-muted-foreground">Student</Label><p className="font-medium">{selectedRequest.student?.name}</p></div>
                                <div><Label className="text-muted-foreground">Admission No</Label><p className="font-medium">{selectedRequest.student?.admissionNo}</p></div>
                                <div><Label className="text-muted-foreground">Parent</Label><p className="font-medium">{selectedRequest.parent?.name}</p></div>
                                <div><Label className="text-muted-foreground">Contact</Label><p className="font-medium">{selectedRequest.parent?.contactNumber}</p></div>
                                <div className="col-span-2"><Label className="text-muted-foreground">Request Type</Label><Badge className="mt-1" variant="outline">{typeLabels[selectedRequest.requestType]}</Badge></div>
                                {selectedRequest.preferredStop && <div className="col-span-2"><Label className="text-muted-foreground">Preferred Stop</Label><p className="font-medium">{selectedRequest.preferredStop}</p></div>}
                                {selectedRequest.reason && <div className="col-span-2"><Label className="text-muted-foreground">Reason</Label><p>{selectedRequest.reason}</p></div>}
                            </div>

                            {selectedRequest.status === "PENDING" && (
                                <div className="space-y-4">
                                    <div>
                                        <Label>Assign Route</Label>
                                        <Select value={formData.routeId || ""} onValueChange={(v) => setFormData({ ...formData, routeId: v, stopId: "" })}>
                                            <SelectTrigger><SelectValue placeholder="Select Route" /></SelectTrigger>
                                            <SelectContent>
                                                {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {formData.routeId && (
                                        <div>
                                            <Label>Assign Stop</Label>
                                            <Select value={formData.stopId || ""} onValueChange={(v) => setFormData({ ...formData, stopId: v })}>
                                                <SelectTrigger><SelectValue placeholder="Select Stop" /></SelectTrigger>
                                                <SelectContent>
                                                    {stops.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                    <div>
                                        <Label>Admin Notes</Label>
                                        <Textarea value={formData.adminNotes || ""} onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })} placeholder="Add notes..." />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleProcess("APPROVED")} disabled={processing} className="flex-1 bg-green-600 hover:bg-green-700">
                                            {processing ? <Loader2 className="animate-spin" size={18} /> : <><CheckCircle className="h-4 w-4 mr-2" /> Approve</>}
                                        </Button>
                                        <Button onClick={() => handleProcess("REJECTED")} disabled={processing} variant="destructive" className="flex-1">
                                            {processing ? <Loader2 className="animate-spin" size={18} /> : <><XCircle className="h-4 w-4 mr-2" /> Reject</>}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DrawerContent>
            </Drawer>
        </div>
    );
}
