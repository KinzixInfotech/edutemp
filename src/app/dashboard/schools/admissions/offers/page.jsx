// app/admissions/offers.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchOfferApplications(schoolId) {
    const response = await fetch(`/api/schools/admissions/applications?schoolId=${schoolId}&stageId=offer-id`); // Assume stage id
    if (!response.ok) throw new Error("Failed to fetch offer applications");
    return response.json();
}

async function sendOffer(data) {
    const response = await fetch(`/api/schools/admissions/offers/${data.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to send offer");
    return response.json();
}

export default function Offers() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;

    const queryClient = useQueryClient();

    const { data: { applications = [] } = {}, isLoading } = useQuery({
        queryKey: ["offerApplications", schoolId],
        queryFn: () => fetchOfferApplications(schoolId),
        enabled: !!schoolId,
    });

    const sendMutation = useMutation({
        mutationFn: sendOffer,
        onSuccess: () => {
            queryClient.invalidateQueries(["offerApplications"]);
            toast.success("Offer sent");
        },
        onError: () => toast.error("Failed to send offer"),
    });

    const handleSend = (id) => {
        sendMutation.mutate({ id, movedById });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Offers</h2>
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
                                    <TableCell>
                                        <Button size="sm" onClick={() => handleSend(app.id)}>Send Offer Letter</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">No applications for offers.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}