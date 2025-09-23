// app/admissions/forms-settings.jsx
'use client'
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

async function fetchForms(schoolId) {
    const response = await fetch(`/api/schools/admissions/forms?schoolId=${schoolId}`);
    if (!response.ok) throw new Error("Failed to fetch forms");
    return response.json();
}

async function createForm(data) {
    const response = await fetch("/api/schools/admissions/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create form");
    return response.json();
}

async function updateForm({ id, ...data }) {
    const response = await fetch(`/api/schools/admissions/forms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update form");
    return response.json();
}

async function deleteForm(id) {
    const response = await fetch(`/api/schools/admissions/forms/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete form");
    return true;
}

async function generateLink(id) {
    const response = await fetch(`/api/schools/admissions/forms/${id}/link`, {
        method: "POST",
    });
    if (!response.ok) throw new Error("Failed to generate link");
    return response.json();
}

async function updateSettings(data) {
    const response = await fetch("/api/schools/admissions/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update settings");
    return response.json();
}

export default function FormsSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [drawerMode, setDrawerMode] = useState(null);
    const [formData, setFormData] = useState({ fields: [] });
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const queryClient = useQueryClient();

    const { data: { forms = [] } = {}, isLoading } = useQuery({
        queryKey: ["forms", schoolId],
        queryFn: () => fetchForms(schoolId),
        enabled: !!schoolId,
    });

    const createMutation = useMutation({
        mutationFn: createForm,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["forms"]);
            setDrawerMode(null);
            toast.success("Form created");
            setSaving(false);
        },
        onError: () => toast.error("Failed to create form"),
    });

    const updateMutation = useMutation({
        mutationFn: updateForm,
        onMutate: () => setSaving(true),
        onSuccess: () => {
            queryClient.invalidateQueries(["forms"]);
            setDrawerMode(null);
            toast.success("Form updated");
            setSaving(false);
        },
        onError: () => toast.error("Failed to update form"),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteForm,
        onSuccess: () => {
            queryClient.invalidateQueries(["forms"]);
            toast.success("Form deleted");
        },
        onError: () => toast.error("Failed to delete form"),
    });

    const linkMutation = useMutation({
        mutationFn: generateLink,
        onSuccess: (res) => toast.success(`Link generated: /admissions/${res.slug}`),
        onError: () => toast.error("Failed to generate link"),
    });

    const settingsMutation = useMutation({
        mutationFn: updateSettings,
        onSuccess: () => toast.success("Settings updated"),
        onError: () => toast.error("Failed to update settings"),
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFieldChange = (index, field, value) => {
        const newFields = [...formData.fields];
        newFields[index] = { ...newFields[index], [field]: value };
        setFormData({ ...formData, fields: newFields });
    };

    const addField = () => {
        setFormData({ ...formData, fields: [...formData.fields, { name: "", type: "", required: false, options: [], order: formData.fields.length + 1 }] });
    };

    const removeField = (index) => {
        setFormData({ ...formData, fields: formData.fields.filter((_, i) => i !== index) });
    };

    const handleSubmit = () => {
        if (!formData.name) {
            setFormError("Form name required");
            return;
        }
        const data = { ...formData, schoolId };
        if (drawerMode === "add") {
            createMutation.mutate(data);
        } else {
            updateMutation.mutate({ id: formData.id, ...data });
        }
    };

    const handleAdd = () => {
        setFormData({ fields: [] });
        setDrawerMode("add");
    };

    const handleEdit = (form) => {
        setFormData(form);
        setDrawerMode("edit");
    };

    const handleDelete = (id) => {
        deleteMutation.mutate(id);
    };

    const handleGenerateLink = (id) => {
        linkMutation.mutate(id);
    };

    const handleUpdateSettings = () => {
        // Placeholder for settings update
        settingsMutation.mutate({ schoolId, stages: [] });
    };

    return (
        <div className="p-6">
            <Button onClick={handleAdd} className="mb-4">Create Form</Button>
            <Button onClick={handleUpdateSettings} className="mb-4 ml-4">Update Settings</Button>
            <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[800px]">
                    <TableHeader>
                        <TableRow className="bg-muted sticky top-0 z-10">
                            <TableHead>#</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Fields</TableHead>
                            <TableHead>Link</TableHead>
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
                                    <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                </TableRow>
                            ))
                        ) : forms.length > 0 ? (
                            forms.map((form, index) => (
                                <TableRow key={form.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                    <TableCell>{index + 1}</TableCell>
                                    <TableCell>{form.name}</TableCell>
                                    <TableCell>{form.description}</TableCell>
                                    <TableCell>{form.fields.length}</TableCell>
                                    <TableCell>{form.slug ? `/admissions/${form.slug}` : "Not generated"}</TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => handleEdit(form)}>Edit</Button>
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(form.id)}>Delete</Button>
                                        <Button size="sm" variant="outline" onClick={() => handleGenerateLink(form.id)}>Generate Link</Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-4">No forms found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                <DrawerContent className="w-[400px] flex flex-col h-full">
                    <DrawerHeader>
                        <DrawerTitle>{drawerMode === "add" ? "Create Form" : "Edit Form"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 flex-1 overflow-y-auto">
                        {formError && <p className="text-red-500 mb-4">{formError}</p>}
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="name" className="mb-2 text-muted-foreground">Name*</Label>
                                <Input id="name" name="name" value={formData.name || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label htmlFor="description" className="mb-2 text-muted-foreground">Description</Label>
                                <Input id="description" name="description" value={formData.description || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <Label className="mb-2 text-muted-foreground">Fields</Label>
                                {formData.fields?.map((field, index) => (
                                    <div key={index} className="flex gap-2 mb-2">
                                        <Input placeholder="Field Name" value={field.name} onChange={(e) => handleFieldChange(index, "name", e.target.value)} />
                                        <Select value={field.type} onValueChange={(val) => handleFieldChange(index, "type", val)}>
                                            <SelectTrigger className="w-[120px]">
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="file">File</SelectItem>
                                                <SelectItem value="select">Select</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button variant="destructive" size="sm" onClick={() => removeField(index)}>Remove</Button>
                                    </div>
                                ))}
                                <Button variant="outline" size="sm" onClick={addField}>Add Field</Button>
                            </div>
                        </div>
                        <Button
                            onClick={handleSubmit}
                            disabled={saving}
                            className={`mt-6 w-full ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {saving ? (
                                <div className="flex items-center gap-2 justify-center">
                                    <Loader2 className="animate-spin" size={20} />
                                    <span>Saving</span>
                                </div>
                            ) : "Save"}
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}