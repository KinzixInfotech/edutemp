"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
    Loader2,
    CheckCircle,
    XCircle,
    ArrowRight,
    User,
    Building2,
    CreditCard,
    FileText,
    ChevronRight,
    ArrowLeft,
    Clock
} from "lucide-react";
import Link from "next/link";

const DiffRow = ({ label, oldVal, newVal }) => {
    if (!newVal && !oldVal) return null;
    const isChanged = oldVal !== newVal;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-3 border-b last:border-0 text-sm">
            <div className="text-muted-foreground font-medium">{label}</div>
            <div className={`break-words ${isChanged ? 'text-red-500 line-through opacity-70' : 'text-gray-600'}`}>
                {oldVal || <span className="text-xs italic text-muted-foreground">(Empty)</span>}
            </div>
            <div className={`break-words font-medium ${isChanged ? 'text-green-600' : 'text-gray-900'}`}>
                {newVal || <span className="text-xs italic text-muted-foreground">(Empty)</span>}
            </div>
        </div>
    );
};

export default function PayrollRequestsPage() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    // Fetch pending requests
    const { data, isLoading, error } = useQuery({
        queryKey: ["payroll-requests", schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/requests`);
            if (!res.ok) throw new Error("Failed to fetch requests");
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Approve/Reject mutation
    const actionMutation = useMutation({
        mutationFn: async ({ requestId, employeeId, action, reason }) => {
            const res = await fetch(`/api/schools/${schoolId}/payroll/employees/${employeeId}/approve-update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action,
                    rejectionReason: reason,
                    approvedBy: fullUser.id
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Action failed");
            }
            return res.json();
        },
        onSuccess: (data, variables) => {
            toast.success(variables.action === 'approve' ? "Request Approved" : "Request Rejected");
            queryClient.invalidateQueries(["payroll-requests", schoolId]);
            // Close dialogs
            setSelectedRequest(null);
            setIsRejectDialogOpen(false);
            setRejectionReason("");
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleApprove = (req) => {
        if (!confirm("Are you sure you want to approve these changes? They will be applied immediately.")) return;
        actionMutation.mutate({
            requestId: req.id,
            employeeId: req.id, // Request ID is effectively employee profile ID here based on API
            action: 'approve'
        });
    };

    const handleRejectClick = (req) => {
        setSelectedRequest(req);
        setIsRejectDialogOpen(true);
    };

    const confirmReject = () => {
        if (!rejectionReason.trim()) {
            toast.error("Please provide a rejection reason");
            return;
        }
        actionMutation.mutate({
            requestId: selectedRequest.id,
            employeeId: selectedRequest.id,
            action: 'reject',
            reason: rejectionReason
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>Failed to load requests: {error.message}</p>
            </div>
        );
    }

    const { profiles: requests, pendingCount } = data || {};

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link href="/dashboard/payroll/overview">
                            <Button variant="ghost" size="icon" className="-ml-2">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">Profile Update Requests</h1>
                    </div>
                    <p className="text-muted-foreground ml-10">Review and approve employee profile changes</p>
                </div>
                <Badge variant={pendingCount > 0 ? "destructive" : "secondary"} className="text-sm px-3 py-1">
                    {pendingCount || 0} Pending
                </Badge>
            </div>

            {(!requests || requests.length === 0) ? (
                <Card className="text-center py-12">
                    <CardContent>
                        <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4 opacity-50" />
                        <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                        <p className="text-muted-foreground">There are no pending profile update requests at the moment.</p>
                        <Link href="/dashboard/payroll/overview">
                            <Button className="mt-6" variant="outline">Back to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {requests.map(req => (
                        <Card key={req.id} className="overflow-hidden border-l-4 border-l-orange-400">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                            <AvatarImage src={req.profilePicture} />
                                            <AvatarFallback>{req.name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <CardTitle className="text-lg">{req.name}</CardTitle>
                                            <CardDescription className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-xs font-normal">
                                                    {req.designation || 'Staff'}
                                                </Badge>
                                                <span className="text-xs">•</span>
                                                <span>{req.department || 'General'}</span>
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white px-3 py-1.5 rounded-full border shadow-sm">
                                        <Clock className="h-3 w-3" />
                                        Submitted {new Date(req.submittedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Bank Details Diff */}
                                    {req.hasBankUpdate && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 font-semibold text-blue-600 pb-2 border-b">
                                                <Building2 className="h-4 w-4" />
                                                Bank Details Update
                                            </div>
                                            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                                                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                                    <span>Field</span>
                                                    <span>Current</span>
                                                    <span>New Value</span>
                                                </div>
                                                <DiffRow
                                                    label="Bank Name"
                                                    oldVal={req.currentBankDetails?.bankName}
                                                    newVal={req.pendingBankDetails?.bankName}
                                                />
                                                <DiffRow
                                                    label="Account No"
                                                    oldVal={req.currentBankDetails?.accountNumber}
                                                    newVal={req.pendingBankDetails?.accountNumber}
                                                />
                                                <DiffRow
                                                    label="IFSC Code"
                                                    oldVal={req.currentBankDetails?.ifscCode}
                                                    newVal={req.pendingBankDetails?.ifscCode}
                                                />
                                                <DiffRow
                                                    label="Holder Name"
                                                    oldVal={req.currentBankDetails?.accountHolder}
                                                    newVal={req.pendingBankDetails?.accountHolder}
                                                />
                                                <DiffRow
                                                    label="UPI ID"
                                                    oldVal={req.currentBankDetails?.upiId}
                                                    newVal={req.pendingBankDetails?.upiId}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* ID Details Diff */}
                                    {req.hasIdUpdate && (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 font-semibold text-purple-600 pb-2 border-b">
                                                <FileText className="h-4 w-4" />
                                                Tax & ID Documents
                                            </div>
                                            <div className="bg-muted/30 rounded-lg p-4 space-y-1">
                                                <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                                                    <span>Field</span>
                                                    <span>Current</span>
                                                    <span>New Value</span>
                                                </div>
                                                <DiffRow
                                                    label="PAN Number"
                                                    oldVal={req.currentIdDetails?.panNumber}
                                                    newVal={req.pendingIdDetails?.panNumber}
                                                />
                                                <DiffRow
                                                    label="Aadhar No"
                                                    oldVal={req.currentIdDetails?.aadharNumber}
                                                    newVal={req.pendingIdDetails?.aadharNumber}
                                                />
                                                <DiffRow
                                                    label="UAN Number"
                                                    oldVal={req.currentIdDetails?.uanNumber}
                                                    newVal={req.pendingIdDetails?.uanNumber}
                                                />
                                                <DiffRow
                                                    label="ESI Number"
                                                    oldVal={req.currentIdDetails?.esiNumber}
                                                    newVal={req.pendingIdDetails?.esiNumber}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter className="bg-gray-50 border-t p-4 flex justify-end gap-3">
                                <Button
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleRejectClick(req)}
                                    disabled={actionMutation.isPending}
                                >
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject Request
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleApprove(req)}
                                    disabled={actionMutation.isPending}
                                >
                                    {actionMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                    )}
                                    Approve Changes
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Rejection Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Request</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this update. The employee will be notified.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Reason for rejection (e.g., Incorrect IFSC code, Unclear document image)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={confirmReject} disabled={!rejectionReason.trim() || actionMutation.isPending}>
                            {actionMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
