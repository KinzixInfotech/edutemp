'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Upload, Save, ChevronLeft, ChevronRight, Users, Loader2, X,
    ImagePlus, Check, Trash2, AlertCircle, Camera, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import LoaderPage from '@/components/loader-page';
import { cn } from '@/lib/utils';

const STUDENTS_PER_PAGE = 15;

function getStorageKey(schoolId, classId, sectionId) {
    return `bulk-images-${schoolId}-${classId}-${sectionId}`;
}

function loadFromStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : {};
    } catch { return {}; }
}

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        console.warn('localStorage save failed:', e);
    }
}

function removeFromStorage(key) {
    try { localStorage.removeItem(key); } catch { }
}

export default function BulkImageUploadPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const schoolId = fullUser?.schoolId;

    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const className = searchParams.get('className') || '';
    const sectionName = searchParams.get('sectionName') || '';

    const [page, setPage] = useState(1);
    // Map: userId -> { file: File | null, preview: string, dataUrl: string }
    const [pendingImages, setPendingImages] = useState({});
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRefs = useRef({});

    const storageKey = schoolId && classId && sectionId ? getStorageKey(schoolId, classId, sectionId) : null;

    // Load from localStorage on mount
    useEffect(() => {
        if (!storageKey) return;
        const saved = loadFromStorage(storageKey);
        if (Object.keys(saved).length > 0) {
            // Restore only dataUrls (Files can't be serialized)
            const restored = {};
            for (const [userId, data] of Object.entries(saved)) {
                restored[userId] = { file: null, preview: data.dataUrl, dataUrl: data.dataUrl };
            }
            setPendingImages(restored);
            toast.info(`Restored ${Object.keys(saved).length} unsaved image(s) from previous session`);
        }
    }, [storageKey]);

    // Save to localStorage whenever pendingImages changes
    useEffect(() => {
        if (!storageKey) return;
        const dataToSave = {};
        for (const [userId, data] of Object.entries(pendingImages)) {
            if (data.dataUrl) {
                dataToSave[userId] = { dataUrl: data.dataUrl };
            }
        }
        if (Object.keys(dataToSave).length > 0) {
            saveToStorage(storageKey, dataToSave);
        } else {
            removeFromStorage(storageKey);
        }
    }, [pendingImages, storageKey]);

    // Fetch students for this class/section
    const { data: studentData, isLoading } = useQuery({
        queryKey: ['bulk-image-students', schoolId, classId, sectionId, page],
        queryFn: async () => {
            const params = new URLSearchParams({
                classId: String(classId),
                sectionId: String(sectionId),
                page: String(page),
                limit: String(STUDENTS_PER_PAGE),
                sortBy: 'name_asc',
            });
            const res = await axios.get(`/api/schools/${schoolId}/students?${params}`);
            return res.data || {};
        },
        enabled: !!schoolId && !!classId && !!sectionId,
        staleTime: 1000 * 60 * 5,
    });

    const students = studentData?.students || [];
    const total = studentData?.total || 0;
    const totalPages = Math.ceil(total / STUDENTS_PER_PAGE);

    const pendingCount = Object.keys(pendingImages).length;

    // Handle file drop / selection
    const handleFile = useCallback((userId, file) => {
        if (!file || !file.type.startsWith('image/')) {
            toast.error('Please select a valid image file');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be under 5MB');
            return;
        }

        const preview = URL.createObjectURL(file);

        // Convert to dataURL for localStorage persistence
        const reader = new FileReader();
        reader.onload = (e) => {
            setPendingImages(prev => ({
                ...prev,
                [userId]: { file, preview, dataUrl: e.target.result }
            }));
        };
        reader.readAsDataURL(file);
    }, []);

    const removeImage = useCallback((userId) => {
        setPendingImages(prev => {
            const next = { ...prev };
            if (next[userId]?.preview) {
                URL.revokeObjectURL(next[userId].preview);
            }
            delete next[userId];
            return next;
        });
    }, []);

    const clearAll = useCallback(() => {
        for (const data of Object.values(pendingImages)) {
            if (data.preview) URL.revokeObjectURL(data.preview);
        }
        setPendingImages({});
        if (storageKey) removeFromStorage(storageKey);
        toast.success('All pending uploads cleared');
    }, [pendingImages, storageKey]);

    // ─── Save All: presign → upload → bulk PATCH ───────────────────
    const handleSaveAll = async () => {
        const entries = Object.entries(pendingImages).filter(([, d]) => d.dataUrl);
        if (entries.length === 0) {
            toast.error('No images to save');
            return;
        }

        setIsSaving(true);
        setUploadProgress(0);

        try {
            // Step 1: Convert dataURLs to Blobs for entries that lost their File (restored from localStorage)
            const filesToUpload = [];
            for (const [userId, data] of entries) {
                let file = data.file;
                if (!file && data.dataUrl) {
                    // Convert dataURL back to Blob
                    const response = await fetch(data.dataUrl);
                    const blob = await response.blob();
                    file = new File([blob], `student-${userId}.jpg`, { type: blob.type || 'image/jpeg' });
                }
                filesToUpload.push({ userId, file });
            }

            // Step 2: Get presigned URLs from R2
            const presignRes = await axios.post('/api/r2/presign', {
                files: filesToUpload.map(({ userId, file }) => ({
                    name: file.name || `student-${userId}.jpg`,
                    type: file.type || 'image/jpeg',
                    size: file.size,
                })),
                folder: 'students',
                schoolId,
            });

            const presignedUrls = presignRes.data;
            setUploadProgress(10);

            // Step 3: Upload files to R2
            const uploadPromises = filesToUpload.map(async ({ file }, index) => {
                const { url } = presignedUrls[index];
                await fetch(url, {
                    method: 'PUT',
                    body: file,
                    headers: { 'Content-Type': file.type || 'image/jpeg' },
                });
                setUploadProgress(prev => Math.min(prev + (70 / filesToUpload.length), 80));
            });

            await Promise.all(uploadPromises);
            setUploadProgress(85);

            // Step 4: Bulk update profile pictures in DB
            const updates = filesToUpload.map(({ userId }, index) => ({
                userId,
                profilePicture: presignedUrls[index].publicUrl,
            }));

            await axios.patch(`/api/schools/${schoolId}/students/bulk-update-images`, {
                updates,
            });

            setUploadProgress(100);

            // Cleanup
            for (const data of Object.values(pendingImages)) {
                if (data.preview) URL.revokeObjectURL(data.preview);
            }
            setPendingImages({});
            if (storageKey) removeFromStorage(storageKey);

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['bulk-image-students'] });
            queryClient.invalidateQueries({ queryKey: ['students'] });

            toast.success(`Successfully updated ${updates.length} student image${updates.length > 1 ? 's' : ''}!`);
        } catch (error) {
            console.error('Bulk upload error:', error);
            toast.error(error.response?.data?.error || 'Failed to upload images. Your progress has been saved.');
        } finally {
            setIsSaving(false);
            setUploadProgress(0);
        }
    };

    // Drop handler for table rows
    const handleDrop = useCallback((e, userId) => {
        e.preventDefault();
        e.stopPropagation();
        const files = e.dataTransfer?.files;
        if (files && files[0]) handleFile(userId, files[0]);
    }, [handleFile]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    if (!schoolId) return <LoaderPage />;

    if (!classId || !sectionId) {
        return (
            <div className="p-6 flex flex-col items-center justify-center min-h-[60vh]">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-lg font-semibold mb-2">Missing Parameters</h2>
                <p className="text-muted-foreground mb-4">Please select a class and section first.</p>
                <Button onClick={() => router.push('/dashboard/schools/manage-student')}>
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Students
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => router.push('/dashboard/schools/manage-student')}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                            Bulk Image Upload
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground pl-10">
                        Upload profile pictures for students in{' '}
                        <Badge variant="outline" className="text-xs">{className || `Class ${classId}`}</Badge>
                        {' '}/{' '}
                        <Badge variant="secondary" className="text-xs">{sectionName || `Section ${sectionId}`}</Badge>
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {pendingCount > 0 && (
                        <Button variant="outline" size="sm" onClick={clearAll} disabled={isSaving}>
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Clear All
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={handleSaveAll}
                        disabled={pendingCount === 0 || isSaving}
                        className="dark:text-white"
                    >
                        {isSaving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save All
                        {pendingCount > 0 && (
                            <Badge variant="secondary" className="ml-2 text-[10px] h-5 px-1.5">
                                {pendingCount}
                            </Badge>
                        )}
                    </Button>
                </div>
            </div>

            {/* Upload progress */}
            {isSaving && (
                <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm font-medium">
                                {uploadProgress < 10 && 'Preparing uploads...'}
                                {uploadProgress >= 10 && uploadProgress < 80 && 'Uploading images to cloud...'}
                                {uploadProgress >= 80 && uploadProgress < 100 && 'Updating student records...'}
                                {uploadProgress >= 100 && 'Complete!'}
                            </span>
                        </div>
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">{Math.round(uploadProgress)}% complete</p>
                    </CardContent>
                </Card>
            )}

            {/* Info card */}
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <ImagePlus className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">
                                Drag & drop or click to upload images
                            </p>
                            <p className="text-blue-600/80 dark:text-blue-400/80 text-xs">
                                Drop an image on any student row, or click the upload zone. Images are saved locally until you click "Save All".
                                Max 5MB per image. Supports JPG, PNG, WebP.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold">{total}</p>
                        <p className="text-xs text-muted-foreground">Total Students</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-primary">{pendingCount}</p>
                        <p className="text-xs text-muted-foreground">Pending Uploads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">
                            {students.filter(s => s.user?.profilePicture).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Have Photo (page)</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-3 text-center">
                        <p className="text-2xl font-bold text-amber-600">
                            {students.filter(s => !s.user?.profilePicture).length}
                        </p>
                        <p className="text-xs text-muted-foreground">No Photo (page)</p>
                    </CardContent>
                </Card>
            </div>

            {/* Students Table */}
            <Card>
                <div className="overflow-x-auto">
                    <Table className="min-w-[700px]">
                        <TableHeader className="bg-muted sticky top-0 z-10">
                            <TableRow>
                                <TableHead className="w-16">#</TableHead>
                                <TableHead>Student</TableHead>
                                <TableHead>Admission No</TableHead>
                                <TableHead>Current Photo</TableHead>
                                <TableHead>Upload Image</TableHead>
                                <TableHead className="text-right w-20">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}>
                                            <Skeleton className="h-16 w-full" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : students.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                                        <h3 className="text-lg font-semibold mb-1">No students found</h3>
                                        <p className="text-sm text-muted-foreground">
                                            This section doesn't have any students yet
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                students.map((student, idx) => {
                                    const pending = pendingImages[student.userId];
                                    const currentPhoto = student.user?.profilePicture;
                                    const rowNum = (page - 1) * STUDENTS_PER_PAGE + idx + 1;

                                    return (
                                        <TableRow
                                            key={student.userId}
                                            className={cn(
                                                "transition-colors",
                                                pending && "bg-primary/5"
                                            )}
                                            onDrop={(e) => handleDrop(e, student.userId)}
                                            onDragOver={handleDragOver}
                                        >
                                            <TableCell className="text-muted-foreground text-sm">
                                                {rowNum}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={pending?.preview || currentPhoto} />
                                                        <AvatarFallback className="text-xs">
                                                            {student.name?.[0]?.toUpperCase() || 'S'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm truncate">{student.name}</p>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {student.email || student.user?.email || ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-xs font-mono text-muted-foreground">
                                                    {student.admissionNo || '—'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {currentPhoto ? (
                                                    <div className="w-10 h-10 rounded-lg border overflow-hidden">
                                                        <img
                                                            src={currentPhoto}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                                        No photo
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {pending ? (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 rounded-lg border-2 border-primary overflow-hidden relative">
                                                            <img
                                                                src={pending.preview}
                                                                alt="New"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                                                <Check className="w-4 h-4 text-primary" />
                                                            </div>
                                                        </div>
                                                        <Badge variant="default" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                            Ready
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <div
                                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors group"
                                                        onClick={() => fileInputRefs.current[student.userId]?.click()}
                                                    >
                                                        <Upload className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                                        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                                            Drop or click
                                                        </span>
                                                        <input
                                                            ref={(el) => { fileInputRefs.current[student.userId] = el; }}
                                                            type="file"
                                                            accept="image/*"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleFile(student.userId, file);
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {pending ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                        onClick={() => removeImage(student.userId)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0"
                                                        onClick={() => fileInputRefs.current[student.userId]?.click()}
                                                    >
                                                        <ImagePlus className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t">
                        <p className="text-sm text-muted-foreground">
                            Page {page} of {totalPages} · {total} students
                        </p>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft className="h-4 w-4 mr-1" />
                                Prev
                            </Button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (page <= 3) {
                                    pageNum = i + 1;
                                } else if (page >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = page - 2 + i;
                                }
                                return (
                                    <Button
                                        key={pageNum}
                                        variant={page === pageNum ? 'default' : 'outline'}
                                        size="sm"
                                        className="h-8 w-8 p-0 text-xs"
                                        onClick={() => setPage(pageNum)}
                                    >
                                        {pageNum}
                                    </Button>
                                );
                            })}
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                                <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}
