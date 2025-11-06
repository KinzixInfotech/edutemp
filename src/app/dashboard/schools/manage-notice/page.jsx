'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Plus,
    Send,
    Save,
    Loader2,
    Bell,
    Trash2,
    Edit,
    Eye,
    AlertCircle,
    Users,
    Calendar,
    FileText,
    Paperclip,
    X
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';

const formSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    subtitle: z.string().optional(),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    category: z.string().min(1, 'Category is required'),
    audience: z.string().min(1, 'Audience is required'),
    priority: z.string().default('NORMAL'),
    status: z.string().default('DRAFT'),
    issuedBy: z.string().optional(),
    issuerRole: z.string().optional(),
    publishedAt: z.string().optional(),
    expiryDate: z.string().optional(),
    fileUrl: z.string().optional(),
});

const CATEGORIES = [
    'GENERAL',
    'ACADEMIC',
    'EXAM',
    'EMERGENCY',
    'EVENT',
    'SPORTS',
    'HOLIDAY',
    'FEE',
    'TRANSPORT',
    'LIBRARY',
    'ANNOUNCEMENT'
];

const AUDIENCES = [
    { value: 'ALL', label: 'All Users' },
    { value: 'STUDENTS', label: 'Students Only' },
    { value: 'TEACHERS', label: 'Teachers Only' },
    { value: 'PARENTS', label: 'Parents Only' },
    { value: 'STAFF', label: 'All Staff' },
    { value: 'TEACHING_STAFF', label: 'Teaching Staff' },
    { value: 'NON_TEACHING_STAFF', label: 'Non-Teaching Staff' },
    { value: 'CLASS', label: 'Specific Class' },
    { value: 'SECTION', label: 'Specific Section' },
];

const PRIORITIES = [
    { value: 'NORMAL', label: 'Normal', color: 'bg-gray-500' },
    { value: 'IMPORTANT', label: 'Important', color: 'bg-blue-500' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-orange-500' },
    { value: 'CRITICAL', label: 'Critical', color: 'bg-red-500' },
];

export default function NoticeAdminPage() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [importantDates, setImportantDates] = useState([]);
    const [selectedClasses, setSelectedClasses] = useState([]);
    const [selectedSections, setSelectedSections] = useState([]);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            priority: 'NORMAL',
            status: 'DRAFT',
            audience: 'ALL',
            category: 'GENERAL',
        },
    });

    const watchedValues = watch();
    const selectedAudience = watch('audience');

    // Fetch notices
    const { data: noticesData, isLoading } = useQuery({
        queryKey: ['notices', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/notices/${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch notices');
            return res.json();
        },
        enabled: !!schoolId,
    });

    // Fetch classes (for targeting)
    const { data: classes } = useQuery({
        queryKey: ['classes', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/classes?schoolId=${schoolId}`);
            if (!res.ok) throw new Error('Failed to fetch classes');
            return res.json();
        },
        enabled: !!schoolId && selectedAudience === 'CLASS',
    });

    // Fetch sections
    const { data: sections } = useQuery({
        queryKey: ['sections', schoolId, selectedClasses],
        queryFn: async () => {
            if (selectedClasses.length === 0) return [];
            const res = await fetch(`/api/sections?schoolId=${schoolId}&classIds=${selectedClasses.join(',')}`);
            if (!res.ok) throw new Error('Failed to fetch sections');
            return res.json();
        },
        enabled: !!schoolId && selectedAudience === 'SECTION' && selectedClasses.length > 0,
    });

    // Create notice mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            const targets = [];

            // Build targets based on audience
            if (data.audience === 'CLASS') {
                targets.push(...selectedClasses.map(classId => ({ classId: parseInt(classId) })));
            } else if (data.audience === 'SECTION') {
                targets.push(...selectedSections.map(sectionId => ({ sectionId: parseInt(sectionId) })));
            }

            const payload = {
                ...data,
                createdById: fullUser?.id,
                importantDates: importantDates.length > 0 ? importantDates : null,
                targets,
            };

            const res = await fetch(`/api/notices/${schoolId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create notice');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Notice created successfully!');
            queryClient.invalidateQueries(['notices', schoolId]);
            setIsCreateDialogOpen(false);
            reset();
            setImportantDates([]);
            setSelectedClasses([]);
            setSelectedSections([]);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create notice');
        },
    });

    // Delete notice mutation
    const deleteMutation = useMutation({
        mutationFn: async (noticeId) => {
            const res = await fetch(`/api/notices/${schoolId}/${noticeId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete notice');
            return res.json();
        },
        onSuccess: () => {
            toast.success('Notice deleted successfully');
            queryClient.invalidateQueries(['notices', schoolId]);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete notice');
        },
    });

    const onSubmit = (data) => {
        createMutation.mutate(data);
    };

    const addImportantDate = () => {
        setImportantDates([...importantDates, { label: '', value: '' }]);
    };

    const updateImportantDate = (index, field, value) => {
        const updated = [...importantDates];
        updated[index][field] = value;
        setImportantDates(updated);
    };

    const removeImportantDate = (index) => {
        setImportantDates(importantDates.filter((_, i) => i !== index));
    };

    if (!schoolId || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <Bell className="w-8 h-8 text-primary" />
                        Notice Board Management
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Create and manage school notices and circulars
                    </p>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Notice
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Notice</DialogTitle>
                            <DialogDescription>
                                Fill in the details to create a new notice or circular
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    {...register('title')}
                                    placeholder="e.g., School Holiday Announcement"
                                />
                                {errors.title && (
                                    <p className="text-xs text-red-500">{errors.title.message}</p>
                                )}
                            </div>

                            {/* Subtitle */}
                            <div className="space-y-2">
                                <Label htmlFor="subtitle">Subtitle (Optional)</Label>
                                <Input
                                    id="subtitle"
                                    {...register('subtitle')}
                                    placeholder="Brief description for preview"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    {...register('description')}
                                    placeholder="Full notice content..."
                                    rows={6}
                                />
                                {errors.description && (
                                    <p className="text-xs text-red-500">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Category */}
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select
                                        value={watchedValues.category}
                                        onValueChange={(value) => setValue('category', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CATEGORIES.map(cat => (
                                                <SelectItem key={cat} value={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Priority */}
                                <div className="space-y-2">
                                    <Label>Priority</Label>
                                    <Select
                                        value={watchedValues.priority}
                                        onValueChange={(value) => setValue('priority', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PRIORITIES.map(p => (
                                                <SelectItem key={p.value} value={p.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${p.color}`} />
                                                        {p.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Audience */}
                            <div className="space-y-2">
                                <Label>Target Audience *</Label>
                                <Select
                                    value={watchedValues.audience}
                                    onValueChange={(value) => setValue('audience', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {AUDIENCES.map(aud => (
                                            <SelectItem key={aud.value} value={aud.value}>
                                                {aud.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Class/Section Selection */}
                            {selectedAudience === 'CLASS' && classes && (
                                <div className="space-y-2">
                                    <Label>Select Classes</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {classes.map(cls => (
                                            <Button
                                                key={cls.id}
                                                type="button"
                                                variant={selectedClasses.includes(cls.id.toString()) ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => {
                                                    if (selectedClasses.includes(cls.id.toString())) {
                                                        setSelectedClasses(selectedClasses.filter(id => id !== cls.id.toString()));
                                                    } else {
                                                        setSelectedClasses([...selectedClasses, cls.id.toString()]);
                                                    }
                                                }}
                                            >
                                                {cls.className}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedAudience === 'SECTION' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>First Select Classes</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {classes?.map(cls => (
                                                <Button
                                                    key={cls.id}
                                                    type="button"
                                                    variant={selectedClasses.includes(cls.id.toString()) ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (selectedClasses.includes(cls.id.toString())) {
                                                            setSelectedClasses(selectedClasses.filter(id => id !== cls.id.toString()));
                                                        } else {
                                                            setSelectedClasses([...selectedClasses, cls.id.toString()]);
                                                        }
                                                    }}
                                                >
                                                    {cls.className}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    {sections && sections.length > 0 && (
                                        <div className="space-y-2">
                                            <Label>Select Sections</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {sections.map(sec => (
                                                    <Button
                                                        key={sec.id}
                                                        type="button"
                                                        variant={selectedSections.includes(sec.id.toString()) ? 'default' : 'outline'}
                                                        size="sm"
                                                        onClick={() => {
                                                            if (selectedSections.includes(sec.id.toString())) {
                                                                setSelectedSections(selectedSections.filter(id => id !== sec.id.toString()));
                                                            } else {
                                                                setSelectedSections([...selectedSections, sec.id.toString()]);
                                                            }
                                                        }}
                                                    >
                                                        {sec.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                {/* Issued By */}
                                <div className="space-y-2">
                                    <Label htmlFor="issuedBy">Issued By</Label>
                                    <Input
                                        id="issuedBy"
                                        {...register('issuedBy')}
                                        placeholder="e.g., Ms. Farhana Islam"
                                    />
                                </div>

                                {/* Issuer Role */}
                                <div className="space-y-2">
                                    <Label htmlFor="issuerRole">Issuer Role</Label>
                                    <Input
                                        id="issuerRole"
                                        {...register('issuerRole')}
                                        placeholder="e.g., Science Department Head"
                                    />
                                </div>
                            </div>

                            {/* Important Dates */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Important Dates</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={addImportantDate}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Add Date
                                    </Button>
                                </div>
                                {importantDates.map((date, index) => (
                                    <div key={index} className="flex gap-2">
                                        <Input
                                            placeholder="Label (e.g., Deadline)"
                                            value={date.label}
                                            onChange={(e) => updateImportantDate(index, 'label', e.target.value)}
                                        />
                                        <Input
                                            placeholder="Date"
                                            value={date.value}
                                            onChange={(e) => updateImportantDate(index, 'value', e.target.value)}
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeImportantDate(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Publish Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="publishedAt">Publish Date</Label>
                                    <Input
                                        id="publishedAt"
                                        type="datetime-local"
                                        {...register('publishedAt')}
                                    />
                                </div>

                                {/* Expiry Date */}
                                <div className="space-y-2">
                                    <Label htmlFor="expiryDate">Expiry Date</Label>
                                    <Input
                                        id="expiryDate"
                                        type="datetime-local"
                                        {...register('expiryDate')}
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={watchedValues.status}
                                    onValueChange={(value) => setValue('status', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DRAFT">Save as Draft</SelectItem>
                                        <SelectItem value="PUBLISHED">Publish Now</SelectItem>
                                        <SelectItem value="SCHEDULED">Schedule for Later</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsCreateDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-4 w-4" />
                                            {watchedValues.status === 'PUBLISHED' ? 'Publish' : 'Save'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Notices List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Notices</CardTitle>
                    <CardDescription>
                        Total: {noticesData?.notices?.length || 0} notices
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {noticesData?.notices?.map((notice) => (
                            <div
                                key={notice.id}
                                className="border rounded-lg p-4 hover:bg-accent transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-lg">{notice.title}</h3>
                                            <Badge variant={notice.priority === 'URGENT' ? 'destructive' : 'secondary'}>
                                                {notice.priority}
                                            </Badge>
                                            <Badge variant="outline">{notice.category}</Badge>
                                            <Badge>{notice.status}</Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {notice.subtitle || notice.description.substring(0, 100)}...
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                            <span>👁️ {notice._count?.NoticeReads || 0} views</span>
                                            <span>📅 {new Date(notice.publishedAt || notice.createdAt).toLocaleDateString()}</span>
                                            <span>👤 {notice.issuedBy || notice.Author?.name}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="sm">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm('Delete this notice?')) {
                                                    deleteMutation.mutate(notice.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}