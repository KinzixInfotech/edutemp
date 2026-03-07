'use client';

import { useBulkUpload } from '@/context/BulkUploadContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
    Minimize2,
    Maximize2,
    X,
    CheckCircle,
    AlertTriangle,
    Upload,
    Loader2,
    ImageIcon,
    XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BulkUploadToast() {
    const { jobs, minimized, setMinimized, removeJob, isUploading } = useBulkUpload();

    if (jobs.length === 0) return null;

    const totalCompleted = jobs.reduce((s, j) => s + j.completed, 0);
    const totalAll = jobs.reduce((s, j) => s + j.total, 0);
    const totalFailed = jobs.reduce((s, j) => s + j.failed, 0);
    const overallProgress = totalAll > 0 ? Math.round(((totalCompleted + totalFailed) / totalAll) * 100) : 0;

    // Minimized view
    if (minimized) {
        return (
            <div className="fixed bottom-4 right-4 z-[9999]">
                <button
                    onClick={() => setMinimized(false)}
                    className={cn(
                        'flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl border transition-all hover:scale-105',
                        isUploading
                            ? 'bg-primary text-primary-foreground border-primary/50'
                            : totalFailed > 0
                                ? 'bg-amber-500 text-white border-amber-400'
                                : 'bg-emerald-500 text-white border-emerald-400'
                    )}
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : totalFailed > 0 ? (
                        <AlertTriangle className="w-4 h-4" />
                    ) : (
                        <CheckCircle className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                        {isUploading
                            ? `Uploading ${totalCompleted}/${totalAll}`
                            : totalFailed > 0
                                ? `${totalFailed} failed`
                                : 'Upload complete'}
                    </span>
                    <Maximize2 className="w-3.5 h-3.5 opacity-70" />
                </button>
            </div>
        );
    }

    // Expanded view
    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-[360px] max-h-[400px] overflow-hidden rounded-xl shadow-2xl border bg-background flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
                <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">
                        Bulk Upload{isUploading ? ` (${overallProgress}%)` : ''}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setMinimized(true)}
                    >
                        <Minimize2 className="w-3.5 h-3.5" />
                    </Button>
                    {!isUploading && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => jobs.forEach((j) => removeJob(j.id))}
                        >
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Jobs list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {jobs.map((job) => {
                    const progress =
                        job.total > 0
                            ? Math.round(((job.completed + job.failed) / job.total) * 100)
                            : 0;

                    return (
                        <div key={job.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                    {job.status === 'uploading' ? (
                                        <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                                    ) : job.status === 'completed' ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                    )}
                                    <span className="text-sm font-medium truncate">
                                        {job.albumTitle || 'Album'}
                                    </span>
                                </div>
                                {job.status !== 'uploading' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0"
                                        onClick={() => removeJob(job.id)}
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>

                            <Progress value={progress} className="h-2" />

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" />
                                    {job.completed}/{job.total} uploaded
                                </span>
                                {job.failed > 0 && (
                                    <span className="flex items-center gap-1 text-red-500">
                                        <XCircle className="w-3 h-3" />
                                        {job.failed} failed
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            {isUploading && (
                <div className="px-4 py-2 border-t bg-muted/30">
                    <p className="text-[11px] text-muted-foreground text-center">
                        Upload continues even if you navigate away
                    </p>
                </div>
            )}
        </div>
    );
}
