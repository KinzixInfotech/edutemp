'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2, Edit, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// Validation schema for create/update notice
const noticeSchema = z.object({
    schoolId: z.string().uuid('Invalid school ID'),
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    fileUrl: z.string().optional(),
    audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'CLASS', 'SECTION'], {
        errorMap: () => ({ message: 'Invalid audience' }),
    }),
    priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT'], {
        errorMap: () => ({ message: 'Invalid priority' }),
    }),
    status: z.enum(['DRAFT', 'PUBLISHED'], {
        errorMap: () => ({ message: 'Status must be DRAFT or PUBLISHED' }),
    }),
    publishedAt: z.date().optional(),
    expiryDate: z.date().optional(),
    createdById: z.string().uuid('Invalid creator ID').optional(),
});

const updateNoticeSchema = noticeSchema.extend({
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED'], {
        errorMap: () => ({ message: 'Invalid status' }),
    }),
});

// Schema for filtering notices
const filterSchema = z.object({
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
    audience: z.enum(['ALL', 'STUDENTS', 'TEACHERS', 'PARENTS', 'CLASS', 'SECTION']).optional(),
    priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).optional(),
    publishedAtStart: z.string().datetime().optional(),
    publishedAtEnd: z.string().datetime().optional(),
    sortBy: z.enum(['publishedAt', 'priority', 'createdAt']).optional().default('createdAt'),
    limit: z.number().min(1).default(10),
    offset: z.number().min(0).default(0),
});



export default function NoticesTable() {
    const { fullUser } = useAuth();
    const [notices, setNotices] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [filters, setFilters] = useState({
        status: '',
        audience: '',
        priority: '',
        publishedAtStart: '',
        publishedAtEnd: '',
        sortBy: 'createdAt',
        limit: 10,
        offset: 0,
    });

    const form = useForm({
        resolver: zodResolver(noticeSchema),
        defaultValues: {
            schoolId: fullUser?.schoolId || '',
            title: '',
            description: '',
            fileUrl: '',
            audience: 'ALL',
            priority: 'NORMAL',
            status: 'DRAFT',
            publishedAt: undefined,
            expiryDate: undefined,
            createdById: fullUser?.id,
        },
    });

    const editForm = useForm({
        resolver: zodResolver(updateNoticeSchema),
        defaultValues: {
            schoolId: '',
            title: '',
            description: '',
            fileUrl: '',
            audience: 'ALL',
            priority: 'NORMAL',
            status: 'DRAFT',
            publishedAt: undefined,
            expiryDate: undefined,
            createdById: '',
        },
    });
    useEffect(() => {
        console.log('Form errors:', form.formState.errors);
    }, [form.formState.errors]);

    // Fetch notices
    const fetchNotices = async () => {
        if (!fullUser?.schoolId) {
            toast.error('School ID is missing');
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const query = new URLSearchParams({
                schoolId: fullUser.schoolId,
                ...filters,
                status: filters.status || null,
                audience: filters.audience || null,
                priority: filters.priority || null,
                publishedAtStart: filters.publishedAtStart || null,
                publishedAtEnd: filters.publishedAtEnd || null,
            }).toString();
            const res = await fetch(`/api/schools/notice?${query}`);
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to fetch notices');
            }
            const data = await res.json();
            setNotices(data.notices || []);
            setTotal(data.total || 0);
        } catch (err) {
            console.error('Fetch error:', err);
            toast.error(err.message || 'Failed to load notices');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, [fullUser?.schoolId, filters]);

    // Handle create notice
    const handleCreate = async (values) => {
        console.log('Creating notice with values:', values);
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                publishedAt: values.publishedAt?.toISOString(),
                expiryDate: values.expiryDate?.toISOString(),
            };
            console.log('Create payload:', payload);
            const res = await fetch('/api/schools/notice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create notice');
            }
            toast.success('Notice created successfully');
            setCreateOpen(false);
            form.reset();
            fetchNotices();
        } catch (err) {
            console.error('Create error:', err);
            toast.error(err.message || 'Failed to create notice');
        } finally {
            console.log('Resetting submitting state');
            setSubmitting(false);
        }
    };

    // Handle update notice
    const handleUpdate = async (values) => {
        if (!selectedNotice) {
            toast.error('No notice selected for update');
            return;
        }
        console.log('Updating notice with values:', values);
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                publishedAt: values.publishedAt?.toISOString(),
                expiryDate: values.expiryDate?.toISOString(),
            };
            console.log('Update payload:', payload);
            const res = await fetch(`/api/schools/notice?id=${selectedNotice.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update notice');
            }
            toast.success('Notice updated successfully');
            setEditOpen(false);
            fetchNotices();
        } catch (err) {
            console.error('Update error:', err);
            toast.error(err.message || 'Failed to update notice');
        } finally {
            setSubmitting(false);
        }
    };

    // Handle delete notice
    const handleDelete = async (hard = false) => {
        if (!selectedNotice) {
            toast.error('No notice selected for deletion');
            return;
        }
        setSubmitting(true);
        try {
            const res = await fetch(
                `/api/schools/notice?id=${selectedNotice.id}${hard ? '&hard=true' : ''}`,
                { method: 'DELETE' }
            );
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete notice');
            }
            toast.success(`Notice ${hard ? 'permanently' : ''} deleted successfully`);
            setDeleteOpen(false);
            setSelectedNotice(null);
            fetchNotices();
        } catch (err) {
            console.error('Delete error:', err);
            toast.error(err.message || 'Failed to delete notice');
        } finally {
            setSubmitting(false);
        }
    };
    useEffect(() => {
        console.log('Submitting state:', submitting);
    }, [submitting]);
    // Handle mark important
    const handleMarkImportant = async (noticeId, priority) => {
        try {
            const res = await fetch(`/api/schools/notice?id=${noticeId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ priority }),
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update priority');
            }
            toast.success(`Notice marked as ${priority}`);
            fetchNotices();
        } catch (err) {
            console.error('Mark important error:', err);
            toast.error(err.message || 'Failed to update priority');
        }
    };

    // Handle file upload (simulated)
    const handleFileChange = (e, formType) => {
        const file = e.target.files?.[0];
        if (file) {
            const targetForm = formType === 'create' ? form : editForm;
            targetForm.setValue('fileUrl', `/uploads/${file.name}`);
        }
    };

    // when fullUser changes, update the form
    useEffect(() => {
        if (fullUser) {
            form.reset({
                ...form.getValues(), // keep current values
                schoolId: fullUser.schoolId || '',
                createdById: fullUser.id,
            });
        }
    }, [fullUser, form]);
    return (
        <div className="p-6">
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle>Notices</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-4 gap-5 lg:flex-row flex-col">
                        <div className="flex gap-2 lg:w-fit w-full">
                            <Select
                                value={filters.status}
                                onValueChange={(value) => setFilters({ ...filters, status: value || '' })}
                            >
                                <SelectTrigger className="lg:w-[180px] w-full">
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Statuses</SelectItem>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="PUBLISHED">Published</SelectItem>
                                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.audience}
                                onValueChange={(value) => setFilters({ ...filters, audience: value || '' })}
                            >
                                <SelectTrigger className="lg:w-[180px] w-full">
                                    <SelectValue placeholder="Filter by Audience" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Audiences</SelectItem>
                                    <SelectItem value="ALL">All</SelectItem>
                                    <SelectItem value="STUDENTS">Students</SelectItem>
                                    <SelectItem value="TEACHERS">Teachers</SelectItem>
                                    <SelectItem value="PARENTS">Parents</SelectItem>
                                    <SelectItem value="CLASS">Class</SelectItem>
                                    <SelectItem value="SECTION">Section</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={filters.priority}
                                onValueChange={(value) => setFilters({ ...filters, priority: value || '' })}
                            >
                                <SelectTrigger className="lg:w-[180px] w-full">
                                    <SelectValue placeholder="Filter by Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All">All Priorities</SelectItem>
                                    <SelectItem value="NORMAL">Normal</SelectItem>
                                    <SelectItem value="IMPORTANT">Important</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Dialog open={createOpen} onOpenChange={(open) => {
                            setCreateOpen(open);
                            if (!open) form.reset();
                        }}>
                            <DialogTrigger asChild>
                                <Button className="lg:w-fit w-full">
                                    <Plus className="h-4 w-4 mr-2" /> Create Notice
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Create Notice</DialogTitle>
                                </DialogHeader>
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="title"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Title</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Notice title" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="description"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Description</FormLabel>
                                                    <FormControl>
                                                        <Textarea placeholder="Notice description" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormItem>
                                            <FormLabel>File Upload (Optional)</FormLabel>
                                            <FormControl>
                                                <Input type="file" onChange={(e) => handleFileChange(e, 'create')} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                        <FormField
                                            control={form.control}
                                            name="audience"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Audience</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select audience" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="ALL">All</SelectItem>
                                                            <SelectItem value="STUDENTS">Students</SelectItem>
                                                            <SelectItem value="TEACHERS">Teachers</SelectItem>
                                                            <SelectItem value="PARENTS">Parents</SelectItem>
                                                            <SelectItem value="CLASS">Class</SelectItem>
                                                            <SelectItem value="SECTION">Section</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="priority"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Priority</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select priority" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="NORMAL">Normal</SelectItem>
                                                            <SelectItem value="IMPORTANT">Important</SelectItem>
                                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="status"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Status</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select status" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="DRAFT">Draft</SelectItem>
                                                            <SelectItem value="PUBLISHED">Published</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="publishedAt"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Published At (Optional)</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'w-full justify-start text-left font-normal',
                                                                        !field.value && 'text-muted-foreground'
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="expiryDate"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Expiry Date (Optional)</FormLabel>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    variant="outline"
                                                                    className={cn(
                                                                        'w-full justify-start text-left font-normal',
                                                                        !field.value && 'text-muted-foreground'
                                                                    )}
                                                                >
                                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                                    {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value}
                                                                onSelect={field.onChange}
                                                                initialFocus
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" disabled={submitting} className="w-full">
                                            {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}

                                            {submitting ? 'Creating...' : 'Create Notice'}
                                        </Button>
                                    </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="overflow-x-auto rounded-lg border">
                        <Table className="min-w-[800px]">
                            <TableHeader className="bg-muted sticky top-0 z-10">
                                <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead>Audience</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Published At</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-4">
                                            <Loader2 className="animate-spin mx-auto" size={30} />
                                        </TableCell>
                                    </TableRow>
                                ) : notices.length > 0 ? (
                                    notices.map((notice, index) => (
                                        <TableRow key={notice.id} className={index % 2 === 0 ? 'bg-muted' : 'bg-background'}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{notice.title}</TableCell>
                                            <TableCell>{notice.audience}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        notice.priority === 'URGENT'
                                                            ? 'destructive'
                                                            : notice.priority === 'IMPORTANT'
                                                                ? 'default'
                                                                : 'secondary'
                                                    }
                                                >
                                                    {notice.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        notice.status === 'PUBLISHED'
                                                            ? 'default'
                                                            : notice.status === 'ARCHIVED'
                                                                ? 'secondary'
                                                                : 'outline'
                                                    }
                                                >
                                                    {notice.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {notice.publishedAt ? format(new Date(notice.publishedAt), 'PPP') : 'N/A'}
                                            </TableCell>
                                            <TableCell className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedNotice(notice);
                                                        editForm.reset({
                                                            schoolId: notice.schoolId,
                                                            title: notice.title,
                                                            description: notice.description,
                                                            fileUrl: notice.fileUrl || '',
                                                            audience: notice.audience,
                                                            priority: notice.priority,
                                                            status: notice.status,
                                                            publishedAt: notice.publishedAt ? new Date(notice.publishedAt) : undefined,
                                                            expiryDate: notice.expiryDate ? new Date(notice.expiryDate) : undefined,
                                                            createdById: notice.createdById || '',
                                                        });
                                                        setEditOpen(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setSelectedNotice(notice);
                                                        setDeleteOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                </Button>
                                                {notice.priority !== 'URGENT' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleMarkImportant(notice.id, notice.priority === 'IMPORTANT' ? 'URGENT' : 'IMPORTANT')}
                                                    >
                                                        <AlertCircle className="h-4 w-4 mr-2" /> Mark {notice.priority === 'IMPORTANT' ? 'Urgent' : 'Important'}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-4">
                                            No notices found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex justify-between items-center mt-4">
                        <Button
                            disabled={filters.offset === 0 || loading}
                            onClick={() => setFilters({ ...filters, offset: filters.offset - filters.limit })}
                        >
                            Previous
                        </Button>
                        <span>
                            Page {Math.floor(filters.offset / filters.limit) + 1} of {Math.ceil(total / filters.limit) || 1}
                        </span>
                        <Button
                            disabled={filters.offset + filters.limit >= total || loading}
                            onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                        >
                            Next
                        </Button>
                    </div>

                    {/* Edit Notice Dialog */}
                    <Dialog open={editOpen} onOpenChange={(open) => {
                        setEditOpen(open);
                        if (!open) editForm.reset();
                    }}>
                        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Notice</DialogTitle>
                            </DialogHeader>
                            <Form {...editForm}>
                                <form onSubmit={editForm.handleSubmit(handleUpdate)} className="space-y-4">
                                    <FormField
                                        control={editForm.control}
                                        name="title"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Title</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Notice title" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={editForm.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Notice description" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormItem>
                                        <FormLabel>File Upload (Optional)</FormLabel>
                                        <FormControl>
                                            <Input type="file" onChange={(e) => handleFileChange(e, 'edit')} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    <FormField
                                        control={editForm.control}
                                        name="audience"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Audience</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select audience" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">All</SelectItem>
                                                        <SelectItem value="STUDENTS">Students</SelectItem>
                                                        <SelectItem value="TEACHERS">Teachers</SelectItem>
                                                        <SelectItem value="PARENTS">Parents</SelectItem>
                                                        <SelectItem value="CLASS">Class</SelectItem>
                                                        <SelectItem value="SECTION">Section</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={editForm.control}
                                        name="priority"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Priority</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select priority" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="NORMAL">Normal</SelectItem>
                                                        <SelectItem value="IMPORTANT">Important</SelectItem>
                                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={editForm.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                                        <SelectItem value="PUBLISHED">Published</SelectItem>
                                                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={editForm.control}
                                        name="publishedAt"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Published At (Optional)</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    'w-full justify-start text-left font-normal',
                                                                    !field.value && 'text-muted-foreground'
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={editForm.control}
                                        name="expiryDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Expiry Date (Optional)</FormLabel>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <FormControl>
                                                            <Button
                                                                variant="outline"
                                                                className={cn(
                                                                    'w-full justify-start text-left font-normal',
                                                                    !field.value && 'text-muted-foreground'
                                                                )}
                                                            >
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                                            </Button>
                                                        </FormControl>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.value}
                                                            onSelect={field.onChange}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="submit" disabled={submitting} className="w-full">
                                        {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                        {submitting ? 'Updating...' : 'Update Notice'}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={deleteOpen} onOpenChange={(open) => {
                        setDeleteOpen(open);
                        if (!open) setSelectedNotice(null);
                    }}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Confirm Deletion</DialogTitle>
                            </DialogHeader>
                            <p>Are you sure you want to delete "{selectedNotice?.title}"?</p>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => handleDelete(false)}
                                    disabled={submitting}
                                >
                                    Soft Delete (Archive)
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(true)}
                                    disabled={submitting}
                                >
                                    Hard Delete
                                </Button>
                                <DialogClose asChild>
                                    <Button variant="secondary">Cancel</Button>
                                </DialogClose>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>
        </div>
    );
}