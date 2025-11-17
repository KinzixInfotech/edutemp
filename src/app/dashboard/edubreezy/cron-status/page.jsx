'use client'
import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Clock, Play, Settings } from 'lucide-react';

export default function CronHealthDashboard() {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [repairing, setRepairing] = useState(false);
    const [testing, setTesting] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchHealth = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/admin/cron-health');
            const data = await res.json();
            setHealth(data);
            setLastRefresh(new Date());
        } catch (error) {
            console.error('Failed to fetch health:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRepair = async () => {
        if (!confirm('Recreate all cron jobs from configuration?')) return;

        try {
            setRepairing(true);
            const res = await fetch('/api/admin/cron-health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'repair' })
            });
            const data = await res.json();

            if (data.success) {
                alert('✅ Cron jobs repaired successfully!');
                fetchHealth();
            } else {
                alert('❌ Repair failed: ' + data.error);
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            setRepairing(false);
        }
    };

    const handleTest = async (jobName) => {
        try {
            setTesting(jobName);
            const res = await fetch('/api/admin/cron-health', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test', jobName })
            });
            const data = await res.json();

            if (data.success) {
                alert(`✅ ${jobName} executed successfully!`);
                fetchHealth();
            } else {
                alert(`❌ Test failed: ${JSON.stringify(data.data)}`);
            }
        } catch (error) {
            alert('❌ Error: ' + error.message);
        } finally {
            setTesting(null);
        }
    };

    const getStatusBadge = (job) => {
        if (!job.enabled) {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Disabled</span>;
        }
        if (job.needsRepair) {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                <XCircle size={14} /> Needs Repair
            </span>;
        }
        if (job.active) {
            return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                <CheckCircle size={14} /> Active
            </span>;
        }
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 flex items-center gap-1">
            <AlertTriangle size={14} /> Inactive
        </span>;
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return 'Never';
        return new Date(timestamp).toLocaleString();
    };

    if (loading && !health) {
        return (
            <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const overallHealthy = health?.healthy;
    const needsRepairCount = health?.needsRepair?.length || 0;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                <Clock className="text-blue-600" size={36} />
                                Cron Job Health Monitor
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Monitor and manage all scheduled background jobs
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={fetchHealth}
                                disabled={loading}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
                            >
                                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            {needsRepairCount > 0 && (
                                <button
                                    onClick={handleRepair}
                                    disabled={repairing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                                >
                                    <Settings size={18} className={repairing ? 'animate-spin' : ''} />
                                    {repairing ? 'Repairing...' : 'Repair All'}
                                </button>
                            )}
                        </div>
                    </div>
                    {lastRefresh && (
                        <p className="text-sm text-gray-500 mt-2">
                            Last updated: {lastRefresh.toLocaleTimeString()}
                        </p>
                    )}
                </div>

                {/* Overall Status Card */}
                <div className={`mb-8 p-6 rounded-lg border-2 ${overallHealthy
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {overallHealthy ? (
                                <CheckCircle size={48} className="text-green-600" />
                            ) : (
                                <XCircle size={48} className="text-red-600" />
                            )}
                            <div>
                                <h2 className={`text-2xl font-bold ${overallHealthy ? 'text-green-900' : 'text-red-900'
                                    }`}>
                                    {overallHealthy ? 'System Healthy' : 'System Needs Attention'}
                                </h2>
                                <p className={`mt-1 ${overallHealthy ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                    {health?.activeJobs || 0} of {health?.totalJobs || 0} jobs active
                                    {needsRepairCount > 0 && ` • ${needsRepairCount} need repair`}
                                </p>
                            </div>
                        </div>

                        {/* System Config */}
                        <div className="text-right">
                            <div className="text-sm text-gray-600">Base URL</div>
                            <div className="font-mono text-sm text-gray-900">
                                {health?.systemConfig?.baseUrl || 'NOT_SET'}
                            </div>
                            <div className="mt-2 text-sm">
                                Cron Secret: {health?.systemConfig?.cronSecretConfigured ? (
                                    <span className="text-green-600 font-medium">✓ Configured</span>
                                ) : (
                                    <span className="text-red-600 font-medium">✗ Missing</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Jobs Grid */}
                <div className="grid grid-cols-1 gap-6">
                    {health?.jobs?.map((job) => (
                        <div
                            key={job.name}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                        >
                            <div className="p-6">
                                {/* Job Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-semibold text-gray-900">
                                                {job.name}
                                            </h3>
                                            {getStatusBadge(job)}
                                        </div>
                                        <p className="text-sm text-gray-600 font-mono bg-gray-50 px-3 py-1 rounded inline-block">
                                            {job.schedule}
                                        </p>
                                    </div>

                                    {job.enabled && (
                                        <button
                                            onClick={() => handleTest(job.name)}
                                            disabled={testing === job.name}
                                            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-2 transition-colors text-sm font-medium"
                                        >
                                            <Play size={16} />
                                            {testing === job.name ? 'Testing...' : 'Test Now'}
                                        </button>
                                    )}
                                </div>

                                {/* Job Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-medium mb-1">Endpoint</div>
                                        <div className="text-sm text-gray-900 font-mono">{job.endpoint}</div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-medium mb-1">Last Run</div>
                                        <div className="text-sm text-gray-900">
                                            {formatTime(job.lastRun)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-medium mb-1">Last Status</div>
                                        <div className="text-sm">
                                            {job.lastStatus ? (
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${job.lastStatus === 'SUCCESS'
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {job.lastStatus}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-500 uppercase font-medium mb-1">Configuration</div>
                                        <div className="text-sm text-gray-900">
                                            {job.configured ? '✓ Saved' : '✗ Missing'}
                                        </div>
                                    </div>
                                </div>

                                {/* Last Execution Details */}
                                {job.lastExecution && (
                                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                                        <div className="text-xs text-gray-500 uppercase font-medium mb-2">Last Execution</div>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Started:</span>
                                                <span className="ml-2 text-gray-900">{new Date(job.lastExecution.start_time).toLocaleTimeString()}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Duration:</span>
                                                <span className="ml-2 text-gray-900">
                                                    {Math.round((new Date(job.lastExecution.end_time) - new Date(job.lastExecution.start_time)) / 1000)}s
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Status:</span>
                                                <span className={`ml-2 font-medium ${job.lastExecution.status === 'succeeded' ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {job.lastExecution.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Warning for Jobs Needing Repair */}
                                {job.needsRepair && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-red-800">
                                            <AlertTriangle size={18} />
                                            <span className="font-medium">This job needs repair!</span>
                                        </div>
                                        <p className="text-sm text-red-700 mt-1">
                                            The cron job is configured but not active in the database. Click "Repair All" to recreate it.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {health?.jobs?.length === 0 && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <Clock size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Cron Jobs Configured</h3>
                        <p className="text-gray-600">
                            No cron jobs found in the system. Please configure your cron jobs first.
                        </p>
                    </div>
                )}

                {/* Timestamp */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    System Status: {health?.timestamp}
                </div>
            </div>
        </div>
    );
}