// app/admissions/tests-interviews.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchTestApplications(schoolId) {
    const response = await fetch(`/api/schools/admissions/applications?schoolId=${schoolId}`); // Assume stage id
    if (!response.ok) throw new Error("Failed to fetch test applications");
    return response.json();
}

async function updateScores(data) {
    const response = await fetch(`/api/schools/admissions/applications/${data.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update");
    return response.json();
}

export default function TestsInterviews() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;
    const [scores, setScores] = useState({});

    const queryClient = useQueryClient();

    const { data: { applications = [] } = {}, isLoading } = useQuery({
        queryKey: ["testApplications", schoolId],
        queryFn: () => fetchTestApplications(schoolId),
        enabled: !!schoolId,
    });

    const updateMutation = useMutation({
        mutationFn: updateScores,
        onSuccess: () => {
            queryClient.invalidateQueries(["testApplications"]);
            toast.success("Scores updated");
        },
        onError: () => toast.error("Failed to update"),
    });

    const handleUpdate = (id) => {
        updateMutation.mutate({ id, stageId: "offer-id", movedById, notes: `Scores: ${scores[id]}` });
    };

    const handleChange = (id, value) => {
        setScores({ ...scores, [id]: value });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Tests / Interviews</h2>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Scores</TableHead>
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
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
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
                                        <Input type="number" value={scores[app.id] || ""} onChange={(e) => handleChange(app.id, e.target.value)} className="max-w-xs" />
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" onClick={() => handleUpdate(app.id)}>Update Status</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">No applications in tests/interviews.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}