"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircleIcon, ImageIcon, UploadIcon, XIcon, Library, Loader2, CheckCircle } from "lucide-react"

import { useFileUpload } from '@/lib/useFileupload'
import { Button } from '@/components/ui/button'
import { MediaLibraryDialog } from './media-library-dialog'
import { useAuth } from "@/context/AuthContext"
import { useUploadThing } from "@/lib/uploadthing"

export default function FileUploadButton({
    field,
    onChange,
    onUploadStatusChange,  // NEW: Callback for upload status (true = uploading, false = done/idle)
    resetKey,
    saveToLibrary = true
}) {
    const maxSizeMB = 2
    const maxSize = maxSizeMB * 1024 * 1024 // 2MB
    const { fullUser: user } = useAuth()
    const [showLibrary, setShowLibrary] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadedUrl, setUploadedUrl] = useState(null)

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
            // Auto-upload when file is added
            if (addedFiles.length > 0 && user?.schoolId && user?.id) {
                const file = addedFiles[0].file
                try {
                    await startUpload([file], {
                        schoolId: user.schoolId,
                        uploadedById: user.id,
                    })
                } catch (error) {
                    console.error("Failed to start upload:", error)
                }
            }
        }
    })

    const previewUrl = files[0]?.preview || uploadedUrl || null

    // Clear state when resetKey changes
    useEffect(() => {
        if (clearFiles) {
            clearFiles()
            setUploadedUrl(null)
            setIsUploading(false)
        }
    }, [resetKey])

    const fileName = files[0]?.file.name || null

    const handleLibrarySelect = (url) => {
        setUploadedUrl(url)
        if (onChange) {
            onChange(url)
        }
    }

    const handleRemove = () => {
        if (files[0]?.id) {
            removeFile(files[0].id)
        }
        setUploadedUrl(null)
        onChange?.(null)
    }

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
                    {previewUrl ? (
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
                            {/* Uploaded checkmark */}
                            {uploadedUrl && !isUploading && (
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
                            <p className="mb-1.5 text-sm font-medium">Drop {field} image here</p>
                            <p className="text-muted-foreground text-xs">
                                PNG, JPG or GIF (max. {maxSizeMB}MB)
                            </p>
                            <div className="flex gap-2 mt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={openFileDialog}
                                    disabled={isUploading}
                                >
                                    <UploadIcon
                                        className="-ms-1 size-4 opacity-60"
                                        aria-hidden="true"
                                    />
                                    Upload New
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
                {previewUrl && (
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
