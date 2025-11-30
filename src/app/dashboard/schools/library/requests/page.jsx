"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
    Loader2,
    BookMarked,
    CheckCircle2,
    XCircle,
    Clock,
    Calendar,
    User,
    AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

export default function BookRequestsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        collected: 0,
        expired: 0,
    });

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [pickupDays, setPickupDays] = useState(3);
    const [rejectionReason, setRejectionReason] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (schoolId) {
            fetchRequests();
            expireOverdueRequests();
        }
    }, [schoolId]);

    const expireOverdueRequests = async () => {
        try {
            await axios.post(`/api/schools/${schoolId}/library/requests/expire`);
        } catch (error) {
            console.error("Error expiring requests:", error);
        }
    };

    const fetchRequests = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/schools/${schoolId}/library/requests`);
            setRequests(res.data);

            // Calculate stats
            const pending = res.data.filter((r) => r.status === "PENDING").length;
            const approved = res.data.filter((r) => r.status === "APPROVED").length;
            const collected = res.data.filter((r) => r.status === "COLLECTED").length;
            const expired = res.data.filter((r) => r.status === "EXPIRED").length;

            setStats({ pending, approved, collected, expired });
        } catch (error) {
            console.error("Failed to fetch requests", error);
            toast.error("Failed to load requests");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedRequest) return;

        setSubmitting(true);
        try {
            await axios.patch(
                `/api/schools/${schoolId}/library/requests/${selectedRequest.id}`,
                {
                    action: "APPROVE",
                    approvedBy: fullUser.id,
                    pickupDays,
                }
            );
            toast.success("Request approved successfully");
            setIsApproveDialogOpen(false);
            setSelectedRequest(null);
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to approve request");
        } finally {
            setSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest) return;

        setSubmitting(true);
        try {
            await axios.patch(
                `/api/schools/${schoolId}/library/requests/${selectedRequest.id}`,
                {
                    action: "REJECT",
                    approvedBy: fullUser.id,
                    rejectionReason,
                }
            );
            toast.success("Request rejected");
            setIsRejectDialogOpen(false);
            setSelectedRequest(null);
            setRejectionReason("");
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to reject request");
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkCollected = async (request) => {
        try {
            await axios.post(
                `/api/schools/${schoolId}/library/requests/${request.id}/collect`,
                {
                    collectedBy: fullUser.id,
                }
            );
            toast.success("Marked as collected");
            fetchRequests();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to mark as collected");
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            PENDING: { variant: "secondary", icon: Clock, color: "text-yellow-600" },
            APPROVED: { variant: "default", icon: CheckCircle2, color: "text-blue-600" },
            COLLECTED: { variant: "default", icon: CheckCircle2, color: "text-green-600", className: "bg-green-500" },
            REJECTED: { variant: "destructive", icon: XCircle, color: "text-red-600" },
            EXPIRED: { variant: "destructive", icon: AlertTriangle, color: "text-orange-600" },
            CANCELLED: { variant: "outline", icon: XCircle, color: "text-gray-600" },
        };
        return config[status] || config.PENDING;
    };

    const RequestTable = ({ data, showActions = false }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Book</TableHead>
                    <TableHead>Request Date</TableHead>
                    {showActions && <TableHead>Pickup Date</TableHead>}
                    <TableHead>Status</TableHead>
                    {showActions && <TableHead>Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={showActions ? 6 : 5} className="text-center text-muted-foreground">
                            No requests found
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((request) => {
                        const statusConfig = getStatusBadge(request.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                            <TableRow key={request.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={request.user.profilePicture} />
                                            <AvatarFallback className="text-xs">
                                                {request.user.name.charAt(0)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">{request.user.name}</p>
                                            <p className="text-xs text-muted-foreground">{request.userType}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div>
                                        <p className="font-medium text-sm">{request.book.title}</p>
                                        <p className="text-xs text-muted-foreground">by {request.book.author}</p>
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {format(new Date(request.requestDate), "MMM dd, yyyy")}
                                </TableCell>
                                {showActions && (
                                    <TableCell className="text-sm">
                                        {request.pickupDate ? (
                                            <span className={new Date(request.pickupDate) < new Date() ? "text-red-600 font-medium" : ""}>
                                                {format(new Date(request.pickupDate), "MMM dd, yyyy")}
                                            </span>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Badge variant={statusConfig.variant} className={statusConfig.className}>
                                        <StatusIcon className="h-3 w-3 mr-1" />
                                        {request.status}
                                    </Badge>
                                </TableCell>
                                {showActions && (
                                    <TableCell>
                                        {request.status === "PENDING" && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setIsApproveDialogOpen(true);
                                                    }}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setIsRejectDialogOpen(true);
                                                    }}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}
                                        {request.status === "APPROVED" && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleMarkCollected(request)}
                                            >
                                                Mark Collected
                                            </Button>
                                        )}
                                    </TableCell>
                                )}
                            </TableRow>
                        );
                    })
                )}
            </TableBody>
        </Table>
    );

    if (!schoolId) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Book Requests</h1>
                <p className="text-muted-foreground mt-2">
                    Manage student and teacher book reservation requests
                </p>
            </div>

            <Separator />

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span className="text-2xl font-bold">{stats.pending}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Approved
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            <span className="text-2xl font-bold text-blue-600">{stats.approved}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Collected
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            <span className="text-2xl font-bold text-green-600">{stats.collected}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Expired
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-2xl font-bold text-orange-600">{stats.expired}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="pending" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="pending">
                        Pending ({stats.pending})
                    </TabsTrigger>
                    <TabsTrigger value="approved">
                        Approved ({stats.approved})
                    </TabsTrigger>
                    <TabsTrigger value="collected">
                        Collected ({stats.collected})
                    </TabsTrigger>
                    <TabsTrigger value="other">
                        Rejected/Expired
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <Card>
                        <CardHeader>
                            <CardTitle>Pending Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                                <RequestTable
                                    data={requests.filter((r) => r.status === "PENDING")}
                                    showActions={true}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="approved">
                    <Card>
                        <CardHeader>
                            <CardTitle>Approved Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                                <RequestTable
                                    data={requests.filter((r) => r.status === "APPROVED")}
                                    showActions={true}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="collected">
                    <Card>
                        <CardHeader>
                            <CardTitle>Collected Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                                <RequestTable
                                    data={requests.filter((r) => r.status === "COLLECTED")}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="other">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rejected & Expired Requests</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : (
                                <RequestTable
                                    data={requests.filter((r) =>
                                        ["REJECTED", "EXPIRED", "CANCELLED"].includes(r.status)
                                    )}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Approve Dialog */}
            <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Book Request</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <p className="text-sm">
                                    <span className="font-medium">User:</span> {selectedRequest.user.name}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Book:</span> {selectedRequest.book.title}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Pickup Deadline (Days from now)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="30"
                                    value={pickupDays}
                                    onChange={(e) => setPickupDays(parseInt(e.target.value))}
                                />
                                <p className="text-xs text-muted-foreground">
                                    User must collect the book by:{" "}
                                    {format(
                                        new Date(Date.now() + pickupDays * 24 * 60 * 60 * 1000),
                                        "MMM dd, yyyy"
                                    )}
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleApprove} disabled={submitting} className="flex-1">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Approve Request
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsApproveDialogOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Book Request</DialogTitle>
                    </DialogHeader>
                    {selectedRequest && (
                        <div className="space-y-4">
                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <p className="text-sm">
                                    <span className="font-medium">User:</span> {selectedRequest.user.name}
                                </p>
                                <p className="text-sm">
                                    <span className="font-medium">Book:</span> {selectedRequest.book.title}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Rejection Reason</Label>
                                <Input
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    placeholder="e.g., Book not available, damaged, etc."
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="destructive"
                                    onClick={handleReject}
                                    disabled={submitting}
                                    className="flex-1"
                                >
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Reject Request
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsRejectDialogOpen(false)}
                                    disabled={submitting}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
