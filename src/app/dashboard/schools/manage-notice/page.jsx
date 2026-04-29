'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Plus,
    Send,
    Loader2,
    Bell,
    Trash2,
    Edit2,
    Eye,
    FileText,
    X,
    Search,
    CheckCircle,
    Clock,
    Save,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/context/AuthContext';
import FileUploadButton from '@/components/fileupload';
import Image from 'next/image';

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
    { value: 'GENERAL', label: 'General', color: 'bg-gray-500' },
    { value: 'ACADEMIC', label: 'Academic', color: 'bg-blue-500' },
    { value: 'EXAM', label: 'Exam', color: 'bg-purple-500' },
    { value: 'EMERGENCY', label: 'Emergency', color: 'bg-red-500' },
    { value: 'EVENT', label: 'Event', color: 'bg-orange-500' },
    { value: 'HOLIDAY', label: 'Holiday', color: 'bg-green-500' },
    { value: 'FEE', label: 'Fee', color: 'bg-yellow-500' },
    { value: 'TRANSPORT', label: 'Transport', color: 'bg-cyan-500' },
];

const AUDIENCES = [
    { value: 'ALL', label: 'All Users' },
    { value: 'STUDENTS', label: 'Students' },
    { value: 'TEACHERS', label: 'Teachers' },
    { value: 'PARENTS', label: 'Parents' },
    { value: 'STAFF', label: 'All Staff' },
];

const PRIORITIES = [
    { value: 'NORMAL', label: 'Normal', color: 'bg-gray-100 text-gray-700' },
    { value: 'IMPORTANT', label: 'Important', color: 'bg-blue-100 text-blue-700' },
    { value: 'URGENT', label: 'Urgent', color: 'bg-orange-100 text-orange-700' },
    { value: 'CRITICAL', label: 'Critical', color: 'bg-red-100 text-red-700' },
];

const DRAFT_STORAGE_KEY = 'notice_draft';

export default function NoticeAdminPage() {
    const queryClient = useQueryClient();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const [hasDraft, setHasDraft] = useState(false);
    const skipDraftSave = useRef(false);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedNotice, setSelectedNotice] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [uploadedImageUrl, setUploadedImageUrl] = useState('');
    const [uploadResetKey, setUploadResetKey] = useState(0);
    const [isImageUploading, setIsImageUploading] = useState(false);

    // IDs currently being deleted — filtered out of UI instantly
    const [deletingIds, setDeletingIds] = useState([]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Image Preview State
    const [previewImage, setPreviewImage] = useState(null);

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
            issuedBy: fullUser?.name || '',
            issuerRole: fullUser?.role?.name || 'Administration',
        },
    });

    // Only watch fields that need to trigger UI re-renders (Selects)
    // We EXCLUDE title, subtitle, and description from here to prevent lag
    const category = watch('category');
    const priority = watch('priority');
    const audience = watch('audience');

    // ── Draft auto-save to localStorage (Non-rendering approach) ──
    useEffect(() => {
        if (!isDialogOpen || selectedNotice) return;

        const subscription = watch((values) => {
            if (skipDraftSave.current || selectedNotice) return;

            const { title, subtitle, description } = values;
            const hasContent = title || subtitle || description;
            if (!hasContent) return;

            // Debounce save operation
            const timer = setTimeout(() => {
                try {
                    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({
                        ...values,
                        uploadedImageUrl, // Still needed from state
                        savedAt: Date.now(),
                    }));
                } catch { /* ignore */ }
            }, 1000);

            return () => clearTimeout(timer);
        });

        return () => subscription.unsubscribe();
    }, [watch, isDialogOpen, selectedNotice, uploadedImageUrl]);

    const clearDraft = useCallback(() => {
        try { localStorage.removeItem(DRAFT_STORAGE_KEY); } catch { }
        setHasDraft(false);
    }, []);

    // Fetch notices - only notices created by current user
    const { data: noticesData, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['notices', schoolId, fullUser?.id],
        queryFn: async () => {
            const res = await fetch(`/api/notices/${schoolId}?limit=100&creatorId=${fullUser?.id}`);
            if (!res.ok) throw new Error('Failed to fetch notices');
            return res.json();
        },
        enabled: !!schoolId && !!fullUser?.id,
    });

    // Filter out items currently being deleted so they vanish from UI immediately
    const notices = useMemo(() => {
        const all = noticesData?.notices || [];
        if (deletingIds.length === 0) return all;
        return all.filter(n => !deletingIds.includes(n.id));
    }, [noticesData, deletingIds]);

    // Manual refresh handler
    const handleRefresh = () => {
        refetch();
    };

    // Stats
    const stats = useMemo(() => {
        const published = notices.filter(n => n.status === 'PUBLISHED').length;
        const draft = notices.filter(n => n.status === 'DRAFT').length;
        const urgent = notices.filter(n => n.priority === 'URGENT' || n.priority === 'CRITICAL').length;
        const totalViews = notices.reduce((acc, n) => acc + (n._count?.NoticeReads || n.viewCount || 0), 0);
        return { total: notices.length, published, draft, urgent, totalViews };
    }, [notices]);

    // Filtered notices
    const filteredNotices = useMemo(() => {
        return notices.filter(notice => {
            const matchesSearch = !searchQuery ||
                notice.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                notice.description?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = filterCategory === 'ALL' || notice.category === filterCategory;
            const matchesStatus = filterStatus === 'ALL' || notice.status === filterStatus;
            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [notices, searchQuery, filterCategory, filterStatus]);

    // Pagination Logic
    const { paginatedNotices, totalPages } = useMemo(() => {
        const total = Math.ceil(filteredNotices.length / pageSize);
        const paginated = filteredNotices.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize
        );
        return { paginatedNotices: paginated, totalPages: total };
    }, [filteredNotices, currentPage, pageSize]);

    // Reset page when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchQuery, filterCategory, filterStatus, pageSize]);

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data) => {
            // Always publish with current time
            const payload = {
                ...data,
                status: 'PUBLISHED',
                createdById: fullUser?.id,
                fileUrl: uploadedImageUrl || null,
                publishedAt: new Date().toISOString(),
                issuedBy: fullUser?.name || 'Administration',
                issuerRole: fullUser?.role?.name || 'Admin',
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
            toast.success('Notice published successfully!');
            clearDraft(); // Clear draft from localStorage on successful save
            queryClient.refetchQueries({ queryKey: ['notices', schoolId, fullUser?.id] });
            closeDialog(true);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create notice');
        },
    });

    // Delete mutation — minimal, callers handle UX
    const deleteMutation = useMutation({
        mutationFn: async (noticeId) => {
            const res = await fetch(`/api/notices/${schoolId}/${noticeId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete notice');
            return res.json();
        },
    });

    // Single notice delete — state-based instant UI update
    const handleSingleDelete = async (noticeId) => {
        if (!confirm('Delete this notice?')) return;

        // Instantly hide from UI
        setDeletingIds(prev => [...prev, noticeId]);
        const loadingId = toast.loading('Deleting notice...');

        try {
            await deleteMutation.mutateAsync(noticeId);
            toast.dismiss(loadingId);
            toast.success('Notice deleted');
        } catch {
            toast.dismiss(loadingId);
            toast.error('Failed to delete notice');
        } finally {
            // Force hard refetch from server & clear deleting state
            await queryClient.refetchQueries({ queryKey: ['notices', schoolId, fullUser?.id] });
            setDeletingIds(prev => prev.filter(id => id !== noticeId));
        }
    };

    const openDialog = (notice = null) => {
        if (notice) {
            setSelectedNotice(notice);
            reset({
                title: notice.title,
                subtitle: notice.subtitle || '',
                description: notice.description,
                category: notice.category,
                audience: notice.audience,
                priority: notice.priority,
            });
            setUploadedImageUrl(notice.fileUrl || '');
        } else {
            setSelectedNotice(null);
            // Try to restore draft from localStorage
            let restoredDraft = false;
            try {
                const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
                if (saved) {
                    const draft = JSON.parse(saved);
                    // Only restore if draft is less than 7 days old
                    if (draft.savedAt && Date.now() - draft.savedAt < 7 * 24 * 60 * 60 * 1000) {
                        reset({
                            title: draft.title || '',
                            subtitle: draft.subtitle || '',
                            description: draft.description || '',
                            category: draft.category || 'GENERAL',
                            audience: draft.audience || 'ALL',
                            priority: draft.priority || 'NORMAL',
                        });
                        setUploadedImageUrl(draft.uploadedImageUrl || '');
                        setHasDraft(true);
                        restoredDraft = true;
                    }
                }
            } catch { }
            if (!restoredDraft) {
                reset({
                    priority: 'NORMAL',
                    audience: 'ALL',
                    category: 'GENERAL',
                });
                setUploadedImageUrl('');
                setHasDraft(false);
            }
        }
        setIsDialogOpen(true);
    };

    const closeDialog = (clearSavedDraft = false) => {
        setIsDialogOpen(false);
        setSelectedNotice(null);
        setUploadedImageUrl('');
        setUploadResetKey(prev => prev + 1);
        setHasDraft(false);
        reset();
        if (clearSavedDraft) {
            clearDraft();
        }
    };

    const onSubmit = (data) => {
        createMutation.mutate(data);
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            // Select only current page items
            setSelectedIds(paginatedNotices.map(n => n.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id, checked) => {
        if (checked) {
            setSelectedIds([...selectedIds, id]);
        } else {
            setSelectedIds(selectedIds.filter(i => i !== id));
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedIds.length;
        if (!confirm(`Delete ${count} notice(s)?`)) return;

        const idsToDelete = [...selectedIds];

        // Instantly hide from UI
        setDeletingIds(prev => [...prev, ...idsToDelete]);
        setSelectedIds([]);

        const loadingId = toast.loading(`Deleting ${count} notice(s)...`);

        try {
            const results = await Promise.allSettled(
                idsToDelete.map(id => deleteMutation.mutateAsync(id))
            );
            const failed = results.filter(r => r.status === 'rejected').length;
            toast.dismiss(loadingId);
            if (failed > 0) {
                toast.error(`Failed to delete ${failed} of ${count} notice(s)`);
            } else {
                toast.success(`Deleted ${count} notice(s)`);
            }
        } catch {
            toast.dismiss(loadingId);
            toast.error('Failed to delete notices');
        } finally {
            // Force hard refetch from server & clear deleting state
            await queryClient.refetchQueries({ queryKey: ['notices', schoolId, fullUser?.id] });
            setDeletingIds(prev => prev.filter(id => !idsToDelete.includes(id)));
        }
    };

    const getCategoryColor = (category) => {
        return CATEGORIES.find(c => c.value === category)?.color || 'bg-gray-500';
    };

    const getPriorityBadge = (priority) => {
        const p = PRIORITIES.find(pr => pr.value === priority);
        return p?.color || 'bg-gray-100 text-gray-700';
    };

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="w-6 h-6 text-primary" />
                        Notice Board Management
                    </h1>
                    <p className="text-muted-foreground">Create and manage school notices and circulars</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={handleRefresh}
                        disabled={isFetching}
                        title="Refresh notices"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button onClick={() => openDialog()}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Notice
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Notices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.total}</div>
                        <p className="text-xs text-muted-foreground">All time notices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Published</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.published}</div>
                        <p className="text-xs text-muted-foreground">Active notices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Drafts</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.draft}</div>
                        <p className="text-xs text-muted-foreground">Pending publish</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalViews}</div>
                        <p className="text-xs text-muted-foreground">Across all notices</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle>All Notices ({filteredNotices.length})</CardTitle>
                            <CardDescription>
                                Manage school notices and announcements
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground hidden sm:inline-block">Rows per page:</span>
                                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
                                    <SelectTrigger className="w-[70px] h-8">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="100">100</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {selectedIds.length > 0 && (
                                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete ({selectedIds.length})
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Filters Row */}
                    <div className="flex flex-col gap-3 mb-4 md:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search notices..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={filterCategory} onValueChange={setFilterCategory}>
                            <SelectTrigger className="w-[150px]">
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Categories</SelectItem>
                                {CATEGORIES.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[130px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="PUBLISHED">Published</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader className="bg-muted">
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={selectedIds.length === paginatedNotices.length && paginatedNotices.length > 0}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Notice</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Audience</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Views</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-10">
                                            <Loader2 className="animate-spin w-6 h-6 mx-auto text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedNotices.length > 0 ? (
                                    paginatedNotices.map((notice, index) => (
                                        <TableRow key={notice.id} className={index % 2 === 0 ? '' : 'bg-muted/50'}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedIds.includes(notice.id)}
                                                    onCheckedChange={(checked) => handleSelectOne(notice.id, checked)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    {notice.fileUrl && (
                                                        <div
                                                            className="w-10 h-10 rounded overflow-hidden flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity border border-border"
                                                            onClick={() => setPreviewImage(notice.fileUrl)}
                                                        >
                                                            <img
                                                                src={notice.fileUrl}
                                                                alt=""
                                                                width={40}
                                                                height={40}
                                                                className="object-cover w-full h-full"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate max-w-[200px]">{notice.title}</p>
                                                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                            {notice.subtitle || notice.description?.substring(0, 50)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-2 h-2 rounded-full ${getCategoryColor(notice.category)}`} />
                                                    <span className="text-sm">{notice.category}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs">
                                                    {notice.audience}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`${getPriorityBadge(notice.priority)} text-xs`}>
                                                    {notice.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={notice.status === 'PUBLISHED' ? 'default' : 'secondary'} className="text-xs">
                                                    {notice.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {notice._count?.NoticeReads || notice.viewCount || 0}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm text-muted-foreground">
                                                    {new Date(notice.publishedAt || notice.createdAt).toLocaleDateString()}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => openDialog(notice)}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleSingleDelete(notice.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                                            No notices found
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-sm text-muted-foreground">
                                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredNotices.length)} of {filteredNotices.length} notices
                            </p>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) {
                                            pageNum = i + 1;
                                        } else if (currentPage <= 3) {
                                            pageNum = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            pageNum = totalPages - 4 + i;
                                        } else {
                                            pageNum = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setCurrentPage(pageNum)}
                                                className="w-8 h-8 p-0"
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedNotice ? 'Edit Notice' : 'Create New Notice'}</DialogTitle>
                        <DialogDescription>
                            {selectedNotice ? 'Update the notice details' : 'Fill in the details to create a new notice'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Draft restored indicator */}
                    {hasDraft && !selectedNotice && (
                        <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 text-sm">
                            <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                <Save className="h-3.5 w-3.5" />
                                Draft restored from previous session
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-amber-600 hover:text-amber-800"
                                onClick={() => {
                                    clearDraft();
                                    skipDraftSave.current = true;
                                    reset({
                                        priority: 'NORMAL',
                                        audience: 'ALL',
                                        category: 'GENERAL',
                                    });
                                    setUploadedImageUrl('');
                                    setHasDraft(false);
                                    setTimeout(() => { skipDraftSave.current = false; }, 600);
                                }}
                            >
                                Clear draft
                            </Button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                {...register('title')}
                                placeholder="e.g., School Holiday Announcement"
                            />
                            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
                        </div>

                        {/* Subtitle */}
                        <div className="space-y-2">
                            <Label htmlFor="subtitle">Subtitle (Preview text)</Label>
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
                                rows={4}
                            />
                            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label>Attachment Image (Optional)</Label>
                            <FileUploadButton
                                field="notice"
                                onChange={(url) => setUploadedImageUrl(url)}
                                onUploadStatusChange={(uploading) => setIsImageUploading(uploading)}
                                resetKey={uploadResetKey}
                                saveToLibrary={true}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Category */}
                            <div className="space-y-2">
                                <Label>Category *</Label>
                                <Select
                                    value={category}
                                    onValueChange={(value) => setValue('category', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${cat.color}`} />
                                                    {cat.label}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Priority */}
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                    value={priority}
                                    onValueChange={(value) => setValue('priority', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PRIORITIES.map(p => (
                                            <SelectItem key={p.value} value={p.value}>
                                                {p.label}
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
                                value={audience}
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





                        {/* Buttons */}
                        <div className="flex gap-2 justify-end pt-2">
                            <Button type="button" variant="outline" onClick={() => closeDialog(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || isImageUploading}>
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : isImageUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading image...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Publish
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Image Preview Dialog */}
            <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
                <DialogContent showCloseButton={false} className="max-w-3xl border-0 p-0 overflow-hidden bg-transparent shadow-none">
                    <div className="relative w-full h-full flex items-center justify-center p-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
                            onClick={() => setPreviewImage(null)}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                        {previewImage && (
                            <img
                                src={previewImage}
                                alt="Preview"
                                className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}