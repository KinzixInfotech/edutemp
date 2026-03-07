'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Custom hook replacing useUploadThing — handles R2 presigned URL uploads.
 * 
 * Usage:
 *   const { startUpload, isUploading, progress } = useR2Upload({
 *       folder: 'gallery',
 *       onUploadBegin: () => {},
 *       onUploadProgress: (pct) => {},
 *       onUploadComplete: (results) => {},
 *       onUploadError: (err) => {},
 *   });
 *   
 *   await startUpload(files, { schoolId: '...' });
 */
export function useR2Upload({
    folder = 'uploads',
    onUploadBegin,
    onUploadProgress,
    onUploadComplete,
    onClientUploadComplete, // alias for compatibility with UploadThing API
    onUploadError,
} = {}) {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const abortRef = useRef(null);

    const startUpload = useCallback(async (files, { schoolId = 'global', subFolder = '' } = {}) => {
        if (!files || files.length === 0) return [];

        const completeHandler = onUploadComplete || onClientUploadComplete;

        try {
            setIsUploading(true);
            setProgress(0);
            onUploadBegin?.();

            // 1. Get presigned URLs from our API
            const presignRes = await fetch('/api/r2/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
                    folder,
                    subFolder,
                    schoolId,
                }),
            });

            if (!presignRes.ok) {
                throw new Error(`Failed to get presigned URLs: ${presignRes.status}`);
            }

            const presigned = await presignRes.json();

            // 2. Upload each file to R2 via presigned URL
            const results = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const { url, key, publicUrl } = presigned[i];

                // Upload via XHR for progress tracking
                await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    abortRef.current = xhr;

                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) {
                            const fileProgress = (e.loaded / e.total) * 100;
                            const overallProgress = ((i + fileProgress / 100) / files.length) * 100;
                            setProgress(Math.round(overallProgress));
                            onUploadProgress?.(Math.round(overallProgress));
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            results.push({
                                url: publicUrl,
                                ufsUrl: publicUrl, // compatibility alias
                                key,
                                name: file.name,
                                size: file.size,
                                type: file.type,
                            });
                            resolve();
                        } else {
                            reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error during upload'));
                    xhr.onabort = () => reject(new Error('Upload cancelled'));

                    xhr.open('PUT', url);
                    xhr.setRequestHeader('Content-Type', file.type);
                    xhr.send(file);
                });
            }

            setProgress(100);
            setIsUploading(false);
            abortRef.current = null;

            completeHandler?.(results);
            return results;
        } catch (error) {
            setIsUploading(false);
            setProgress(0);
            abortRef.current = null;
            onUploadError?.(error);
            throw error;
        }
    }, [folder, onUploadBegin, onUploadProgress, onUploadComplete, onClientUploadComplete, onUploadError]);

    const abort = useCallback(() => {
        abortRef.current?.abort();
    }, []);

    return {
        startUpload,
        isUploading,
        progress,
        abort,
    };
}

/**
 * Standalone (non-hook) function to upload files to R2.
 * Drop-in replacement for UploadThing's `uploadFiles()`.
 * 
 * Usage:
 *   import { uploadFilesToR2 } from '@/hooks/useR2Upload';
 *   const res = await uploadFilesToR2('gallery', {
 *       files: [file],
 *       input: { schoolId: '...', albumId: '...' },
 *   });
 */
export async function uploadFilesToR2(folder, { files, input = {} } = {}) {
    if (!files || files.length === 0) return [];

    const schoolId = input.schoolId || 'global';
    const subFolder = input.subFolder || '';

    // 1. Get presigned URLs
    const presignRes = await fetch('/api/r2/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            files: files.map(f => ({ name: f.name, type: f.type, size: f.size })),
            folder,
            subFolder,
            schoolId,
        }),
    });

    if (!presignRes.ok) {
        throw new Error(`Failed to get presigned URLs: ${presignRes.status}`);
    }

    const presigned = await presignRes.json();

    // 2. Upload each file
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { url, key, publicUrl } = presigned[i];

        const uploadRes = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
        });

        if (!uploadRes.ok) {
            throw new Error(`Upload failed for ${file.name}: ${uploadRes.status}`);
        }

        results.push({
            url: publicUrl,
            ufsUrl: publicUrl, // compatibility alias
            key,
            name: file.name,
            size: file.size,
            type: file.type,
        });
    }

    return results;
}
