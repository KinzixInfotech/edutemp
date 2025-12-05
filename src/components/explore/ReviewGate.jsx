'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Star, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import WriteReviewDialog from './WriteReviewDialog';

export default function ReviewGate({ profileId, schoolId, onReviewSubmit }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [authState, setAuthState] = useState({
        isLoading: true,
        isAuthenticated: false,
        isParent: false,
        canReview: false,
        error: null,
        existingReview: null
    });

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            // Check Supabase authentication
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );

            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setAuthState({
                    isLoading: false,
                    isAuthenticated: false,
                    isParent: false,
                    canReview: false,
                    error: null,
                    existingReview: null
                });
                return;
            }

            // Get parent data from localStorage
            const storedData = typeof window !== 'undefined' ? localStorage.getItem('parentUser') : null;
            const parentData = storedData ? JSON.parse(storedData) : null;

            if (!parentData || !parentData.parent) {
                setAuthState({
                    isLoading: false,
                    isAuthenticated: true,
                    isParent: false,
                    canReview: false,
                    error: 'Only parents can write reviews',
                    existingReview: null
                });
                return;
            }

            // Check if parent belongs to this school
            // validating against internal schoolId (parent's schoolId vs page's schoolId)
            if (parentData.parent.schoolId !== schoolId) {
                // Also check linked students just in case parent has multiple kids
                const studentMatch = parentData.parent.students?.some(
                    student => student.class?.schoolId === schoolId // Check if student object has schoolId populated (might need to check this)
                    // Note: localized student data might not have schoolId, relying on parent.schoolId is safer for primary
                );
                
                // If strictly not matching primary school, show error
                if (!studentMatch) {
                     setAuthState({
                        isLoading: false,
                        isAuthenticated: true,
                        isParent: true,
                        canReview: false,
                        error: 'You can only review your child\'s school',
                        existingReview: null
                    });
                    return;
                }
            }

            // Check for existing review
            const reviewResponse = await fetch(`/api/public/schools/${profileId}/reviews/my-review`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const existingReview = reviewResponse.ok ? await reviewResponse.json() : null;

            setAuthState({
                isLoading: false,
                isAuthenticated: true,
                isParent: true,
                canReview: true,
                error: null,
                existingReview
            });

        } catch (error) {
            console.error('Auth check error:', error);
            setAuthState({
                isLoading: false,
                isAuthenticated: false,
                isParent: false,
                canReview: false,
                error: 'Failed to verify authentication',
                existingReview: null
            });
        }
    };

    if (authState.isLoading) {
        return (
            <div className="flex justify-end">
                <Button disabled size="sm" variant="outline">
                    Loading...
                </Button>
            </div>
        );
    }

    if (!authState.isAuthenticated) {
        return (
            <div className="flex justify-end">
                <Link href={`/explore/login?returnTo=/explore/schools/${profileId}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                        Log In to Review
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </Link>
            </div>
        );
    }

    if (authState.error) {
        // If it's a permission error, maybe just hide the button or show a small badge?
        // User asked for logic to work. So we show feedback.
        return (
            <div className="flex justify-end">
                 <Button disabled variant="ghost" className="text-muted-foreground text-xs">
                    Enroll to Review
                 </Button>
            </div>
        );
    }

    if (!authState.canReview) {
        return null;
    }

    return (
        <>
            <div className="flex justify-end">
                <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="gap-2 bg-primary hover:bg-primary/90 text-white shadow-sm"
                    size="sm"
                >
                    <Star className="h-4 w-4" />
                    {authState.existingReview ? 'Edit Review' : 'Write Review'}
                </Button>
            </div>

            <WriteReviewDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                profileId={profileId}
                existingReview={authState.existingReview}
                onSubmitSuccess={() => {
                    checkAuthStatus();
                    onReviewSubmit && onReviewSubmit();
                }}
            />
        </>
    );
}
