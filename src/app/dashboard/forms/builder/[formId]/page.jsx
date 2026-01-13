"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Trash2, GripVertical, Eye } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

// Drag and drop imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Field Card Component
function SortableFieldCard({ field, index, updateField, removeField, updateOption, addOption, removeOption }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id || `field-${index}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 50 : 'auto',
    };

    return (
        <Card ref={setNodeRef} style={style} className={`group relative ${isDragging ? 'shadow-xl bg-card' : ''}`}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-l-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-4">
                    {/* Drag Handle */}
                    <div
                        {...attributes}
                        {...listeners}
                        className="mt-3 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted"
                    >
                        <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <div className="flex gap-4 items-start">
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground mb-1 block">Question Label</Label>
                                <Input
                                    value={field.name}
                                    onChange={(e) => updateField(index, 'name', e.target.value)}
                                    placeholder="Enter question..."
                                    className="font-medium"
                                />
                            </div>
                            <div className="w-[200px]">
                                <Label className="text-xs text-muted-foreground mb-1 block">Type</Label>
                                <Select value={field.type} onValueChange={(val) => updateField(index, 'type', val)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Short Text</SelectItem>
                                        <SelectItem value="textarea">Long Text</SelectItem>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                        <SelectItem value="select">Dropdown</SelectItem>
                                        <SelectItem value="radio">Radio Buttons</SelectItem>
                                        <SelectItem value="checkbox">Checkboxes</SelectItem>
                                        <SelectItem value="date">Date</SelectItem>
                                        <SelectItem value="file">File Upload</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <Label className="flex items-center gap-2 cursor-pointer">
                                <Switch
                                    checked={field.required}
                                    onCheckedChange={(c) => updateField(index, 'required', c)}
                                />
                                <span className="text-sm">Required</span>
                            </Label>
                        </div>

                        {/* Options for Select/Radio/Checkbox */}
                        {['select', 'radio', 'checkbox'].includes(field.type) && (
                            <div className="space-y-2 pl-4 border-l-2 border-muted mt-4">
                                <Label className="text-sm text-muted-foreground">Options</Label>
                                {(field.options || []).map((opt, oIndex) => (
                                    <div key={oIndex} className="flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                                        <Input
                                            value={opt}
                                            onChange={(e) => updateOption(index, oIndex, e.target.value)}
                                            className="h-8"
                                            placeholder={`Option ${oIndex + 1}`}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => removeOption(index, oIndex)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                                <Button variant="ghost" size="sm" className="text-primary h-8" onClick={() => addOption(index)}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Option
                                </Button>
                            </div>
                        )}

                        {/* File type configuration for File Upload */}
                        {field.type === 'file' && (
                            <div className="space-y-2 pl-4 border-l-2 border-muted mt-4">
                                <Label className="text-sm text-muted-foreground">Accepted File Types</Label>
                                <Select
                                    value={field.fileTypes || "all"}
                                    onValueChange={(val) => updateField(index, 'fileTypes', val)}
                                >
                                    <SelectTrigger className="h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Files</SelectItem>
                                        <SelectItem value="images">Images Only (PNG, JPG, GIF)</SelectItem>
                                        <SelectItem value="documents">Documents (PDF, Word, Excel)</SelectItem>
                                        <SelectItem value="audio">Audio Files</SelectItem>
                                        <SelectItem value="video">Video Files</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeField(index)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function FormBuilderPage() {
    const { fullUser } = useAuth();
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState(null);
    const [fields, setFields] = useState([]);
    const [settings, setSettings] = useState({
        isPublic: true,
        allowMultiple: false,
        notifications: []
    });

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 250,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (fullUser?.schoolId && params.formId) {
            fetchFormData();
        }
    }, [fullUser?.schoolId, params.formId]);

    const fetchFormData = async () => {
        try {
            const res = await axios.get(`/api/schools/${fullUser.schoolId}/forms/${params.formId}`);
            setForm(res.data);
            if (res.data.settings) {
                setSettings(res.data.settings);
            }
            // Ensure each field has a unique ID for drag-drop
            const fetchedFields = (res.data.fields || []).map((f, i) => ({
                ...f,
                id: f.id || `field-${i}-${Date.now()}`
            }));
            setFields(fetchedFields);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching form:", error);
            toast.error("Failed to load form data");
            setLoading(false);
        }
    };

    const addField = () => {
        const newId = `temp-${Date.now()}`;
        setFields([
            ...fields,
            {
                id: newId,
                name: "New Question",
                type: "text",
                required: false,
                options: ["Option 1", "Option 2"],
                order: fields.length
            }
        ]);
    };

    const updateField = (index, key, value) => {
        const newFields = [...fields];
        newFields[index][key] = value;
        setFields(newFields);
    };

    const removeField = (index) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        setFields(newFields);
    };

    const updateOption = (fieldIndex, optionIndex, value) => {
        const newFields = [...fields];
        const newOptions = [...(newFields[fieldIndex].options || [])];
        newOptions[optionIndex] = value;
        newFields[fieldIndex].options = newOptions;
        setFields(newFields);
    };

    const addOption = (fieldIndex) => {
        const newFields = [...fields];
        const newOptions = [...(newFields[fieldIndex].options || [])];
        newOptions.push(`Option ${newOptions.length + 1}`);
        newFields[fieldIndex].options = newOptions;
        setFields(newFields);
    };

    const removeOption = (fieldIndex, optionIndex) => {
        const newFields = [...fields];
        const newOptions = [...(newFields[fieldIndex].options || [])];
        newOptions.splice(optionIndex, 1);
        newFields[fieldIndex].options = newOptions;
        setFields(newFields);
    };

    // Handle drag end for reordering
    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = fields.findIndex(item => item.id === active.id);
        const newIndex = fields.findIndex(item => item.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
            setFields(arrayMove(fields, oldIndex, newIndex));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put(`/api/schools/${fullUser.schoolId}/forms/${params.formId}`, {
                title: form.title,
                description: form.description,
                category: form.category,
                status: form.status,
                settings,
                fields: fields.map((f, i) => ({
                    ...f,
                    order: i
                }))
            });

            toast.success("Form saved successfully!");
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Failed to save form");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;

    // Get sortable IDs for DndContext
    const sortableIds = fields.map((f, i) => f.id || `field-${i}`);

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header className="bg-card border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                    </Button>
                    <div>
                        <Input
                            value={form?.title || ""}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 h-auto py-0"
                        />
                        <p className="text-xs text-muted-foreground">Form Builder • {form?.category}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(`/forms/${params.formId}`, '_blank')}>
                        <Eye className="mr-2 h-4 w-4" /> Preview
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">
                <Tabs defaultValue="builder" className="w-full">
                    <TabsList className="grid w-full bg-[#f2f3f4] dark:bg-muted border grid-cols-2 max-w-[400px] mb-6">
                        <TabsTrigger value="builder">Builder</TabsTrigger>
                        <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="builder" className="space-y-6">
                        <div className="space-y-4 ">
                            <Label>Description</Label>
                            <Textarea
                                className={'dark:bg-muted border bg-white'}
                                value={form?.description || ""}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Form description displayed to users..."
                            />
                        </div>

                        {/* Drag and Drop Context for Fields */}
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <SortableFieldCard
                                            key={field.id || `field-${index}`}
                                            field={field}
                                            index={index}
                                            updateField={updateField}
                                            removeField={removeField}
                                            updateOption={updateOption}
                                            addOption={addOption}
                                            removeOption={removeOption}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>

                        <Button variant="outline" className="w-full py-8 border-dashed" onClick={addField}>
                            <Plus className="mr-2 h-4 w-4" /> Add Field
                        </Button>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Form Settings</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Public Access</Label>
                                        <p className="text-sm text-muted-foreground">Allow anyone with the link to view and submit this form.</p>
                                    </div>
                                    <Switch
                                        checked={settings.isPublic}
                                        onCheckedChange={(c) => setSettings({ ...settings, isPublic: c })}
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Allow Multiple Submissions</Label>
                                        <p className="text-sm text-muted-foreground">Allow the same user (email) to submit multiple times.</p>
                                    </div>
                                    <Switch
                                        checked={settings.allowMultiple}
                                        onCheckedChange={(c) => setSettings({ ...settings, allowMultiple: c })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Form Status</Label>
                                    <Select
                                        value={form?.status || "DRAFT"}
                                        onValueChange={(val) => setForm({ ...form, status: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DRAFT">Draft (Private)</SelectItem>
                                            <SelectItem value="PUBLISHED">Published (Live)</SelectItem>
                                            <SelectItem value="ARCHIVED">Archived (Closed)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
