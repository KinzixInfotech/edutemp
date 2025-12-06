'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
    Star, Trash2, CheckCircle2, Grid3x3, List, Search,
    MessageSquare
} from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDistanceToNow } from 'date-fns';

export default function ReviewsManagement() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [page, setPage] = useState(1);

    const { data, isLoading } = useQuery({
        queryKey: ['admin-reviews', fullUser?.schoolId, page],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/reviews?page=${page}`);
            if (!response.ok) throw new Error('Failed to fetch');
            return response.json();
        },
        enabled: !!fullUser?.schoolId,
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/reviews?id=${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['admin-reviews']);
            setDeleteId(null);
        },
    });

    const filteredReviews = data?.reviews?.filter(review =>
        searchQuery === '' ||
        review.parentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        review.review?.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-48" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Reviews Management</h1>
                    <p className="text-muted-foreground">
                        Manage parent reviews for your school ({data?.total || 0} total)
                    </p>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2">
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode('grid')}
                    >
                        <Grid3x3 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search reviews by parent name or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Reviews */}
            {filteredReviews.length === 0 ? (
                <Card className="p-12 text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-xl text-muted-foreground mb-2">No reviews found</p>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery ? 'Try a different search term' : 'Reviews will appear here once parents submit them'}
                    </p>
                </Card>
            ) : (
                <>
                    <div className={viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
                        : 'space-y-4'
                    }>
                        {filteredReviews.map((review) => (
                            <Card key={review.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <span className="text-lg font-semibold text-primary">
                                                {review.parentName?.charAt(0) || 'P'}
                                            </span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">
                                                    {review.parentName || 'Anonymous'}
                                                </span>
                                                {review.isVerified && (
                                                    <Badge variant="secondary" className="gap-1">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Verified
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-sm text-muted-foreground">
                                                {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setDeleteId(review.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>

                                {/* Overall Rating */}
                                <div className="flex items-center gap-1 mb-3">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`h-4 w-4 ${i < Math.floor(review.overallRating)
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                                }`}
                                        />
                                    ))}
                                    <span className="ml-2 font-semibold">{review.overallRating.toFixed(1)}</span>
                                </div>

                                {/* Rating Breakdown */}
                                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Academic:</span>
                                        <span className="ml-1 font-medium">{review.academicRating.toFixed(1)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Infrastructure:</span>
                                        <span className="ml-1 font-medium">{review.infrastructureRating.toFixed(1)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Teachers:</span>
                                        <span className="ml-1 font-medium">{review.teacherRating.toFixed(1)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Sports:</span>
                                        <span className="ml-1 font-medium">{review.sportsRating.toFixed(1)}</span>
                                    </div>
                                </div>

                                {/* Review Text */}
                                {review.review && (
                                    <p className="text-sm text-muted-foreground line-clamp-3">{review.review}</p>
                                )}
                            </Card>
                        ))}
                    </div>

                    {/* Pagination */}
                    {data.totalPages > 1 && (
                        <div className="flex justify-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(page - 1)}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center px-4 text-sm text-muted-foreground">
                                Page {page} of {data.totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page === data.totalPages}
                                onClick={() => setPage(page + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this review and recalculate your school's average ratings. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
