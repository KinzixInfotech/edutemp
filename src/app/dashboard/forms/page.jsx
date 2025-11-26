"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, FileText, Trash2, Edit, Copy, Link2, ExternalLink } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import axios from "axios";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function FormListPage() {
    const { fullUser } = useAuth();
    const [forms, setForms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newForm, setNewForm] = useState({
        title: "",
        description: "",
        category: "GENERAL"
    });

    useEffect(() => {
        if (fullUser?.schoolId) {
            fetchForms();
        }
    }, [fullUser?.schoolId]);

    const fetchForms = async () => {
        try {
            const response = await axios.get(
                `/api/schools/${fullUser.schoolId}/forms`
            );
            setForms(response.data);
        } catch (error) {
            console.error("Error fetching forms:", error);
            toast.error("Failed to fetch forms");
        } finally {
            setLoading(false);
        }
    };

    const createForm = async () => {
        if (!newForm.title) {
            toast.error("Title is required");
            return;
        }

        setCreating(true);
        try {
            await axios.post(`/api/schools/${fullUser.schoolId}/forms`, newForm);
            toast.success("Form created successfully");
            setCreateDialogOpen(false);
            setNewForm({ title: "", description: "", category: "GENERAL" });
            fetchForms();
        } catch (error) {
            console.error("Error creating form:", error);
            toast.error("Failed to create form");
        } finally {
            setCreating(false);
        }
    };

    const deleteForm = async (formId) => {
        if (!confirm("Are you sure you want to delete this form? All submissions will be lost.")) return;

        try {
            await axios.delete(
                `/api/schools/${fullUser.schoolId}/forms/${formId}`
            );
            toast.success("Form deleted successfully");
            fetchForms();
        } catch (error) {
            console.error("Error deleting form:", error);
            toast.error("Failed to delete form");
        }
    };

    const copyFormUrl = (formId) => {
        const url = `${window.location.origin}/forms/${formId}`;
        navigator.clipboard.writeText(url);
        toast.success("Form URL copied to clipboard");
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "PUBLISHED": return "default"; // Black/Primary
            case "DRAFT": return "secondary"; // Gray
            case "ARCHIVED": return "destructive"; // Red
            default: return "outline";
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Form Builder</h1>
                    <p className="text-muted-foreground">Create and manage forms for admissions, surveys, and more.</p>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create New Form
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Form</DialogTitle>
                            <DialogDescription>
                                Enter the details for your new form. You can add fields later.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Form Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g., Admission Form 2025"
                                    value={newForm.title}
                                    onChange={(e) => setNewForm({ ...newForm, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={newForm.category}
                                    onValueChange={(value) => setNewForm({ ...newForm, category: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="GENERAL">General</SelectItem>
                                        <SelectItem value="ADMISSION">Admission</SelectItem>
                                        <SelectItem value="SURVEY">Survey</SelectItem>
                                        <SelectItem value="FEEDBACK">Feedback</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Brief description of the form..."
                                    value={newForm.description}
                                    onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                            <Button onClick={createForm} disabled={creating}>
                                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Form
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Forms</CardTitle>
                </CardHeader>
                <CardContent>
                    {forms.length === 0 ? (
                        <div className="text-center py-10">
                            <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                            <h3 className="mt-4 text-lg font-semibold">No forms found</h3>
                            <p className="text-muted-foreground">Create your first form to get started.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Submissions</TableHead>
                                    <TableHead>Created At</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {forms.map((form) => (
                                    <TableRow key={form.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{form.title}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{form.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{form.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(form.status)}>{form.status}</Badge>
                                        </TableCell>
                                        <TableCell>{form._count?.applications || 0}</TableCell>
                                        <TableCell>{format(new Date(form.createdAt), "MMM d, yyyy")}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => copyFormUrl(form.id)} title="Copy Public Link">
                                                    <Link2 className="h-4 w-4" />
                                                </Button>
                                                <Link href={`/dashboard/forms/${form.id}/submissions`}>
                                                    <Button variant="ghost" size="icon" title="View Submissions">
                                                        <FileText className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Link href={`/dashboard/forms/builder/${form.id}`}>
                                                    <Button variant="ghost" size="icon" title="Edit Form">
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteForm(form.id)} title="Delete Form">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
