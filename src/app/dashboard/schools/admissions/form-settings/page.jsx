    // app/admissions/forms-settings.jsx
    'use client'
    import { useState } from "react";
    import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
    import { Switch } from "@/components/ui/switch";
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
    import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
    import { Skeleton } from "@/components/ui/skeleton";
    import { toast } from "sonner";
    import { Loader2, Plus } from "lucide-react";
    import { useAuth } from "@/context/AuthContext";

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
        const response = await fetch(`/api/schools/admissions/forms?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data), // only the rest of the data
        });
        if (!response.ok) throw new Error("Failed to update form");
        return response.json();
    }

    async function deleteForm(id) {
        const response = await fetch(`/api/schools/admissions/forms?id=${id}`, {
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

    async function createStage(data) {
        const response = await fetch("/api/schools/admissions/settings/stages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to create stage");
        return response.json();
    }

    async function updateStage({ id, ...data }) {
        const response = await fetch(`/api/schools/admissions/settings/stages?id=${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Failed to update stage");
        return response.json();
    }

    async function deleteStage(id) {
        const response = await fetch(`/api/schools/admissions/settings/stages?id=${id}`, {
            method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete stage");
        return true;
    }

    export default function FormsSettings() {
        const { fullUser } = useAuth();
        const schoolId = fullUser?.schoolId;
        const [drawerMode, setDrawerMode] = useState(null);
        const [formData, setFormData] = useState({ fields: [] });
        const [stageData, setStageData] = useState({ name: "", order: 0, requiresTest: false });
        const [formError, setFormError] = useState("");
        const [stageError, setStageError] = useState("");
        const [saving, setSaving] = useState(false);

        const queryClient = useQueryClient();

        const { data: { forms = [] } = {}, isLoading: formsLoading } = useQuery({
            queryKey: ["forms", schoolId],
            queryFn: () => fetchForms(schoolId),
            enabled: !!schoolId,
        });

        const { data: { stages = [] } = {}, isLoading: stagesLoading } = useQuery({
            queryKey: ["stages", schoolId],
            queryFn: () => fetchStages(schoolId),
            enabled: !!schoolId,
        });

        const createFormMutation = useMutation({
            mutationFn: createForm,
            onMutate: () => setSaving(true),
            onSuccess: () => {
                queryClient.invalidateQueries(["forms"]);
                setDrawerMode(null);
                toast.success("Form created");
                setSaving(false);
            },
            onError: () => {
                setSaving(false);
                toast.error("Failed to create form")
            }
        });

        const updateFormMutation = useMutation({
            mutationFn: updateForm,
            onMutate: () => setSaving(true),
            onSuccess: () => {
                queryClient.invalidateQueries(["forms"]);
                setDrawerMode(null);
                toast.success("Form updated");
                setSaving(false);
            },
            onError: () => {
                setSaving(false);
                toast.error("Failed to update form")
            }
        });

        const deleteFormMutation = useMutation({
            mutationFn: deleteForm,
            onSuccess: () => {
                queryClient.invalidateQueries(["forms"]);
                toast.success("Form deleted");
            },
            onError: () => {
                setSaving(false);
                toast.error("Failed to delete form")
            }
        });

        const generateLinkMutation = useMutation({
            mutationFn: generateLink,
            onSuccess: (res) => toast.success(`Link generated: /admissions/${res.slug}`),
            onError: () => toast.error("Failed to generate link"),
        });

        const createStageMutation = useMutation({
            mutationFn: createStage,
            onMutate: () => setSaving(true),
            onSuccess: () => {
                queryClient.invalidateQueries(["stages"]);
                setDrawerMode(null);
                toast.success("Stage created");
                setSaving(false);
            },
            onError: () => {
                setSaving(false);
                toast.error("Failed to create stage")
            }
        });

        const updateStageMutation = useMutation({
            mutationFn: updateStage,
            onMutate: () => setSaving(true),
            onSuccess: () => {
                queryClient.invalidateQueries(["stages"]);
                setDrawerMode(null);
                toast.success("Stage updated");
                setSaving(false);
            },
            onError: () => {
                setSaving(false);
                toast.error("Failed to update stage")
            }
        });

        const deleteStageMutation = useMutation({
            mutationFn: deleteStage,
            onSuccess: () => {
                queryClient.invalidateQueries(["stages"]);
                toast.success("Stage deleted");
            },
            onError: () => {
                setSaving(false);
                toast.error("Failed to delete stage")
            }
        });

        const handleFormChange = (e) => {
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

        const handleStageChange = (e) => {
            const { name, value } = e.target;
            setStageData({ ...stageData, [name]: name === "order" ? parseInt(value) : value });
        };

        const handleStageSwitch = (checked) => {
            setStageData({ ...stageData, requiresTest: checked });
        };

        const handleFormSubmit = () => {
            if (!formData.name) {
                setFormError("Form name required");
                return;
            }
            const data = { ...formData, schoolId };
            if (drawerMode === "add-form") {
                createFormMutation.mutate(data);
            } else if (drawerMode === "edit-form") {
                updateFormMutation.mutate({ id: formData.id, ...data });
            }
        };

        const handleStageSubmit = () => {
            if (!stageData.name) {
                setStageError("Stage name required");
                return;
            }
            const data = { ...stageData, schoolId };
            if (drawerMode === "add-stage") {
                createStageMutation.mutate(data);
            } else if (drawerMode === "edit-stage") {
                updateStageMutation.mutate({ id: stageData.id, ...data });
            }
        };

        const handleAddForm = () => {
            setFormData({ fields: [] });
            setFormError("");
            setDrawerMode("add-form");
        };

        const handleEditForm = (form) => {
            setFormData(form);
            setFormError("");
            setDrawerMode("edit-form");
        };

        const handleDeleteForm = (id) => {
            deleteFormMutation.mutate(id);
        };

        const handleGenerateLink = (id) => {
            generateLinkMutation.mutate(id);
        };

        const handleAddStage = () => {
            setStageData({ name: "", order: stages.length + 1, requiresTest: false });
            setStageError("");
            setDrawerMode("add-stage");
        };

        const handleEditStage = (stage) => {
            setStageData(stage);
            setStageError("");
            setDrawerMode("edit-stage");
        };

        const handleDeleteStage = (id) => {
            deleteStageMutation.mutate(id);
        };

        return (
            <div className="p-6">
                <h2 className="text-2xl font-bold mb-4">Forms & Settings</h2>
                <div className="space-y-8">
                    {/* Forms Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Admission Forms</h3>
                            <Button onClick={handleAddForm}>Create Form <Plus strokeWidth={2} /> </Button>
                        </div>
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
                                    {formsLoading ? (
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

                                                <TableCell>
                                                    <a target="_blank" className="underline text-blue-700 hover:text-blue-500" href={`/dashboard/schools${form.slug ? `/admissions/${form.slug}` : "#"}`}>{form.slug ? `/admissions/${form.slug}` : "Not generated"}
                                                    </a>
                                                </TableCell>

                                                <TableCell className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleEditForm(form)}>Edit</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteForm(form.id)}>Delete</Button>
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
                    </div>

                    {/* Stages Section */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Admission Stages</h3>
                            {/* <Button onClick={handleAddStage}>Create Stage</Button> */}
                        </div>
                        <div className="overflow-x-auto rounded-lg border">
                            <Table className="min-w-[800px]">
                                <TableHeader>
                                    <TableRow className="bg-muted sticky top-0 z-10">
                                        <TableHead>#</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Order</TableHead>
                                        {/* <TableHead>Requires Test</TableHead> */}
                                        {/* <TableHead>Actions</TableHead> */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stagesLoading ? (
                                        Array(6).fill(0).map((_, index) => (
                                            <TableRow key={index}>
                                                <TableCell><Skeleton className="h-6 w-6" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-32" /></TableCell>
                                                <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                                                {/* <TableCell><Skeleton className="h-6 w-24" /></TableCell> */}
                                                {/* <TableCell><Skeleton className="h-6 w-20" /></TableCell> */}
                                            </TableRow>
                                        ))
                                    ) : stages.length > 0 ? (
                                        stages.map((stage, index) => (
                                            <TableRow key={stage.id} className={index % 2 === 0 ? "bg-muted" : "bg-background"}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{stage.name}</TableCell>
                                                <TableCell>{stage.order}</TableCell>
                                                {/* <TableCell>{stage.requiresTest ? "Yes" : "No"}</TableCell> */}
                                                {/* <TableCell className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => handleEditStage(stage)}>Edit</Button>
                                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteStage(stage.id)}>Delete</Button>
                                                </TableCell> */}
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-4">No stages found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Drawer for Form and Stage Management */}
                <Drawer open={!!drawerMode} onOpenChange={() => setDrawerMode(null)} direction="right">
                    <DrawerContent className="w-[400px] flex flex-col h-full">
                        <DrawerHeader>
                            <DrawerTitle>
                                {drawerMode === "add-form" ? "Create Form" :
                                    drawerMode === "edit-form" ? "Edit Form" :
                                        drawerMode === "add-stage" ? "Create Stage" :
                                            "Edit Stage"}
                            </DrawerTitle>
                        </DrawerHeader>
                        <div className="p-4 flex-1 overflow-y-auto">
                            {drawerMode?.includes("form") ? (
                                <>
                                    {formError && <p className="text-red-500 mb-4">{formError}</p>}
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="name" className="mb-2 text-muted-foreground">Name*</Label>
                                            <Input id="name" name="name" value={formData.name || ""} onChange={handleFormChange} />
                                        </div>
                                        <div>
                                            <Label htmlFor="description" className="mb-2 text-muted-foreground">Description</Label>
                                            <Input id="description" name="description" value={formData.description || ""} onChange={handleFormChange} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="requiresTest" className="text-muted-foreground">Requires Payment</Label>
                                            <Switch
                                                id="requiresTest"
                                                checked={stageData.requiresTest}
                                                onCheckedChange={handleStageSwitch}
                                            />
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
                                        onClick={handleFormSubmit}
                                        disabled={saving}
                                        className={`mt-6 w-full ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        {saving ? (
                                            <div className="flex items-center gap-2 justify-center">
                                                <Loader2 className="animate-spin" size={20} />
                                                <span>Saving</span>
                                            </div>
                                        ) : "Save Form"}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {stageError && <p className="text-red-500 mb-4">{stageError}</p>}
                                    <div className="space-y-4">
                                        <div>
                                            <Label htmlFor="name" className="mb-2 text-muted-foreground">Stage Name*</Label>
                                            <Input id="name" name="name" value={stageData.name || ""} onChange={handleStageChange} />
                                        </div>
                                        <div>
                                            <Label htmlFor="order" className="mb-2 text-muted-foreground">Order*</Label>
                                            <Input id="order" name="order" type="number" value={stageData.order || 0} onChange={handleStageChange} />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="requiresTest" className="text-muted-foreground">Requires Test</Label>
                                            <Switch
                                                id="requiresTest"
                                                checked={stageData.requiresTest}
                                                onCheckedChange={handleStageSwitch}
                                            />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleStageSubmit}
                                        disabled={saving}
                                        className={`mt-6 w-full ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                                    >
                                        {saving ? (
                                            <div className="flex items-center gap-2 justify-center">
                                                <Loader2 className="animate-spin" size={20} />
                                                <span>Saving</span>
                                            </div>
                                        ) : "Save Stage"}
                                    </Button>
                                </>
                            )}
                        </div>
                    </DrawerContent>
                </Drawer>
            </div >
        );
    }