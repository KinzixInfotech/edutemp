"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircleIcon, ImageIcon, UploadIcon, XIcon, Library, Loader2, CheckCircle, RefreshCw } from "lucide-react"

import { useFileUpload } from '@/lib/useFileupload'
import { Button } from '@/components/ui/button'
import { MediaLibraryDialog } from './media-library-dialog'
import { useAuth } from "@/context/AuthContext"
import { useUploadThing } from "@/lib/uploadthing"

export default function FileUploadButton({
    field,
    onChange,
    onUploadStatusChange,  // Callback for upload status (true = uploading, false = done/idle)
    onCancelled,           // Callback when user cancels crop dialog - for re-upload
    resetKey,
    saveToLibrary = true,
    value = null,          // NEW: Pre-set image URL (previously uploaded)
}) {
    const maxSizeMB = 2
    const maxSize = maxSizeMB * 1024 * 1024 // 2MB
    const { fullUser: user } = useAuth()
    const [showLibrary, setShowLibrary] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadedUrl, setUploadedUrl] = useState(value) // Initialize with value prop
    const [wasCancelled, setWasCancelled] = useState(false)

    // Sync uploadedUrl when value prop changes (e.g., parent passes previous upload)
    useEffect(() => {
        if (value && value !== uploadedUrl) {
            setUploadedUrl(value)
            setWasCancelled(false)
        }
    }, [value])

    // Uploadthing hook for auto-upload
    const { startUpload } = useUploadThing("schoolImageUpload", {
        onUploadBegin: () => {
            setIsUploading(true)
            onUploadStatusChange?.(true)
        },
        onClientUploadComplete: (res) => {
            if (res?.[0]?.ufsUrl) {
                const url = res[0].ufsUrl;
                setUploadedUrl(url)
                setIsUploading(false)
                setWasCancelled(false)
                onUploadStatusChange?.(false)
                onChange?.(url)
            }
        },
        onUploadError: (error) => {
            console.error("Upload error:", error)
            setIsUploading(false)
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
        accept: "image/,image/png,image/jpeg,image/jpg,image/gif",
        maxSize,
        onFilesAdded: async (addedFiles) => {
            if (addedFiles.length > 0) {
                const file = addedFiles[0].file
                const preview = addedFiles[0].preview

                setWasCancelled(false)

                // If user has schoolId, do auto-upload (school context)
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
                    // No schoolId (super admin context) - pass preview for manual upload flow
                    onChange?.(preview)
                }
            }
        }
    })

    // Priority: files preview > uploadedUrl > value prop
    const previewUrl = files[0]?.preview || uploadedUrl || null

    // Clear state when resetKey changes
    useEffect(() => {
        if (resetKey !== undefined) {
            clearFiles?.()
            setUploadedUrl(null)
            setIsUploading(false)
            setWasCancelled(false)
        }
    }, [resetKey])

    const fileName = files[0]?.file.name || null

    const handleLibrarySelect = (url) => {
        setUploadedUrl(url)
        setWasCancelled(false)
        onChange?.(url)
    }

    const handleRemove = () => {
        if (files[0]?.id) {
            removeFile(files[0].id)
        }
        setUploadedUrl(null)
        setWasCancelled(false)
        onChange?.(null)
    }

    const handleCropCancelled = () => {
        setWasCancelled(true)
        if (files[0]?.id) {
            removeFile(files[0].id)
        }
        onCancelled?.()
    }

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
    }, [files])

    // Check if we have a valid uploaded URL (not just a local preview)
    const hasUploadedUrl = uploadedUrl && (uploadedUrl.startsWith('http') || uploadedUrl.startsWith('https'))

    return (
        <div className="flex flex-col gap-2">
            <div className="relative">
                <div
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    data-dragging={isDragging || undefined}
                    className="border-blue-500 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 relative flex min-h-52 flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed p-4 transition-colors has-[input:focus]:ring-[3px]"
                >
                    <input
                        {...getInputProps()}
                        className="sr-only"
                        aria-label="Upload image file"
                    />
                    {previewUrl && !wasCancelled ? (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <img
                                src={previewUrl}
                                alt={fileName || "Uploaded image"}
                                className="mx-auto max-h-full rounded object-contain"
                            />
                            {/* Upload status overlay */}
                            {isUploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
                                    <div className="flex flex-col items-center gap-2 text-white">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                        <span className="text-sm font-medium">Uploading...</span>
                                    </div>
                                </div>
                            )}
                            {/* Uploaded checkmark - show for actual URLs, not local previews */}
                            {hasUploadedUrl && !isUploading && (
                                <div className="absolute bottom-4 left-4 flex items-center gap-1 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                                    <CheckCircle className="h-3 w-3" />
                                    Uploaded
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
                            <div
                                className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
                                aria-hidden="true"
                            >
                                <ImageIcon className="size-4 opacity-60" />
                            </div>
                            <p className="mb-1.5 text-sm font-medium">
                                {wasCancelled ? "Upload cancelled - " : "Drop "}{field} image here
                            </p>
                            <p className="text-muted-foreground text-xs">
                                PNG, JPG or GIF (max. {maxSizeMB}MB)
                            </p>
                            <div className="flex gap-2 mt-4">
                                <Button
                                    type="button"
                                    variant={wasCancelled ? "default" : "outline"}
                                    onClick={openFileDialog}
                                    disabled={isUploading}
                                >
                                    {wasCancelled ? (
                                        <>
                                            <RefreshCw className="-ms-1 size-4 opacity-60" aria-hidden="true" />
                                            Try Again
                                        </>
                                    ) : (
                                        <>
                                            <UploadIcon className="-ms-1 size-4 opacity-60" aria-hidden="true" />
                                            Upload New
                                        </>
                                    )}
                                </Button>
                                {user?.schoolId && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowLibrary(true)}
                                        disabled={isUploading}
                                    >
                                        <Library
                                            className="-ms-1 size-4 opacity-60"
                                            aria-hidden="true"
                                        />
                                        Choose from Library
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                {previewUrl && !wasCancelled && (
                    <div className="absolute top-4 right-4">
                        <button
                            type="button"
                            className="focus-visible:border-ring focus-visible:ring-ring/50 z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:ring-[3px]"
                            onClick={handleRemove}
                            aria-label="Remove image"
                            disabled={isUploading}
                        >
                            <XIcon className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                )}
            </div>

            {errors.length > 0 && (
                <div className="text-destructive flex items-center gap-1 text-xs" role="alert">
                    <AlertCircleIcon className="size-3 shrink-0" />
                    <span>{errors[0]}</span>
                </div>
            )}

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
