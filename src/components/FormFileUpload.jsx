"use client";

import { useState, useRef } from "react";
import { Upload, X, FileIcon, Loader2, CheckCircle, ImageIcon, FileText, Music, Video } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";

// File type configurations
const FILE_TYPE_CONFIG = {
    images: {
        accept: "image/*",
        label: "Images (PNG, JPG, GIF)",
        icon: ImageIcon
    },
    documents: {
        accept: ".pdf,.doc,.docx,.txt,.xls,.xlsx",
        label: "Documents (PDF, Word, Excel)",
        icon: FileText
    },
    audio: {
        accept: "audio/*",
        label: "Audio files",
        icon: Music
    },
    video: {
        accept: "video/*",
        label: "Video files",
        icon: Video
    },
    all: {
        accept: "*",
        label: "All files",
        icon: FileIcon
    }
};

export default function FormFileUpload({
    fieldId,
    fieldName,
    acceptedTypes = "all", // "images", "documents", "audio", "video", "all"
    maxSizeMB = 10,
    schoolId,
    onChange,
    value,
    required = false,
}) {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(value || null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const inputRef = useRef(null);

    const config = FILE_TYPE_CONFIG[acceptedTypes] || FILE_TYPE_CONFIG.all;
    const maxSize = maxSizeMB * 1024 * 1024;

    const { startUpload } = useUploadThing("formSubmissionUpload", {
        onUploadBegin: () => {
            setIsUploading(true);
            setUploadError(null);
        },
        onClientUploadComplete: (res) => {
            if (res?.[0]?.ufsUrl) {
                const url = res[0].ufsUrl;
                setPreview(url);
                setIsUploading(false);
                onChange?.({
                    url,
                    name: file?.name || "uploaded-file",
                    type: file?.type || "unknown"
                });
            }
        },
        onUploadError: (error) => {
            console.error("Upload error:", error);
            setUploadError("Upload failed. Please try again.");
            setIsUploading(false);
        },
    });

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // Validate file size
        if (selectedFile.size > maxSize) {
            setUploadError(`File too large. Max size: ${maxSizeMB}MB`);
            return;
        }

        setFile(selectedFile);
        setUploadError(null);

        // Create local preview for images
        if (selectedFile.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target.result);
            reader.readAsDataURL(selectedFile);
        } else {
            setPreview(null);
        }

        // Upload to UploadThing
        try {
            await startUpload([selectedFile], {
                schoolId: schoolId || "public-form",
                fieldName: fieldName || fieldId,
            });
        } catch (error) {
            console.error("Failed to upload:", error);
            setUploadError("Upload failed. Please try again.");
        }
    };

    const handleRemove = () => {
        setFile(null);
        setPreview(null);
        setUploadError(null);
        onChange?.(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const isImage = file?.type?.startsWith("image/") || (preview && (preview.includes(".jpg") || preview.includes(".png") || preview.includes(".gif") || preview.includes(".jpeg")));
    const Icon = config.icon;

    return (
        <div className="space-y-2">
            <input
                ref={inputRef}
                type="file"
                accept={config.accept}
                onChange={handleFileChange}
                className="hidden"
                id={`file-${fieldId}`}
            />

            {!file && !preview ? (
                // Upload area
                <label
                    htmlFor={`file-${fieldId}`}
                    className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 cursor-pointer hover:border-slate-300 hover:bg-slate-100/50 transition-all"
                >
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-700">
                            Click to upload {required && <span className="text-red-500">*</span>}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                            {config.label} • Max {maxSizeMB}MB
                        </p>
                    </div>
                </label>
            ) : (
                // File preview
                <div className="relative rounded-xl border border-slate-200 bg-white overflow-hidden">
                    {isImage && preview ? (
                        // Image preview
                        <div className="relative h-48 flex items-center justify-center bg-slate-50">
                            <img
                                src={preview}
                                alt="Preview"
                                className="max-h-full max-w-full object-contain"
                            />
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                    <div className="flex flex-col items-center gap-2 text-white">
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                        <span className="text-sm">Uploading...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        // Non-image file preview
                        <div className="flex items-center gap-4 p-4">
                            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                {isUploading ? (
                                    <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                                ) : (
                                    <Icon className="h-5 w-5 text-slate-500" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 truncate">
                                    {file?.name || "Uploaded file"}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {isUploading ? "Uploading..." : (
                                        file?.size ? `${(file.size / 1024).toFixed(1)} KB` : "Uploaded"
                                    )}
                                </p>
                            </div>
                            {!isUploading && preview && (
                                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                            )}
                        </div>
                    )}

                    {/* Remove button */}
                    {!isUploading && (
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            )}

            {uploadError && (
                <p className="text-xs text-red-500">{uploadError}</p>
            )}
        </div>
    );
}
