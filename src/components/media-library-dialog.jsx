"use client";

import { useState } from "react";
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
import { Loader2, Search, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export function MediaLibraryDialog({ open, onOpenChange, schoolId, onSelect }) {
    const [search, setSearch] = useState("");
    const [selectedImage, setSelectedImage] = useState(null);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["media-library", schoolId, search],
        queryFn: async () => {
            const params = new URLSearchParams({ limit: "100" });
            if (search) params.append("search", search);

            const res = await fetch(`/api/schools/${schoolId}/media?${params}`);
            if (!res.ok) throw new Error("Failed to fetch media library");
            return res.json();
        },
        enabled: !!schoolId && open,
    });

    const handleSelect = () => {
        if (selectedImage) {
            onSelect(selectedImage.url);
            onOpenChange(false);
            setSelectedImage(null);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this image?")) return;

        try {
            const res = await fetch(`/api/schools/${schoolId}/media?id=${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete");

            toast.success("Image deleted successfully");
            refetch();
        } catch (error) {
            toast.error("Failed to delete image");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Image Library</DialogTitle>
                    <DialogDescription>
                        Select an image from your school's library or search to find specific images
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search images..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    {/* Image Grid */}
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : data?.mediaItems?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center">
                                <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">
                                    No images found
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Upload your first image to build your library
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-4">
                                {data?.mediaItems?.map((item) => (
                                    <div
                                        key={item.id}
                                        className={`relative group cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${selectedImage?.id === item.id
                                                ? "border-primary ring-2 ring-primary/20"
                                                : "border-transparent hover:border-muted-foreground/20"
                                            }`}
                                        onClick={() => setSelectedImage(item)}
                                    >
                                        <div className="aspect-square bg-muted">
                                            <img
                                                src={item.url}
                                                alt={item.altText || item.fileName}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => handleDelete(item.id, e)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                            {item.fileName}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSelect} disabled={!selectedImage}>
                            Select Image
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
