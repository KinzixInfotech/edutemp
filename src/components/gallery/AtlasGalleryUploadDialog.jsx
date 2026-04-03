'use client';

import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBulkUpload } from '@/context/BulkUploadContext';
import { uploadFilesToR2 } from '@/hooks/useR2Upload';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    Upload,
    FileArchive,
    ImageIcon,
    X,
    Loader2,
    Link as LinkIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const ACCEPTED_TYPES = '.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.zip';
const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const COMPRESSION_TARGET = 1 * 1024 * 1024;

function getExtension(filename) {
    return (filename.split('.').pop() || '').toLowerCase();
}

function isImageFile(filename) {
    return new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif']).has(getExtension(filename));
}

async function compressImage(file) {
    try {
        const imageCompression = (await import('browser-image-compression')).default;
        const compressed = await imageCompression(file, {
            maxSizeMB: COMPRESSION_TARGET / (1024 * 1024),
            maxWidthOrHeight: 2000,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.85,
        });
        const newName = file.name.replace(/\.[^.]+$/, '.webp');
        return new File([compressed], newName, { type: 'image/webp' });
    } catch (error) {
        console.warn('Compression failed for', file.name, '- using original:', error);
        return file;
    }
}

async function extractImagesFromZip(zipFile) {
    const JSZip = (await import('jszip')).default;
    const zip = await JSZip.loadAsync(zipFile);
    const images = [];

    for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        const filename = path.split('/').pop();
        if (!filename || filename.startsWith('.') || path.includes('__MACOSX')) continue;
        if (!isImageFile(filename)) continue;

        try {
            const blob = await zipEntry.async('blob');
            const ext = getExtension(filename);
            const file = new File([blob], filename, {
                type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
            });
            images.push(file);
        } catch (err) {
            console.warn('Failed to extract:', path, err);
        }
    }
    return images;
}

const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers = { ...options?.headers };
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
    return fetch(url, { ...options, headers });
};

export default function AtlasGalleryUploadDialog({ open, onOpenChange, schoolId, existingGallery = [] }) {
    const { addJob, updateJob } = useBulkUpload();
    const queryClient = useQueryClient();
    
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [category, setCategory] = useState('Campus');
    const [imageUrlUrl, setImageUrlUrl] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isPreparing, setIsPreparing] = useState(false);
    const fileInputRef = useRef(null);

    const handleFiles = useCallback((fileList) => {
        const files = Array.from(fileList);
        setSelectedFiles((prev) => {
            const newList = [...prev, ...files];
            if (newList.length > 10) {
                toast.warning('Maximum 10 files allowed. Extra files were dropped.');
                return newList.slice(0, 10);
            }
            return newList;
        });
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    const handleUpload = async () => {
        if (imageUrlUrl.trim()) {
            // Fast track URL upload
            setIsPreparing(true);
            try {
                const newImage = {
                    id: uuidv4(),
                    imageUrl: imageUrlUrl.trim(),
                    caption: '',
                    category: category
                };
                
                const updatedGallery = [...existingGallery, newImage];
                
                const res = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gallery: updatedGallery }),
                });

                if (!res.ok) throw new Error('Failed to save URL to gallery');
                
                queryClient.invalidateQueries({ queryKey: ['atlas-school-detail', schoolId] });
                toast.success('Image URL added to gallery!');
                setImageUrlUrl('');
                onOpenChange(false);
            } catch (err) {
                toast.error(err.message);
            } finally {
                setIsPreparing(false);
            }
            return;
        }

        if (selectedFiles.length === 0) return;
        setIsPreparing(true);

        try {
            let allImages = [];

            for (const file of selectedFiles) {
                const ext = getExtension(file.name);
                if (ext === 'zip') {
                    try {
                        const extracted = await extractImagesFromZip(file);
                        if (extracted.length === 0) {
                            toast.error(`No images found in "${file.name}"`);
                        }
                        allImages.push(...extracted);
                    } catch (err) {
                        toast.error(`Failed to extract "${file.name}"`);
                    }
                } else if (isImageFile(file.name)) {
                    if (file.size > MAX_IMAGE_SIZE) {
                        toast.error(`"${file.name}" exceeds 50MB limit`);
                        continue;
                    }
                    allImages.push(file);
                } else {
                    toast.error(`"${file.name}" is not a supported format`);
                }
            }

            if (allImages.length > 10) {
                toast.warning('Limiting to 10 images maximum per bulk upload.');
                allImages = allImages.slice(0, 10);
            }

            if (allImages.length === 0) {
                toast.error('No valid images to upload');
                setIsPreparing(false);
                return;
            }

            const { jobId, signal } = addJob({
                albumId: schoolId,
                albumTitle: `Atlas Gallery Upload`,
                total: allImages.length,
            });

            setIsPreparing(false);
            setSelectedFiles([]);
            onOpenChange(false);

            // Run background upload pipeline
            runUploadPipeline({
                allImages,
                jobId,
                signal,
                category,
                schoolId,
                existingGallery,
                updateJob,
                queryClient
            });

        } catch (error) {
            toast.error(`Upload failed: ${error.message}`);
            setIsPreparing(false);
        }
    };

    const runUploadPipeline = async ({ allImages, jobId, signal, category, schoolId, existingGallery, updateJob, queryClient }) => {
        const successfulUploads = [];
        let totalCompleted = 0;
        let totalFailed = 0;
        
        updateJob(jobId, { status: 'compressing' });
        
        const compressed = await Promise.all(
            allImages.map(async (file) => {
                try {
                    if (file.size > COMPRESSION_TARGET || file.type !== 'image/webp') {
                        return await compressImage(file);
                    }
                    return file;
                } catch {
                    return file;
                }
            })
        );
        
        if (signal.aborted) return;
        
        updateJob(jobId, { status: 'uploading' });
        
        for (let i = 0; i < compressed.length; i++) {
            if (signal.aborted) break;
            
            const file = compressed[i];
            let uploaded = false;
            let retries = 0;
            const maxRetries = 2;
            
            while (!uploaded && retries <= maxRetries) {
                try {
                    const res = await uploadFilesToR2('gallery', {
                        files: [file],
                        input: { schoolId, subFolder: 'atlas_gallery' },
                    });
                    const r = res[0];
                    if (r) {
                        totalCompleted++;
                        successfulUploads.push({
                            id: uuidv4(),
                            imageUrl: r.url,
                            caption: file.name.split('.')[0],
                            category: category
                        });
                        uploaded = true;
                    }
                } catch (err) {
                    retries++;
                    if (retries > maxRetries) {
                        totalFailed++;
                    } else {
                        await new Promise(r => setTimeout(r, retries * 1000));
                    }
                }
            }
            
            updateJob(jobId, { completed: totalCompleted, failed: totalFailed });
        }
        
        // Save to DB
        if (successfulUploads.length > 0 && !signal.aborted) {
            try {
                // Because existingGallery could be stale by the time multiple jobs finish, 
                // it is best to fetch the latest gallery. But for simplicity we use existingGallery
                // or issue a PATCH. A reliable way is a safe PATCH API, but we are standard REST here.
                const freshRes = await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`);
                const freshData = await freshRes.json();
                const latestGallery = freshData.gallery || [];
                
                const finalGallery = [...latestGallery, ...successfulUploads];
                
                await fetchWithAuth(`/api/edubreezyatlas/${schoolId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gallery: finalGallery }),
                });
                
                queryClient.invalidateQueries({ queryKey: ['atlas-school-detail', schoolId] });
            } catch (err) {
                console.error('Failed to save bulk atlas upload', err);
                toast.error('Images uploaded, but failed to link to Atlas profile.');
            }
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { if(!isPreparing) onOpenChange(v); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-primary" />
                        Add to Atlas Gallery
                    </DialogTitle>
                    <DialogDescription>
                        Upload up to 10 images at once or provide an image URL. Recommended resolution is <strong>1200x800px</strong> for crisp display.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label>Category</Label>
                        <Select value={category} onValueChange={setCategory}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select image category..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Campus">Campus & Infrastructure</SelectItem>
                                <SelectItem value="Classrooms">Classrooms</SelectItem>
                                <SelectItem value="Labs">Laboratories</SelectItem>
                                <SelectItem value="Sports">Sports & Activity</SelectItem>
                                <SelectItem value="Events">Function & Events</SelectItem>
                                <SelectItem value="Others">Others</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label>Paste Image URL</Label>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="https://example.com/image.jpg" 
                                value={imageUrlUrl}
                                onChange={(e) => {
                                    setImageUrlUrl(e.target.value);
                                    if(e.target.value) setSelectedFiles([]);
                                }}
                            />
                        </div>
                    </div>
                    
                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-muted" />
                        <span className="flex-shrink-0 mx-4 text-xs text-muted-foreground uppercase">OR UPLOAD FILES (MAX 10)</span>
                        <div className="flex-grow border-t border-muted" />
                    </div>

                    <div
                        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                            isDragging ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
                            imageUrlUrl ? 'opacity-50 pointer-events-none' : ''
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
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-primary" />
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <FileArchive className="w-5 h-5 text-amber-500" />
                                </div>
                            </div>
                            <div>
                                <p className="font-medium text-sm">Drop up to 10 images or a ZIP file here</p>
                                <p className="text-xs text-muted-foreground mt-1">Recommended: 1200x800 resolution for clear images.</p>
                            </div>
                        </div>
                    </div>

                    {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{selectedFiles.length}/10 selected</span>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedFiles([])} className="text-xs text-muted-foreground h-7">
                                    Clear all
                                </Button>
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border p-2">
                                {selectedFiles.map((file, i) => (
                                    <div key={`${file.name}-${i}`} className="flex items-center justify-between py-1 px-2 rounded hover:bg-muted/50 group">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {file.name.toLowerCase().endsWith('.zip') ? (
                                                <FileArchive className="w-4 h-4 text-amber-500 shrink-0" />
                                            ) : (
                                                <ImageIcon className="w-4 h-4 text-primary shrink-0" />
                                            )}
                                            <span className="text-xs truncate">{file.name}</span>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <Button
                        onClick={handleUpload}
                        disabled={(!imageUrlUrl && selectedFiles.length === 0) || isPreparing}
                        className="w-full"
                        size="lg"
                    >
                        {isPreparing ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Preparing Upload...</>
                        ) : imageUrlUrl ? (
                            <><LinkIcon className="w-4 h-4 mr-2" /> Save Image URL</>
                        ) : (
                            <><Upload className="w-4 h-4 mr-2" /> Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}</>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
