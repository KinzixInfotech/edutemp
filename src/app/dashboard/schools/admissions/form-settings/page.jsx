"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2, Plus, ExternalLink, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function FormsSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const router = useRouter();
    const queryClient = useQueryClient();

    const [drawerMode, setDrawerMode] = useState(null);
    const [stageData, setStageData] = useState({ name: "", order: 0, requiresTest: false, requiresInterview: false, feeRequired: false });
    const [stageError, setStageError] = useState("");
    const [saving, setSaving] = useState(false);
    const [creatingForm, setCreatingForm] = useState(false);

    // Fetch Admission Forms
    const { data: forms = [], isLoading: formsLoading } = useQuery({
        queryKey: ["admission-forms", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms?category=ADMISSION`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Fetch Stages
    const { data: stages = [], isLoading: stagesLoading } = useQuery({
        queryKey: ["stages", schoolId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/admissions/stages`);
            return res.data;
        },
        enabled: !!schoolId,
    });

    // Create New Form (Redirects to Builder)
    const createForm = async () => {
        setCreatingForm(true);
        try {
            const res = await axios.post(`/api/schools/${schoolId}/forms`, {
                title: "New Admission Form",
                category: "ADMISSION",
                description: "Admission form for new academic year"
            });
            toast.success("Form created! Redirecting to builder...");
            router.push(`/dashboard/forms/builder/${res.data.id}`);
        } catch (error) {
            console.error("Error creating form:", error);
            toast.error("Failed to create form");
            setCreatingForm(false);
        }
    };

    // Delete Form
    const deleteFormMutation = useMutation({
        mutationFn: async (id) => {
            await axios.delete(`/api/schools/${schoolId}/forms/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["admission-forms"]);
            toast.success("Form deleted");
        },
        onError: () => toast.error("Failed to delete form")
    });

    // Stage Mutations
    const createStageMutation = useMutation({
        mutationFn: async (data) => {
            await axios.post(`/api/schools/${schoolId}/admissions/stages`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["stages"]);
            setDrawerMode(null);
            toast.success("Stage created");
        },
        onError: () => toast.error("Failed to create stage")
    });

    const updateStageMutation = useMutation({
        mutationFn: async ({ id, ...data }) => {
            await axios.put(`/api/schools/${schoolId}/admissions/stages?id=${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["stages"]);
            setDrawerMode(null);
            toast.success("Stage updated");
        },
        onError: () => toast.error("Failed to update stage")
    });

    const deleteStageMutation = useMutation({
        mutationFn: async (id) => {
            await axios.delete(`/api/schools/${schoolId}/admissions/stages?id=${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["stages"]);
            toast.success("Stage deleted");
        },
        onError: () => toast.error("Failed to delete stage")
    });

    const handleStageSubmit = () => {
        if (!stageData.name) {
            setStageError("Stage name required");
            return;
        }
        if (drawerMode === "add-stage") {
            createStageMutation.mutate(stageData);
        } else if (drawerMode === "edit-stage") {
            updateStageMutation.mutate(stageData);
        }
    };

    const handleAddStage = () => {
        setStageData({ name: "", order: stages.length + 1, requiresTest: false, requiresInterview: false, feeRequired: false });
        setStageError("");
        setDrawerMode("add-stage");
    };

    const handleEditStage = (stage) => {
        setStageData(stage);
        setStageError("");
        setDrawerMode("edit-stage");
    };

    return (
        <div className="p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Admission Settings</h1>
                <p className="text-muted-foreground">Manage admission forms and application stages.</p>
            </div>

            {/* Forms Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Admission Forms</h2>
                    <Button onClick={createForm} disabled={creatingForm}>
                        {creatingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Create New Form
                    </Button>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Submissions</TableHead>
                                <TableHead>Public Link</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {formsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell>
                                </TableRow>
                            ) : forms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No admission forms found.</TableCell>
                                </TableRow>
                            ) : (
                                forms.map((form) => (
                                    <TableRow key={form.id}>
                                        <TableCell className="font-medium">{form.title}</TableCell>
                                        <TableCell>{form.status}</TableCell>
                                        <TableCell>{form._count?.applications || 0}</TableCell>
                                        <TableCell>
                                            <a
                                                href={`/forms/${form.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center text-blue-600 hover:underline"
                                            >
                                                View Form <ExternalLink className="ml-1 h-3 w-3" />
                                            </a>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Link href={`/dashboard/forms/builder/${form.id}`}>
                                                    <Button variant="ghost" size="icon">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteFormMutation.mutate(form.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Stages Section */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Application Stages</h2>
                    <Button onClick={handleAddStage} variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Add Stage
                    </Button>
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order</TableHead>
                                <TableHead>Stage Name</TableHead>
                                <TableHead>Requirements</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stagesLoading ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell>
                                </TableRow>
                            ) : stages.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No stages defined.</TableCell>
                                </TableRow>
                            ) : (
                                stages.map((stage) => (
                                    <TableRow key={stage.id}>
                                        <TableCell>{stage.order}</TableCell>
                                        <TableCell className="font-medium">{stage.name}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                {stage.requiresTest && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">Test</span>}
                                                {stage.requiresInterview && <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">Interview</span>}
                                                {stage.feeRequired && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Fee</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditStage(stage)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteStageMutation.mutate(stage.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Stage Drawer */}
            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>
                            {drawerMode === "add-stage" ? "Add New Stage" : "Edit Stage"}
                        </DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 space-y-6">
                        {stageError && <p className="text-destructive text-sm">{stageError}</p>}

                        <div className="space-y-2">
                            <Label htmlFor="name">Stage Name</Label>
                            <Input
                                id="name"
                                value={stageData.name}
                                onChange={(e) => setStageData({ ...stageData, name: e.target.value })}
                                placeholder="e.g., Interview"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="order">Order</Label>
                            <Input
                                id="order"
                                type="number"
                                value={stageData.order}
                                onChange={(e) => setStageData({ ...stageData, order: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-muted-foreground">Lower numbers appear first in the pipeline.</p>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="requiresTest">Requires Test/Exam</Label>
                                <Switch
                                    id="requiresTest"
                                    checked={stageData.requiresTest}
                                    onCheckedChange={(c) => setStageData({ ...stageData, requiresTest: c })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="requiresInterview">Requires Interview</Label>
                                <Switch
                                    id="requiresInterview"
                                    checked={stageData.requiresInterview}
                                    onCheckedChange={(c) => setStageData({ ...stageData, requiresInterview: c })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="feeRequired">Requires Fee Payment</Label>
                                <Switch
                                    id="feeRequired"
                                    checked={stageData.feeRequired}
                                    onCheckedChange={(c) => setStageData({ ...stageData, feeRequired: c })}
                                />
                            </div>
                        </div>

                        <Button className="w-full mt-6" onClick={handleStageSubmit}>
                            {drawerMode === "add-stage" ? "Create Stage" : "Update Stage"}
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}