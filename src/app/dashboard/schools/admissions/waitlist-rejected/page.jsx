// app/admissions/waitlist-rejected.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchWaitlistRejected(schoolId) {
    const response = await fetch(`/api/schools/admissions/applications?schoolId=${schoolId}&stageId=waitlist-rejected-id`); // Assume stage id
    if (!response.ok) throw new Error("Failed to fetch");
    return response.json();
}

async function moveToOffer(data) {
    const response = await fetch(`/api/schools/admissions/applications/${data.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to move");
    return response.json();
}

export default function WaitlistRejected() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;

    const queryClient = useQueryClient();

    const { data: { applications = [] } = {}, isLoading } = useQuery({
        queryKey: ["waitlistRejected", schoolId],
        queryFn: () => fetchWaitlistRejected(schoolId),
        enabled: !!schoolId,
    });

    const moveMutation = useMutation({
        mutationFn: moveToOffer,
        onSuccess: () => {
            queryClient.invalidateQueries(["waitlistRejected"]);
            toast.success("Moved to offer");
        },
        onError: () => toast.error("Failed to move"),
    });

    const handleMove = (id) => {
        moveMutation.mutate({ id, stageId: "offer-id", movedById, notes: "Moved from waitlist" });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Waitlist / Rejected</h2>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
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
                                    <TableCell>{app.currentStage.name}</TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => handleMove(app.id)}>Move to Offer</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">No waitlisted or rejected students.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}