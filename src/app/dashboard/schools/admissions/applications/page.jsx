"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, UserPlus, Eye, ArrowRight } from "lucide-react";
import Link from 'next/link';
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { Label } from "@/components/ui/label";

export default function Applications() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [stageId, setStageId] = useState("All");
    const [formId, setFormId] = useState("ALL");
    const [search, setSearch] = useState("");
    const [admitDialogOpen, setAdmitDialogOpen] = useState(false);
    const [selectedAppForAdmission, setSelectedAppForAdmission] = useState(null);
    const [admissionData, setAdmissionData] = useState({ classId: "", admissionNumber: "" });
    const [admitting, setAdmitting] = useState(false);

    const queryClient = useQueryClient();

    // Fetch Applications
    const { data: { applications = [], total } = {}, isLoading: appsLoading } = useQuery({
        queryKey: ["applications", schoolId, stageId, formId],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (stageId && stageId !== "All") params.append("stageId", stageId);
            if (formId && formId !== "ALL") params.append("formId", formId);
            const res = await axios.get(`/api/schools/${schoolId}/admissions/applications?${params}`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Forms for Filter
    const { data: forms = [] } = useQuery({
        queryKey: ["admission-forms", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms?category=ADMISSION`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Stages for Filter
    const { data: stages = [] } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/admissions/stages`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Classes for Admission Dialog
    const { data: classes = [] } = useQuery({
        queryKey: ["classes", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/classes`);
            return res.data;
        },
        enabled: !!schoolId && admitDialogOpen,
    });

    const admitStudentMutation = useMutation({
        mutationFn: async (data) => {
            const res = await axios.post(`/api/schools/${schoolId}/admissions/admit`, data);
            return res.data;
        },
        onMutate: () => setAdmitting(true),
        onSuccess: (data) => {
            setAdmitting(false);
            setAdmitDialogOpen(false);
            setSelectedAppForAdmission(null);
            setAdmissionData({ classId: "", admissionNumber: "" });
            queryClient.invalidateQueries(["applications"]);
            toast.success("Student admitted successfully!");
            // Optionally show credentials
            toast.message("Credentials Generated", {
                description: `Email: ${data.credentials.email}, Password: ${data.credentials.password}`,
                duration: 10000,
            });
        },
        onError: (error) => {
            setAdmitting(false);
            toast.error(error.response?.data?.error || "Failed to admit student");
        }
    });

    const handleAdmitClick = (app) => {
        setSelectedAppForAdmission(app);
        setAdmissionData({ classId: "", admissionNumber: `ADM-${Date.now().toString().slice(-6)}` });
        setAdmitDialogOpen(true);
    };

    const confirmAdmission = () => {
        if (!selectedAppForAdmission) return;
        admitStudentMutation.mutate({
            applicationId: selectedAppForAdmission.id,
            ...admissionData
        });
    };

    const getStageStyle = (stageName) => {
        if (!stageName) return "bg-gray-100 text-gray-700";
        const name = stageName.toLowerCase();
        if (name.includes("review")) return "bg-blue-100 text-blue-700 border-blue-200";
        if (name.includes("interview") || name.includes("test")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
        if (name.includes("offer")) return "bg-purple-100 text-purple-700 border-purple-200";
        if (name.includes("enrolled")) return "bg-green-100 text-green-700 border-green-200";
        if (name.includes("reject")) return "bg-red-100 text-red-700 border-red-200";
        return "bg-gray-100 text-gray-700 border-gray-200";
    };

    return (
        <div className="p-6 space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
                <p className="text-muted-foreground">Manage and process student applications.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex gap-4 w-full sm:w-auto">
                    <Input
                        placeholder="Search by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-xs"
                    />
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
                                <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-sm text-muted-foreground">
                    Showing <strong>{applications.length}</strong> applications
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Applicant</TableHead>
                            <TableHead>Form</TableHead>
                            <TableHead>Submitted</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {appsLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell>
                            </TableRow>
                        ) : applications.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No applications found matching your filters.</TableCell>
                            </TableRow>
                        ) : (
                            applications
                                .filter(app => app.applicantName.toLowerCase().includes(search.toLowerCase()))
                                .map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{app.applicantName}</span>
                                                <span className="text-xs text-muted-foreground">{app.applicantEmail}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{app.form?.title || "Unknown Form"}</TableCell>
                                        <TableCell>{new Date(app.submittedAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={getStageStyle(app.currentStage?.name)}>
                                                {app.currentStage?.name || "Unknown"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`applications/${app.id}/view`}>
                                                    <Button size="sm" variant="ghost">
                                                        <Eye className="h-4 w-4 mr-1" /> View
                                                    </Button>
                                                </Link>
                                                {app.currentStage?.name !== "Enrolled" && app.currentStage?.name !== "Rejected" && (
                                                    <Button size="sm" onClick={() => handleAdmitClick(app)}>
                                                        <UserPlus className="h-4 w-4 mr-1" /> Admit
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Admit Student Dialog */}
            <Dialog open={admitDialogOpen} onOpenChange={setAdmitDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Admit Student</DialogTitle>
                        <DialogDescription>
                            Create a student record for <strong>{selectedAppForAdmission?.applicantName}</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Admission Number</Label>
                            <Input
                                value={admissionData.admissionNumber}
                                onChange={(e) => setAdmissionData({ ...admissionData, admissionNumber: e.target.value })}
                                placeholder="Enter admission number"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Assign Class</Label>
                            <Select
                                value={admissionData.classId}
                                onValueChange={(val) => setAdmissionData({ ...admissionData, classId: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((cls) => (
                                        <SelectItem key={cls.id} value={cls.id}>{cls.name} {cls.section ? `- ${cls.section}` : ""}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdmitDialogOpen(false)}>Cancel</Button>
                        <Button onClick={confirmAdmission} disabled={admitting}>
                            {admitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Admission
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}