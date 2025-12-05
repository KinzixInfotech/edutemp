'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ApplyForAdmission() {
    const params = useParams();
    const router = useRouter();
    const schoolId = params.id;
    const [formData, setFormData] = useState({
        studentName: '',
        studentAge: '',
        preferredGrade: '',
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        message: ''
    });

    const { data: school, isLoading } = useQuery({
        queryKey: ['school-inquiry', schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/public/schools/${schoolId}`);
            if (!response.ok) throw new Error('School not found');
            return response.json();
        },
    });

    const submitMutation = useMutation({
        mutationFn: async (data) => {
            const response = await fetch('/api/public/admission-inquiry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, profileId: schoolId }),
            });
            if (!response.ok) throw new Error('Failed to submit');
            return response.json();
        },
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        submitMutation.mutate({
            ...formData,
            studentAge: formData.studentAge ? parseInt(formData.studentAge) : null
        });
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (submitMutation.isSuccess) {
        return (
            <div className="max-w-3xl mx-auto p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <Card className="p-12 text-center">
                        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold mb-4">Application Submitted!</h2>
                        <p className="text-muted-foreground mb-6">
                            Thank you for your interest in {school?.school?.name}. The admissions team will contact you shortly.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link href={`/explore/schools/${schoolId}`}>
                                <Button variant="outline">Back to Profile</Button>
                            </Link>
                            <Link href="/explore/schools">
                                <Button>Browse More Schools</Button>
                            </Link>
                        </div>
                    </Card>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <Link href={`/explore/schools/${schoolId}`}>
                <Button variant="ghost" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to School Profile
                </Button>
            </Link>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <Card className="p-8">
                    <div className="mb-6">
                        <h1 className="text-3xl font-bold mb-2">Apply for Admission</h1>
                        <p className="text-muted-foreground">
                            Fill out this form to express your interest in {school?.school?.name}
                        </p>
                    </div>

                    {submitMutation.isError && (
                        <Alert variant="destructive" className="mb-6">
                            <AlertDescription>
                                Failed to submit application. Please try again.
                            </AlertDescription>
                        </Alert>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Student Information */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Student Information</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="studentName">Student Name *</Label>
                                    <Input
                                        id="studentName"
                                        value={formData.studentName}
                                        onChange={(e) => handleChange('studentName', e.target.value)}
                                        placeholder="Full name"
                                        required
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="studentAge">Age</Label>
                                    <Input
                                        id="studentAge"
                                        type="number"
                                        value={formData.studentAge}
                                        onChange={(e) => handleChange('studentAge', e.target.value)}
                                        placeholder="Age in years"
                                        min="3"
                                        max="25"
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label htmlFor="preferredGrade">Preferred Grade/Class *</Label>
                                <Input
                                    id="preferredGrade"
                                    value={formData.preferredGrade}
                                    onChange={(e) => handleChange('preferredGrade', e.target.value)}
                                    placeholder="e.g., Grade 5, Class 10"
                                    required
                                    className="mt-2"
                                />
                            </div>
                        </div>

                        {/* Parent Information */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Parent/Guardian Information</h2>
                            <div>
                                <Label htmlFor="parentName">Name *</Label>
                                <Input
                                    id="parentName"
                                    value={formData.parentName}
                                    onChange={(e) => handleChange('parentName', e.target.value)}
                                    placeholder="Full name"
                                    required
                                    className="mt-2"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="parentEmail">Email *</Label>
                                    <Input
                                        id="parentEmail"
                                        type="email"
                                        value={formData.parentEmail}
                                        onChange={(e) => handleChange('parentEmail', e.target.value)}
                                        placeholder="email@example.com"
                                        required
                                        className="mt-2"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="parentPhone">Phone *</Label>
                                    <Input
                                        id="parentPhone"
                                        type="tel"
                                        value={formData.parentPhone}
                                        onChange={(e) => handleChange('parentPhone', e.target.value)}
                                        placeholder="+91 1234567890"
                                        required
                                        className="mt-2"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Additional Message */}
                        <div>
                            <Label htmlFor="message">Message (Optional)</Label>
                            <Textarea
                                id="message"
                                value={formData.message}
                                onChange={(e) => handleChange('message', e.target.value)}
                                placeholder="Any additional information or questions..."
                                rows={4}
                                className="mt-2"
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={submitMutation.isPending}
                            className="w-full gap-2"
                            size="lg"
                        >
                            <Send className="h-4 w-4" />
                            {submitMutation.isPending ? 'Submitting...' : 'Submit Application'}
                        </Button>
                    </form>
                </Card>
            </motion.div>
        </div>
    );
}
