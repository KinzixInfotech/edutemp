"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    Loader2,
    Search,
    Trash2,
    ImageIcon,
    Upload,
    X,
    ChevronLeft,
    ChevronRight,
    ZoomIn,
    Copy,
    Download,
    Grid3X3,
    List,
    HardDrive,
    Images,
    Calendar,
    AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { UploadDropzone } from "@/app/components/utils/uploadThing";

// Image component with error fallback
function ImageWithFallback({ src, alt, className, onClick, ...props }) {
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(true);

    // Debug: log the URL being used
    useEffect(() => {
        console.log("Image URL:", src);
    }, [src]);

    if (error) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-muted text-muted-foreground ${className}`}
                onClick={onClick}
            >
                <AlertCircle className="h-8 w-8 mb-2" />
                <span className="text-xs text-center px-2">Failed to load</span>
            </div>
        );
    }

    return (
        <>
            {loading && (
                <div className={`absolute inset-0 bg-muted animate-pulse ${className}`} />
            )}
            <img
                src={src}
                alt={alt}
                className={className}
                onClick={onClick}
                onError={() => setError(true)}
                onLoad={() => setLoading(false)}
                {...props}
            />
        </>
    );
}

export default function MediaLibraryPage() {
    const { fullUser: user } = useAuth();
    const [search, setSearch] = useState("");
    const [uploadMode, setUploadMode] = useState(false);
    const [page, setPage] = useState(1);
    const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
    const [selectedImages, setSelectedImages] = useState([]);

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const limit = 24;

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["media-library", user?.schoolId, search, page],
        queryFn: async () => {
            if (!user?.schoolId) {
                throw new Error("School ID not found");
            }

            const params = new URLSearchParams({
                limit: limit.toString(),
                page: page.toString()
            });
            if (search) params.append("search", search);

            const res = await fetch(`/api/schools/${user.schoolId}/media?${params}`);
            if (!res.ok) throw new Error("Failed to fetch media library");
            return res.json();
        },
        enabled: !!user?.schoolId,
        keepPreviousData: true,
    });

    const mediaItems = data?.mediaItems || [];
    const pagination = data?.pagination || { total: 0, page: 1, totalPages: 1 };

    // Filter out invalid blob URLs for display
    const validMediaItems = mediaItems.filter(item =>
        item.url && !item.url.startsWith("blob:")
    );
    const invalidCount = mediaItems.length - validMediaItems.length;

    // Calculate stats
    const totalSize = validMediaItems.reduce((acc, item) => acc + (item.fileSize || 0), 0);
    const formatBytes = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    // Keyboard navigation for lightbox
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!lightboxOpen) return;

            if (e.key === "Escape") {
                setLightboxOpen(false);
            } else if (e.key === "ArrowLeft") {
                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : validMediaItems.length - 1));
            } else if (e.key === "ArrowRight") {
                setLightboxIndex((prev) => (prev < validMediaItems.length - 1 ? prev + 1 : 0));
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [lightboxOpen, validMediaItems.length]);

    const openLightbox = (index) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };

    const handleDelete = async (id) => {
        if (!user?.schoolId) {
            toast.error("User information not available");
            return;
        }

        if (!confirm("Are you sure you want to delete this image?")) return;

        try {
            const res = await fetch(`/api/schools/${user.schoolId}/media?id=${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Image deleted successfully");
            refetch();
        } catch (error) {
            toast.error("Failed to delete image");
        }
    };

    const handleBulkDelete = async () => {
        if (selectedImages.length === 0) return;
        if (!confirm(`Are you sure you want to delete ${selectedImages.length} image(s)?`)) return;

        try {
            await Promise.all(
                selectedImages.map((id) =>
                    fetch(`/api/schools/${user.schoolId}/media?id=${id}`, { method: "DELETE" })
                )
            );
            toast.success(`Deleted ${selectedImages.length} image(s)`);
            setSelectedImages([]);
            refetch();
        } catch (error) {
            toast.error("Failed to delete some images");
        }
    };

    const handleCopyUrl = (url) => {
        navigator.clipboard.writeText(url);
        toast.success("Image URL copied to clipboard");
    };

    const toggleImageSelection = (id) => {
        setSelectedImages((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    // Cleanup invalid blob URLs
    const handleCleanup = async () => {
        if (!confirm("This will permanently delete all images with invalid URLs (blob: URLs). Continue?")) return;

        try {
            const res = await fetch(`/api/schools/${user.schoolId}/media/cleanup`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error);

            toast.success(data.message);
            refetch();
        } catch (error) {
            toast.error("Failed to clean up invalid images");
        }
    };

    const currentLightboxImage = validMediaItems[lightboxIndex];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
            {!user?.schoolId ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                                <Images className="h-7 w-7" />
                                Media Library
                            </h1>
                            <p className="text-muted-foreground">
                                Manage and reuse images across your school
                            </p>
                        </div>
                        <Button onClick={() => setUploadMode(!uploadMode)} className="w-full sm:w-auto">
                            {uploadMode ? (
                                <>
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Images
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Images</p>
                                    <p className="text-2xl font-bold">{pagination.total}</p>
                                </div>
                                <div className="p-3 rounded-full bg-blue-500/20">
                                    <Images className="h-6 w-6 text-blue-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Storage Used</p>
                                    <p className="text-2xl font-bold">{formatBytes(totalSize)}</p>
                                </div>
                                <div className="p-3 rounded-full bg-green-500/20">
                                    <HardDrive className="h-6 w-6 text-green-500" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">This Page</p>
                                    <p className="text-2xl font-bold">{validMediaItems.length}</p>
                                </div>
                                <div className="p-3 rounded-full bg-amber-500/20">
                                    <Calendar className="h-6 w-6 text-amber-500" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Upload Section */}
                    {uploadMode && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Upload Images</CardTitle>
                                <CardDescription>
                                    Upload one or multiple images to your library (max 5MB each)
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {user?.schoolId && user?.id ? (
                                    <UploadDropzone
                                        input={{
                                            schoolId: user.schoolId,
                                            uploadedById: user.id,
                                        }}
                                        endpoint="schoolImageUpload"
                                        onClientUploadComplete={(res) => {
                                            toast.success(`Successfully uploaded ${res.length} image(s)`);
                                            setUploadMode(false);
                                            refetch();
                                        }}
                                        onUploadError={(error) => {
                                            toast.error(`Upload failed: ${error.message}`);
                                        }}
                                        appearance={{
                                            button: "ut-ready:bg-primary ut-uploading:cursor-not-allowed bg-primary after:bg-primary",
                                            container: "border-2 border-dashed",
                                        }}
                                    />
                                ) : (
                                    <div className="text-center p-8 text-muted-foreground">
                                        Loading user information...
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Gallery Card */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Your Images</CardTitle>
                                    <CardDescription>
                                        Click any image to view full size
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    {selectedImages.length > 0 && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={handleBulkDelete}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete ({selectedImages.length})
                                        </Button>
                                    )}
                                    <div className="flex border rounded-lg">
                                        <Button
                                            variant={viewMode === "grid" ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => setViewMode("grid")}
                                            className="rounded-r-none"
                                        >
                                            <Grid3X3 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant={viewMode === "list" ? "secondary" : "ghost"}
                                            size="sm"
                                            onClick={() => setViewMode("list")}
                                            className="rounded-l-none"
                                        >
                                            <List className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Warning for invalid URLs */}
                            {invalidCount > 0 && (
                                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                        <AlertCircle className="h-5 w-5" />
                                        <span className="text-sm">
                                            {invalidCount} image(s) have invalid URLs and are hidden.
                                        </span>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={handleCleanup}>
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Clean Up
                                    </Button>
                                </div>
                            )}

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search images..."
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setPage(1);
                                    }}
                                    className="pl-9"
                                />
                            </div>

                            {isLoading ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {[...Array(12)].map((_, i) => (
                                        <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
                                    ))}
                                </div>
                            ) : validMediaItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">No images found</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Upload your first image to build your library
                                    </p>
                                </div>
                            ) : viewMode === "grid" ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                    {validMediaItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`group relative cursor-pointer ${selectedImages.includes(item.id) ? "ring-2 ring-primary" : ""
                                                }`}
                                        >
                                            <div
                                                className="aspect-square bg-muted rounded-lg overflow-hidden relative"
                                                onClick={() => openLightbox(index)}
                                            >
                                                <ImageWithFallback
                                                    src={item.url}
                                                    alt={item.altText || item.fileName}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                            </div>
                                            {/* Hover overlay - also clickable to open lightbox */}
                                            <div
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                                                onClick={() => openLightbox(index)}
                                            >
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openLightbox(index);
                                                    }}
                                                >
                                                    <ZoomIn className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyUrl(item.url);
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(item.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            {/* Selection checkbox */}
                                            <div className="absolute top-2 left-2">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedImages.includes(item.id)}
                                                    onChange={() => toggleImageSelection(item.id)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="h-4 w-4 rounded"
                                                />
                                            </div>
                                            <p className="text-xs truncate mt-1">{item.fileName}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // List View
                                <div className="space-y-2">
                                    {validMediaItems.map((item, index) => (
                                        <div
                                            key={item.id}
                                            className={`flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer ${selectedImages.includes(item.id) ? "ring-2 ring-primary" : ""
                                                }`}
                                            onClick={() => openLightbox(index)}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedImages.includes(item.id)}
                                                onChange={() => toggleImageSelection(item.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="h-4 w-4 rounded"
                                            />
                                            <ImageWithFallback
                                                src={item.url}
                                                alt={item.altText || item.fileName}
                                                loading="lazy"
                                                className="w-16 h-16 object-cover rounded"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">{item.fileName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatBytes(item.fileSize || 0)} • {new Date(item.uploadedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCopyUrl(item.url);
                                                    }}
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(item.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 border-t">
                                    <p className="text-sm text-muted-foreground">
                                        Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, pagination.total)} of {pagination.total}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                                            disabled={page === 1 || isFetching}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Previous
                                        </Button>
                                        <span className="text-sm text-muted-foreground px-2">
                                            Page {page} of {pagination.totalPages}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                                            disabled={page >= pagination.totalPages || isFetching}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Lightbox Modal */}
                    <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
                        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
                            {currentLightboxImage && (
                                <div className="relative w-full h-[90vh] flex items-center justify-center">
                                    {/* Previous button */}
                                    {validMediaItems.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/40 h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/30 shadow-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxIndex((prev) => (prev > 0 ? prev - 1 : validMediaItems.length - 1));
                                            }}
                                        >
                                            <ChevronLeft className="h-8 w-8" />
                                        </Button>
                                    )}

                                    {/* Image */}
                                    <ImageWithFallback
                                        src={currentLightboxImage.url}
                                        alt={currentLightboxImage.altText || currentLightboxImage.fileName}
                                        className="max-w-full max-h-[80vh] object-contain"
                                    />

                                    {/* Next button */}
                                    {validMediaItems.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 text-white hover:bg-white/40 h-12 w-12 rounded-full bg-black/30 backdrop-blur-md border border-white/30 shadow-lg"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLightboxIndex((prev) => (prev < validMediaItems.length - 1 ? prev + 1 : 0));
                                            }}
                                        >
                                            <ChevronRight className="h-8 w-8" />
                                        </Button>
                                    )}

                                    {/* Image info */}
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                                        <div className="flex items-center justify-between text-white">
                                            <div>
                                                <p className="font-medium">{currentLightboxImage.fileName}</p>
                                                <p className="text-sm text-white/70">
                                                    {formatBytes(currentLightboxImage.fileSize || 0)} • {new Date(currentLightboxImage.uploadedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">
                                                    {lightboxIndex + 1} / {validMediaItems.length}
                                                </Badge>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleCopyUrl(currentLightboxImage.url)}
                                                >
                                                    <Copy className="h-4 w-4 mr-2" />
                                                    Copy URL
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    asChild
                                                >
                                                    <a href={currentLightboxImage.url} download target="_blank">
                                                        <Download className="h-4 w-4 mr-2" />
                                                        Download
                                                    </a>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </DialogContent>
                    </Dialog>
                </>
            )}
        </div>
    );
}
