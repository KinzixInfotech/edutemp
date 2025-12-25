'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Save, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PublicProfileSettings() {
    const { fullUser } = useAuth();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({});

    const { data: profile, isLoading } = useQuery({
        queryKey: ['school-public-profile', fullUser?.schoolId],
        queryFn: async () => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/profile`);
            if (!response.ok) throw new Error('Failed to fetch profile');
            const data = await response.json();
            setFormData(data);
            return data;
        },
        enabled: !!fullUser?.schoolId,
    });

    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update');
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['school-public-profile']);
            queryClient.invalidateQueries(['school-explorer-analytics']);
        },
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const { school, ...updateData } = formData;
        updateMutation.mutate(updateData);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 p-6">
                <Skeleton className="h-8 w-64" />
                <Card className="p-6 space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                </Card>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Public Profile Settings</h1>
                <p className="text-muted-foreground">
                    Manage your school's public profile visibility and information
                </p>
            </div>

            {/* Success/Error Messages */}
            {updateMutation.isSuccess && (
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 dark:text-green-200">
                        Profile updated successfully!
                    </AlertDescription>
                </Alert>
            )}

            {updateMutation.isError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Failed to update profile. Please try again.
                    </AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Visibility Settings */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Visibility Settings</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Publicly Visible</Label>
                                <p className="text-sm text-muted-foreground">
                                    Make your school profile visible on school.edubreezy.com
                                </p>
                            </div>
                            <Switch
                                checked={formData.isPubliclyVisible || false}
                                onCheckedChange={(checked) => handleChange('isPubliclyVisible', checked)}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Featured School</Label>
                                <p className="text-sm text-muted-foreground">
                                    Highlight your school on the homepage
                                </p>
                            </div>
                            <Switch
                                checked={formData.isFeatured || false}
                                onCheckedChange={(checked) => handleChange('isFeatured', checked)}
                            />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Verified Badge</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show verified badge (contact support to enable)
                                </p>
                            </div>
                            <Switch
                                checked={formData.isVerified || false}
                                disabled
                            />
                        </div>
                    </div>
                </Card>

                {/* Basic Information */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="tagline">Tagline *</Label>
                            <Input
                                id="tagline"
                                type="text"
                                value={formData.tagline || ''}
                                onChange={(e) => handleChange('tagline', e.target.value)}
                                placeholder="A catchy tagline for your school"
                                maxLength={100}
                                className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Short, catchy phrase (max 100 characters)
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="description">Description *</Label>
                            <Textarea
                                id="description"
                                value={formData.description || ''}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Describe your school, its values, and what makes it unique..."
                                rows={4}
                                className="mt-2"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="vision">Vision</Label>
                                <Textarea
                                    id="vision"
                                    value={formData.vision || ''}
                                    onChange={(e) => handleChange('vision', e.target.value)}
                                    placeholder="Your school's vision statement"
                                    rows={3}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="mission">Mission</Label>
                                <Textarea
                                    id="mission"
                                    value={formData.mission || ''}
                                    onChange={(e) => handleChange('mission', e.target.value)}
                                    placeholder="Your school's mission statement"
                                    rows={3}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Media  */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Media</h2>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="coverImage">Cover Image URL</Label>
                            <Input
                                id="coverImage"
                                type="url"
                                value={formData.coverImage || ''}
                                onChange={(e) => handleChange('coverImage', e.target.value)}
                                placeholder="https://example.com/cover.jpg"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="logoImage">Logo Image URL</Label>
                            <Input
                                id="logoImage"
                                type="url"
                                value={formData.logoImage || ''}
                                onChange={(e) => handleChange('logoImage', e.target.value)}
                                placeholder="https://example.com/logo.png"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="videoUrl">Promotional Video URL</Label>
                            <Input
                                id="videoUrl"
                                type="url"
                                value={formData.videoUrl || ''}
                                onChange={(e) => handleChange('videoUrl', e.target.value)}
                                placeholder="https://youtube.com/watch?v=..."
                                className="mt-2"
                            />
                        </div>
                    </div>
                </Card>

                {/* Contact Information */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="publicEmail">Public Email</Label>
                                <Input
                                    id="publicEmail"
                                    type="email"
                                    value={formData.publicEmail || ''}
                                    onChange={(e) => handleChange('publicEmail', e.target.value)}
                                    placeholder="admissions@school.com"
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <Label htmlFor="publicPhone">Public Phone</Label>
                                <Input
                                    id="publicPhone"
                                    type="tel"
                                    value={formData.publicPhone || ''}
                                    onChange={(e) => handleChange('publicPhone', e.target.value)}
                                    placeholder="+91 1234567890"
                                    className="mt-2"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                type="url"
                                value={formData.website || ''}
                                onChange={(e) => handleChange('website', e.target.value)}
                                placeholder="https://www.school.com"
                                className="mt-2"
                            />
                        </div>
                    </div>
                </Card>

                {/* Fees */}
                <Card className="p-6">
                </Card>
                {/* Fees */}
                <Card className="p-6">
                    <h2 className="text-xl font-semibold mb-4">Fee Structure</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <Label htmlFor="minFee">Minimum Fee (₹/year)</Label>
                            <Input
                                id="minFee"
                                type="number"
                                value={formData.minFee || ''}
                                onChange={(e) => handleChange('minFee', parseInt(e.target.value))}
                                placeholder="50000"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="maxFee">Maximum Fee (₹/year)</Label>
                            <Input
                                id="maxFee"
                                type="number"
                                value={formData.maxFee || ''}
                                onChange={(e) => handleChange('maxFee', parseInt(e.target.value))}
                                placeholder="200000"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="feeStructureUrl">Fee Structure PDF URL</Label>
                            <Input
                                id="feeStructureUrl"
                                type="url"
                                value={formData.feeStructureUrl || ''}
                                onChange={(e) => handleChange('feeStructureUrl', e.target.value)}
                                placeholder="https://yourschool.com/fees.pdf"
                                className="mt-2"
                            />
                        </div>
                    </div>

                    {/* Auto-calculate button */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mb-6 gap-2"
                        disabled={!Array.isArray(formData.detailedFeeStructure) || formData.detailedFeeStructure.length === 0}
                        onClick={() => {
                            const fees = formData.detailedFeeStructure;
                            const totals = fees.map(f => f.total || 0).filter(t => t > 0);
                            if (totals.length > 0) {
                                handleChange('minFee', Math.min(...totals));
                                handleChange('maxFee', Math.max(...totals));
                            }
                        }}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="16" height="16" x="4" y="4" rx="2" />
                            <path d="M8 10h8" />
                            <path d="M8 14h4" />
                        </svg>
                        Calculate from Fee Breakdown
                    </Button>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Class-wise Fee Breakdown</h3>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const currentFees = Array.isArray(formData.detailedFeeStructure) ? formData.detailedFeeStructure : [];
                                    handleChange('detailedFeeStructure', [...currentFees, { className: '', admissionFee: 0, tuitionFee: 0, total: 0 }]);
                                }}
                            >
                                + Add Class
                            </Button>
                        </div>

                        <div className="border rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-muted">
                                    <tr>
                                        <th className="p-2 text-left">Class</th>
                                        <th className="p-2 text-left">Admission Fee</th>
                                        <th className="p-2 text-left">Tuition Fee (Annual)</th>
                                        <th className="p-2 text-left">Total</th>
                                        <th className="p-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {Array.isArray(formData.detailedFeeStructure) && formData.detailedFeeStructure.length > 0 ? (
                                        formData.detailedFeeStructure.map((fee, index) => (
                                            <tr key={index}>
                                                <td className="p-2">
                                                    <Input
                                                        value={fee.className}
                                                        onChange={(e) => {
                                                            const newFees = [...formData.detailedFeeStructure];
                                                            newFees[index].className = e.target.value;
                                                            handleChange('detailedFeeStructure', newFees);
                                                        }}
                                                        placeholder="e.g. Class 1"
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        value={fee.admissionFee}
                                                        onChange={(e) => {
                                                            const newFees = [...formData.detailedFeeStructure];
                                                            newFees[index].admissionFee = parseInt(e.target.value) || 0;
                                                            newFees[index].total = (newFees[index].admissionFee || 0) + (newFees[index].tuitionFee || 0);
                                                            handleChange('detailedFeeStructure', newFees);
                                                        }}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        value={fee.tuitionFee}
                                                        onChange={(e) => {
                                                            const newFees = [...formData.detailedFeeStructure];
                                                            newFees[index].tuitionFee = parseInt(e.target.value) || 0;
                                                            newFees[index].total = (newFees[index].admissionFee || 0) + (newFees[index].tuitionFee || 0);
                                                            handleChange('detailedFeeStructure', newFees);
                                                        }}
                                                        className="h-8"
                                                    />
                                                </td>
                                                <td className="p-2 font-medium">
                                                    ₹{fee.total?.toLocaleString()}
                                                </td>
                                                <td className="p-2">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            const newFees = formData.detailedFeeStructure.filter((_, i) => i !== index);
                                                            handleChange('detailedFeeStructure', newFees);
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={5} className="p-4 text-center text-muted-foreground">
                                                No fee details added yet. Click "Add Class" to start.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Card>

                {/* Stats */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">Statistics</h2>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                try {
                                    const response = await fetch(`/api/schools/${fullUser.schoolId}/explorer/system-stats`);
                                    if (response.ok) {
                                        const stats = await response.json();
                                        setFormData(prev => ({
                                            ...prev,
                                            totalStudents: stats.totalStudents,
                                            totalTeachers: stats.totalTeachers,
                                            studentTeacherRatio: stats.studentTeacherRatio
                                        }));
                                    }
                                } catch (error) {
                                    console.error('Failed to fetch system stats:', error);
                                }
                            }}
                            className="gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                <path d="M3 3v5h5" />
                                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                                <path d="M16 16h5v5" />
                            </svg>
                            Auto-fill from System
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="establishedYear">Established Year</Label>
                            <Input
                                id="establishedYear"
                                type="number"
                                value={formData.establishedYear || ''}
                                onChange={(e) => handleChange('establishedYear', parseInt(e.target.value))}
                                placeholder="1990"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="totalStudents">Total Students</Label>
                            <Input
                                id="totalStudents"
                                type="number"
                                value={formData.totalStudents || ''}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    handleChange('totalStudents', value);
                                    // Auto-calculate ratio if teachers exist
                                    if (formData.totalTeachers && value) {
                                        handleChange('studentTeacherRatio', Math.round(value / formData.totalTeachers));
                                    }
                                }}
                                placeholder="500"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="totalTeachers">Total Teachers</Label>
                            <Input
                                id="totalTeachers"
                                type="number"
                                value={formData.totalTeachers || ''}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    handleChange('totalTeachers', value);
                                    // Auto-calculate ratio if students exist
                                    if (formData.totalStudents && value) {
                                        handleChange('studentTeacherRatio', Math.round(formData.totalStudents / value));
                                    }
                                }}
                                placeholder="50"
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <Label htmlFor="studentTeacherRatio">Student-Teacher Ratio</Label>
                            <Input
                                id="studentTeacherRatio"
                                type="number"
                                step="0.1"
                                value={formData.studentTeacherRatio || ''}
                                onChange={(e) => handleChange('studentTeacherRatio', parseFloat(e.target.value))}
                                placeholder="15"
                                className="mt-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Auto-calculated when you enter students and teachers
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Submit */}
                <div className="flex gap-3">
                    <Button
                        type="submit"
                        disabled={updateMutation.isPending}
                        className="gap-2"
                    >
                        <Save className="h-4 w-4" />
                        {updateMutation.isPending ? 'Saving...' : 'Save Profile'}
                    </Button>

                    {formData.id && (
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                        >
                            <a href={`http://school.edubreezy.com/explore/schools/${formData.slug || formData.schoolId}`} target="_blank" className="gap-2">
                                {formData.isPubliclyVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                {formData.isPubliclyVisible ? 'View Public Profile' : 'Preview (Hidden)'}
                            </a>
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
