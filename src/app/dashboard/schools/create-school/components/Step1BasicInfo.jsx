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
import { uploadFiles } from '@/app/components/utils/uploadThing';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

const step1Schema = z.object({
    name: z.string().min(1, 'School name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().min(1, 'Phone number is required'),
    location: z.string().min(1, 'Location is required'),
    subscriptionType: z.enum(['A', 'B', 'C']),
    language: z.string().min(1),
});

export default function Step1BasicInfo({ data, updateFormData, nextStep }) {
    const [uploading, setUploading] = useState(false);
    const [rawImage, setRawImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);

    const form = useForm({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            location: data.location || '',
            subscriptionType: data.subscriptionType || 'A',
            language: data.language || 'en',
        },
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

    return (
        <>
            {cropDialogOpen && rawImage && (
                <CropImageDialog
                    image={rawImage}
                    open={cropDialogOpen}
                    uploading={uploading}
                    onClose={() => {
                        if (!uploading) setCropDialogOpen(false);
                    }}
                    onCropComplete={async (croppedBlob) => {
                        const now = new Date();
                        const iso = now.toISOString().replace(/[:.]/g, '-');
                        const perf = Math.floor(performance.now() * 1000);
                        const timestamp = `${iso}-${perf}`;
                        const filename = `${timestamp}.jpg`;
                        const file = new File([croppedBlob], filename, { type: 'image/jpeg' });

                        try {
                            setUploading(true);
                            const res = await uploadFiles('profilePictureUploader', {
                                files: [file],
                                input: {
                                    profileId: crypto.randomUUID(),
                                    username: form.getValues('name') || 'School',
                                },
                            });

                            if (res && res[0]?.url) {
                                updateFormData({ profilePicture: res[0].url });
                                toast.success('Image uploaded!');
                            } else {
                                toast.error('Upload failed');
                            }
                        } catch (err) {
                            toast.error('Something went wrong during upload');
                            console.error(err);
                        } finally {
                            setUploading(false);
                            setCropDialogOpen(false);
                        }
                    }}
                />
            )}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* School Name */}
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>School Name *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Sunshine Public School" {...field} />
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

                    {/* Location */}
                    <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Address *</FormLabel>
                                <FormControl>
                                    <Input placeholder="Delhi, India" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Logo Upload */}
                    <div className="space-y-2">
                        <Label>School Logo</Label>
                        <FileUploadButton
                            field="School"
                            onChange={(previewUrl) => handleImageUpload(previewUrl)}
                        />
                    </div>

                    {/* Subscription Type & Language */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="subscriptionType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subscription Type *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="A">Per Student</SelectItem>
                                            <SelectItem value="B">Up to 500 Students</SelectItem>
                                            <SelectItem value="C">501 to 1000 Students</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="language"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Language *</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="en">English</SelectItem>
                                            <SelectItem value="hi">Hindi</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button type="submit" className="w-full">
                        Next
                    </Button>
                </form>
            </Form>
        </>
    );
}
