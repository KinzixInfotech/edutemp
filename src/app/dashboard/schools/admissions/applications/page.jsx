// app/admissions/applications.jsx
'use client';
export const dynamic = 'force-dynamic';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Label } from "recharts";
import { Badge } from "@/components/ui/badge";

async function fetchApplications({ schoolId, stageId, formId }) {
    const params = new URLSearchParams({ schoolId });
    if (stageId) params.append("stageId", stageId);
    if (formId) params.append("formId", formId);
    const response = await fetch(`/api/schools/admissions/applications?${params}`);
    // console.log(response.json());
    if (!response.ok) throw new Error("Failed to fetch applications");
    return response.json();
}

async function fetchForms(schoolId) {
    const response = await fetch(`/api/schools/admissions/forms?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch forms");
    return response.json();
}

async function fetchStages(schoolId) {
    const response = await fetch(`/api/schools/admissions/settings?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch stages");
    return response.json();
}

async function fetchApplication(id) {
    const response = await fetch(`/api/schools/admissions/applications/${id}`);
    if (!response.ok) throw new Error("Failed to fetch application");
    return response.json();
}

async function moveApplication(data) {
    const response = await fetch(`/api/schools/admissions/applications/${data.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to move application");
    return response.json();
}

export default function Applications() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const movedById = fullUser?.id;
    const [stageId, setStageId] = useState("");
    const [formId, setFormId] = useState("");
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [search, setSearch] = useState("");
    const [notes, setNotes] = useState("");

    const queryClient = useQueryClient();

    const { data: { applications = [], total } = {}, isLoading: appsLoading } = useQuery({
        queryKey: ["applications", schoolId, stageId, formId],
        queryFn: () => fetchApplications({ schoolId, stageId, formId }),
        enabled: !!schoolId,
    });



    const { data: { forms = [] } = {} } = useQuery({
        queryKey: ["forms", schoolId],
        queryFn: () => fetchForms(schoolId),
        enabled: !!schoolId,
    });

    const { data: { stages = [] } = {} } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: () => fetchStages(schoolId),
        enabled: !!schoolId,
    });

    const getStageStyle = (stage) => {
        switch (stage) {
            case "REVIEW":
                return "bg-blue-100 text-blue-700 border-blue-200";
            case "TEST_INTERVIEW":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "OFFER":
                return "bg-green-100 text-green-700 border-green-200";
            case "ENROLLED":
                return "bg-emerald-100 text-emerald-700 border-emerald-200";
            case "REJECTED":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    // const { data: selectedApp, isLoading: appLoading } = useQuery({
    //     queryKey: ["application", selectedApplication?.id],
    //     queryFn: () => fetchApplication(selectedApplication?.id),
    //     enabled: !!selectedApplication?.id,
    // });


    // const moveMutation = useMutation({
    //     mutationFn: moveApplication,
    //     onSuccess: () => {
    //         queryClient.invalidateQueries(["applications"]);
    //         toast.success("Application moved");
    //         setNotes("");
    //         setSelectedApplication(null);
    //     },
    //     onError: () => toast.error("Failed to move"),
    // });

    const handleMove = (id, stageId) => {
        console.log(id, stageId, 'move hanlder');

        moveMutation.mutate({ id, stageId, movedById, notes });
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-4">Applications</h2>
            <p className="text-sm text-muted-foreground mb-4">
                Showing <span className="font-medium">{applications.length}</span> out of{" "}
                <span className="font-medium">{total}</span> Applications
            </p>
            <div className="flex gap-4 mb-4">
                <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
                <Select value={stageId} onValueChange={setStageId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by stage" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Stages</SelectItem>
                        {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={formId} onValueChange={setFormId}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by form" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">All Forms</SelectItem>
                        {forms.map((form) => (
                            <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="overflow-x-auto rounded-lg border bg-">
                <Table className="min-w-[800px]">
                    <TableHeader >
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Submitted At</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {appsLoading ? (
                            Array(6).fill(0).map((_, index) => (
                                <TableRow key={index}>
                                    <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : applications.length > 0 ? (

                            applications.filter(app => app.applicantName.toLowerCase().includes(search.toLowerCase())).map((app, index) => (

                                <TableRow key={app.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    {/* {console.log(app)} */}
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{app.applicantName}</TableCell>
                                    <TableCell>{app.applicantEmail}</TableCell>
                                    <TableCell>{new Date(app.submittedAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`px-2 py-1 text-xs font-medium ${getStageStyle(app.currentStage.name)} capitalize`}
                                        >
                                            {app.currentStage.name.replace("_", " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Link href={`applications/${app.id}/view`}>
                                            <Button size="sm" variant="outline">View</Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No applications found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>

            </div>
        </div>
    );
}