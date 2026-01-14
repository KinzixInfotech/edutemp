"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
    AlertCircleIcon,
    ImageIcon,
    UploadIcon,
    XIcon,
    Library,
    Loader2,
    CheckCircle,
    RefreshCw,
    CloudUpload,
    Sparkles
} from "lucide-react"

import { useFileUpload } from '@/lib/useFileupload'
import { Button } from '@/components/ui/button'
import { MediaLibraryDialog } from './media-library-dialog'
import { useAuth } from "@/context/AuthContext"
import { useUploadThing } from "@/lib/uploadthing"
import { cn } from "@/lib/utils"

export default function FileUploadButton({
    field,
    onChange,
    onUploadStatusChange,
    onCancelled,
    resetKey,
    saveToLibrary = true,
    value = null,
    compact = false, // New: Compact mode for smaller spaces
    aspectRatio = "auto", // New: "square", "video", "auto"
}) {
    const maxSizeMB = 2
    const maxSize = maxSizeMB * 1024 * 1024
    const { fullUser: user } = useAuth()
    const [showLibrary, setShowLibrary] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [uploadedUrl, setUploadedUrl] = useState(value)
    const [wasCancelled, setWasCancelled] = useState(false)
    const [imageLoaded, setImageLoaded] = useState(false)

    // Sync uploadedUrl when value prop changes
    useEffect(() => {
        if (value && value !== uploadedUrl) {
            setUploadedUrl(value)
            setWasCancelled(false)
            setImageLoaded(false)
        }
    }, [value])

    // Uploadthing hook for auto-upload
    const { startUpload } = useUploadThing("schoolImageUpload", {
        onUploadBegin: () => {
            setIsUploading(true)
            setUploadProgress(0)
            onUploadStatusChange?.(true)
        },
        onUploadProgress: (progress) => {
            setUploadProgress(progress)
        },
        onClientUploadComplete: (res) => {
            if (res?.[0]?.ufsUrl) {
                const url = res[0].ufsUrl
                setUploadedUrl(url)
                setIsUploading(false)
                setUploadProgress(100)
                setWasCancelled(false)
                onUploadStatusChange?.(false)
                onChange?.(url)
            }
        },
        onUploadError: (error) => {
            console.error("Upload error:", error)
            setIsUploading(false)
            setUploadProgress(0)
            onUploadStatusChange?.(false)
        },
    })

    const [
        { files, isDragging, errors },
        {
            handleDragEnter,
            handleDragLeave,
            handleDragOver,
            handleDrop,
            openFileDialog,
            removeFile,
            getInputProps,
            clearFiles,
        },
    ] = useFileUpload({
        accept: "image/*,image/png,image/jpeg,image/jpg,image/gif,image/webp",
        maxSize,
        onFilesAdded: async (addedFiles) => {
            if (addedFiles.length > 0) {
                const file = addedFiles[0].file
                setWasCancelled(false)
                setImageLoaded(false)

                if (user?.schoolId && user?.id) {
                    try {
                        await startUpload([file], {
                            schoolId: user.schoolId,
                            uploadedById: user.id,
                        })
                    } catch (error) {
                        console.error("Failed to start upload:", error)
                    }
                } else {
                    onChange?.(addedFiles[0].preview)
                }
            }
        }
    })

    // Priority: files preview > uploadedUrl > value prop
    const previewUrl = useMemo(() =>
        files[0]?.preview || uploadedUrl || null,
        [files, uploadedUrl]
    )

    // Clear state when resetKey changes
    useEffect(() => {
        if (resetKey !== undefined) {
            clearFiles?.()
            setUploadedUrl(null)
            setIsUploading(false)
            setWasCancelled(false)
            setUploadProgress(0)
            setImageLoaded(false)
        }
    }, [resetKey])

    const fileName = files[0]?.file.name || null

    const handleLibrarySelect = useCallback((url) => {
        setUploadedUrl(url)
        setWasCancelled(false)
        setImageLoaded(false)
        onChange?.(url)
    }, [onChange])

    const handleRemove = useCallback(() => {
        if (files[0]?.id) {
            removeFile(files[0].id)
        }
        setUploadedUrl(null)
        setWasCancelled(false)
        setImageLoaded(false)
        onChange?.(null)
    }, [files, removeFile, onChange])

    const handleCropCancelled = useCallback(() => {
        setWasCancelled(true)
        if (files[0]?.id) {
            removeFile(files[0].id)
        }
        onCancelled?.()
    }, [files, removeFile, onCancelled])

    // Expose cancel handler for parent component
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.__fileUploadCancelHandler = handleCropCancelled
        }
        return () => {
            if (typeof window !== 'undefined') {
                delete window.__fileUploadCancelHandler
            }
        }
    }, [handleCropCancelled])

    const hasUploadedUrl = uploadedUrl && (uploadedUrl.startsWith('http') || uploadedUrl.startsWith('https'))

    // Aspect ratio classes
    const aspectClasses = {
        square: "aspect-square",
        video: "aspect-video",
        auto: compact ? "min-h-32" : "min-h-52"
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="relative group">
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    data-dragging={isDragging || undefined}
                    className={cn(
                        "relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200",
                        aspectClasses[aspectRatio],
                        isDragging
                            ? "border-primary bg-primary/5 scale-[1.02]"
                            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30",
                        previewUrl && !wasCancelled && "border-solid border-muted bg-muted"
                    )}
                >
                    <input
                        {...getInputProps()}
                        className="sr-only"
                        aria-label="Upload image file"
                    />

                    {previewUrl && !wasCancelled ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                            {/* Image with loading state */}
                            <div className="relative w-full h-full">
                                {!imageLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                                        <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                                    </div>
                                )}
                                <img
                                    src={previewUrl}
                                    alt={fileName || "Uploaded image"}
                                    className={cn(
                                        "w-full h-full object-contain transition-opacity duration-300",
                                        imageLoaded ? "opacity-100" : "opacity-0"
                                    )}
                                    onLoad={() => setImageLoaded(true)}
                                    loading="lazy"
                                />
                            </div>

                            {/* Upload progress overlay */}
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                                    <div className="flex flex-col items-center gap-3 text-white">
                                        <div className="relative">
                                            <svg className="w-16 h-16 -rotate-90">
                                                <circle
                                                    cx="32"
                                                    cy="32"
                                                    r="28"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                    className="opacity-20"
                                                />
                                                <circle
                                                    cx="32"
                                                    cy="32"
                                                    r="28"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                    strokeDasharray={175.93}
                                                    strokeDashoffset={175.93 - (175.93 * uploadProgress) / 100}
                                                    className="transition-all duration-300"
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                                {Math.round(uploadProgress)}%
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium">Uploading...</span>
                                    </div>
                                </div>
                            )}

                            {/* Success badge */}
                            {hasUploadedUrl && !isUploading && (
                                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-lg">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    Uploaded
                                </div>
                            )}

                            {/* Remove button - shows on hover */}
                            <button
                                type="button"
                                className={cn(
                                    "absolute top-3 right-3 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/70 text-white transition-all duration-200 hover:bg-red-500 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white/50",
                                    "opacity-0 group-hover:opacity-100"
                                )}
                                onClick={handleRemove}
                                aria-label="Remove image"
                                disabled={isUploading}
                            >
                                <XIcon className="size-4" aria-hidden="true" />
                            </button>

                            {/* Change image button - shows on hover */}
                            {!isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={openFileDialog}
                                        className="shadow-lg"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Change Image
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={cn(
                            "flex flex-col items-center justify-center text-center",
                            compact ? "px-3 py-4 gap-2" : "px-6 py-8 gap-3"
                        )}>
                            {/* Icon */}
                            <div className={cn(
                                "flex items-center justify-center rounded-full bg-primary/10 transition-transform duration-200",
                                isDragging && "scale-110",
                                compact ? "size-10" : "size-14"
                            )}>
                                {isDragging ? (
                                    <Sparkles className={cn("text-primary", compact ? "size-5" : "size-7")} />
                                ) : (
                                    <CloudUpload className={cn("text-primary", compact ? "size-5" : "size-7")} />
                                )}
                            </div>

                            {/* Text */}
                            <div className="space-y-1">
                                <p className={cn(
                                    "font-medium text-foreground",
                                    compact ? "text-sm" : "text-base"
                                )}>
                                    {isDragging ? (
                                        "Drop to upload"
                                    ) : wasCancelled ? (
                                        <>
                                            <span className="text-amber-600">Upload cancelled</span>
                                            {" - try again"}
                                        </>
                                    ) : (
                                        <>Drop {field} image here</>
                                    )}
                                </p>
                                {!compact && (
                                    <p className="text-xs text-muted-foreground">
                                        PNG, JPG, GIF or WebP (max. {maxSizeMB}MB)
                                    </p>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className={cn(
                                "flex gap-2",
                                compact ? "mt-1" : "mt-2"
                            )}>
                                <Button
                                    type="button"
                                    variant={wasCancelled ? "default" : "outline"}
                                    size={compact ? "sm" : "default"}
                                    onClick={openFileDialog}
                                    disabled={isUploading}
                                    className="shadow-sm"
                                >
                                    {wasCancelled ? (
                                        <>
                                            <RefreshCw className="size-4 mr-1.5" />
                                            Retry
                                        </>
                                    ) : (
                                        <>
                                            <UploadIcon className="size-4 mr-1.5" />
                                            {compact ? "Upload" : "Browse Files"}
                                        </>
                                    )}
                                </Button>
                                {user?.schoolId && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size={compact ? "sm" : "default"}
                                        onClick={() => setShowLibrary(true)}
                                        disabled={isUploading}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <Library className="size-4 mr-1.5" />
                                        {compact ? "Library" : "From Library"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Error display */}
            {errors.length > 0 && (
                <div className="flex items-center gap-1.5 text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg" role="alert">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    <span>{errors[0]}</span>
                </div>
            )}

            {/* Media Library Dialog */}
            {user?.schoolId && (
                <MediaLibraryDialog
                    open={showLibrary}
                    onOpenChange={setShowLibrary}
                    schoolId={user.schoolId}
                    onSelect={handleLibrarySelect}
                />
            )}
        </div>
    )
}
