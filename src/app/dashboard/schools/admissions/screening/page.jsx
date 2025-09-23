// app/admissions/screening.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchScreeningApplications(schoolId) {
    const response = await fetch(`/api/schools/admissions/applications?schoolId=${schoolId}&stageId=pending-review-id`); // Assume pending stage id
    if (!response.ok) throw new Error("Failed to fetch screening applications");
    return response.json();
}

async function approveApplication(data) {
    const response = await fetch(`/api/schools/admissions/applications/${data.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to approve");
    return response.json();
}

async function rejectApplication(data) {
    const response = await fetch(`/api/schools/admissions/applications/${data.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to reject");
    return response.json();
}

export default function Screening() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [notes, setNotes] = useState("");

    const queryClient = useQueryClient();

    const { data: { applications = [] } = {}, isLoading } = useQuery({
        queryKey: ["screeningApplications", schoolId],
        queryFn: () => fetchScreeningApplications(schoolId),
        enabled: !!schoolId,
    });

    const approveMutation = useMutation({
        mutationFn: approveApplication,
        onSuccess: () => {
            queryClient.invalidateQueries(["screeningApplications"]);
            toast.success("Application approved");
        },
        onError: () => toast.error("Failed to approve"),
    });

    const rejectMutation = useMutation({
        mutationFn: rejectApplication,
        onSuccess: () => {
            queryClient.invalidateQueries(["screeningApplications"]);
            toast.success("Application rejected");
        },
        onError: () => toast.error("Failed to reject"),
    });

    const handleApprove = (id) => {
        approveMutation.mutate({ id, stageId: "shortlisted-id", movedById, notes });
    };

    const handleReject = (id) => {
        rejectMutation.mutate({ id, stageId: "rejected-id", movedById, notes });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Screening</h2>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
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
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : applications.length > 0 ? (
                            applications.map((app, index) => (
                                <TableRow key={app.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{app.applicantName}</TableCell>
                                    <TableCell>{app.applicantEmail}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button size="sm" variant="outline" onClick={() => setSelectedApplication(app)}>
                                                    View
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>{selectedApplication?.applicantName}</DialogTitle>
                                                </DialogHeader>
                                                {/* Detail view similar to previous */}
                                            </DialogContent>
                                        </Dialog>
                                        <Button size="sm" onClick={() => handleApprove(app.id)}>Approve</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)}>Reject</Button>
                                        <Input placeholder="Comments" value={notes} onChange={(e) => setNotes(e.target.value)} className="max-w-xs" />
                                        <Button size="sm" variant="outline">Request Docs</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">No applications in screening.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}