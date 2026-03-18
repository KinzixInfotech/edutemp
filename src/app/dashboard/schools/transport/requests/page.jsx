'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Search, FileText, Clock, CheckCircle, XCircle, Eye, ChevronLeft, ChevronRight, Bus, IndianRupee, AlertTriangle } from "lucide-react";

const INR = (n) => `₹${(n || 0).toLocaleString('en-IN')}`;

async function fetchRequests({ schoolId, search, status, page = 1, limit = 10 }) {
    const params = new URLSearchParams({ schoolId });
    if (search) params.append("search", search);
    if (status) params.append("status", status);
    params.append("page", page);
    params.append("limit", limit);
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
    const [processDialogOpen, setProcessDialogOpen] = useState(false);
    const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [saving, setSaving] = useState(false);
    const [processData, setProcessData] = useState({});
    const [selectedRouteId, setSelectedRouteId] = useState("");

    // Fee activation state
    const [activateTransportFee, setActivateTransportFee] = useState(true);
    const [transportParticular, setTransportParticular] = useState(null);
    const [feeCheckStatus, setFeeCheckStatus] = useState(null);

    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;
    const limit = 10;

    // Get active academic year
    const { data: academicYears = [] } = useQuery({
        queryKey: ['academic-years', schoolId],
        queryFn: async () => {
            const r = await fetch(`/api/schools/academic-years?schoolId=${schoolId}`);
            const d = await r.json();
            return Array.isArray(d) ? d : (d.academicYears || []);
        },
        enabled: !!schoolId,
        staleTime: 5 * 60 * 1000,
    });
    const activeYear = academicYears.find(y => y.isActive);

    const { data: { requests = [], total = 0 } = {}, isLoading } = useQuery({
        queryKey: ["bus-requests", schoolId, search, statusFilter, page],
        queryFn: () => fetchRequests({ schoolId, search, status: statusFilter, page, limit }),
        enabled: !!schoolId,
        staleTime: 60 * 1000,
    });

    const { data: { routes = [] } = {} } = useQuery({
        queryKey: ["routes", schoolId],
        queryFn: () => fetchRoutes({ schoolId }),
        enabled: !!schoolId && processDialogOpen,
    });

    const { data: { stops = [] } = {} } = useQuery({
        queryKey: ["stops", schoolId, selectedRouteId],
        queryFn: () => fetchStops({ schoolId, routeId: selectedRouteId }),
        enabled: !!schoolId && !!selectedRouteId && processDialogOpen,
    });

    // When process dialog opens for APPROVE, check the student's fee structure
    useEffect(() => {
        if (!processDialogOpen || processData.status !== 'APPROVED' || !selectedRequest?.studentId || !activeYear?.id || !schoolId) {
            return;
        }

        setFeeCheckStatus('loading');
        setTransportParticular(null);

        (async () => {
            try {
                const r = await fetch(`/api/schools/fee/global-structures?schoolId=${schoolId}&academicYearId=${activeYear.id}`);
                const structures = await r.json();
                if (!Array.isArray(structures) || structures.length === 0) {
                    setFeeCheckStatus('no-structure');
                    return;
                }

                // Look for the transport particular in any structure (we'll match by student's class ideally)
                let transportPart = null;
                for (const structure of structures) {
                    const found = (structure?.particulars || []).find(
                        p => p.isOptional && p.name?.toLowerCase().includes('transport')
                    );
                    if (found) {
                        transportPart = found;
                        break;
                    }
                }

                if (transportPart) {
                    setTransportParticular(transportPart);
                    setFeeCheckStatus('found');
                } else {
                    setFeeCheckStatus('not-found');
                }
            } catch (err) {
                console.error("Fee check error:", err);
                setFeeCheckStatus('no-structure');
            }
        })();
    }, [processDialogOpen, processData.status, selectedRequest?.studentId, activeYear?.id, schoolId]);

    const processMutation = useMutation({
        mutationFn: async (data) => {
            const { id, ...payload } = data;
            const result = await processRequest({ id, ...payload });

            // If approving and fee activation is checked, activate transport fee
            if (payload.status === 'APPROVED' && activateTransportFee && transportParticular && activeYear?.id && selectedRequest?.studentId) {
                try {
                    const feeRes = await fetch('/api/schools/fee/student-services', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'activate-optional',
                            studentId: selectedRequest.studentId,
                            particularId: transportParticular.id,
                            schoolId,
                            academicYearId: activeYear.id,
                            userId: fullUser?.id,
                        }),
                    });
                    const feeData = await feeRes.json();
                    if (feeRes.ok) {
                        result.feeActivated = true;
                        result.ledgerEntries = feeData.ledgerEntriesCreated;
                        result.feeAmount = feeData.monthlyAmount;
                    } else if (feeData.alreadyActive) {
                        result.feeMessage = "Transport fee already active";
                    } else {
                        result.feeMessage = feeData.error;
                    }
                } catch (err) {
                    result.feeMessage = "Fee activation failed — can be done manually";
                }
            }

            return result;
        },
        onMutate: () => setSaving(true),
        onSuccess: (result) => {
            queryClient.invalidateQueries(["bus-requests"]);
            setProcessDialogOpen(false);
            if (result.feeActivated) {
                toast.success(`Request approved! Transport fee activated — ${result.ledgerEntries} ledger entries (${INR(result.feeAmount)}/mo)`);
            } else if (result.feeMessage) {
                toast.success("Request processed", { description: result.feeMessage });
            } else {
                toast.success("Request processed successfully");
            }
        },
        onSettled: () => setSaving(false),
        onError: () => toast.error("Failed to process request"),
    });

    const handleProcess = (request, action) => {
        setSelectedRequest(request);
        setProcessData({ status: action, adminNotes: "" });
        setSelectedRouteId("");
        setActivateTransportFee(true);
        setTransportParticular(null);
        setFeeCheckStatus(null);
        setProcessDialogOpen(true);
    };

    const handleViewDetails = (request) => {
        setSelectedRequest(request);
        setDetailsDialogOpen(true);
    };

    const handleSubmitProcess = () => {
        if (processData.status === 'APPROVED' && (!processData.routeId || !processData.stopId)) {
            toast.error("Please select route and stop for approved requests");
            return;
        }
        processMutation.mutate({
            id: selectedRequest.id,
            ...processData,
        });
    };

    // Stats
    const pendingRequests = requests.filter(r => r.status === 'PENDING').length;
    const approvedRequests = requests.filter(r => r.status === 'APPROVED').length;
    const rejectedRequests = requests.filter(r => r.status === 'REJECTED').length;
    const totalPages = Math.ceil(total / limit);

    const statusConfig = {
        PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
        APPROVED: { label: "Approved", className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
        REJECTED: { label: "Rejected", className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
    };

    const requestTypeLabels = {
        NEW: "New Service",
        CHANGE_STOP: "Change Stop",
        CANCEL: "Cancel Service",
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Bus Requests</h1>
                    <p className="text-muted-foreground text-sm mt-1">Review and process parent requests</p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-yellow-600">{pendingRequests}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-green-600">{approvedRequests}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent><div className="text-2xl font-bold text-red-600">{rejectedRequests}</div></CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by student or parent..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10 bg-white dark:bg-muted" />
                </div>
                <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === "all" ? "" : val); setPage(1); }}>
                    <SelectTrigger className="w-[150px] bg-white dark:bg-muted">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent className={'bg-white dark:bg-muted'}>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className={'bg-white dark:bg-muted'}>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Parent</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Preferred Stop</TableHead>
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
                            ) : requests.length > 0 ? (
                                requests.map((request, index) => (
                                    <TableRow key={request.id} className="hover:bg-muted/30">
                                        <TableCell className="text-muted-foreground">{(page - 1) * limit + index + 1}</TableCell>
                                        <TableCell className="font-semibold">{request.student?.name || "N/A"}</TableCell>
                                        <TableCell>{request.parent?.name || "N/A"}</TableCell>
                                        <TableCell>
                                            <Badge variant={request.requestType === 'CANCEL' ? 'destructive' : 'outline'}>
                                                {requestTypeLabels[request.requestType] || request.requestType}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{request.preferredStop || "-"}</TableCell>
                                        <TableCell>{new Date(request.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[request.status]?.className || ''}`}>
                                                {statusConfig[request.status]?.label || request.status}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => handleViewDetails(request)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                {request.status === 'PENDING' && (
                                                    <>
                                                        <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700" onClick={() => handleProcess(request, 'APPROVED')}>
                                                            <CheckCircle className="h-4 w-4" />
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleProcess(request, 'REJECTED')}>
                                                            <XCircle className="h-4 w-4" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-12">
                                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                                        <p className="text-muted-foreground">No bus requests found</p>
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

            {/* Process Request Dialog */}
            <Dialog open={processDialogOpen} onOpenChange={setProcessDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{processData.status === 'APPROVED' ? 'Approve Request' : 'Reject Request'}</DialogTitle>
                        <DialogDescription>
                            {processData.status === 'APPROVED'
                                ? 'Assign a route and stop, and optionally activate transport fee'
                                : 'Provide a reason for rejection'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-sm"><strong>Student:</strong> {selectedRequest?.student?.name}</p>
                            <p className="text-sm"><strong>Type:</strong> {requestTypeLabels[selectedRequest?.requestType]}</p>
                            {selectedRequest?.preferredStop && (
                                <p className="text-sm"><strong>Preferred Stop:</strong> {selectedRequest.preferredStop}</p>
                            )}
                        </div>

                        {processData.status === 'APPROVED' && selectedRequest?.requestType !== 'CANCEL' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Route <span className="text-destructive">*</span></Label>
                                    <Select value={processData.routeId || ""} onValueChange={(val) => { setProcessData({ ...processData, routeId: val, stopId: "" }); setSelectedRouteId(val); }}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select route" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {routes.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Stop <span className="text-destructive">*</span></Label>
                                    <Select value={processData.stopId || ""} onValueChange={(val) => setProcessData({ ...processData, stopId: val })} disabled={!selectedRouteId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder={selectedRouteId ? "Select stop" : "Select route first"} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stops.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Transport Fee Activation */}
                                <div className="rounded-lg border p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Bus className="h-4 w-4 text-blue-600" />
                                        <span>Transport Fee</span>
                                    </div>

                                    {feeCheckStatus === 'loading' && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Checking fee structure...
                                        </div>
                                    )}

                                    {feeCheckStatus === 'found' && transportParticular && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                                                <div className="flex items-center gap-2">
                                                    <IndianRupee className="h-3.5 w-3.5 text-green-600" />
                                                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                                                        {transportParticular.name}: {INR(transportParticular.amount)}/mo
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    id="activateFeeRequest"
                                                    checked={activateTransportFee}
                                                    onCheckedChange={setActivateTransportFee}
                                                />
                                                <Label htmlFor="activateFeeRequest" className="text-sm cursor-pointer">
                                                    Activate transport fee & generate ledger entries
                                                </Label>
                                            </div>
                                        </div>
                                    )}

                                    {feeCheckStatus === 'not-found' && (
                                        <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                                No optional transport fee found in the fee structure.
                                                Add a &quot;Transport Fee&quot; component (marked as <strong>optional</strong>) in Fee Structure editor.
                                            </p>
                                        </div>
                                    )}

                                    {feeCheckStatus === 'no-structure' && (
                                        <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                                            <p className="text-xs text-red-700 dark:text-red-400">
                                                No fee structure found. Can still approve the route — fee can be set up later.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label>Admin Notes</Label>
                            <Textarea placeholder="Add notes for the parent..." value={processData.adminNotes || ""} onChange={(e) => setProcessData({ ...processData, adminNotes: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setProcessDialogOpen(false)} disabled={saving}>Cancel</Button>
                        <Button variant={processData.status === 'APPROVED' ? 'default' : 'destructive'} onClick={handleSubmitProcess} disabled={saving}>
                            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Processing...</> : processData.status === 'APPROVED' ? 'Approve' : 'Reject'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Request Details Dialog */}
            <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Request Details</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><p className="text-sm text-muted-foreground">Student</p><p className="font-medium">{selectedRequest.student?.name}</p></div>
                                <div><p className="text-sm text-muted-foreground">Parent</p><p className="font-medium">{selectedRequest.parent?.name}</p></div>
                                <div><p className="text-sm text-muted-foreground">Request Type</p><Badge>{requestTypeLabels[selectedRequest.requestType]}</Badge></div>
                                <div><p className="text-sm text-muted-foreground">Status</p><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedRequest.status]?.className}`}>{statusConfig[selectedRequest.status]?.label}</span></div>
                                {selectedRequest.preferredStop && <div className="col-span-2"><p className="text-sm text-muted-foreground">Preferred Stop</p><p className="font-medium">{selectedRequest.preferredStop}</p></div>}
                                {selectedRequest.reason && <div className="col-span-2"><p className="text-sm text-muted-foreground">Reason</p><p className="font-medium">{selectedRequest.reason}</p></div>}
                                <div><p className="text-sm text-muted-foreground">Submitted</p><p className="font-medium">{new Date(selectedRequest.createdAt).toLocaleString()}</p></div>
                                {selectedRequest.processedAt && <div><p className="text-sm text-muted-foreground">Processed</p><p className="font-medium">{new Date(selectedRequest.processedAt).toLocaleString()}</p></div>}
                                {selectedRequest.adminNotes && <div className="col-span-2"><p className="text-sm text-muted-foreground">Admin Notes</p><p className="font-medium">{selectedRequest.adminNotes}</p></div>}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
