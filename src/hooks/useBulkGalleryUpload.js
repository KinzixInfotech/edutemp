'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useBulkUpload } from '@/context/BulkUploadContext';
import { useAuth } from '@/context/AuthContext';
import { uploadFiles } from '@/lib/uploadthing';
import { toast } from 'sonner';

const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB per raw image
const COMPRESSION_TARGET = 2 * 1024 * 1024; // 2MB target after compression
const BATCH_SIZE = 3;
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif']);

function getExtension(filename) {
    return (filename.split('.').pop() || '').toLowerCase();
}

function isImageFile(filename) {
    return IMAGE_EXTENSIONS.has(getExtension(filename));
}

async function compressImage(file) {
    try {
        const imageCompression = (await import('browser-image-compression')).default;
        const compressed = await imageCompression(file, {
            maxSizeMB: COMPRESSION_TARGET / (1024 * 1024),
            maxWidthOrHeight: 2560,
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

/**
 * Background upload + save pipeline.
 * Runs independently of UI — progress tracked via BulkUploadContext.
 */
async function runUploadPipeline({ allImages, jobId, signal, albumId, schoolId, uploadedById, updateJob, queryClient }) {
    const successfulUploads = [];
    let totalCompleted = 0;
    let totalFailed = 0;
    const failedFiles = [];

    // 1. Persist uploads locally as they happen (failsafe)
    const storageKey = `bulk_upload_pending_${jobId}`;
    const persistUploads = (uploads) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify({
                albumId,
                schoolId,
                uploadedById,
                uploads
            }));
        } catch (e) {
            console.warn('Failed to persist to localStorage:', e);
        }
    };

    for (let i = 0; i < allImages.length; i += BATCH_SIZE) {
        if (signal.aborted) {
            localStorage.removeItem(storageKey);
            break;
        }

        const batch = allImages.slice(i, i + BATCH_SIZE);

        // Compress + upload each file, updating progress per-file
        await Promise.allSettled(
            batch.map(async (file) => {
                if (signal.aborted) throw new Error('Upload aborted');

                // Compress
                let compressed = file;
                try {
                    if (file.size > COMPRESSION_TARGET || file.type !== 'image/webp') {
                        compressed = await compressImage(file);
                    }
                } catch {
                    compressed = file;
                }

                // Upload
                try {
                    const res = await uploadFiles('galleryImageUpload', {
                        files: [compressed],
                        input: { schoolId, albumId, uploadedById },
                    });
                    const r = res[0];
                    if (r) {
                        totalCompleted++;
                        successfulUploads.push({
                            url: r.ufsUrl || r.url || r.serverData?.url,
                            fileName: r.name || r.serverData?.fileName,
                            fileSize: r.size || r.serverData?.fileSize,
                            mimeType: r.type || r.serverData?.mimeType || 'image/webp',
                        });
                    }
                } catch (err) {
                    totalFailed++;
                    failedFiles.push(err?.message || 'unknown');
                    console.error('Upload failed:', err);
                }

                // Update progress immediately after each file
                persistUploads(successfulUploads);
                updateJob(jobId, {
                    completed: totalCompleted,
                    failed: totalFailed,
                    failedFiles,
                });
            })
        );
    }

    // 2. Batch save to DB with RETRY logic
    if (successfulUploads.length > 0 && !signal.aborted) {
        let attempts = 0;
        const maxAttempts = 3;
        let saved = false;

        while (attempts < maxAttempts && !saved && !signal.aborted) {
            attempts++;
            try {
                const saveRes = await fetch(`/api/schools/${schoolId}/gallery/bulk-save`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        albumId,
                        uploadedById,
                        files: successfulUploads,
                    }),
                });

                if (saveRes.ok) {
                    saved = true;
                    localStorage.removeItem(storageKey); // Clear on success
                    // Invalidate gallery queries so the page refreshes
                    queryClient?.invalidateQueries({ queryKey: ['admin-gallery'] });
                    console.log('Bulk save successful on attempt', attempts);
                } else {
                    const err = await saveRes.json();
                    console.error(`Bulk save attempt ${attempts} failed:`, err);
                    if (attempts === maxAttempts) {
                        toast.error(err.message || 'Failed to save images after multiple attempts');
                    } else {
                        // Exponential backoff
                        await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                    }
                }
            } catch (err) {
                console.error(`Bulk save attempt ${attempts} errored:`, err);
                if (attempts === maxAttempts) {
                    toast.error('Network error during save. Your uploads are stored locally.');
                } else {
                    await new Promise(resolve => setTimeout(resolve, attempts * 1000));
                }
            }
        }
    } else if (signal.aborted) {
        localStorage.removeItem(storageKey);
    }
}

export function useBulkGalleryUpload() {
    const { addJob, updateJob } = useBulkUpload();
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const isProcessing = useRef(false);

    const startBulkUpload = useCallback(
        async ({ albumId, albumTitle, files }) => {
            if (isProcessing.current) {
                toast.error('Another upload is already being prepared');
                return;
            }
            isProcessing.current = true;

            const schoolId = fullUser?.schoolId;
            const uploadedById = fullUser?.id;

            if (!schoolId || !uploadedById) {
                toast.error('Authentication required');
                isProcessing.current = false;
                return;
            }

            try {
                // Step 1: Extract ZIPs + validate (quick, sync-ish)
                let allImages = [];

                for (const file of files) {
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

                if (allImages.length === 0) {
                    toast.error('No valid images to upload');
                    isProcessing.current = false;
                    return;
                }

                // Step 2: Create job — this returns IMMEDIATELY, dialog can close
                const { jobId, signal } = addJob({
                    albumId,
                    albumTitle,
                    total: allImages.length,
                });

                isProcessing.current = false;

                // Step 3: Fire-and-forget — uploads + save run in background
                // NOT awaited, so the caller (dialog) returns immediately
                runUploadPipeline({
                    allImages,
                    jobId,
                    signal,
                    albumId,
                    schoolId,
                    uploadedById,
                    updateJob,
                    queryClient,
                });

                // Function returns here — dialog closes, uploads continue in background
            } catch (error) {
                toast.error(`Upload failed: ${error.message}`);
                isProcessing.current = false;
            }
        },
        [addJob, updateJob, fullUser, queryClient]
    );

    return { startBulkUpload };
}