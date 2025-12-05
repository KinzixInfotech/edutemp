'use client';

import { Star, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export default function ReviewSection({ reviews, totalPages, currentPage, onPageChange }) {
    if (!reviews || reviews.length === 0) {
        return (
            <Card className="p-12 text-center">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl text-muted-foreground mb-2">No reviews yet</p>
                <p className="text-sm text-muted-foreground">Be the first to share your experience!</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {reviews.map((review) => (
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
                                        {review.parentName || 'Parent'}
                                    </span>
                                    {review.isVerified && (
                                        <Badge variant="secondary" className="gap-1">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Verified Parent
                                        </Badge>
                                    )}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                                </span>
                            </div>
                        </div>

                        {/* Overall Rating */}
                        <div className="flex items-center gap-1">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{review.overallRating.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Rating Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        <div className="text-sm">
                            <span className="text-muted-foreground">Academic:</span>
                            <span className="ml-2 font-medium">{review.academicRating.toFixed(1)}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Infrastructure:</span>
                            <span className="ml-2 font-medium">{review.infrastructureRating.toFixed(1)}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Teachers:</span>
                            <span className="ml-2 font-medium">{review.teacherRating.toFixed(1)}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted-foreground">Sports:</span>
                            <span className="ml-2 font-medium">{review.sportsRating.toFixed(1)}</span>
                        </div>
                    </div>

                    {/* Review Text */}
                    {review.review && (
                        <p className="text-muted-foreground">{review.review}</p>
                    )}
                </Card>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(currentPage - 1)}
                    >
                        Previous
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(currentPage + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    );
}
