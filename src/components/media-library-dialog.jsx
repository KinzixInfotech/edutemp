"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Loader2,
    Search,
    Trash2,
    ImageIcon,
    Check,
    Grid3X3,
    LayoutGrid,
    Calendar,
    FileImage,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export function MediaLibraryDialog({ open, onOpenChange, schoolId, onSelect }) {
    const [search, setSearch] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "compact"
    const [loadedImages, setLoadedImages] = useState(new Set());

    const { data, isLoading, refetch, error } = useQuery({
        queryKey: ["media-library", schoolId, search],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "100" });
            if (search) params.append("search", search);

            const res = await fetch(`/api/schools/${schoolId}/media?${params}`);
            if (!res.ok) throw new Error("Failed to fetch media library");
            return res.json();
        },
        enabled: !!schoolId && open,
        staleTime: 30000, // Cache for 30 seconds
    });

    // Filter and sort images
    const filteredImages = useMemo(() => {
        if (!data?.mediaItems) return [];
        return data.mediaItems.sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }, [data?.mediaItems]);

    const handleSelect = useCallback(() => {
        if (selectedImage) {
            onSelect(selectedImage.url);
            onOpenChange(false);
            setSelectedImage(null);
        }
    }, [selectedImage, onSelect, onOpenChange]);

    const handleDelete = useCallback(async (id, e) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this image?")) return;

        try {
            const res = await fetch(`/api/schools/${schoolId}/media?id=${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Image deleted successfully");
            if (selectedImage?.id === id) {
                setSelectedImage(null);
            }
            refetch();
        } catch (error) {
            toast.error("Failed to delete image");
        }
    }, [schoolId, selectedImage, refetch]);

    const handleImageLoad = useCallback((id) => {
        setLoadedImages(prev => new Set([...prev, id]));
    }, []);

    // Reset state when dialog closes
    const handleOpenChange = useCallback((open) => {
        if (!open) {
            setSelectedImage(null);
            setSearch("");
        }
        onOpenChange(open);
    }, [onOpenChange]);

    const imageCount = filteredImages.length;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b bg-muted/30">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileImage className="h-5 w-5 text-primary" />
                            Media Library
                        </DialogTitle>
                        <DialogDescription>
                            Select an image from your school's library
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search and View Toggle */}
                    <div className="flex items-center gap-3 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by filename..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-background"
                            />
                        </div>
                        <div className="flex items-center rounded-lg border bg-background p-1">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    viewMode === "grid"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("compact")}
                                className={cn(
                                    "p-1.5 rounded-md transition-colors",
                                    viewMode === "compact"
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <Grid3X3 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Image count badge */}
                    {!isLoading && imageCount > 0 && (
                        <div className="mt-3 text-xs text-muted-foreground">
                            {imageCount} image{imageCount !== 1 ? 's' : ''} in library
                        </div>
                    )}
                </div>

                {/* Image Grid */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-[350px] gap-3">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p className="text-sm text-muted-foreground">Loading your media...</p>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-[350px] gap-3 text-center">
                                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                    <AlertCircle className="h-8 w-8 text-destructive" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Failed to load media</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Please try again later
                                    </p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => refetch()}>
                                    Retry
                                </Button>
                            </div>
                        ) : filteredImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[350px] gap-4 text-center">
                                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                                    <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">
                                        {search ? "No images found" : "Your library is empty"}
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                                        {search
                                            ? `No images match "${search}". Try a different search.`
                                            : "Upload your first image to start building your media library"
                                        }
                                    </p>
                                </div>
                                {search && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSearch("")}
                                    >
                                        Clear search
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className={cn(
                                "grid gap-3",
                                viewMode === "grid"
                                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                                    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-6"
                            )}>
                                {filteredImages.map((item) => {
                                    const isSelected = selectedImage?.id === item.id;
                                    const isLoaded = loadedImages.has(item.id);

                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "relative group cursor-pointer rounded-xl overflow-hidden transition-all duration-200",
                                                "ring-2 ring-offset-2 ring-offset-background",
                                                isSelected
                                                    ? "ring-primary shadow-lg scale-[1.02]"
                                                    : "ring-transparent hover:ring-muted-foreground/30"
                                            )}
                                            onClick={() => setSelectedImage(item)}
                                        >
                                            {/* Image container */}
                                            <div className={cn(
                                                "bg-muted",
                                                viewMode === "grid" ? "aspect-square" : "aspect-square"
                                            )}>
                                                {/* Loading skeleton */}
                                                {!isLoaded && (
                                                    <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
                                                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                                                    </div>
                                                )}
                                                <img
                                                    src={item.url}
                                                    alt={item.altText || item.fileName}
                                                    className={cn(
                                                        "w-full h-full object-cover transition-all duration-300",
                                                        isLoaded ? "opacity-100" : "opacity-0",
                                                        "group-hover:scale-105"
                                                    )}
                                                    loading="lazy"
                                                    onLoad={() => handleImageLoad(item.id)}
                                                />
                                            </div>

                                            {/* Selection indicator */}
                                            {isSelected && (
                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                                                    <Check className="h-4 w-4" />
                                                </div>
                                            )}

                                            {/* Delete button */}
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className={cn(
                                                    "absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg",
                                                    isSelected && "opacity-100"
                                                )}
                                                onClick={(e) => handleDelete(item.id, e)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>

                                            {/* Filename overlay */}
                                            {viewMode === "grid" && (
                                                <div className={cn(
                                                    "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8",
                                                    "opacity-0 group-hover:opacity-100 transition-opacity"
                                                )}>
                                                    <p className="text-white text-xs font-medium truncate">
                                                        {item.fileName}
                                                    </p>
                                                    {item.createdAt && (
                                                        <p className="text-white/70 text-[10px] flex items-center gap-1 mt-0.5">
                                                            <Calendar className="h-3 w-3" />
                                                            {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer with actions */}
                <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-between">
                    {selectedImage ? (
                        <div className="flex items-center gap-3 text-sm">
                            <div className="w-10 h-10 rounded-lg overflow-hidden border bg-muted">
                                <img
                                    src={selectedImage.url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="max-w-[200px]">
                                <p className="font-medium truncate">{selectedImage.fileName}</p>
                                <p className="text-xs text-muted-foreground">Selected</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Click on an image to select it
                        </p>
                    )}

                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelect} disabled={!selectedImage}>
                            <Check className="h-4 w-4 mr-2" />
                            Select Image
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
