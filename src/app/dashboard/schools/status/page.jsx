'use client';

import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import LoaderPage from '@/components/loader-page';
import {
    Play, Eye, Trash2, Clock, Users, Image as ImageIcon, Video, Type,
    BarChart3, AlertCircle, RefreshCw
} from 'lucide-react';
import { useState } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

function formatTimeAgo(date) {
    const now = new Date();
    const d = new Date(date);
    const diff = now - d;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
}

function formatExpiryTime(date) {
    const now = new Date();
    const d = new Date(date);
    const diff = d - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
}

const typeIcons = {
    image: <ImageIcon className="h-4 w-4" />,
    video: <Video className="h-4 w-4" />,
    text: <Type className="h-4 w-4" />,
};

const audienceLabels = {
    all: 'Whole School',
    teachers: 'Teachers Only',
    class: 'Specific Class',
    custom: 'Custom',
};

export default function StatusManagementPage() {
    const { fullUser, loading: authLoading } = useAuth();
    const queryClient = useQueryClient();
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [deleteId, setDeleteId] = useState(null);
    const [showExpired, setShowExpired] = useState(false);

    const schoolId = fullUser?.schoolId;

    // Fetch status stats
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['statusStats', schoolId],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/status/stats`);
            if (!res.ok) throw new Error('Failed to fetch stats');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60 * 2,
    });

    // Fetch all statuses
    const { data: statusesData, isLoading: statusesLoading, refetch } = useQuery({
        queryKey: ['adminStatuses', schoolId, showExpired],
        queryFn: async () => {
            const res = await fetch(
                `/api/schools/${schoolId}/status?limit=50&showExpired=${showExpired}`
            );
            if (!res.ok) throw new Error('Failed to fetch statuses');
            return res.json();
        },
        enabled: !!schoolId,
        staleTime: 1000 * 60,
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (statusId) => {
            const res = await fetch(
                `/api/schools/${schoolId}/status/${statusId}?userId=${fullUser.id}`,
                { method: 'DELETE' }
            );
            if (!res.ok) throw new Error('Failed to delete');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['adminStatuses']);
            queryClient.invalidateQueries(['statusStats']);
            setDeleteId(null);
        },
    });

    // View details
    const { data: viewerData, isLoading: viewerLoading } = useQuery({
        queryKey: ['statusViewers', selectedStatus?.id],
        queryFn: async () => {
            const res = await fetch(`/api/schools/${schoolId}/status/${selectedStatus.id}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        },
        enabled: !!selectedStatus?.id,
    });

    if (authLoading) return <LoaderPage />;

    const stats = statsData?.stats || {};
    const statuses = statusesData?.statuses || [];

    return (
        <div className="px-4 py-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Status Updates</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage story statuses posted by staff on the mobile app
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 border-blue-200 dark:border-blue-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-100">Active Statuses</CardTitle>
                        <Play className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardDescription className="px-6 pb-4">
                        <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                            {statsLoading ? '...' : stats.activeStatuses || 0}
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300">Currently live</p>
                    </CardDescription>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200 dark:border-green-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-green-900 dark:text-green-100">Views Today</CardTitle>
                        <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </CardHeader>
                    <CardDescription className="px-6 pb-4">
                        <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                            {statsLoading ? '...' : stats.totalViewsToday || 0}
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-300">Total views</p>
                    </CardDescription>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50 border-purple-200 dark:border-purple-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-100">Posted Today</CardTitle>
                        <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </CardHeader>
                    <CardDescription className="px-6 pb-4">
                        <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                            {statsLoading ? '...' : stats.statusesToday || 0}
                        </div>
                        <p className="text-xs text-purple-700 dark:text-purple-300">New statuses</p>
                    </CardDescription>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-amber-950/50 border-amber-200 dark:border-amber-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-100">Top Posters</CardTitle>
                        <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </CardHeader>
                    <CardDescription className="px-6 pb-4">
                        <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                            {statsLoading ? '...' : stats.topPosters?.length || 0}
                        </div>
                        <p className="text-xs text-amber-700 dark:text-amber-300">This week</p>
                    </CardDescription>
                </Card>
            </div>

            {/* Filter Toggle */}
            <div className="flex items-center gap-3">
                <Button
                    variant={showExpired ? "outline" : "default"}
                    size="sm"
                    onClick={() => setShowExpired(false)}
                >
                    Active Only
                </Button>
                <Button
                    variant={showExpired ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowExpired(true)}
                >
                    Include Expired
                </Button>
            </div>

            {/* Statuses Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">All Status Updates</CardTitle>
                    <CardDescription>
                        {statusesData?.pagination?.total || 0} total statuses
                    </CardDescription>
                </CardHeader>
                <div className="px-6 pb-6">
                    {statusesLoading ? (
                        <div className="text-center py-8 text-muted-foreground">Loading...</div>
                    ) : statuses.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
                            <AlertCircle className="h-8 w-8 opacity-50" />
                            <p>No statuses found</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {statuses.map((status) => {
                                const isExpired = new Date(status.expiryAt) < new Date();
                                return (
                                    <div
                                        key={status.id}
                                        className={`flex items-center justify-between p-3 rounded-lg border ${isExpired
                                            ? 'bg-gray-50 dark:bg-gray-900/30 opacity-60'
                                            : 'bg-white dark:bg-gray-900/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {/* Preview */}
                                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                {status.type === 'image' && status.mediaUrl ? (
                                                    <img
                                                        src={status.mediaUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : status.type === 'video' && status.thumbnailUrl ? (
                                                    <img
                                                        src={status.thumbnailUrl}
                                                        alt=""
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="text-muted-foreground">
                                                        {typeIcons[status.type]}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm truncate">
                                                        {status.user?.name || 'Unknown'}
                                                    </span>
                                                    <Badge variant="outline" className="text-xs shrink-0">
                                                        {status.user?.role?.name}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        {typeIcons[status.type]}
                                                        {status.type}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{audienceLabels[status.audience] || status.audience}</span>
                                                    <span>•</span>
                                                    <span>{formatTimeAgo(status.createdAt)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right side */}
                                        <div className="flex items-center gap-3 shrink-0 ml-4">
                                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                <Eye className="h-3.5 w-3.5" />
                                                {status._count?.views || 0}
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${isExpired
                                                    ? 'bg-gray-100 dark:bg-gray-800'
                                                    : 'bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300'
                                                    }`}
                                            >
                                                <Clock className="h-3 w-3 mr-1" />
                                                {isExpired ? 'Expired' : formatExpiryTime(status.expiryAt)}
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedStatus(status)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => setDeleteId(status.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>

            {/* Viewer Details Dialog */}
            <Dialog open={!!selectedStatus} onOpenChange={() => setSelectedStatus(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center overflow-hidden shrink-0">
                                {selectedStatus?.user?.profilePicture && selectedStatus.user.profilePicture !== 'default.png' ? (
                                    <img src={selectedStatus.user.profilePicture} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-white font-bold text-sm">
                                        {(selectedStatus?.user?.name || '?')[0].toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div>
                                <span className="text-sm">{selectedStatus?.user?.name}</span>
                                <p className="text-xs text-muted-foreground font-normal">
                                    {selectedStatus && formatTimeAgo(selectedStatus.createdAt)}
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Preview */}
                    <div className="rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                        {selectedStatus?.type === 'image' && selectedStatus?.mediaUrl ? (
                            <img src={selectedStatus.mediaUrl} alt="" className="w-full h-full object-contain bg-muted rounded-xl" />
                        ) : selectedStatus?.type === 'text' ? (
                            <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center p-6 rounded-xl">
                                <div className="text-center">
                                    <p className="text-xl font-bold text-white">{selectedStatus?.text}</p>
                                    {selectedStatus?.caption && (
                                        <p className="text-sm text-white/80 mt-2">{selectedStatus.caption}</p>
                                    )}
                                </div>
                            </div>
                        ) : selectedStatus?.type === 'video' ? (
                            <div className="w-full h-full bg-muted flex flex-col items-center justify-center rounded-xl gap-2">
                                {selectedStatus?.thumbnailUrl ? (
                                    <img src={selectedStatus.thumbnailUrl} alt="" className="w-full h-full object-contain rounded-xl" />
                                ) : (
                                    <>
                                        <Video className="h-12 w-12 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Video status</span>
                                    </>
                                )}
                            </div>
                        ) : null}
                    </div>

                    {/* Viewers List */}
                    <div>
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            Viewers ({viewerData?.status?.viewCount || 0})
                        </h4>
                        {viewerLoading ? (
                            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                                Loading viewers...
                            </div>
                        ) : viewerData?.status?.viewers?.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-3">No viewers yet</p>
                        ) : (
                            <div className="space-y-2.5 max-h-48 overflow-y-auto">
                                {viewerData?.status?.viewers?.map((viewer) => (
                                    <div key={viewer.id} className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center overflow-hidden shrink-0">
                                                {viewer.profilePicture && viewer.profilePicture !== 'default.png' ? (
                                                    <img src={viewer.profilePicture} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                                                        {(viewer.name || '?')[0].toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="font-medium">{viewer.name}</span>
                                                <p className="text-xs text-muted-foreground">
                                                    {(viewer.role || '').replace(/_/g, ' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatTimeAgo(viewer.viewedAt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Status</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this status update. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteMutation.mutate(deleteId)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
