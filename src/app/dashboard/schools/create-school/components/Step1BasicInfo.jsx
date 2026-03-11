'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import FileUploadButton from '@/components/fileupload';
import CropImageDialog from '@/app/components/CropImageDialog';
import { uploadFilesToR2 } from '@/hooks/useR2Upload';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const step1Schema = z.object({
    name: z.string()
        .min(3, 'School name must be at least 3 characters')
        .max(100, 'School name cannot exceed 100 characters'),
    email: z.string()
        .email('Please enter a valid email address')
        .min(1, 'Email is required'),
    phone: z.string()
        .min(10, 'Phone number must be at least 10 digits')
        .regex(/^[+]?[\d\s()-]{10,}$/, 'Please enter a valid phone number'),
    location: z.string()
        .min(5, 'Please enter a complete address')
        .max(200, 'Address cannot exceed 200 characters'),
    city: z.string()
        .min(2, 'City name must be at least 2 characters')
        .max(100, 'City name cannot exceed 100 characters'),
    state: z.string()
        .min(2, 'State name must be at least 2 characters')
        .max(100, 'State name cannot exceed 100 characters'),
    country: z.string()
        .min(2, 'Country name must be at least 2 characters')
        .max(100, 'Country name cannot exceed 100 characters'),
    subscriptionType: z.enum(['A', 'B', 'C'], {
        required_error: 'Please select a subscription type',
    }),
    language: z.enum(['en', 'hi'], {
        required_error: 'Please select a language',
    }),
});

export default function Step1BasicInfo({ data, updateFormData, nextStep }) {
    const [uploading, setUploading] = useState(false);
    const [rawImage, setRawImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [resetKey, setResetKey] = useState(0);
    const [localPreview, setLocalPreview] = useState(data.profilePicture || null);

    const form = useForm({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            city: data.city || '',
            state: data.state || '',
            country: data.country || 'India',
            subscriptionType: data.subscriptionType || 'A',
            language: data.language || 'en',
        },
        mode: 'onChange',
    });

    const handleImageUpload = (previewUrl) => {
        if (!previewUrl || previewUrl === rawImage) return;
        setRawImage(previewUrl);
        setCropDialogOpen(true);
    };

    const onSubmit = (formValues) => {
        updateFormData(formValues);
        nextStep();
    };

    // Determine what preview to show
    const displayPreview = data.profilePicture || localPreview;

    return (
        <>
            {cropDialogOpen && rawImage && (
                <CropImageDialog
                    image={rawImage}
                    open={cropDialogOpen}
                    title="Crop School Logo"
                    defaultAspect={1}
                    onClose={() => {
                        setCropDialogOpen(false);
                        setRawImage(null);
                    }}
                    onCancel={() => {
                        setRawImage(null);
                        setResetKey(prev => prev + 1);
                    }}
                    onCropComplete={async (croppedBlob) => {
                        try {
                            const now = new Date();
                            const iso = now.toISOString().replace(/[:.]/g, '-');
                            const perf = Math.floor(performance.now() * 1000);
                            const timestamp = `${iso}-${perf}`;
                            const filename = `${timestamp}.jpg`;
                            const file = new File([croppedBlob], filename, { type: 'image/jpeg' });

                            // Show local preview immediately from blob
                            const blobUrl = URL.createObjectURL(croppedBlob);
                            setLocalPreview(blobUrl);

                            const res = await uploadFilesToR2('profiles', {
                                files: [file],
                                input: {
                                    profileId: crypto.randomUUID(),
                                    username: form.getValues('name') || 'School',
                                },
                            });

                            if (res && res[0]?.url) {
                                updateFormData({ profilePicture: res[0].url });
                                setLocalPreview(res[0].url);
                            } else {
                                // Keep blob preview even if upload fails
                                toast.error('Upload failed - please try again');
                                setLocalPreview(null);
                            }
                        } catch (err) {
                            console.error('Upload error:', err);
                            toast.error('Upload failed - please try again');
                            setLocalPreview(null);
                        }
                    }}
                />
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Info Banner */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <p className="text-sm text-blue-900 dark:text-blue-300">
                            Enter the basic information about your school. All fields marked with * are required.
                        </p>
                    </div>

                    {/* School Name */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>School Name *</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="e.g., Sunrise Public School"
                                        {...field}
                                        className={form.formState.errors.name ? 'border-red-500 focus:ring-red-500' : ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* School Email & Phone */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>School Email *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="mail@example.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+91 1234567890" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Address */}
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Address *</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g., 123, Main Street, Near Park" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* City, State, Country */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="city"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>City *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Delhi" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="state"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>State *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Delhi" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="country"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Country *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., India" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label>School Logo</Label>
                        {displayPreview ? (
                            <div className="relative border border-dashed rounded-xl p-4 min-h-52 flex flex-col items-center justify-center">
                                <img
                                    src={displayPreview}
                                    alt="School Logo"
                                    className="max-h-40 rounded object-contain"
                                />
                                <p className="text-sm text-green-600 mt-2">✓ Logo uploaded</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => {
                                        updateFormData({ profilePicture: '' });
                                        setLocalPreview(null);
                                    }}
                                >
                                    Change Logo
                                </Button>
                            </div>
                        ) : (
                            <FileUploadButton
                                field="School"
                                onChange={(previewUrl) => handleImageUpload(previewUrl)}
                                resetKey={resetKey}
                            />
                        )}
                    </div>

                    {/* Language is defaulted to English - not shown to user */}

                    <Button type="submit" className="w-full">
                        Next
                    </Button>
                </form>
            </Form>
        </>
    );
}
