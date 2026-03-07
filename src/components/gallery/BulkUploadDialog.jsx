'use client';

import { useState, useRef, useCallback } from 'react';
import { useBulkGalleryUpload } from '@/hooks/useBulkGalleryUpload';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Upload,
    FileArchive,
    ImageIcon,
    X,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.zip';

export default function BulkUploadDialog({
    open,
    onOpenChange,
    albumId: presetAlbumId,
    albumTitle: presetAlbumTitle,
    albums = [],
}) {
    const { startBulkUpload } = useBulkGalleryUpload();
    const [selectedAlbumId, setSelectedAlbumId] = useState(presetAlbumId || '');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const fileInputRef = useRef(null);

    const albumId = presetAlbumId || selectedAlbumId;
    const albumTitle =
        presetAlbumTitle ||
        albums.find((a) => a.id === selectedAlbumId)?.title ||
        'Album';

    const handleFiles = useCallback((fileList) => {
        const files = Array.from(fileList);
        setSelectedFiles((prev) => [...prev, ...files]);
    }, []);

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length > 0) {
                handleFiles(e.dataTransfer.files);
            }
        },
        [handleFiles]
    );

    const removeFile = useCallback((index) => {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleUpload = async () => {
        if (!albumId || selectedFiles.length === 0) return;
        setIsPreparing(true);
        try {
            // startBulkUpload now returns immediately after preparation/job creation
            await startBulkUpload({
                albumId,
                albumTitle,
                files: selectedFiles,
            });
            // Reset and close immediately
            setSelectedFiles([]);
            onOpenChange(false);
        } finally {
            setIsPreparing(false);
        }
    };

    const imageCount = selectedFiles.filter(
        (f) => !f.name.toLowerCase().endsWith('.zip')
    ).length;
    const zipCount = selectedFiles.filter((f) =>
        f.name.toLowerCase().endsWith('.zip')
    ).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" />
                        Bulk Upload Images
                    </DialogTitle>
                    <DialogDescription>
                        Upload multiple images or a ZIP file containing images.
                        Images will be automatically compressed.
                    </DialogDescription>
                </DialogHeader>

                {/* Album selector (only if no preset) */}
                {!presetAlbumId && albums.length > 0 && (
                    <div className="space-y-2">
                        <label className="text-sm font-medium">
                            Select Album
                        </label>
                        <Select
                            value={selectedAlbumId}
                            onValueChange={setSelectedAlbumId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Choose an album..." />
                            </SelectTrigger>
                            <SelectContent>
                                {albums.map((album) => (
                                    <SelectItem key={album.id} value={album.id}>
                                        {album.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Drop zone */}
                <div
                    onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                        'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                        isDragging
                            ? 'border-primary bg-primary/5 scale-[1.02]'
                            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                    )}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_TYPES}
                        multiple
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files.length > 0) {
                                handleFiles(e.target.files);
                                e.target.value = '';
                            }
                        }}
                    />
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-2">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                <ImageIcon className="w-6 h-6 text-primary" />
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <FileArchive className="w-6 h-6 text-amber-500" />
                            </div>
                        </div>
                        <div>
                            <p className="font-medium text-sm">
                                Drop images or ZIP files here
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                JPG, PNG, GIF, WebP, or ZIP • Max 50MB per
                                image • Max 500MB per ZIP
                            </p>
                        </div>
                    </div>
                </div>

                {/* Selected files */}
                {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                                {selectedFiles.length} file
                                {selectedFiles.length !== 1 ? 's' : ''} selected
                                {imageCount > 0 &&
                                    ` (${imageCount} image${imageCount !== 1 ? 's' : ''})`}
                                {zipCount > 0 &&
                                    ` (${zipCount} ZIP${zipCount !== 1 ? 's' : ''})`}
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFiles([])}
                                className="text-xs text-muted-foreground h-7"
                            >
                                Clear all
                            </Button>
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border p-2">
                            {selectedFiles.map((file, i) => (
                                <div
                                    key={`${file.name}-${i}`}
                                    className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 group"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        {file.name
                                            .toLowerCase()
                                            .endsWith('.zip') ? (
                                            <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />
                                        ) : (
                                            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                                        )}
                                        <span className="text-xs truncate">
                                            {file.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {(file.size / (1024 * 1024)).toFixed(
                                                1
                                            )}
                                            MB
                                        </span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFile(i);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Upload button */}
                <Button
                    onClick={handleUpload}
                    disabled={
                        !albumId ||
                        selectedFiles.length === 0 ||
                        isPreparing
                    }
                    className="w-full"
                    size="lg"
                >
                    {isPreparing ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Preparing Upload...
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4 mr-2" />
                            Upload {selectedFiles.length} File
                            {selectedFiles.length !== 1 ? 's' : ''}
                        </>
                    )}
                </Button>
            </DialogContent>
        </Dialog>
    );
}
