'use client';

// ═══════════════════════════════════════════════════════════════
// FILE: context/FeeAssignJobContext.jsx
//
// Wrap {children} in client-layout.jsx with <FeeAssignJobProvider>
// so the toast survives page navigation.
//
// Usage in AssignFeesToStudents page:
//   const { startJob } = useFeeAssignJob();
//   startJob({ jobId, total, structureName, className });
// ═══════════════════════════════════════════════════════════════

import {
    createContext, useContext, useState,
    useEffect, useRef, useCallback,
} from 'react';
import {
    CheckCircle, XCircle, Loader2,
    X, Users, ChevronDown, ChevronUp,
} from 'lucide-react';

const Ctx = createContext(null);

export function useFeeAssignJob() {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useFeeAssignJob must be used inside <FeeAssignJobProvider>');
    return ctx;
}

// ═══════════════════════════════════════════════════════════════
// Provider
// ═══════════════════════════════════════════════════════════════
export function FeeAssignJobProvider({ children }) {
    const [job, setJob] = useState(null);
    const [collapsed, setCollapsed] = useState(false);
    const esRef = useRef(null); // holds EventSource

    // Start a new job — called from the assign page
    const startJob = useCallback((jobData) => {
        // jobData: { jobId, total, structureName, className }
        setJob({
            ...jobData,
            done: 0,
            failed: 0,
            status: 'running',
            startedAt: Date.now(),
        });
        setCollapsed(false);
    }, []);

    // Dismiss toast and close SSE connection
    const clearJob = useCallback(() => {
        if (esRef.current) {
            esRef.current.close();
            esRef.current = null;
        }
        setJob(null);
    }, []);

    // Cancel a running job
    const cancelJob = useCallback(async (jobId) => {
        try {
            await fetch('/api/schools/fee/assign/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobId }),
            });
            setJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
        } catch (e) {
            console.error('[FeeAssignJob] Cancel failed:', e);
        }
    }, []);

    // Open SSE stream when a job starts
    useEffect(() => {
        if (!job?.jobId || job.status !== 'running') return;

        // Close any existing connection first
        if (esRef.current) esRef.current.close();

        const es = new EventSource(`/api/schools/fee/assign/status?jobId=${job.jobId}`);
        esRef.current = es;

        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.error) { es.close(); return; }

                setJob(prev => ({
                    ...prev,
                    done: data.done ?? prev.done,
                    failed: data.failed ?? prev.failed,
                    total: data.total ?? prev.total,
                    status: data.status ?? prev.status,
                }));

                // Server closes stream when done — we mirror that here
                if (data.status === 'done' || data.status === 'error' || data.status === 'cancelled') {
                    es.close();
                    esRef.current = null;
                }
            } catch { }
        };

        // onerror fires when server closes stream (normal on job completion)
        es.onerror = () => {
            es.close();
            esRef.current = null;
        };

        return () => {
            es.close();
            esRef.current = null;
        };
    }, [job?.jobId, job?.status]);

    return (
        <Ctx.Provider value={{ job, startJob, clearJob, cancelJob }}>
            {children}
            {job && (
                <FeeAssignToast
                    job={job}
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    onClose={clearJob}
                    onCancel={() => cancelJob(job.jobId)}
                />
            )}
        </Ctx.Provider>
    );
}

// ═══════════════════════════════════════════════════════════════
// Floating persistent toast
// ═══════════════════════════════════════════════════════════════
function FeeAssignToast({ job, collapsed, setCollapsed, onClose, onCancel }) {
    const { total, done, failed, status, structureName, className, startedAt } = job;

    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const elapsed = (Date.now() - startedAt) / 1000;
    const rate = done > 0 ? done / elapsed : null;
    const remaining = rate ? Math.ceil((total - done) / rate) : null;

    const isDone = status === 'done';
    const isError = status === 'error';
    const isRunning = status === 'running';
    const isCancelled = status === 'cancelled';
    const isTerminal = isDone || isError || isCancelled;

    const etaText = () => {
        if (!isRunning || !remaining) return 'Estimating…';
        if (remaining < 60) return `~${remaining}s left`;
        return `~${Math.ceil(remaining / 60)}m left`;
    };

    return (
        <div
            className="fixed bottom-5 right-5 z-[9999] w-[22rem] rounded-2xl border
                bg-white dark:bg-slate-900 shadow-2xl shadow-black/20 dark:shadow-black/50
                overflow-hidden transition-all duration-300"
        >
            {/* ── Header ── */}
            <div
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer select-none border-b
                    ${isDone
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900'
                        : isError
                            ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900'
                            : isCancelled
                                ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-slate-800'
                                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900'
                    }`}
                onClick={() => setCollapsed(c => !c)}
            >
                {/* Status icon */}
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                    bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
                    {isDone && <CheckCircle className="w-4 h-4 text-green-600" />}
                    {isError && <XCircle className="w-4 h-4 text-red-600" />}
                    {isCancelled && <XCircle className="w-4 h-4 text-slate-500" />}
                    {isRunning && <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />}
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-tight">
                        {isDone ? 'Fee Assignment Done' :
                            isError ? 'Assignment Failed' :
                                isCancelled ? 'Assignment Cancelled' :
                                    'Assigning Fees…'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {structureName}{className ? ` → ${className}` : ''}
                    </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600
                            dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        {collapsed
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    {isTerminal && (
                        <button
                            onClick={e => { e.stopPropagation(); onClose(); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500
                                hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Body ── */}
            {!collapsed && (
                <div className="px-4 py-4 space-y-3">

                    {/* Count */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            <span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{done}</span>
                                {' / '}
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{total}</span>
                                {' students'}
                            </span>
                            {failed > 0 && (
                                <span className="text-red-500 font-medium ml-1">({failed} failed)</span>
                            )}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{pct}%</span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ease-out ${isDone ? 'bg-green-500' :
                                isError ? 'bg-red-500' :
                                    isCancelled ? 'bg-slate-400' :
                                        'bg-blue-500'
                                }`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>

                    {/* Status line */}
                    <div className="flex items-center justify-between text-xs">
                        {isDone ? (
                            <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {done} assigned{failed > 0 ? `, ${failed} failed` : ' successfully'}
                            </span>
                        ) : isError ? (
                            <span className="text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Something went wrong — admin notified
                            </span>
                        ) : isCancelled ? (
                            <span className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                Cancelled — {done} of {total} assigned
                            </span>
                        ) : (
                            <>
                                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                    Running in background
                                </span>
                                <span className="text-slate-500 dark:text-slate-400 font-medium tabular-nums">
                                    {etaText()}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Dismiss */}
                    {isTerminal && (
                        <button
                            onClick={onClose}
                            className="w-full text-xs text-center py-1.5 rounded-lg
                                text-slate-400 hover:text-slate-600 dark:hover:text-slate-300
                                hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors
                                border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                        >
                            Dismiss
                        </button>
                    )}
                </div>
            )}

            {/* Running pulse stripe */}
            {isRunning && !collapsed && (
                <div className="h-0.5 w-full bg-blue-100 dark:bg-blue-950 overflow-hidden">
                    <div
                        className="h-full bg-blue-400 animate-pulse"
                        style={{ width: `${pct}%`, transition: 'width 0.7s ease-out' }}
                    />
                </div>
            )}
        </div>
    );
}