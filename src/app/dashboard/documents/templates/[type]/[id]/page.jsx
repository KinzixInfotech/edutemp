'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import {
    Save,
    Loader2,
    Award,
    CreditCard,
    FileText,
    ArrowLeft,
    Eye,
    Edit,
    Trash2,
    Download,
    AlertCircle,
    Image as ImageIcon,
    Type,
    Layout
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/AuthContext';
import FileUploadButton from '@/components/fileupload';
import CropImageDialog from '@/app/components/CropImageDialog';
import { uploadFiles } from '@/app/components/utils/uploadThing';

const formSchema = z.object({
    name: z.string().min(3, 'Name must be at least 3 characters'),
    description: z.string().optional(),
    type: z.string(),
    isDefault: z.boolean().default(false),
    backgroundColor: z.string().default('#FFFFFF'),
    primaryColor: z.string().default('#1e40af'),
    secondaryColor: z.string().default('#64748b'),
    borderColor: z.string().default('#000000'),
    borderWidth: z.number().min(0).max(20).default(2),
    fontSize: z.number().min(8).max(72).default(14),
    fontFamily: z.string().default('Arial'),
    textColor: z.string().default('#000000'),
    headerText: z.string().default(''),
    footerText: z.string().default(''),
    logoUrl: z.string().optional(),
    signatureUrl: z.string().optional(),
    stampUrl: z.string().optional(),
    backgroundImage: z.string().optional(),
    includeQRCode: z.boolean().default(false),
    includeBarcode: z.boolean().default(false),
    includePhoto: z.boolean().default(false),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
});

const TEMPLATE_CONFIGS = {
    certificate: {
        title: 'Certificate Template',
        icon: Award,
        apiEndpoint: 'certificate-templates',
        backUrl: '/dashboard/documents/templates/certificate',
        types: [
            { value: 'character', label: 'Character Certificate' },
            { value: 'bonafide', label: 'Bonafide Certificate' },
            { value: 'transfer', label: 'Transfer Certificate' },
            { value: 'completion', label: 'Course Completion' },
            { value: 'participation', label: 'Participation' },
            { value: 'achievement', label: 'Achievement' },
        ],
        defaultType: 'character',
        previewAspect: '1/1.414',
        showSignature: true,
        showStamp: true,
        showQR: false,
        showPhoto: false,
    },
    idcard: {
        title: 'ID Card Template',
        icon: CreditCard,
        apiEndpoint: 'idcard-templates',
        backUrl: '/dashboard/documents/templates/id-card',
        types: [
            { value: 'student', label: 'Student ID' },
            { value: 'teacher', label: 'Teacher ID' },
            { value: 'staff', label: 'Staff ID' },
            { value: 'visitor', label: 'Visitor Pass' },
        ],
        defaultType: 'student',
        previewAspect: '0.63/1',
        showSignature: false,
        showStamp: false,
        showQR: true,
        showPhoto: true,
    },
    admitcard: {
        title: 'Admit Card Template',
        icon: FileText,
        apiEndpoint: 'admitcard-templates',
        backUrl: '/dashboard/documents/templates/admit-cards',
        types: [
            { value: 'midterm', label: 'Mid-term Exam' },
            { value: 'final', label: 'Final Exam' },
            { value: 'quarterly', label: 'Quarterly Exam' },
            { value: 'annual', label: 'Annual Exam' },
            { value: 'entrance', label: 'Entrance Test' },
        ],
        defaultType: 'midterm',
        previewAspect: '1/1.414',
        showSignature: true,
        showStamp: true,
        showQR: true,
        showPhoto: true,
    },
};

export default function TemplateViewEditPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;
    const queryClient = useQueryClient();

    const templateType = params?.type;
    const templateId = params?.id;
    const mode = searchParams.get('mode') || 'preview'; // 'preview' or 'edit'

    const [isEditMode, setIsEditMode] = useState(mode === 'edit');
    const [uploading, setUploading] = useState(false);
    const [rawImage, setRawImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [resetKeys, setResetKeys] = useState({
        logo: 0,
        signature: 0,
        stamp: 0,
        background: 0,
    });

    const config = TEMPLATE_CONFIGS[templateType];
    const Icon = config?.icon;

    // Fetch template data
    const { data: template, isLoading } = useQuery({
        queryKey: ['template', templateType, templateId, schoolId],
        queryFn: async () => {
            if (!schoolId || !templateId || !config) throw new Error('Invalid parameters');
            const res = await fetch(`/api/documents/${schoolId}/${config.apiEndpoint}/${templateId}`);
            if (!res.ok) throw new Error('Failed to fetch template');
            return res.json();
        },
        enabled: !!schoolId && !!templateId && !!config,
    });

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            type: config?.defaultType || '',
            isDefault: false,
            backgroundColor: '#FFFFFF',
            primaryColor: '#1e40af',
            secondaryColor: '#64748b',
            borderColor: '#000000',
            borderWidth: 2,
            fontSize: 14,
            fontFamily: 'Arial',
            textColor: '#000000',
            headerText: '',
            footerText: '',
            includeQRCode: config?.showQR || false,
            includeBarcode: false,
            includePhoto: config?.showPhoto || false,
            orientation: 'portrait',
        },
    });

    const watchedValues = watch();

    // Populate form when template data loads
    useEffect(() => {
        if (template) {
            reset({
                name: template.name,
                description: template.description || '',
                type: template.type || template.cardType || template.subType,
                isDefault: template.isDefault,
                ...template.layoutConfig,
            });
        }
    }, [template, reset]);

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: async (data) => {
            const layoutConfig = {
                backgroundColor: data.backgroundColor,
                primaryColor: data.primaryColor,
                secondaryColor: data.secondaryColor,
                borderColor: data.borderColor,
                borderWidth: data.borderWidth,
                fontSize: data.fontSize,
                fontFamily: data.fontFamily,
                textColor: data.textColor,
                headerText: data.headerText,
                footerText: data.footerText,
                logoUrl: data.logoUrl,
                signatureUrl: data.signatureUrl,
                stampUrl: data.stampUrl,
                backgroundImage: data.backgroundImage,
                includeQRCode: data.includeQRCode,
                includeBarcode: data.includeBarcode,
                includePhoto: data.includePhoto,
                orientation: data.orientation,
            };

            const res = await fetch(`/api/documents/${schoolId}/${config.apiEndpoint}/${templateId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    isDefault: data.isDefault,
                    layoutConfig,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update template');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Template updated successfully');
            queryClient.invalidateQueries({ queryKey: ['template', templateType, templateId, schoolId] });
            queryClient.invalidateQueries({ queryKey: [`${templateType}-templates`, schoolId] });
            setIsEditMode(false);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update template');
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/documents/${schoolId}/${config.apiEndpoint}/${templateId}`, {
                method: 'DELETE',
            });
            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to delete');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Template deleted successfully');
            queryClient.invalidateQueries({ queryKey: [`${templateType}-templates`, schoolId] });
            router.push(config.backUrl);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to delete template');
        },
    });

    const handleImageUpload = (field, previewUrl) => {
        if (!previewUrl || previewUrl === rawImage) return;
        setCurrentField(field);
        setRawImage(previewUrl);
        setCropDialogOpen(true);
    };

    const onSubmit = (data) => {
        updateMutation.mutate(data);
    };

    // Error page for invalid template type
    if (!templateType || !config) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                            <CardTitle className="text-xl">Invalid Template Type</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>
                                The template type "<strong>{params?.type || 'unknown'}</strong>" is not recognized.
                            </AlertDescription>
                        </Alert>
                        <Button onClick={() => router.push('/dashboard')} className="w-full">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!schoolId || !templateId || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <Card className="max-w-md w-full">
                    <CardHeader>
                        <div className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-6 w-6" />
                            <CardTitle className="text-xl">Template Not Found</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            The template you're looking for doesn't exist or has been deleted.
                        </p>
                        <Button onClick={() => router.push(config.backUrl)} className="w-full">
                            Back to Templates
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Crop Dialog */}
            {cropDialogOpen && rawImage && currentField && (
                <CropImageDialog
                    image={rawImage}
                    onClose={() => { if (!uploading) setCropDialogOpen(false); }}
                    uploading={uploading}
                    open={cropDialogOpen}
                    onCropComplete={async (croppedBlob) => {
                        const now = new Date();
                        const iso = now.toISOString().replace(/[:.]/g, "-");
                        const perf = Math.floor(performance.now() * 1000);
                        const timestamp = `${iso}-${perf}`;
                        const filename = `${timestamp}.jpg`;
                        const file = new File([croppedBlob], filename, { type: "image/jpeg" });
                        try {
                            setUploading(true);
                            const res = await uploadFiles("logoupload", { files: [file] });
                            if (res && res[0]?.url) {
                                setValue(currentField, res[0].url);
                                toast.success("Image uploaded successfully!");
                            } else {
                                toast.error("Upload failed");
                            }
                        } catch (err) {
                            toast.error("Something went wrong during upload");
                            console.error(err);
                        } finally {
                            setUploading(false);
                            setCropDialogOpen(false);
                            setCurrentField(null);
                            setRawImage(null);
                        }
                    }}
                />
            )}

            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(config.backUrl)}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                            <span>{isEditMode ? 'Edit' : 'Preview'} {config.title}</span>
                        </h1>
                        {template.isDefault && (
                            <Badge variant="secondary">Default</Badge>
                        )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        {template.name}
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {!isEditMode ? (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditMode(true)}
                            >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {/* Download logic */ }}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setShowDeleteDialog(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setIsEditMode(false);
                                    reset();
                                }}
                                disabled={updateMutation.isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSubmit(onSubmit)}
                                disabled={updateMutation.isPending || uploading}
                            >
                                {updateMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                Save Changes
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Form/Details Section */}
                <div className="space-y-4">
                    {isEditMode ? (
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic" className="text-xs sm:text-sm">
                                    <Type className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Basic
                                </TabsTrigger>
                                <TabsTrigger value="design" className="text-xs sm:text-sm">
                                    <Layout className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Design
                                </TabsTrigger>
                                <TabsTrigger value="assets" className="text-xs sm:text-sm">
                                    <ImageIcon className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                    Assets
                                </TabsTrigger>
                            </TabsList>

                            {/* Basic Tab */}
                            <TabsContent value="basic" className="space-y-4 mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-sm">Template Name *</Label>
                                            <Input
                                                id="name"
                                                {...register('name')}
                                                className="text-sm"
                                            />
                                            {errors.name && (
                                                <p className="text-xs text-red-500">{errors.name.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="description" className="text-sm">Description</Label>
                                            <Textarea
                                                id="description"
                                                {...register('description')}
                                                rows={3}
                                                className="text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="type" className="text-sm">Type *</Label>
                                            <Select
                                                value={watchedValues.type}
                                                onValueChange={(value) => setValue('type', value)}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {config.types.map((type) => (
                                                        <SelectItem key={type.value} value={type.value}>
                                                            {type.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {templateType !== 'certificate' && (
                                            <div className="space-y-2">
                                                <Label htmlFor="orientation" className="text-sm">Orientation</Label>
                                                <Select
                                                    value={watchedValues.orientation}
                                                    onValueChange={(value) => setValue('orientation', value)}
                                                >
                                                    <SelectTrigger className="text-sm">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="portrait">Portrait</SelectItem>
                                                        <SelectItem value="landscape">Landscape</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between py-2">
                                            <Label htmlFor="isDefault" className="text-sm">Set as Default</Label>
                                            <Switch
                                                id="isDefault"
                                                checked={watchedValues.isDefault}
                                                onCheckedChange={(checked) => setValue('isDefault', checked)}
                                            />
                                        </div>

                                        {config.showQR && (
                                            <div className="flex items-center justify-between py-2">
                                                <Label htmlFor="includeQRCode" className="text-sm">Include QR Code</Label>
                                                <Switch
                                                    id="includeQRCode"
                                                    checked={watchedValues.includeQRCode}
                                                    onCheckedChange={(checked) => setValue('includeQRCode', checked)}
                                                />
                                            </div>
                                        )}

                                        {config.showPhoto && (
                                            <div className="flex items-center justify-between py-2">
                                                <Label htmlFor="includePhoto" className="text-sm">Include Photo</Label>
                                                <Switch
                                                    id="includePhoto"
                                                    checked={watchedValues.includePhoto}
                                                    onCheckedChange={(checked) => setValue('includePhoto', checked)}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Design Tab */}
                            <TabsContent value="design" className="space-y-4 mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base sm:text-lg">Design Settings</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="backgroundColor" className="text-sm">Background</Label>
                                                <Input
                                                    id="backgroundColor"
                                                    type="color"
                                                    {...register('backgroundColor')}
                                                    className="h-10"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="primaryColor" className="text-sm">Primary Color</Label>
                                                <Input
                                                    id="primaryColor"
                                                    type="color"
                                                    {...register('primaryColor')}
                                                    className="h-10"
                                                />
                                            </div>
                                        </div>

                                        {templateType === 'certificate' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="borderColor" className="text-sm">Border Color</Label>
                                                    <Input
                                                        id="borderColor"
                                                        type="color"
                                                        {...register('borderColor')}
                                                        className="h-10"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="borderWidth" className="text-sm">Border Width</Label>
                                                    <Input
                                                        id="borderWidth"
                                                        type="number"
                                                        {...register('borderWidth', { valueAsNumber: true })}
                                                        min="0"
                                                        max="20"
                                                        className="text-sm"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label htmlFor="fontFamily" className="text-sm">Font Family</Label>
                                            <Select
                                                value={watchedValues.fontFamily}
                                                onValueChange={(value) => setValue('fontFamily', value)}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Arial">Arial</SelectItem>
                                                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                                    <SelectItem value="Georgia">Georgia</SelectItem>
                                                    <SelectItem value="Courier New">Courier New</SelectItem>
                                                    <SelectItem value="Verdana">Verdana</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="fontSize" className="text-sm">Font Size</Label>
                                                <Input
                                                    id="fontSize"
                                                    type="number"
                                                    {...register('fontSize', { valueAsNumber: true })}
                                                    min="8"
                                                    max="72"
                                                    className="text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="textColor" className="text-sm">Text Color</Label>
                                                <Input
                                                    id="textColor"
                                                    type="color"
                                                    {...register('textColor')}
                                                    className="h-10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="headerText" className="text-sm">Header Text</Label>
                                            <Input
                                                id="headerText"
                                                {...register('headerText')}
                                                className="text-sm"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="footerText" className="text-sm">Footer Text</Label>
                                            <Input
                                                id="footerText"
                                                {...register('footerText')}
                                                className="text-sm"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Assets Tab */}
                            <TabsContent value="assets" className="space-y-4 mt-4">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base sm:text-lg">Assets & Images</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm">School Logo</Label>
                                            <FileUploadButton
                                                onChange={(previewUrl) => handleImageUpload('logoUrl', previewUrl)}
                                                resetKey={resetKeys.logo}
                                                disabled={uploading}
                                            />
                                            {watchedValues.logoUrl && (
                                                <img
                                                    src={watchedValues.logoUrl}
                                                    alt="Logo"
                                                    className="h-20 w-auto border rounded mt-2"
                                                />
                                            )}
                                        </div>

                                        {config.showSignature && (
                                            <div className="space-y-2">
                                                <Label className="text-sm">Signature</Label>
                                                <FileUploadButton
                                                    onChange={(previewUrl) => handleImageUpload('signatureUrl', previewUrl)}
                                                    resetKey={resetKeys.signature}
                                                    disabled={uploading}
                                                />
                                                {watchedValues.signatureUrl && (
                                                    <img
                                                        src={watchedValues.signatureUrl}
                                                        alt="Signature"
                                                        className="h-20 w-auto border rounded mt-2"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        {config.showStamp && (
                                            <div className="space-y-2">
                                                <Label className="text-sm">Stamp/Seal</Label>
                                                <FileUploadButton
                                                    onChange={(previewUrl) => handleImageUpload('stampUrl', previewUrl)}
                                                    resetKey={resetKeys.stamp}
                                                    disabled={uploading}
                                                />
                                                {watchedValues.stampUrl && (
                                                    <img
                                                        src={watchedValues.stampUrl}
                                                        alt="Stamp"
                                                        className="h-20 w-auto border rounded mt-2"
                                                    />
                                                )}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label className="text-sm">Background Image (Optional)</Label>
                                            <FileUploadButton
                                                onChange={(previewUrl) => handleImageUpload('backgroundImage', previewUrl)}
                                                resetKey={resetKeys.background}
                                                disabled={uploading}
                                            />
                                            {watchedValues.backgroundImage && (
                                                <img
                                                    src={watchedValues.backgroundImage}
                                                    alt="Background"
                                                    className="h-20 w-auto border rounded mt-2"
                                                />
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        /* Preview Mode - Template Details */
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base sm:text-lg">Template Details</CardTitle>
                                <CardDescription className="text-xs sm:text-sm">
                                    Information about this template
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between pb-2 border-b">
                                        <span className="text-sm text-muted-foreground">Name</span>
                                        <span className="text-sm font-medium">{template.name}</span>
                                    </div>

                                    {template.description && (
                                        <div className="flex flex-col gap-1 pb-2 border-b">
                                            <span className="text-sm text-muted-foreground">Description</span>
                                            <span className="text-sm">{template.description}</span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pb-2 border-b">
                                        <span className="text-sm text-muted-foreground">Type</span>
                                        <Badge variant="outline" className="capitalize">
                                            {config.types.find(t => t.value === (template.type || template.cardType || template.subType))?.label}
                                        </Badge>
                                    </div>

                                    {(template.orientation || template.layoutConfig?.orientation) && (
                                        <div className="flex items-center justify-between pb-2 border-b">
                                            <span className="text-sm text-muted-foreground">Orientation</span>
                                            <span className="text-sm capitalize">
                                                {template.orientation || template.layoutConfig?.orientation}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pb-2 border-b">
                                        <span className="text-sm text-muted-foreground">Status</span>
                                        <Badge variant={template.isDefault ? 'default' : 'secondary'}>
                                            {template.isDefault ? 'Default' : 'Active'}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center justify-between pb-2 border-b">
                                        <span className="text-sm text-muted-foreground">Created</span>
                                        <span className="text-sm">
                                            {new Date(template.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </span>
                                    </div>

                                    {template.createdBy && (
                                        <div className="flex items-center justify-between pb-2 border-b">
                                            <span className="text-sm text-muted-foreground">Created By</span>
                                            <span className="text-sm">{template.createdBy.name}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Design Settings Preview */}
                                <div className="pt-4 space-y-3">
                                    <h4 className="text-sm font-semibold">Design Settings</h4>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">Background</span>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded border"
                                                    style={{ backgroundColor: template.layoutConfig?.backgroundColor || '#FFFFFF' }}
                                                />
                                                <span className="text-xs font-mono">
                                                    {template.layoutConfig?.backgroundColor || '#FFFFFF'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">Primary Color</span>
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded border"
                                                    style={{ backgroundColor: template.layoutConfig?.primaryColor || '#1e40af' }}
                                                />
                                                <span className="text-xs font-mono">
                                                    {template.layoutConfig?.primaryColor || '#1e40af'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">Font Family</span>
                                            <span className="text-xs">{template.layoutConfig?.fontFamily || 'Arial'}</span>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-xs text-muted-foreground">Font Size</span>
                                            <span className="text-xs">{template.layoutConfig?.fontSize || 14}px</span>
                                        </div>
                                    </div>

                                    {/* Features */}
                                    <div className="flex flex-col gap-1 pt-2">
                                        <span className="text-xs text-muted-foreground">Features</span>
                                        <div className="flex flex-wrap gap-2">
                                            {template.layoutConfig?.includeQRCode && (
                                                <Badge variant="outline" className="text-xs">QR Code</Badge>
                                            )}
                                            {template.layoutConfig?.includePhoto && (
                                                <Badge variant="outline" className="text-xs">Photo</Badge>
                                            )}
                                            {template.layoutConfig?.includeBarcode && (
                                                <Badge variant="outline" className="text-xs">Barcode</Badge>
                                            )}
                                            {template.layoutConfig?.logoUrl && (
                                                <Badge variant="outline" className="text-xs">Logo</Badge>
                                            )}
                                            {template.layoutConfig?.signatureUrl && (
                                                <Badge variant="outline" className="text-xs">Signature</Badge>
                                            )}
                                            {template.layoutConfig?.stampUrl && (
                                                <Badge variant="outline" className="text-xs">Stamp</Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Preview Section */}
                <div className="lg:sticky lg:top-4 lg:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                {isEditMode ? 'Live Preview' : 'Template Preview'}
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                {isEditMode ? 'Changes will be reflected here' : 'How your template looks'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="border-2 rounded-lg p-4 sm:p-6 flex flex-col justify-between"
                                style={{
                                    aspectRatio: config.previewAspect,
                                    backgroundColor: watchedValues.backgroundColor || template.layoutConfig?.backgroundColor,
                                    borderColor: templateType === 'certificate'
                                        ? (watchedValues.borderColor || template.layoutConfig?.borderColor)
                                        : (watchedValues.primaryColor || template.layoutConfig?.primaryColor),
                                    borderWidth: `${watchedValues.borderWidth || template.layoutConfig?.borderWidth || 2}px`,
                                    color: watchedValues.textColor || template.layoutConfig?.textColor,
                                    fontFamily: watchedValues.fontFamily || template.layoutConfig?.fontFamily,
                                    backgroundImage: (watchedValues.backgroundImage || template.layoutConfig?.backgroundImage)
                                        ? `url(${watchedValues.backgroundImage || template.layoutConfig?.backgroundImage})`
                                        : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            >
                                {/* Header */}
                                <div className="text-center space-y-2">
                                    {(watchedValues.logoUrl || template.layoutConfig?.logoUrl) && (
                                        <img
                                            src={watchedValues.logoUrl || template.layoutConfig?.logoUrl}
                                            alt="Logo"
                                            className="h-8 sm:h-12 w-auto mx-auto"
                                        />
                                    )}
                                    {(watchedValues.headerText || template.layoutConfig?.headerText) && (
                                        <h2
                                            className="text-sm sm:text-base font-bold"
                                            style={{ color: watchedValues.primaryColor || template.layoutConfig?.primaryColor }}
                                        >
                                            {watchedValues.headerText || template.layoutConfig?.headerText}
                                        </h2>
                                    )}
                                    <h3 className="text-xs sm:text-sm font-semibold uppercase">
                                        {config.types.find(t => t.value === (watchedValues.type || template.type || template.cardType || template.subType))?.label}
                                    </h3>
                                </div>

                                {/* Content */}
                                <div className="text-center space-y-2 flex-1 flex flex-col justify-center">
                                    {(watchedValues.includePhoto || template.layoutConfig?.includePhoto) && (
                                        <div
                                            className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full mx-auto border-2"
                                            style={{ borderColor: watchedValues.primaryColor || template.layoutConfig?.primaryColor }}
                                        />
                                    )}
                                    <p
                                        className="text-xs"
                                        style={{ fontSize: `${watchedValues.fontSize || template.layoutConfig?.fontSize || 14}px` }}
                                    >
                                        {templateType === 'certificate' ? 'This is to certify that' : 'Name: [Student Name]'}
                                    </p>
                                    <p className="text-sm font-bold">
                                        {templateType === 'certificate' ? '[Student Name]' : 'ID: [Student ID]'}
                                    </p>
                                    {templateType === 'idcard' && (
                                        <>
                                            <p className="text-xs">Class: [Class Name]</p>
                                            <p className="text-xs">Valid Until: [Date]</p>
                                        </>
                                    )}
                                    {templateType === 'admitcard' && (
                                        <>
                                            <p className="text-xs">Seat No: [Seat Number]</p>
                                            <p className="text-xs">Exam: [Exam Name]</p>
                                            <p className="text-xs">Date: [Exam Date]</p>
                                        </>
                                    )}
                                    {(watchedValues.includeQRCode || template.layoutConfig?.includeQRCode) && (
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black mx-auto mt-2" />
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-between items-end text-xs">
                                    {config.showSignature && (watchedValues.signatureUrl || template.layoutConfig?.signatureUrl) && (
                                        <div className="text-center">
                                            <img
                                                src={watchedValues.signatureUrl || template.layoutConfig?.signatureUrl}
                                                alt="Signature"
                                                className="h-6 sm:h-8 w-auto mb-1"
                                            />
                                            <div className="border-t pt-1">
                                                <p>Authorized Signature</p>
                                            </div>
                                        </div>
                                    )}
                                    {config.showStamp && (watchedValues.stampUrl || template.layoutConfig?.stampUrl) && (
                                        <img
                                            src={watchedValues.stampUrl || template.layoutConfig?.stampUrl}
                                            alt="Stamp"
                                            className="h-8 sm:h-12 w-auto"
                                        />
                                    )}
                                </div>

                                {(watchedValues.footerText || template.layoutConfig?.footerText) && (
                                    <p className="text-center text-xs mt-2">
                                        {watchedValues.footerText || template.layoutConfig?.footerText}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent className="max-w-[90vw] sm:max-w-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base sm:text-lg">
                            Delete Template?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs sm:text-sm">
                            This action cannot be undone. This will permanently delete the template
                            <strong> "{template.name}"</strong> and it cannot be recovered.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                        <AlertDialogCancel className="m-0 w-full sm:w-auto">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteMutation.mutate()}
                            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Delete'
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
// ```

// ---

// ## 📁 **URL Structure**

// This single page handles all routes:
// ```
// ✅ /dashboard/documents/templates/certificate/[id]?mode=preview
// ✅ /dashboard/documents/templates/certificate/[id]?mode=edit
// ✅ /dashboard/documents/templates/idcard/[id]?mode=preview
// ✅ /dashboard/documents/templates/idcard/[id]?mode=edit
// ✅ /dashboard/documents/templates/admitcard/[id]?mode=preview
// ✅ /dashboard/documents/templates/admitcard/[id]?mode=edit