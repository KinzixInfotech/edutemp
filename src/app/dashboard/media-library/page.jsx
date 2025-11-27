"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Trash2, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { UploadDropzone } from "@/app/components/utils/uploadThing";

export default function MediaLibraryPage() {
    const { fullUser: user } = useAuth();
    const [search, setSearch] = useState("");
    const [uploadMode, setUploadMode] = useState(false);

    const { data, isLoading, refetch } = useQuery({
        queryKey: ["media-library", user?.schoolId, search],
        queryFn: async () => {
            if (!user?.schoolId) {
                throw new Error("School ID not found");
            }

            const params = new URLSearchParams({ limit: "100" });
            if (search) params.append("search", search);

            const res = await fetch(`/api/schools/${user.schoolId}/media?${params}`);
            if (!res.ok) throw new Error("Failed to fetch media library");
            return res.json();
        },
        enabled: !!user?.schoolId,
    });

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

    const handleCopyUrl = (url) => {
        navigator.clipboard.writeText(url);
        toast.success("Image URL copied to clipboard");
    };

    return (
        <div className="p-6 space-y-6">
            {!user?.schoolId ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">Media Library</h1>
                            <p className="text-muted-foreground">
                                Manage and reuse images across your school
                            </p>
                        </div>
                        <Button onClick={() => setUploadMode(!uploadMode)}>
                            {uploadMode ? (
                                <>
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel Upload
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Images
                                </>
                            )}
                        </Button>
                    </div>

                    {uploadMode && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Upload Images</CardTitle>
                                <CardDescription>
                                    Upload one or multiple images to your library
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
                                            console.log("Upload complete:", res);
                                            toast.success(`Successfully uploaded ${res.length} image(s)`);
                                            setUploadMode(false);
                                            refetch();
                                        }}
                                        onUploadError={(error) => {
                                            console.error("Upload error:", error);
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

                    <Card>
                        <CardHeader>
                            <CardTitle>Your Images</CardTitle>
                            <CardDescription>
                                Browse and manage all uploaded images
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search images..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {isLoading ? (
                                <div className="flex items-center justify-center h-64">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : data?.mediaItems?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">No images found</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Upload your first image to build your library
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-4">
                                    {data?.mediaItems?.map((item) => (
                                        <div key={item.id} className="group relative">
                                            <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                                                <img
                                                    src={item.url}
                                                    alt={item.altText || item.fileName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                                <Button
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => handleCopyUrl(item.url)}
                                                >
                                                    Copy URL
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleDelete(item.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs truncate mt-1">{item.fileName}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(item.uploadedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
