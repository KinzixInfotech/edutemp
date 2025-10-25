'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { Loader2, Save, Eye, Upload, Lock, FileText, Layout } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAuth } from '@/context/AuthContext';

const formSchema = z.object({
    paperSize: z.enum(['A4', 'A5', 'Letter', 'Custom']),
    customWidth: z.number().min(100).max(2000).optional(),
    customHeight: z.number().min(100).max(2000).optional(),
    orientation: z.enum(['portrait', 'landscape']),
    marginTop: z.number().min(0).max(100),
    marginBottom: z.number().min(0).max(100),
    marginLeft: z.number().min(0).max(100),
    marginRight: z.number().min(0).max(100),
    resolution: z.enum(['standard', 'high', 'ultra']),
    compression: z.enum(['low', 'medium', 'high']),
    embedFonts: z.boolean(),
    headerImageUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    footerImageUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    schoolLogoUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    watermarkType: z.enum(['none', 'text', 'image']),
    watermarkText: z.string().optional(),
    watermarkImageUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
    footerText: z.string().optional(),
    pageNumbering: z.boolean(),
    passwordProtect: z.boolean(),
    password: z.string().optional(),
    disablePrint: z.boolean(),
    disableCopy: z.boolean(),
    digitalSignature: z.boolean(),
    fileNameFormat: z.string().min(1),
    autoSaveLocation: z.enum(['cloud', 'local']),
    bulkExportBehavior: z.enum(['combine', 'separate']),
    saveAsDefault: z.boolean(),
}).refine((data) => {
    // Only require password if passwordProtect is true
    if (data.passwordProtect && (!data.password || data.password.length < 6)) {
        return false;
    }
    return true;
}, {
    message: "Password must be at least 6 characters when protection is enabled",
    path: ["password"],
});

export default function PdfExportSettings() {
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();
    const [uploading, setUploading] = useState(false);
    const [previewPdf, setPreviewPdf] = useState('');

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        control,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            paperSize: 'A4',
            orientation: 'portrait',
            marginTop: 20,
            marginBottom: 20,
            marginLeft: 20,
            marginRight: 20,
            resolution: 'standard',
            compression: 'medium',
            embedFonts: true,
            watermarkType: 'none',
            pageNumbering: true,
            passwordProtect: false,
            disablePrint: false,
            disableCopy: false,
            digitalSignature: false,
            fileNameFormat: '{student_name}_{document_type}.pdf',
            autoSaveLocation: 'cloud',
            bulkExportBehavior: 'separate',
            saveAsDefault: true,
        },
    });

    const watched = watch();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['pdf-settings', schoolId],
        queryFn: async () => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/documents/${schoolId}/pdf-settings`);
            if (!res.ok) throw new Error('Failed to fetch');
            return res.json();
        },
        enabled: !!schoolId,
    });

    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (!schoolId) throw new Error('No school ID');
            const res = await fetch(`/api/documents/${schoolId}/pdf-settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error('Failed to save');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pdf-settings', schoolId] });
            toast.success('PDF settings saved');
        },
        onError: (error) => toast.error(error.message || 'Save failed'),
    });

    useEffect(() => {
        if (settings && settings.id) {
            Object.entries(settings).forEach(([key, value]) => {
                if (value !== null && value !== undefined) {
                    setValue(key, value);
                }
            });
        }
    }, [settings, setValue]);

    const handleUpload = async (field, file) => {
        if (!file) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('Upload failed');
            const { url } = await res.json();
            setValue(field, url);
            toast.success('File uploaded');
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const generatePreview = async () => {
        try {
            const format = watched.paperSize === 'Custom'
                ? [watched.customWidth || 210, watched.customHeight || 297]
                : watched.paperSize.toLowerCase();

            const doc = new jsPDF({
                orientation: watched.orientation,
                unit: 'mm',
                format,
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            const margin = {
                top: watched.marginTop,
                bottom: watched.marginBottom,
                left: watched.marginLeft,
                right: watched.marginRight,
            };

            doc.setFontSize(20);
            doc.text('Sample Certificate', margin.left, margin.top + 10);
            doc.setFontSize(14);
            doc.text('Student: John Doe', margin.left, margin.top + 25);
            doc.text('Grade: A+', margin.left, margin.top + 35);

            if (watched.watermarkType === 'text' && watched.watermarkText) {
                doc.setFontSize(50);
                doc.setTextColor(240, 240, 240);
                doc.text(watched.watermarkText, pageWidth / 2, pageHeight / 2, {
                    align: 'center',
                    angle: 45,
                });
            }

            if (watched.footerText) {
                doc.setFontSize(10);
                doc.setTextColor(100, 100, 100);
                doc.text(watched.footerText, pageWidth / 2, pageHeight - margin.bottom / 2, {
                    align: 'center',
                });
            }

            if (watched.pageNumbering) {
                doc.text(`Page 1 of 1`, pageWidth - margin.right - 10, pageHeight - margin.bottom / 2, {
                    align: 'right',
                });
            }

            const pdfBlob = doc.output('blob');
            const url = URL.createObjectURL(pdfBlob);
            setPreviewPdf(url);
            toast.success('Preview generated');

            return () => URL.revokeObjectURL(url);
        } catch (error) {
            console.error('PDF generation failed:', error);
            toast.error('Failed to generate preview');
        }
    };

    useEffect(() => {
        return () => {
            if (previewPdf) URL.revokeObjectURL(previewPdf);
        };
    }, [previewPdf]);

    const onSubmit = (data) => {
        console.log('✅ Form submitted with data:', data);
        if (data.passwordProtect && !data.password) {
            toast.error('Password is required when protection is enabled');
            return;
        }
        saveMutation.mutate(data);
    };

    const onError = (errors) => {
        console.error('❌ Form validation errors:', errors);
        console.error('Error keys:', Object.keys(errors));
        
        // Show each error as a toast
        Object.entries(errors).forEach(([field, error]) => {
            toast.error(`${field}: ${error.message}`);
        });
    };

    const handleSaveClick = async () => {
        console.log('🔵 Save button clicked!');
        console.log('Current form values:', watched);
        console.log('Form state errors:', errors);
        console.log('Error keys:', Object.keys(errors));
        
        // Try to submit
        const result = await handleSubmit(onSubmit, onError)();
        console.log('Submit result:', result);
    };

    if (!schoolId || isLoading) {
        return (
            <div className="p-4 sm:p-6 flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                        <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                        <span className="break-words">PDF Export Settings</span>
                    </h1>
                    <p className="text-sm sm:text-base text-muted-foreground">
                        Configure how all documents are exported to PDF.
                    </p>
                </div>
                <Button
                    onClick={handleSaveClick}
                    disabled={saveMutation.isPending}
                    className="w-full sm:w-auto"
                    type="button"
                >
                    {saveMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Settings
                </Button>
            </div>

            <TooltipProvider>
                <Tabs defaultValue="layout" className="space-y-4 sm:space-y-6">
                    <TabsList className="grid grid-cols-3 sm:grid-cols-6 w-full h-auto gap-1">
                        <TabsTrigger value="layout" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm py-2">
                            <Layout className="w-4 h-4" />
                            <span>Layout</span>
                        </TabsTrigger>
                        <TabsTrigger value="quality" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm py-2">
                            <Eye className="w-4 h-4" />
                            <span>Quality</span>
                        </TabsTrigger>
                        <TabsTrigger value="branding" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm py-2">
                            <Upload className="w-4 h-4" />
                            <span>Brand</span>
                        </TabsTrigger>
                        <TabsTrigger value="security" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm py-2">
                            <Lock className="w-4 h-4" />
                            <span>Security</span>
                        </TabsTrigger>
                        <TabsTrigger value="file" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm py-2">
                            <FileText className="w-4 h-4" />
                            <span>Files</span>
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm py-2">
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                        </TabsTrigger>
                    </TabsList>

                    {/* LAYOUT */}
                    <TabsContent value="layout">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">Page Layout</CardTitle>
                                <CardDescription className="text-sm">
                                    Define paper size, orientation, and margins.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-2.5">
                                        <Label className="text-sm sm:text-base">Paper Size</Label>
                                        <Select value={watched.paperSize} onValueChange={(v) => setValue('paperSize', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                                                <SelectItem value="A5">A5 (148 × 210 mm)</SelectItem>
                                                <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                                                <SelectItem value="Custom">Custom Size</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-col gap-2.5">
                                        <Label className="text-sm sm:text-base">Orientation</Label>
                                        <Select value={watched.orientation} onValueChange={(v) => setValue('orientation', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="portrait">Portrait</SelectItem>
                                                <SelectItem value="landscape">Landscape</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {watched.paperSize === 'Custom' && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-2.5">
                                            <Label className="text-sm sm:text-base">Width (mm)</Label>
                                            <Input type="number" {...register('customWidth', { valueAsNumber: true })} />
                                        </div>
                                        <div className="flex flex-col gap-2.5">
                                            <Label className="text-sm sm:text-base">Height (mm)</Label>
                                            <Input type="number" {...register('customHeight', { valueAsNumber: true })} />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    {['Top', 'Bottom', 'Left', 'Right'].map((side) => (
                                        <div key={side} className="flex flex-col gap-2.5">
                                            <Label className="text-xs sm:text-sm">{side} Margin (mm)</Label>
                                            <Input
                                                type="number"
                                                {...register(`margin${side}`, { valueAsNumber: true })}
                                                className="text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* QUALITY */}
                    <TabsContent value="quality">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">Output Quality</CardTitle>
                                <CardDescription className="text-sm">
                                    Control file size vs print quality.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6">
                                <div className="flex flex-col gap-2.5">
                                    <Label className="text-sm sm:text-base">Resolution</Label>
                                    <Select value={watched.resolution} onValueChange={(v) => setValue('resolution', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="standard">Standard (150 DPI)</SelectItem>
                                            <SelectItem value="high">High (300 DPI)</SelectItem>
                                            <SelectItem value="ultra">Ultra (600 DPI)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <Label className="text-sm sm:text-base">Compression</Label>
                                    <Select value={watched.compression} onValueChange={(v) => setValue('compression', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Low</SelectItem>
                                            <SelectItem value="medium">Medium</SelectItem>
                                            <SelectItem value="high">High</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <Label className="text-sm sm:text-base">Embed Fonts</Label>
                                    <Controller
                                        name="embedFonts"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* BRANDING */}
                    <TabsContent value="branding">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">Branding & Header/Footer</CardTitle>
                                <CardDescription className="text-sm">
                                    Add logos, watermarks, and footer text.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6">
                                {['headerImageUrl', 'footerImageUrl', 'schoolLogoUrl'].map((field) => (
                                    <div key={field} className="flex flex-col gap-2.5">
                                        <Label className="text-sm sm:text-base capitalize">
                                            {field.replace(/([A-Z])/g, ' $1').replace('Url', '')}
                                        </Label>
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            disabled={uploading}
                                            onChange={(e) => handleUpload(field, e.target.files[0])}
                                            className="text-sm"
                                        />
                                        {watched[field] && (
                                            <p className="text-xs text-muted-foreground break-all">
                                                {watched[field]}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* SECURITY */}
                    <TabsContent value="security">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">Security</CardTitle>
                                <CardDescription className="text-sm">
                                    Control PDF restrictions.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6">
                                <div className="flex items-center justify-between py-2">
                                    <Label className="text-sm sm:text-base">Password Protect</Label>
                                    <Controller
                                        name="passwordProtect"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                                {watched.passwordProtect && (
                                    <div className="flex flex-col gap-2.5">
                                        <Label className="text-sm sm:text-base">Password (min 6 characters)</Label>
                                        <Input 
                                            type="password" 
                                            {...register('password')} 
                                            className="text-sm" 
                                        />
                                        {errors.password && (
                                            <p className="text-xs text-red-500 mt-1">
                                                {errors.password.message}
                                            </p>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center justify-between py-2">
                                    <Label className="text-sm sm:text-base">Disable Print</Label>
                                    <Controller
                                        name="disablePrint"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <Label className="text-sm sm:text-base">Disable Copy</Label>
                                    <Controller
                                        name="disableCopy"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <Label className="text-sm sm:text-base">Digital Signature</Label>
                                    <Controller
                                        name="digitalSignature"
                                        control={control}
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FILE */}
                    <TabsContent value="file">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">File Naming & Save Options</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 sm:space-y-6">
                                <div className="flex flex-col gap-2.5">
                                    <Label className="text-sm sm:text-base">File Name Format</Label>
                                    <Input {...register('fileNameFormat')} className="text-sm" />
                                    {errors.fileNameFormat && (
                                        <p className="text-xs text-red-500 mt-1">
                                            {errors.fileNameFormat.message}
                                        </p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <Label className="text-sm sm:text-base">Auto Save Location</Label>
                                    <Select value={watched.autoSaveLocation} onValueChange={(v) => setValue('autoSaveLocation', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="cloud">Cloud</SelectItem>
                                            <SelectItem value="local">Local</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-2.5">
                                    <Label className="text-sm sm:text-base">Bulk Export Behavior</Label>
                                    <Select value={watched.bulkExportBehavior} onValueChange={(v) => setValue('bulkExportBehavior', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="combine">Combine</SelectItem>
                                            <SelectItem value="separate">Separate</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* PREVIEW */}
                    <TabsContent value="preview">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg sm:text-xl">Preview</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Button
                                    onClick={generatePreview}
                                    disabled={uploading}
                                    className="w-full sm:w-auto"
                                    type="button"
                                >
                                    Generate Preview
                                </Button>
                                {previewPdf && (
                                    <iframe
                                        src={previewPdf}
                                        className="w-full h-[400px] sm:h-[500px] lg:h-[600px] border rounded-md"
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </TooltipProvider>
        </div>
    );
}