'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Star } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function WriteReviewDialog({ open, onOpenChange, profileId, existingReview, onSubmitSuccess }) {
    const [formData, setFormData] = useState(existingReview || {
        academicRating: 4,
        infrastructureRating: 4,
        teacherRating: 4,
        sportsRating: 4,
        overallRating: 4,
        review: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Get Supabase token from session
            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );

            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setError('Please log in to submit a review');
                setIsSubmitting(false);
                return;
            }

            const response = await fetch(`/api/public/schools/${profileId}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit review');
            }

            onSubmitSuccess && onSubmitSuccess();
            onOpenChange(false);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-scroll">
                <DialogHeader>
                    <DialogTitle>{existingReview ? 'Update Your Review' : 'Write a Review'}</DialogTitle>
                    <DialogDescription>
                        Share your experience to help other parents make informed decisions
                    </DialogDescription>
                </DialogHeader>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Academic Rating */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Academic Excellence</Label>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{formData.academicRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <Slider
                            value={[formData.academicRating]}
                            onValueChange={([value]) => setFormData({ ...formData, academicRating: value })}
                            min={0}
                            max={5}
                            step={0.5}
                            className="mt-2"
                        />
                    </div>

                    {/* Infrastructure Rating */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Infrastructure & Facilities</Label>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{formData.infrastructureRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <Slider
                            value={[formData.infrastructureRating]}
                            onValueChange={([value]) => setFormData({ ...formData, infrastructureRating: value })}
                            min={0}
                            max={5}
                            step={0.5}
                            className="mt-2"
                        />
                    </div>

                    {/* Teacher Rating */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Teaching Quality</Label>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{formData.teacherRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <Slider
                            value={[formData.teacherRating]}
                            onValueChange={([value]) => setFormData({ ...formData, teacherRating: value })}
                            min={0}
                            max={5}
                            step={0.5}
                            className="mt-2"
                        />
                    </div>

                    {/* Sports Rating */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Sports & Extracurriculars</Label>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{formData.sportsRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <Slider
                            value={[formData.sportsRating]}
                            onValueChange={([value]) => setFormData({ ...formData, sportsRating: value })}
                            min={0}
                            max={5}
                            step={0.5}
                            className="mt-2"
                        />
                    </div>

                    {/* Overall Rating */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <Label>Overall Experience</Label>
                            <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">{formData.overallRating.toFixed(1)}</span>
                            </div>
                        </div>
                        <Slider
                            value={[formData.overallRating]}
                            onValueChange={([value]) => setFormData({ ...formData, overallRating: value })}
                            min={0}
                            max={5}
                            step={0.5}
                            className="mt-2"
                        />
                    </div>

                    {/* Review Text */}
                    <div>
                        <Label htmlFor="review">Your Review (Optional)</Label>
                        <Textarea
                            id="review"
                            value={formData.review}
                            onChange={(e) => setFormData({ ...formData, review: e.target.value })}
                            placeholder="Share your thoughts about this school..."
                            rows={4}
                            className="mt-2"
                        />
                    </div>

                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? 'Submitting...' : existingReview ? 'Update Review' : 'Submit Review'}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
