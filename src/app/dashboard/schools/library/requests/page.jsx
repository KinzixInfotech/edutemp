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
    ScanBarcode,
    Undo2,
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { useLibraryNotifications } from "@/context/LibraryNotificationContext";

export default function BookRequestsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const { markRequestsAsSeen, refreshCount } = useLibraryNotifications();

    const [loading, setLoading] = useState(false);
    const [requests, setRequests] = useState([]);
    const [borrowedBooks, setBorrowedBooks] = useState([]);
    const [stats, setStats] = useState({
        pending: 0,
        approved: 0,
        collected: 0,
        expired: 0,
        borrowed: 0,
    });

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [pickupDays, setPickupDays] = useState(3);
    const [rejectionReason, setRejectionReason] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [pickupCodeInput, setPickupCodeInput] = useState("");
    const [processingScan, setProcessingScan] = useState(false);

    // Return Flow State
    const [returnBarcode, setReturnBarcode] = useState("");
    const [processingReturn, setProcessingReturn] = useState(false);
    const [selectedCopyId, setSelectedCopyId] = useState("");

    useEffect(() => {
        if (!isApproveDialogOpen) {
            setSelectedCopyId("");
        }
    }, [isApproveDialogOpen]);

    useEffect(() => {
        if (schoolId) {
            fetchRequests();
            expireOverdueRequests();
            // Mark all requests as seen when page loads
            markRequestsAsSeen();
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
            const [requestsRes, borrowedRes] = await Promise.all([
                axios.get(`/api/schools/${schoolId}/library/requests`),
                axios.get(`/api/schools/${schoolId}/library/transactions?status=ISSUED`)
            ]);

            setRequests(requestsRes.data);
            setBorrowedBooks(borrowedRes.data);

            // Calculate stats
            const pending = requestsRes.data.filter((r) => r.status === "PENDING").length;
            const approved = requestsRes.data.filter((r) => r.status === "APPROVED").length;
            const collected = requestsRes.data.filter((r) => r.status === "COLLECTED").length;
            const expired = requestsRes.data.filter((r) => r.status === "EXPIRED").length;
            const borrowed = borrowedRes.data.length;

            setStats({ pending, approved, collected, expired, borrowed });
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
                    copyId: selectedCopyId,
                }
            );
            toast.success("Request approved successfully");
            setIsApproveDialogOpen(false);
            setSelectedRequest(null);
            fetchRequests();
            refreshCount(); // Refresh badge count
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
            refreshCount(); // Refresh badge count
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
            refreshCount(); // Refresh badge count
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to mark as collected");
        }
    };

    const handleScan = async (e) => {
        e.preventDefault();
        if (!pickupCodeInput.trim()) return;

        setProcessingScan(true);
        try {
            const res = await axios.post(
                `/api/schools/${schoolId}/library/requests/collect-by-code`,
                {
                    pickupCode: pickupCodeInput.trim().toUpperCase(),
                    collectedBy: fullUser.id,
                }
            );
            toast.success(res.data.message);
            setPickupCodeInput(""); // Clear input on success
            fetchRequests();
            refreshCount();
        } catch (error) {
            toast.error(error.response?.data?.error || "Invalid pickup code");
        } finally {
            setProcessingScan(false);
        }
    };

    const processReturn = async (barcode) => {
        if (!barcode) return;
        setProcessingReturn(true);
        try {
            const res = await axios.post(
                `/api/schools/${schoolId}/library/return`,
                {
                    barcode: barcode.trim(),
                    returnedBy: fullUser.id,
                }
            );
            toast.success(res.data.message);
            if (res.data.fine) {
                toast.warning(`Late Return Fine: ${res.data.fine}`);
            }
            setReturnBarcode("");
            fetchRequests();
            refreshCount();
        } catch (error) {
            toast.error(error.response?.data?.error || "Failed to return book");
        } finally {
            setProcessingReturn(false);
        }
    };

    const handleReturn = (e) => {
        e.preventDefault();
        processReturn(returnBarcode);
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
                    {showActions && <TableHead>Pickup Code</TableHead>}
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
                                    <TableCell className="font-mono font-medium text-blue-600">
                                        {request.pickupCode || "-"}
                                    </TableCell>
                                )}
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
                                        {request.status === "COLLECTED" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => processReturn(request.copy?.barcode)}
                                                disabled={processingReturn || !request.copy?.barcode}
                                            >
                                                {processingReturn ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    "Mark Returned"
                                                )}
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

            {/* Barcode Scanner Input */}
            <Card className="bg-blue-50/50 border-blue-100 dark:bg-muted dark:border-muted">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="bg-blue-100 p-2 rounded-full">
                        <ScanBarcode className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <Label htmlFor="scanner" className="text-sm font-medium dark:text-blue-200 text-blue-900">
                            Scan Pickup Code
                        </Label>
                        <form onSubmit={handleScan} className="flex gap-2 mt-1">
                            <Input
                                id="scanner"
                                placeholder="Click here and scan barcode..."
                                value={pickupCodeInput}
                                onChange={(e) => setPickupCodeInput(e.target.value)}
                                className="bg-white"
                                autoFocus
                            />
                            <Button type="submit" disabled={processingScan || !pickupCodeInput}>
                                {processingScan ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Process"
                                )}
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>

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
                        Pending Pickups ({stats.approved})
                    </TabsTrigger>
                    <TabsTrigger value="borrowed">
                        Books Borrowed ({stats.borrowed})
                    </TabsTrigger>
                    <TabsTrigger value="collected">
                        Collected ({stats.collected})
                    </TabsTrigger>
                    <TabsTrigger value="returns" className="text-orange-600">
                        Returns
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
                            <CardTitle>Pending Pickups</CardTitle>
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

                <TabsContent value="borrowed">
                    <Card>
                        <CardHeader>
                            <CardTitle>Books Borrowed</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex justify-center p-8">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : borrowedBooks.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Book</TableHead>
                                            <TableHead>Copy</TableHead>
                                            <TableHead>Issue Date</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {borrowedBooks.map((transaction) => (
                                            <TableRow key={transaction.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-8 w-8">
                                                            <AvatarImage src={transaction.user?.profilePicture} />
                                                            <AvatarFallback className="text-xs">
                                                                {transaction.user?.name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-medium text-sm">{transaction.user?.name}</p>
                                                            <p className="text-xs text-muted-foreground">{transaction.userType}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium text-sm">{transaction.book?.title}</p>
                                                        <p className="text-xs text-muted-foreground">by {transaction.book?.author}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-mono text-sm">
                                                    {transaction.copy?.barcode || transaction.copy?.accessionNumber || "-"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {format(new Date(transaction.issueDate), "MMM dd, yyyy")}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    <span className={new Date(transaction.dueDate) < new Date() ? "text-red-600 font-medium" : ""}>
                                                        {format(new Date(transaction.dueDate), "MMM dd, yyyy")}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    {transaction.isOverdue ? (
                                                        <Badge variant="destructive">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Overdue
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-blue-500">
                                                            <BookMarked className="h-3 w-3 mr-1" />
                                                            Issued
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center text-muted-foreground py-8">
                                    No books currently borrowed
                                </div>
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
                                    showActions={true}
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

                            <div className="space-y-2">
                                <Label>Assign Copy</Label>
                                {selectedRequest.book.copies && selectedRequest.book.copies.length > 0 ? (
                                    <Select value={selectedCopyId} onValueChange={setSelectedCopyId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a copy" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {selectedRequest.book.copies.map((copy) => (
                                                <SelectItem key={copy.id} value={copy.id}>
                                                    {copy.barcode || copy.accessionNumber} ({copy.condition})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100">
                                        No available copies found for this book.
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button onClick={handleApprove} disabled={submitting || !selectedCopyId} className="flex-1">
                                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Approve & Assign
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
            < Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen} >
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
            </Dialog >
        </div >
    );
}
