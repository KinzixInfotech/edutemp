'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
    Loader2,
    Plus,
    MoreVertical,
    Pencil,
    Trash2,
    Eye,
    MessageSquare,
    CheckCircle,
    AlertCircle,
} from 'lucide-react';

const CATEGORIES = [
    { value: 'ATTENDANCE', label: 'Attendance' },
    { value: 'FEE_REMINDER', label: 'Fee Reminder' },
    { value: 'OTP', label: 'OTP' },
    { value: 'NOTICE', label: 'Notice' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'GENERAL', label: 'General' },
];

const initialFormState = {
    name: '',
    dltTemplateId: '',
    content: '',
    variables: '',
    category: 'GENERAL',
    isActive: true,
};

export default function ManageTemplatesPage() {
    const { fullUser } = useAuth();
    const userRole = fullUser?.role?.name;
    const queryClient = useQueryClient();
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [form, setForm] = useState(initialFormState);

    // Fetch templates
    const { data: templates, isLoading } = useQuery({
        queryKey: ['sms-templates-admin'],
        queryFn: async () => {
            const res = await fetch('/api/sms/templates?activeOnly=false');
            if (!res.ok) throw new Error('Failed to fetch templates');
            return res.json();
        },
    });

    // Create template mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch('/api/sms/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    variables: data.variables.split(',').map(v => v.trim()).filter(Boolean),
                    role: 'SUPER_ADMIN',
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to create template');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-templates-admin']);
            setIsAddOpen(false);
            setForm(initialFormState);
            toast.success('Template created successfully');
        },
        onError: (error) => toast.error(error.message),
    });

    // Update template mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const res = await fetch(`/api/sms/templates/${data.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...data,
                    variables: typeof data.variables === 'string'
                        ? data.variables.split(',').map(v => v.trim()).filter(Boolean)
                        : data.variables,
                    role: 'SUPER_ADMIN',
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update template');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-templates-admin']);
            setIsEditOpen(false);
            setSelectedTemplate(null);
            setForm(initialFormState);
            toast.success('Template updated successfully');
        },
        onError: (error) => toast.error(error.message),
    });

    // Delete template mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await fetch(`/api/sms/templates/${id}?role=SUPER_ADMIN`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete template');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-templates-admin']);
            setIsDeleteOpen(false);
            setSelectedTemplate(null);
            toast.success('Template deleted successfully');
        },
        onError: (error) => toast.error(error.message),
    });

    // Toggle active status
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }) => {
            const res = await fetch(`/api/sms/templates/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive, role: 'SUPER_ADMIN' }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to update template');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['sms-templates-admin']);
            toast.success('Template status updated');
        },
        onError: (error) => toast.error(error.message),
    });

    const handleCreate = () => {
        if (!form.name || !form.dltTemplateId || !form.content || !form.category) {
            toast.error('Please fill all required fields');
            return;
        }
        createMutation.mutate(form);
    };

    const handleEdit = (template) => {
        setSelectedTemplate(template);
        setForm({
            name: template.name,
            dltTemplateId: template.dltTemplateId,
            content: template.content,
            variables: template.variables?.join(', ') || '',
            category: template.category,
            isActive: template.isActive,
        });
        setIsEditOpen(true);
    };

    const handleUpdate = () => {
        if (!form.name || !form.dltTemplateId || !form.content || !form.category) {
            toast.error('Please fill all required fields');
            return;
        }
        updateMutation.mutate({ id: selectedTemplate.id, ...form });
    };

    const handleDelete = (template) => {
        setSelectedTemplate(template);
        setIsDeleteOpen(true);
    };

    const handlePreview = (template) => {
        setSelectedTemplate(template);
        setIsPreviewOpen(true);
    };

    const TemplateForm = ({ isEdit = false }) => (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Template Name *</Label>
                <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Attendance Absent Notification"
                />
            </div>
            <div className="space-y-2">
                <Label>DLT Template ID *</Label>
                <Input
                    value={form.dltTemplateId}
                    onChange={(e) => setForm({ ...form, dltTemplateId: e.target.value })}
                    placeholder="e.g., 1234567890123456789"
                    disabled={isEdit}
                />
                {isEdit && (
                    <p className="text-xs text-muted-foreground">DLT ID cannot be changed after creation</p>
                )}
            </div>
            <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Template Content *</Label>
                <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Dear {PARENT_NAME}, your child {STUDENT_NAME} was absent on {DATE}. Regards, {SCHOOL_NAME}"
                    className="w-full min-h-[120px] px-3 py-2 border rounded-md bg-background text-foreground resize-none"
                />
                <p className="text-xs text-muted-foreground">
                    Use {'{VARIABLE_NAME}'} format for dynamic content
                </p>
            </div>
            <div className="space-y-2">
                <Label>Variables (comma separated)</Label>
                <Input
                    value={form.variables}
                    onChange={(e) => setForm({ ...form, variables: e.target.value })}
                    placeholder="PARENT_NAME, STUDENT_NAME, DATE, SCHOOL_NAME"
                />
            </div>
            {isEdit && (
                <div className="flex items-center justify-between">
                    <Label>Active Status</Label>
                    <Switch
                        checked={form.isActive}
                        onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                    />
                </div>
            )}
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage SMS Templates</h1>
                    <p className="text-muted-foreground mt-2">
                        Create and manage DLT-compliant SMS templates for all schools
                    </p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setForm(initialFormState)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Add New Template</DialogTitle>
                            <DialogDescription>
                                Create a new DLT-registered SMS template
                            </DialogDescription>
                        </DialogHeader>
                        <TemplateForm />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreate} disabled={createMutation.isPending}>
                                {createMutation.isPending ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                                ) : (
                                    'Create Template'
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Separator />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Templates</p>
                                <p className="text-2xl font-bold">{templates?.length || 0}</p>
                            </div>
                            <MessageSquare className="h-8 w-8 text-muted-foreground" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Templates</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {templates?.filter(t => t.isActive).length || 0}
                                </p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Inactive Templates</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {templates?.filter(t => !t.isActive).length || 0}
                                </p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Templates Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Templates</CardTitle>
                    <CardDescription>
                        These templates are available to all schools for sending SMS
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : templates?.length === 0 ? (
                        <div className="text-center text-muted-foreground py-12">
                            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No templates found. Create your first template.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>DLT ID</TableHead>
                                        <TableHead>Variables</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {templates?.map((template) => (
                                        <TableRow key={template.id}>
                                            <TableCell className="font-medium">{template.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{template.category}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {template.dltTemplateId.length > 15
                                                    ? `${template.dltTemplateId.slice(0, 15)}...`
                                                    : template.dltTemplateId}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 flex-wrap max-w-[200px]">
                                                    {template.variables?.slice(0, 3).map((v) => (
                                                        <Badge key={v} variant="outline" className="text-xs">
                                                            {v}
                                                        </Badge>
                                                    ))}
                                                    {template.variables?.length > 3 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            +{template.variables.length - 3}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={template.isActive}
                                                    onCheckedChange={(checked) =>
                                                        toggleMutation.mutate({ id: template.id, isActive: checked })
                                                    }
                                                    disabled={toggleMutation.isPending}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handlePreview(template)}>
                                                            <Eye className="h-4 w-4 mr-2" />
                                                            Preview
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                                                            <Pencil className="h-4 w-4 mr-2" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(template)}
                                                            className="text-red-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Edit Template</DialogTitle>
                        <DialogDescription>
                            Update the SMS template details
                        </DialogDescription>
                    </DialogHeader>
                    <TemplateForm isEdit />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                            {updateMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                            ) : (
                                'Update Template'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Template</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedTemplate?.name}"? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(selectedTemplate?.id)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
                            ) : (
                                'Delete Template'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Preview Dialog */}
            <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Template Preview</DialogTitle>
                    </DialogHeader>
                    {selectedTemplate && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-medium">{selectedTemplate.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Category</p>
                                    <Badge variant="secondary">{selectedTemplate.category}</Badge>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">DLT Template ID</p>
                                <p className="font-mono text-sm bg-muted p-2 rounded mt-1">
                                    {selectedTemplate.dltTemplateId}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Content</p>
                                <div className="bg-muted p-3 rounded mt-1 text-sm">
                                    {selectedTemplate.content}
                                </div>
                            </div>
                            {selectedTemplate.variables?.length > 0 && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-2">Variables</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {selectedTemplate.variables.map((v) => (
                                            <Badge key={v} variant="outline">
                                                {'{' + v + '}'}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground">Status:</p>
                                <Badge variant={selectedTemplate.isActive ? "default" : "secondary"}>
                                    {selectedTemplate.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
