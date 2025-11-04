'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
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
    Image as ImageIcon,
    Type,
    Layout,
    AlertCircle
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
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

export default function CreateTemplatePage() {
    const router = useRouter();
    const params = useParams();
    const [resetKeys, setResetKeys] = useState({
        logo: 0,
        signature: 0,
        stamp: 0,
        background: 0,
    });
    const [uploading, setUploading] = useState(false);
    const [rawImage, setRawImage] = useState(null);
    const [cropDialogOpen, setCropDialogOpen] = useState(false);
    const [currentField, setCurrentField] = useState(null);
    const { fullUser } = useAuth();
    const schoolId = fullUser?.schoolId;

    // Get template type from URL param
    const templateType = params?.type;
    const config = TEMPLATE_CONFIGS[templateType];

    // If invalid type, show error
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

                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">Valid template types:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li><code className="bg-muted px-2 py-0.5 rounded">certificate</code> - Certificate Templates</li>
                                <li><code className="bg-muted px-2 py-0.5 rounded">idcard</code> - ID Card Templates</li>
                                <li><code className="bg-muted px-2 py-0.5 rounded">admitcard</code> - Admit Card Templates</li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row">
                            <Button
                                onClick={() => router.push('/dashboard/documents/templates/certificate')}
                                variant="outline"
                                className="flex-1"
                            >
                                <Award className="mr-2 h-4 w-4" />
                                Certificates
                            </Button>
                            <Button
                                onClick={() => router.push('/dashboard/documents/templates/id-card')}
                                variant="outline"
                                className="flex-1"
                            >
                                <CreditCard className="mr-2 h-4 w-4" />
                                ID Cards
                            </Button>
                            <Button
                                onClick={() => router.push('/dashboard/documents/templates/admit-cards')}
                                variant="outline"
                                className="flex-1"
                            >
                                <FileText className="mr-2 h-4 w-4" />
                                Admit Cards
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const Icon = config.icon;

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            type: config.defaultType,
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
            includeQRCode: config.showQR,
            includeBarcode: false,
            includePhoto: config.showPhoto,
            orientation: 'portrait',
        },
    });

    const watchedValues = watch();

    const createMutation = useMutation({
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

            const res = await fetch(`/api/documents/${schoolId}/${config.apiEndpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: data.name,
                    description: data.description,
                    type: data.type,
                    isDefault: data.isDefault,
                    layoutConfig,
                    createdById: fullUser?.id,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create template');
            }
            return res.json();
        },
        onSuccess: () => {
            toast.success('Template created successfully');
            router.push(config.backUrl);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to create template');
        },
    });

    const handleImageUpload = (field, previewUrl) => {
        if (!previewUrl || previewUrl === rawImage) return;
        setCurrentField(field);
        setRawImage(previewUrl);
        setCropDialogOpen(true);
    };

    const onSubmit = (data) => {
        createMutation.mutate(data);
    };

    if (!schoolId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
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
                                setValue(currentField, res[0].ufsUrl);
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
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
                            <Icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 flex-shrink-0" />
                            <span>Create {config.title}</span>
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground ml-10 sm:ml-12">
                        Design a new {config.title.toLowerCase()} for your school
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={handleSubmit(onSubmit)}
                        disabled={createMutation.isPending || uploading}
                        size="sm"
                    >
                        {createMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Template
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Form Section */}
                <div className="space-y-4">
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

                        {/* Basic Info Tab */}
                        <TabsContent value="basic" className="space-y-4 mt-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base sm:text-lg">Basic Information</CardTitle>
                                    <CardDescription className="text-xs sm:text-sm">
                                        Enter the template details
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-sm">Template Name *</Label>
                                        <Input
                                            id="name"
                                            {...register('name')}
                                            placeholder={`e.g., ${config.title} 2024`}
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
                                            placeholder="Brief description of this template"
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
                                        <div className="space-y-0.5">
                                            <Label htmlFor="isDefault" className="text-sm">Set as Default</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Use this template by default for this type
                                            </p>
                                        </div>
                                        <Switch
                                            id="isDefault"
                                            checked={watchedValues.isDefault}
                                            onCheckedChange={(checked) => setValue('isDefault', checked)}
                                        />
                                    </div>

                                    {/* Conditional Features */}
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
                                    <CardDescription className="text-xs sm:text-sm">
                                        Customize the appearance
                                    </CardDescription>
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
                                                <Label htmlFor="borderWidth" className="text-sm">Border Width (px)</Label>
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
                                            <Label htmlFor="fontSize" className="text-sm">Font Size (px)</Label>
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
                                            placeholder="e.g., School Name"
                                            className="text-sm"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="footerText" className="text-sm">Footer Text</Label>
                                        <Input
                                            id="footerText"
                                            {...register('footerText')}
                                            placeholder="e.g., Authorized Signature"
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
                                    <CardDescription className="text-xs sm:text-sm">
                                        Upload logos, signatures, and stamps
                                    </CardDescription>
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
                                            <div className="mt-2">
                                                <img
                                                    src={watchedValues.logoUrl}
                                                    alt="Logo"
                                                    className="h-20 w-auto border rounded"
                                                />
                                            </div>
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
                                                <div className="mt-2">
                                                    <img
                                                        src={watchedValues.signatureUrl}
                                                        alt="Signature"
                                                        className="h-20 w-auto border rounded"
                                                    />
                                                </div>
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
                                                <div className="mt-2">
                                                    <img
                                                        src={watchedValues.stampUrl}
                                                        alt="Stamp"
                                                        className="h-20 w-auto border rounded"
                                                    />
                                                </div>
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
                                            <div className="mt-2">
                                                <img
                                                    src={watchedValues.backgroundImage}
                                                    alt="Background"
                                                    className="h-20 w-auto border rounded"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Preview Section */}
                <div className="lg:sticky lg:top-4 lg:self-start">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                                <Eye className="h-4 w-4" />
                                Live Preview
                            </CardTitle>
                            <CardDescription className="text-xs sm:text-sm">
                                Preview how your {templateType} will look
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div
                                className="border-2 rounded-lg p-4 sm:p-6 flex flex-col justify-between"
                                style={{
                                    aspectRatio: config.previewAspect,
                                    backgroundColor: watchedValues.backgroundColor,
                                    borderColor: templateType === 'certificate' ? watchedValues.borderColor : watchedValues.primaryColor,
                                    borderWidth: `${watchedValues.borderWidth || 2}px`,
                                    color: watchedValues.textColor,
                                    fontFamily: watchedValues.fontFamily,
                                    backgroundImage: watchedValues.backgroundImage ? `url(${watchedValues.backgroundImage})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                }}
                            >
                                {/* Header */}
                                <div className="text-center space-y-2">
                                    {watchedValues.logoUrl && (
                                        <img
                                            src={watchedValues.logoUrl}
                                            alt="Logo"
                                            className="h-8 sm:h-12 w-auto mx-auto"
                                        />
                                    )}
                                    {watchedValues.headerText && (
                                        <h2
                                            className="text-sm sm:text-base font-bold"
                                            style={{ color: watchedValues.primaryColor }}
                                        >
                                            {watchedValues.headerText}
                                        </h2>
                                    )}
                                    <h3 className="text-xs sm:text-sm font-semibold uppercase">
                                        {config.types.find(t => t.value === watchedValues.type)?.label}
                                    </h3>
                                </div>

                                {/* Content */}
                                <div className="text-center space-y-2 flex-1 flex flex-col justify-center">
                                    {watchedValues.includePhoto && (
                                        <div
                                            className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-full mx-auto border-2"
                                            style={{ borderColor: watchedValues.primaryColor }}
                                        />
                                    )}
                                    <p className="text-xs" style={{ fontSize: `${watchedValues.fontSize}px` }}>
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
                                    {watchedValues.includeQRCode && (
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-black mx-auto mt-2" />
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="flex justify-between items-end text-xs">
                                    {config.showSignature && watchedValues.signatureUrl && (
                                        <div className="text-center">
                                            <img
                                                src={watchedValues.signatureUrl}
                                                alt="Signature"
                                                className="h-6 sm:h-8 w-auto mb-1"
                                            />
                                            <div className="border-t pt-1">
                                                <p>Authorized Signature</p>
                                            </div>
                                        </div>
                                    )}
                                    {config.showStamp && watchedValues.stampUrl && (
                                        <img
                                            src={watchedValues.stampUrl}
                                            alt="Stamp"
                                            className="h-8 sm:h-12 w-auto"
                                        />
                                    )}
                                </div>

                                {watchedValues.footerText && (
                                    <p className="text-center text-xs mt-2">
                                        {watchedValues.footerText}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}