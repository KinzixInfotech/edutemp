'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const BulkUploadContext = createContext(null);

export function useBulkUpload() {
    const ctx = useContext(BulkUploadContext);
    if (!ctx) throw new Error('useBulkUpload must be used within BulkUploadProvider');
    return ctx;
}

export function BulkUploadProvider({ children }) {
    const [jobs, setJobs] = useState([]);
    const [minimized, setMinimized] = useState(false);
    const abortControllers = useRef({});

    // Add a new upload job
    const addJob = useCallback((job) => {
        const id = `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const newJob = {
            id,
            albumId: job.albumId,
            albumTitle: job.albumTitle,
            total: job.total,
            completed: 0,
            failed: 0,
            failedFiles: [],
            status: 'uploading', // uploading | completed | failed
            startedAt: Date.now(),
        };
        setJobs((prev) => [...prev, newJob]);
        abortControllers.current[id] = new AbortController();
        return { jobId: id, signal: abortControllers.current[id].signal };
    }, []);

    // Update job progress
    const updateJob = useCallback((jobId, updates) => {
        setJobs((prev) =>
            prev.map((j) => {
                if (j.id !== jobId) return j;
                const updated = { ...j, ...updates };
                // Auto-complete if all done
                if (updated.completed + updated.failed >= updated.total && updated.status === 'uploading') {
                    updated.status = updated.failed > 0 ? 'failed' : 'completed';
                }
                return updated;
            })
        );
    }, []);

    // Remove a completed/failed job from the list
    const removeJob = useCallback((jobId) => {
        setJobs((prev) => prev.filter((j) => j.id !== jobId));
        delete abortControllers.current[jobId];
    }, []);

    // Abort a running job
    const abortJob = useCallback((jobId) => {
        if (abortControllers.current[jobId]) {
            abortControllers.current[jobId].abort();
        }
        setJobs((prev) =>
            prev.map((j) =>
                j.id === jobId ? { ...j, status: 'failed' } : j
            )
        );
    }, []);

    // Determine if any uploads are in progress
    const isUploading = jobs.some((j) => j.status === 'uploading');
    const activeJobs = jobs.filter((j) => j.status === 'uploading');
    const completedJobs = jobs.filter((j) => j.status !== 'uploading');

    // Warn on tab close during upload
    useEffect(() => {
        if (!isUploading) return;
        const handler = (e) => {
            e.preventDefault();
            e.returnValue = 'Upload is still in progress. Are you sure you want to leave?';
            return e.returnValue;
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [isUploading]);

    // Recover orphaned uploads from localStorage (files uploaded but DB save failed/interrupted)
    useEffect(() => {
        const recoverOrphaned = async () => {
            try {
                const keys = Object.keys(localStorage).filter(k => k.startsWith('bulk_upload_pending_'));
                for (const key of keys) {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (!data || !data.uploads?.length) {
                        localStorage.removeItem(key);
                        continue;
                    }

                    console.log('Recovering orphaned upload:', key, data.uploads.length, 'files');

                    const res = await fetch(`/api/schools/${data.schoolId}/gallery/bulk-save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            albumId: data.albumId,
                            uploadedById: data.uploadedById,
                            files: data.uploads,
                        }),
                    });

                    if (res.ok) {
                        console.log('Successfully recovered orphaned upload:', key);
                        localStorage.removeItem(key);
                    }
                }
            } catch (e) {
                console.warn('Failed to recover orphaned uploads:', e);
            }
        };

        // Wait a bit after load to not compete with initial page data
        const timer = setTimeout(recoverOrphaned, 5000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <BulkUploadContext.Provider
            value={{
                jobs,
                isUploading,
                activeJobs,
                completedJobs,
                minimized,
                setMinimized,
                addJob,
                updateJob,
                removeJob,
                abortJob,
            }}
        >
            {children}
        </BulkUploadContext.Provider>
    );
}
