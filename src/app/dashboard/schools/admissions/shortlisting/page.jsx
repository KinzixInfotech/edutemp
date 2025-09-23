// app/admissions/shortlisting.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchShortlistedApplications(schoolId) {
    const response = await fetch(`/api/schools/admissions/applications?schoolId=${schoolId}&stageId=shortlisted-id`); // Assume shortlisted stage id
    if (!response.ok) throw new Error("Failed to fetch shortlisted applications");
    return response.json();
}

async function moveToTest(data) {
    const response = await fetch(`/api/schools/admissions/applications/${data.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to move");
    return response.json();
}

export default function Shortlisting() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;
    const [notes, setNotes] = useState("");

    const queryClient = useQueryClient();

    const { data: { applications = [] } = {}, isLoading } = useQuery({
        queryKey: ["shortlistedApplications", schoolId],
        queryFn: () => fetchShortlistedApplications(schoolId),
        enabled: !!schoolId,
    });

    const moveMutation = useMutation({
        mutationFn: moveToTest,
        onSuccess: () => {
            queryClient.invalidateQueries(["shortlistedApplications"]);
            toast.success("Moved to test/interview");
        },
        onError: () => toast.error("Failed to move"),
    });

    const handleMove = (id) => {
        moveMutation.mutate({ id, stageId: "test-interview-id", movedById, notes });
    };

    const handleReject = (id) => {
        moveMutation.mutate({ id, stageId: "rejected-id", movedById, notes });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Shortlisting</h2>
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
                                        <Button size="sm" onClick={() => handleMove(app.id)}>Move to Test/Interview</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleReject(app.id)}>Reject</Button>
                                        <Input placeholder="Reason/Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="max-w-xs" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-4">No shortlisted applications.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}