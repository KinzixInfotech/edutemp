'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Upload,
    Trash2,
    Eye,
    Image as ImageIcon,
    Calendar,
    Loader2,
    CheckCircle,
    Clock,
    XCircle,
    ChevronLeft,
    ChevronRight,
    Grid3X3,
    LayoutGrid,
    Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import FileUploadButton from '@/components/fileupload';
import { cn } from '@/lib/utils';

const CATEGORIES = [
    { value: 'ANNUAL_DAY', label: 'Annual Day', color: 'bg-purple-500' },
    { value: 'SPORTS_DAY', label: 'Sports Day', color: 'bg-green-500' },
    { value: 'CULTURAL', label: 'Cultural', color: 'bg-pink-500' },
    { value: 'GRADUATION', label: 'Graduation', color: 'bg-blue-500' },
    { value: 'FIELD_TRIP', label: 'Field Trip', color: 'bg-orange-500' },
    { value: 'CLASSROOM', label: 'Classroom', color: 'bg-cyan-500' },
    { value: 'INFRASTRUCTURE', label: 'Infrastructure', color: 'bg-gray-500' },
    { value: 'AWARDS', label: 'Awards', color: 'bg-yellow-500' },
    { value: 'GENERAL', label: 'General', color: 'bg-indigo-500' },
];

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function AlbumDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const albumId = params.albumId;
    const queryClient = useQueryClient();

    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [viewMode, setViewMode] = useState('grid');
    const [currentPage, setCurrentPage] = useState(1);
    const [uploadResetKey, setUploadResetKey] = useState(0);
    const pageSize = 24;

    // Fetch album with images
    const { data, isLoading, refetch } = useQuery({
        queryKey: ['album-detail', albumId, currentPage],
        queryFn: async () => {
            const res = await fetch(
                `/api/schools/${schoolId}/gallery/albums/${albumId}?status=ALL&page=${currentPage}&limit=${pageSize}`
            );
            if (!res.ok) throw new Error('Failed to fetch album');
            return res.json();
        },
        enabled: !!schoolId && !!albumId,
    });

    // Add image to gallery mutation (after FileUploadButton completes)
    const addToGalleryMutation = useMutation({
        mutationFn: async (imageUrl) => {
            const res = await fetch(`/api/schools/${schoolId}/gallery/albums/${albumId}/images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalUrl: imageUrl,
                    uploadedById: fullUser?.id,
                }),
            });
            if (!res.ok) throw new Error('Failed to add image to gallery');
            return res.json();
        },
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries(['admin-gallery', schoolId]);
            toast.success('Image added to album!');
            setUploadResetKey(prev => prev + 1);
            setUploadDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Delete image mutation
    const deleteImageMutation = useMutation({
        mutationFn: async (imageId) => {
            const res = await fetch(`/api/schools/${schoolId}/gallery/images/${imageId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete image');
            return res.json();
        },
        onSuccess: () => {
            refetch();
            queryClient.invalidateQueries(['admin-gallery', schoolId]);
            toast.success('Image deleted');
            setSelectedImage(null);
            setDeleteDialogOpen(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Handle image upload from FileUploadButton
    const handleImageUploaded = useCallback((url) => {
        if (url) {
            addToGalleryMutation.mutate(url);
        }
    }, [addToGalleryMutation]);

    const album = data?.album;
    const images = data?.images || [];
    const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };
    const categoryInfo = CATEGORIES.find((c) => c.value === album?.category);

    if (!schoolId) {
        return (
            <div className="p-8 flex justify-center">
                <Loader2 className="animate-spin text-primary" />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 w-48 bg-muted rounded" />
                    <div className="h-4 w-64 bg-muted rounded" />
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-square bg-muted rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!album) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="py-16 text-center">
                        <ImageIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Album not found</h3>
                        <p className="text-muted-foreground mb-4">
                            This album may have been deleted or you don't have access.
                        </p>
                        <Button onClick={() => router.push('/dashboard/schools/gallery')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Gallery
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const approvedCount = images.filter((i) => i.approvalStatus === 'APPROVED').length;
    const pendingCount = images.filter((i) => i.approvalStatus === 'PENDING').length;
    const processingCount = images.filter((i) => i.processingStatus === 'PROCESSING').length;

    return (
        <div className="p-6 space-y-6">
            {/* Header with breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => router.push('/dashboard/schools/gallery')}
                        className="shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-2xl font-bold tracking-tight">{album.title}</h1>
                            <Badge className={cn('text-white', categoryInfo?.color || 'bg-gray-500')}>
                                {categoryInfo?.label || album.category}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <ImageIcon className="w-4 h-4" />
                                {pagination.total} photos
                            </span>
                            {album.eventDate && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(album.eventDate).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View toggle */}
                    <div className="flex items-center border rounded-lg p-1">
                        <Button
                            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('grid')}
                            className="h-8"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('compact')}
                            className="h-8"
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Upload Dialog */}
                    <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Add Photos
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Upload Photo to Album</DialogTitle>
                            </DialogHeader>
                            <div className="py-4">
                                <FileUploadButton
                                    field="gallery"
                                    aspectRatio="auto"
                                    resetKey={uploadResetKey}
                                    onChange={handleImageUploaded}
                                />
                                <p className="text-xs text-muted-foreground mt-3 text-center">
                                    Images are saved to Media Library and added to this album
                                </p>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Photos</p>
                                <p className="text-2xl font-bold">{pagination.total}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <ImageIcon className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Approved</p>
                                <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Pending</p>
                                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Processing</p>
                                <p className="text-2xl font-bold text-purple-600">{processingCount}</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                {processingCount > 0 ? (
                                    <Loader2 className="h-6 w-6 text-purple-600 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-6 w-6 text-purple-600" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Images Grid */}
            {images.length > 0 ? (
                <>
                    <div
                        className={cn(
                            'grid gap-4',
                            viewMode === 'grid'
                                ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                                : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8'
                        )}
                    >
                        {images.map((image) => (
                            <div
                                key={image.id}
                                className="group relative rounded-lg overflow-hidden bg-muted border hover:shadow-lg transition-all aspect-square"
                            >
                                <img
                                    src={image.thumbnailUrl || image.originalUrl}
                                    alt={image.caption || 'Gallery image'}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />

                                {/* Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="absolute bottom-0 left-0 right-0 p-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-white text-xs truncate">
                                                {formatBytes(image.fileSize)}
                                            </span>
                                            <div className="flex gap-1">
                                                <a
                                                    href={image.originalUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition"
                                                >
                                                    <Eye className="w-4 h-4 text-white" />
                                                </a>
                                                <button
                                                    onClick={() => {
                                                        setSelectedImage(image);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                    className="p-1.5 bg-red-500/80 rounded-full hover:bg-red-600 transition"
                                                >
                                                    <Trash2 className="w-4 h-4 text-white" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status badges */}
                                <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                                    {image.processingStatus === 'PROCESSING' && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-purple-500 text-white text-[10px] px-1.5 py-0"
                                        >
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Processing
                                        </Badge>
                                    )}
                                    {image.approvalStatus === 'PENDING' && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-orange-500 text-white text-[10px] px-1.5 py-0"
                                        >
                                            <Clock className="w-3 h-3 mr-1" />
                                            Pending
                                        </Badge>
                                    )}
                                    {image.approvalStatus === 'REJECTED' && (
                                        <Badge
                                            variant="secondary"
                                            className="bg-red-500 text-white text-[10px] px-1.5 py-0"
                                        >
                                            <XCircle className="w-3 h-3 mr-1" />
                                            Rejected
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground px-4">
                                Page {currentPage} of {pagination.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                                disabled={currentPage === pagination.totalPages}
                            >
                                Next
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <Card>
                    <CardContent className="py-16 text-center">
                        <div className="w-20 h-20 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">No photos yet</h3>
                        <p className="text-muted-foreground mb-4">
                            Start uploading photos to this album
                        </p>
                        <Button onClick={() => setUploadDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Photos
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Image?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. The image will be permanently deleted from
                            this album.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => selectedImage && deleteImageMutation.mutate(selectedImage.id)}
                        >
                            {deleteImageMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
