"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
    Loader2, ArrowLeft, Download, FileText, Image as ImageIcon,
    File, ExternalLink, Calendar, Mail, User, ZoomIn, Copy, X,
    Play, Music, FileIcon
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import axios from "axios";
import { format } from "date-fns";
import { toast } from "sonner";

// Helper to detect file types
const getFileType = (url) => {
    if (!url || typeof url !== 'string') return null;
    const lower = url.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image';
    if (lower.match(/\.(pdf)$/)) return 'pdf';
    if (lower.match(/\.(doc|docx)$/)) return 'doc';
    if (lower.match(/\.(xls|xlsx)$/)) return 'excel';
    if (lower.match(/\.(mp4|webm|mov)$/)) return 'video';
    if (lower.match(/^https?:\/\//)) return 'link';
    return null;
};

// File Preview Component
const FilePreview = ({ value, label }) => {
    const fileType = getFileType(value);

    if (!fileType) return null;

    switch (fileType) {
        case 'image':
            return (
                <div className="mt-2">
                    <a href={value} target="_blank" rel="noopener noreferrer" className="block">
                        <img
                            src={value}
                            alt={label}
                            className="max-w-full max-h-64 rounded-lg border object-contain hover:opacity-90 transition-opacity"
                        />
                    </a>
                    <a
                        href={value}
                        download
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                    >
                        <Download className="w-3 h-3" /> Download
                    </a>
                </div>
            );
        case 'pdf':
            return (
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <FileText className="w-8 h-8 text-red-600" />
                        <div>
                            <p className="text-sm font-medium">PDF Document</p>
                            <div className="flex gap-2 mt-1">
                                <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <ExternalLink className="w-3 h-3" /> View
                                </a>
                                <a
                                    href={value}
                                    download
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <Download className="w-3 h-3" /> Download
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            );
        case 'video':
            return (
                <div className="mt-2">
                    <video
                        src={value}
                        controls
                        className="max-w-full max-h-64 rounded-lg border"
                    />
                </div>
            );
        case 'link':
            return (
                <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                >
                    <ExternalLink className="w-3 h-3" /> {value.length > 50 ? value.substring(0, 50) + '...' : value}
                </a>
            );
        default:
            return (
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                        <File className="w-6 h-6 text-muted-foreground" />
                        <a
                            href={value}
                            download
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                            <Download className="w-3 h-3" /> Download File
                        </a>
                    </div>
                </div>
            );
    }
};

// Image Preview with Lightbox Modal (like Media Library)
const ImagePreviewWithLightbox = ({ url }) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(url);
        toast.success("Image URL copied to clipboard");
    };

    if (error) {
        return (
            <div className="mt-2 flex items-center gap-2 p-3 bg-muted rounded-lg border">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Failed to load image</p>
            </div>
        );
    }

    return (
        <>
            {/* Thumbnail with hover overlay */}
            <div className="mt-2 relative group cursor-pointer inline-block" onClick={() => setOpen(true)}>
                <div className="relative overflow-hidden rounded-lg border bg-muted max-w-xs">
                    {loading && <div className="absolute inset-0 bg-muted animate-pulse" />}
                    <img
                        src={url}
                        alt="Uploaded file"
                        className="max-w-full max-h-48 object-contain"
                        onLoad={() => setLoading(false)}
                        onError={() => setError(true)}
                    />
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                            <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-white text-sm font-medium">View</span>
                    </div>
                </div>
            </div>

            {/* Lightbox Modal */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
                    <div className="relative w-full h-[90vh] flex items-center justify-center">
                        {/* Close button */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-10 text-white hover:bg-white/20 h-10 w-10 rounded-full"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-5 w-5" />
                        </Button>

                        {/* Image */}
                        <img
                            src={url}
                            alt="Full size preview"
                            className="max-w-full max-h-[80vh] object-contain"
                        />

                        {/* Bottom bar with actions */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                            <div className="flex items-center justify-end gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={handleCopyUrl}
                                >
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy URL
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    asChild
                                >
                                    <a href={url} download>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </a>
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

// Data Field Component
const DataField = ({ label, value }) => {
    const fileType = getFileType(value);
    const isArray = Array.isArray(value);
    const isObject = typeof value === 'object' && value !== null && !isArray;

    // Handle arrays
    if (isArray) {
        return (
            <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">{label}</p>
                <div className="space-y-1">
                    {value.map((item, i) => {
                        const itemFileType = getFileType(item);
                        if (itemFileType === 'image') {
                            return <FilePreview key={i} value={item} label={`${label} ${i + 1}`} />;
                        }
                        return (
                            <Badge key={i} variant="secondary" className="mr-1 mb-1">
                                {String(item)}
                            </Badge>
                        );
                    })}
                </div>
            </div>
        );
    }

    // Handle objects
    if (isObject) {
        return (
            <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-medium">{label}</p>
                <pre className="text-sm whitespace-pre-wrap bg-background p-2 rounded border text-xs overflow-auto">
                    {JSON.stringify(value, null, 2)}
                </pre>
            </div>
        );
    }

    // Handle files
    if (fileType) {
        return (
            <div className="bg-muted/50 p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-medium">{label}</p>
                <FilePreview value={value} label={label} />
            </div>
        );
    }

    // Handle regular text
    return (
        <div className="bg-muted/50 p-4 rounded-lg border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1 font-medium">{label}</p>
            <p className="text-sm whitespace-pre-wrap break-words">{String(value || '-')}</p>
        </div>
    );
};

export default function SubmissionDetailPage({ params }) {
    const { formId, submissionId } = React.use(params);
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    // Fetch Form Details
    const { data: form, isLoading: formLoading } = useQuery({
        queryKey: ["form", formId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms/${formId}`);
            return res.data;
        },
        enabled: !!schoolId && !!formId,
    });

    // Fetch Submission
    const { data: submission, isLoading: submissionLoading } = useQuery({
        queryKey: ["submission", submissionId],
        queryFn: async () => {
            const res = await axios.get(`/api/schools/${schoolId}/forms/${formId}/submissions/${submissionId}`);
            return res.data;
        },
        enabled: !!schoolId && !!formId && !!submissionId,
    });

    const isLoading = formLoading || submissionLoading;

    if (isLoading) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10" />
                    <div>
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Skeleton className="h-20" />
                            <Skeleton className="h-20" />
                            <Skeleton className="h-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="p-6">
                <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="w-16 h-16 text-muted-foreground/50 mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Submission Not Found</h2>
                    <p className="text-muted-foreground mb-4">The submission you're looking for doesn't exist.</p>
                    <Link href={`/dashboard/forms/${formId}/submissions`}>
                        <Button variant="outline">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Submissions
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href={`/dashboard/forms/${formId}/submissions`}>
                        <Button variant="outline" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">{form?.title}</h1>
                        <p className="text-muted-foreground">Submission Details</p>
                    </div>
                </div>
            </div>

            {/* Applicant Info Card */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Applicant Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Name</p>
                                <p className="font-medium">{submission.applicantName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Mail className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-medium">{submission.applicantEmail}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <Calendar className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Submitted</p>
                                <p className="font-medium">
                                    {submission.submittedAt
                                        ? (() => {
                                            try {
                                                return format(new Date(submission.submittedAt), "PPpp");
                                            } catch {
                                                return submission.submittedAt || 'Unknown';
                                            }
                                        })()
                                        : 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Form Responses - Using form field structure */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Form Responses</CardTitle>
                    <CardDescription>Responses submitted for each question</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {submission.form?.fields?.length > 0 ? (
                            submission.form.fields.map((field, index) => {
                                // New submissions save by field.id, old ones by field.name - check both
                                const value = submission.data?.[field.id] || submission.data?.[field.name] || submission.data?.[field.label] || '-';
                                return (
                                    <div key={field.id || index} className="bg-muted/50 p-4 rounded-lg border">
                                        <div className="flex items-start gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium mb-1">{field.name || field.label || `Question ${index + 1}`}</p>
                                                {/* Smart value rendering based on type and value */}
                                                {(() => {
                                                    const fieldType = (field.type || '').toLowerCase();
                                                    const displayValue = Array.isArray(value)
                                                        ? value.join(', ')
                                                        : (typeof value === 'object' && value !== null)
                                                            ? JSON.stringify(value)
                                                            : String(value || '-');

                                                    // File upload handling - comprehensive media preview
                                                    if (fieldType === 'file') {
                                                        let fileUrl = null;
                                                        let fileType = null;

                                                        if (value && typeof value === 'object') {
                                                            fileUrl = value.url;
                                                            fileType = value.type; // e.g., "image/png", "application/pdf"
                                                        } else if (typeof value === 'string' && value.startsWith('http')) {
                                                            fileUrl = value;
                                                        }

                                                        if (fileUrl) {
                                                            // Check by extension
                                                            const isImageExt = fileUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i);
                                                            const isVideoExt = fileUrl.match(/\.(mp4|webm|mov|avi)(\?|$)/i);
                                                            const isAudioExt = fileUrl.match(/\.(mp3|wav|ogg|m4a)(\?|$)/i);
                                                            const isPDFExt = fileUrl.match(/\.pdf(\?|$)/i);

                                                            // Also check by mime type if available
                                                            const isImageType = fileType?.startsWith('image/');
                                                            const isVideoType = fileType?.startsWith('video/');
                                                            const isAudioType = fileType?.startsWith('audio/');
                                                            const isPDFType = fileType === 'application/pdf';

                                                            // Check if it's an UploadThing URL (ufs.sh) - assume image if no type info
                                                            const isUploadThing = fileUrl.includes('ufs.sh') || fileUrl.includes('uploadthing');

                                                            const isImage = isImageExt || isImageType || (isUploadThing && !isVideoType && !isAudioType && !isPDFType);
                                                            const isVideo = isVideoExt || isVideoType;
                                                            const isAudio = isAudioExt || isAudioType;
                                                            const isPDF = isPDFExt || isPDFType;

                                                            // Image: show preview with lightbox
                                                            if (isImage) {
                                                                return <ImagePreviewWithLightbox url={fileUrl} />;
                                                            }

                                                            // Video: inline player with download button
                                                            if (isVideo) {
                                                                return (
                                                                    <div className="mt-2 space-y-3">
                                                                        <video src={fileUrl} controls className="max-w-full max-h-64 rounded-lg border bg-black" />
                                                                        <Button variant="outline" size="sm" asChild>
                                                                            <a href={fileUrl} download><Download className="w-4 h-4 mr-2" /> Download Video</a>
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            }

                                                            // Audio: inline player with download button
                                                            if (isAudio) {
                                                                return (
                                                                    <div className="mt-2 space-y-3">
                                                                        <audio src={fileUrl} controls className="w-full max-w-md" />
                                                                        <Button variant="outline" size="sm" asChild>
                                                                            <a href={fileUrl} download><Download className="w-4 h-4 mr-2" /> Download Audio</a>
                                                                        </Button>
                                                                    </div>
                                                                );
                                                            }

                                                            // PDF: professional card with view and download
                                                            if (isPDF) {
                                                                return (
                                                                    <div className="mt-2 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800/50">
                                                                        <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-medium">PDF Document</p>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <Button variant="destructive" size="sm" asChild>
                                                                                <a href={fileUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-4 h-4 mr-1" /> View</a>
                                                                            </Button>
                                                                            <Button variant="outline" size="sm" asChild>
                                                                                <a href={fileUrl} download><Download className="w-4 h-4" /></a>
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }

                                                            // Other files: professional download card
                                                            return (
                                                                <div className="mt-2 flex items-center gap-3 p-3 bg-muted rounded-lg border">
                                                                    <File className="w-8 h-8 text-muted-foreground flex-shrink-0" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-medium">File Attachment</p>
                                                                    </div>
                                                                    <Button variant="outline" size="sm" asChild>
                                                                        <a href={fileUrl} download><Download className="w-4 h-4 mr-2" /> Download</a>
                                                                    </Button>
                                                                </div>
                                                            );
                                                        }
                                                        return <p className="text-sm text-muted-foreground">No file uploaded</p>;
                                                    }

                                                    // Checkbox / Multi-select - show as badges
                                                    if (fieldType === 'checkbox' || Array.isArray(value)) {
                                                        const items = Array.isArray(value) ? value : [value];
                                                        return (
                                                            <div className="flex flex-wrap gap-1">
                                                                {items.map((v, i) => (
                                                                    <Badge key={i} variant="secondary">{String(v)}</Badge>
                                                                ))}
                                                            </div>
                                                        );
                                                    }

                                                    // Radio/Select - show as badge
                                                    if (['radio', 'select', 'dropdown'].includes(fieldType)) {
                                                        return <Badge variant="secondary">{displayValue}</Badge>;
                                                    }

                                                    // Email - clickable link
                                                    if (fieldType === 'email') {
                                                        return <a href={`mailto:${displayValue}`} className="text-sm text-primary hover:underline">{displayValue}</a>;
                                                    }

                                                    // Phone - clickable link
                                                    if (fieldType === 'phone') {
                                                        return <a href={`tel:${displayValue}`} className="text-sm text-primary hover:underline">{displayValue}</a>;
                                                    }

                                                    // Date - formatted
                                                    if (fieldType === 'date' && displayValue && displayValue !== '-') {
                                                        try {
                                                            return <p className="text-sm text-muted-foreground">{format(new Date(displayValue), 'PPP')}</p>;
                                                        } catch {
                                                            return <p className="text-sm text-muted-foreground">{displayValue}</p>;
                                                        }
                                                    }

                                                    // Default text display
                                                    return <p className="text-sm text-muted-foreground whitespace-pre-wrap">{displayValue}</p>;
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            // Fallback: Show raw data if no form fields structure
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(submission.data || {}).map(([key, value]) => (
                                    <DataField key={key} label={key} value={value} />
                                ))}
                            </div>
                        )}
                        {(!submission.data || Object.keys(submission.data).length === 0) && (!submission.form?.fields || submission.form.fields.length === 0) && (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No form data available</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
